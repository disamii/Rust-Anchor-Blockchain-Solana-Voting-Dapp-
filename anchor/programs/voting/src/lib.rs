#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("CJQhZqq1X6EC2wE2sUYZAczqQSBvYs9DZGkrs8AQiRxB");

#[program]
pub mod voting {
    use super::*;

    // =============================================
    // INSTRUCTION 1: Admin creates a ballot
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

        let poll = &mut ctx.accounts.poll;
        poll.poll_id = poll_id;
        poll.description = description;
        poll.poll_start = poll_start;
        poll.poll_end = poll_end;
        poll.candidate_amount = 0;

        // store WHO created this ballot
        // this is how we enforce admin-only later
        poll.authority = ctx.accounts.signer.key();

        Ok(())
    }

    // =============================================
    // INSTRUCTION 2: Admin adds a candidate
    // =============================================
    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        candidate_name: String,
        _poll_id: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let now = Clock::get()?.unix_timestamp as u64;


        // business rule: candidates can only be added BEFORE voting starts
        // once voting starts the candidate list is locked
        require!(now < poll.poll_start, VotingError::VotingAlreadyStarted);

        let candidate = &mut ctx.accounts.candidate;
        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0;

        // increment candidate count on the ballot
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

        // "vote once" is enforced automatically by the VoteRecord PDA
        // if this wallet already voted on this poll,
        // the VoteRecord account already exists at this address
        // Anchor will REJECT the transaction before we even get here
        // so we don't need an explicit check — the PDA seed does it

        // increment the chosen candidate's vote count
        let candidate = &mut ctx.accounts.candidate;
        candidate.candidate_votes += 1;

        msg!("Vote cast for: {}", candidate.candidate_name);
        msg!("Total votes: {}", candidate.candidate_votes);

        Ok(())
    }
}

// =============================================
// ACCOUNT CONTEXTS
// (who needs to sign, what accounts are needed)
// =============================================

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + Poll::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(
        constraint = config.admin == signer.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

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
    #[account(
        constraint = config.admin == signer.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,
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
        seeds = [
            b"vote_record",
            poll.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}
pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    msg!("Transferring admin rights from {} to {}", config.admin, new_admin);
    
    // Update the dynamic storage
    config.admin = new_admin;
    
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub current_admin: Signer<'info>,

    #[account(
        mut,
        // Only the current admin can authorize their successor
        constraint = config.admin == current_admin.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,
}
// =============================================
// ACCOUNT STRUCTS (your database schema)
// =============================================

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id: u64,
    #[max_len(280)]
    pub description: String,
    pub poll_start: u64,
    pub poll_end: u64,
    pub candidate_amount: u64,
    pub authority: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Candidate {
    pub poll: Pubkey,            
    #[max_len(280)]
    pub candidate_name: String,
    pub candidate_votes: u64,
}
#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub poll: Pubkey,

}


#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey, // 32 bytes
}

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

    #[msg("Candidate is not in this Poll")]
    CandidateNotInPoll,

    
    
}