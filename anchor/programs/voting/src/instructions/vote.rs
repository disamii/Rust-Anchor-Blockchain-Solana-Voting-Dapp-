use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::VotingError;

pub fn vote(
    ctx: Context<CastVote>,
    _poll_id: u64,
    _candidate_name: String,
) -> Result<()> {
    let poll = &ctx.accounts.poll;
    let now = Clock::get()?.unix_timestamp as u64;

    require!(now >= poll.poll_start, VotingError::VotingNotStarted);
    require!(now <= poll.poll_end, VotingError::VotingEnded);

    let candidate = &mut ctx.accounts.candidate;
    candidate.candidate_votes += 1;

    let record = &mut ctx.accounts.vote_record;
    record.voter = ctx.accounts.signer.key();
    record.poll = poll.key();

    msg!("Vote cast for: {}", candidate.candidate_name);
    msg!("Total votes: {}", candidate.candidate_votes);
    Ok(())
}

pub fn register_voter(ctx: Context<RegisterVoter>, _poll_id: u64, _voter: Pubkey) -> Result<()> {
    let record = &mut ctx.accounts.registered_voter;
    record.voter = ctx.accounts.voter_wallet.key();
    record.poll = ctx.accounts.poll.key();
    record.registered_at = Clock::get()?.unix_timestamp;
    msg!("Voter registered: {}", record.voter);
    Ok(())
}

pub fn deregister_voter(ctx: Context<DeregisterVoter>, _poll_id: u64, _voter: Pubkey) -> Result<()> {
    msg!("Voter removed: {}", ctx.accounts.registered_voter.voter);
    Ok(())
}
#[derive(Accounts)]
#[instruction(poll_id: u64, _voter: Pubkey)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // institution needed so we can derive the poll PDA correctly
    pub institution: Account<'info, Institution>,

    #[account(
        seeds = [
            b"poll",
            institution.key().as_ref(),      // ← must match how poll was created
            poll_id.to_le_bytes().as_ref()
        ],
        bump,
        constraint = poll.authority == signer.key() @ VotingError::Unauthorized
    )]
    pub poll: Account<'info, Poll>,

    /// CHECK: Address verification performed via derivation path seeds below
    pub voter_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + RegisteredVoter::INIT_SPACE,
        seeds = [b"registered_voter", poll.key().as_ref(), voter_wallet.key().as_ref()],
        bump
    )]
    pub registered_voter: Account<'info, RegisteredVoter>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, _voter: Pubkey)]
pub struct DeregisterVoter<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub institution: Account<'info, Institution>,

    #[account(
        seeds = [
            b"poll",
            institution.key().as_ref(),
            poll_id.to_le_bytes().as_ref()
        ],
        bump,
        constraint = poll.authority == signer.key() @ VotingError::Unauthorized
    )]
    pub poll: Account<'info, Poll>,

    /// CHECK: Address verification performed via derivation path seeds below
    pub voter_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"registered_voter", poll.key().as_ref(), voter_wallet.key().as_ref()],
        bump,
        close = signer
    )]
    pub registered_voter: Account<'info, RegisteredVoter>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate_name: String)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub institution: Account<'info, Institution>,

    #[account(
        seeds = [
            b"poll",
            institution.key().as_ref(),
            poll_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        seeds = [b"registered_voter", poll.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub registered_voter: Account<'info, RegisteredVoter>,

    #[account(
        mut,
        seeds = [
            b"candidate",
            poll.key().as_ref(),
            candidate_name.as_bytes()
        ],
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