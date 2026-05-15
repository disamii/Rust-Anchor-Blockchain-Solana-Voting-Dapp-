#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("CJQhZqq1X6EC2wE2sUYZAczqQSBvYs9DZGkrs8AQiRxB");
const SUPER_ADMIN: Pubkey = pubkey!("GpUMEq99J518SMjgRMmKX6kcRCiudg3FoKxpzx7pGD7J");
#[program]
pub mod voting {
    use super::*;

    // =============================================
    // INSTRUCTION 0: Deploy once — sets the super-admin
    // Called ONE time after deployment, never again
    // because Config PDA has fixed seeds — second call fails
    // =============================================
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
    require!(
        ctx.accounts.signer.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );

    let config = &mut ctx.accounts.config;
    config.admin = SUPER_ADMIN;

    Ok(())
}

    // =============================================
    // INSTRUCTION 0b: Transfer super-admin to new wallet
    // Only current super-admin can do this
    // =============================================
    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;

        msg!(
            "Transferring admin from {} to {}",
            config.admin,
            new_admin
        );

        config.admin = new_admin;
        Ok(())
    }

    // =============================================
    // INSTRUCTION 0c: Super-admin approves a poll creator
    // Creates an ApprovedCreator PDA for that wallet
    // From this moment that wallet can create polls
    // =============================================
    pub fn add_approved_creator(
        ctx: Context<AddApprovedCreator>,
        // we pass the creator's pubkey as instruction arg
        // so Anchor can use it in the PDA seeds
        _creator: Pubkey,
    ) -> Result<()> {
        let approved = &mut ctx.accounts.approved_creator;

        // store who was approved and who approved them
        approved.creator = ctx.accounts.creator_wallet.key();
        approved.added_by = ctx.accounts.super_admin.key();
        approved.added_at = Clock::get()?.unix_timestamp;

        msg!("Approved creator: {}", approved.creator);
        Ok(())
    }

    // =============================================
    // INSTRUCTION 0d: Super-admin removes a poll creator
    // Closes (deletes) the ApprovedCreator PDA
    // From this moment that wallet CANNOT create new polls
    // Their existing polls are unaffected
    // =============================================
    pub fn remove_approved_creator(
        ctx: Context<RemoveApprovedCreator>,
        _creator: Pubkey,
    ) -> Result<()> {
        // closing the account is handled by Anchor via `close = super_admin`
        // in the account constraint below
        // we just log it here
        msg!(
            "Removed creator: {}",
            ctx.accounts.approved_creator.creator
        );
        Ok(())
    }

    // =============================================
    // INSTRUCTION 1: Approved creator creates a poll
    // =============================================

    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        poll_id: u64,
        description: String,
        poll_start: u64,
        poll_end: u64,
    ) -> Result<()> {
        // business rule: end must be after start
        require!(poll_end > poll_start, VotingError::InvalidTimeWindow);

        // NOTE: we do NOT need a require! check here for approval
        // the ApprovedCreator account in the context already does it
        // if the signer has no ApprovedCreator PDA → tx fails automatically
        // before this function even runs

        let poll = &mut ctx.accounts.poll;
        poll.poll_id = poll_id;
        poll.description = description;
        poll.poll_start = poll_start;
        poll.poll_end = poll_end;
        poll.candidate_amount = 0;
        poll.authority = ctx.accounts.signer.key();

        msg!("Poll created by approved creator: {}", poll.authority);
        Ok(())
    }

    // =============================================
    // INSTRUCTION 2: Poll admin adds a candidate
    // =============================================
    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        candidate_name: String,
        _poll_id: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let now = Clock::get()?.unix_timestamp as u64;

        // business rule: only the poll creator can add candidates
        require!(
            ctx.accounts.signer.key() == poll.authority,
            VotingError::Unauthorized
        );

        // business rule: candidates locked once voting starts
        require!(now < poll.poll_start, VotingError::VotingAlreadyStarted);

        let candidate = &mut ctx.accounts.candidate;
        candidate.poll = poll.key();         // store the FK relationship
        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0;

        poll.candidate_amount += 1;
        Ok(())
    }

    // =============================================
    // INSTRUCTION 3: User casts a vote
    // =============================================
    pub fn vote(
        ctx: Context<CastVote>,
        _poll_id: u64,
        _candidate_name: String,
    ) -> Result<()> {
        let poll = &ctx.accounts.poll;
        let now = Clock::get()?.unix_timestamp as u64;

        // business rule: voting window must be open
        require!(now >= poll.poll_start, VotingError::VotingNotStarted);
        require!(now <= poll.poll_end, VotingError::VotingEnded);

        // vote-once is enforced by VoteRecord PDA
        // second vote attempt → same PDA address → init fails → tx rejected

        let candidate = &mut ctx.accounts.candidate;
        candidate.candidate_votes += 1;

        // store audit trail on vote record
        let record = &mut ctx.accounts.vote_record;
        record.voter = ctx.accounts.signer.key();
        record.poll = poll.key();
        // deliberately NOT storing which candidate → anonymity

        msg!("Vote cast for: {}", candidate.candidate_name);
        msg!("Total votes: {}", candidate.candidate_votes);
        Ok(())
    }
}

