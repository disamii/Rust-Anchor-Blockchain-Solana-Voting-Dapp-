use crate::errors::VotingError;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn initialize_poll(
    ctx: Context<InitializePoll>,
    poll_id: u64,
    _institution_id: u64,
    title:String,
    description: String,
    poll_start: u64,
    poll_end: u64,
) -> Result<()> {
    require!(poll_end > poll_start, VotingError::InvalidTimeWindow);

    let poll = &mut ctx.accounts.poll;
    poll.poll_id = poll_id;
    poll.title=title;
    poll.description = description;
    poll.poll_start = poll_start;
    poll.poll_end = poll_end;
    poll.institution_id = _institution_id; 
    poll.candidate_amount = 0;
    poll.authority = ctx.accounts.signer.key();
    poll.institution = ctx.accounts.institution.key();
    Ok(())
}

pub fn initialize_candidate(
    ctx: Context<InitializeCandidate>,
    candidate_name: String,
    _poll_id: u64,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let now = Clock::get()?.unix_timestamp as u64;

    require!(
        ctx.accounts.signer.key() == poll.authority,
        VotingError::Unauthorized
    );
    require!(now < poll.poll_start, VotingError::VotingAlreadyStarted);

    let candidate = &mut ctx.accounts.candidate;
    candidate.poll = poll.key();
    candidate.candidate_name = candidate_name;
    candidate.candidate_votes = 0;

    poll.candidate_amount += 1;
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64, institution_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [b"admin", signer.key().as_ref()],
        bump
    )]
    pub admin: Account<'info, Admin>,
    #[account(
        seeds = [b"institution", institution_id.to_le_bytes().as_ref()],
        bump,
        constraint = institution.admin == signer.key() @ VotingError::Unauthorized,
        constraint = institution.is_active @ VotingError::InstitutionFrozen
    )]
    pub institution: Account<'info, Institution>,
    #[account(
    init,
    payer = signer,
    space = 8 + Poll::INIT_SPACE,
    seeds = [
        b"poll",
        institution.key().as_ref(),
        poll_id.to_le_bytes().as_ref()
    ],
    bump
)]
    pub poll: Account<'info, Poll>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u64)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub institution: Account<'info, Institution>,

    #[account(
        mut,
        seeds = [
            b"poll",
            institution.key().as_ref(),
            poll_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = signer,
        space = 8 + Candidate::INIT_SPACE,
        seeds = [
            b"candidate",
            poll.key().as_ref(),
            candidate_name.as_bytes()
        ],
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    pub system_program: Program<'info, System>,
}