// =============================================
// ACCOUNT CONTEXTS
// =============================================

// --- Config setup ---

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + Config::INIT_SPACE,
        // fixed seeds — only one Config can ever exist for this program
        // calling initialize_config a second time fails automatically
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub current_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump,
        // only the stored super-admin can update this
        constraint = config.admin == current_admin.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,
}

// --- Creator management ---

#[derive(Accounts)]
// _creator arg is needed so Anchor can use it in PDA seeds
#[instruction(_creator: Pubkey)]
pub struct AddApprovedCreator<'info> {
    #[account(mut)]
    pub super_admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump,
        // only the super-admin stored in Config can approve creators
        constraint = config.admin == super_admin.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,

    /// CHECK: this is the wallet being approved, we just store its pubkey
    /// we use CHECK because we don't need to read any data from it
    /// we just need its address to derive the PDA
    pub creator_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = super_admin,
        space = 8 + ApprovedCreator::INIT_SPACE,
        // seeds include the creator's wallet
        // so each wallet gets its own unique ApprovedCreator PDA
        // one wallet = one PDA = one approval
        seeds = [b"approved_creator", creator_wallet.key().as_ref()],
        bump
    )]
    pub approved_creator: Account<'info, ApprovedCreator>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_creator: Pubkey)]
pub struct RemoveApprovedCreator<'info> {
    #[account(mut)]
    pub super_admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump,
        constraint = config.admin == super_admin.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,

    /// CHECK: just need the address to derive the PDA to close
    pub creator_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"approved_creator", creator_wallet.key().as_ref()],
        bump,
        // close = super_admin means:
        // delete this account and send its rent SOL back to super_admin
        // after this instruction the PDA no longer exists
        // that wallet can no longer create polls
        close = super_admin
    )]
    pub approved_creator: Account<'info, ApprovedCreator>,
}

// --- Poll creation (now requires ApprovedCreator) ---
#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        // NOT init — we are just reading this to verify approval
        // if this PDA doesn't exist for the signer → tx fails here
        // this single line replaces any require! check for creator permission
        seeds = [b"approved_creator", signer.key().as_ref()],
        bump
    )]
    pub approved_creator: Account<'info, ApprovedCreator>,

    #[account(
        init,
        payer = signer,
        space = 8 + Poll::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    pub system_program: Program<'info, System>,
}

// --- Candidate and Vote unchanged ---

#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u64)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = signer,
        space = 8 + Candidate::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate_name: String)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
        bump,
        constraint = candidate.poll == poll.key() @ VotingError::CandidateNotInPoll
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(
        init,
        payer = signer,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote_record", poll.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}

// =============================================
// ACCOUNT STRUCTS
// =============================================

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,      // the super-admin wallet — only one globally
}

#[account]
#[derive(InitSpace)]
pub struct ApprovedCreator {
    pub creator:   Pubkey,  
    pub added_by:  Pubkey,  
    pub added_at:  i64,     
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id:          u64,
    #[max_len(280)]
    pub description:      String,
    pub poll_start:       u64,
    pub poll_end:         u64,
    pub candidate_amount: u64,
    pub authority:        Pubkey,   
}

#[account]
#[derive(InitSpace)]
pub struct Candidate {
    pub poll:             Pubkey,   
    #[max_len(280)]
    pub candidate_name:   String,
    pub candidate_votes:  u64,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub voter: Pubkey,  
    pub poll:  Pubkey,  
}

// =============================================
// CUSTOM ERRORS
// =============================================

#[error_code]
pub enum VotingError {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Voting has not started yet")]
    VotingNotStarted,

    #[msg("Voting period has ended")]
    VotingEnded,

    #[msg("Candidates can only be added before voting starts")]
    VotingAlreadyStarted,

    #[msg("Poll end time must be after poll start time")]
    InvalidTimeWindow,

    #[msg("This candidate does not belong to this poll")]
    CandidateNotInPoll,
}