#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("CJQhZqq1X6EC2wE2sUYZAczqQSBvYs9DZGkrs8AQiRxB");

#[program]
pub mod voting {
    use super::*;

    // -------------------------------------------------
    // ADMIN
    // -------------------------------------------------

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::admin::initialize_config(ctx)
    }

    pub fn update_admin(
        ctx: Context<UpdateSuperAdmin>,
        new_admin: Pubkey,
    ) -> Result<()> {
        instructions::admin::update_superadmin(ctx, new_admin)
    }




    // -------------------------------------------------
    // INSTITUTION
    // -------------------------------------------------

    pub fn initialize_institution(
        ctx: Context<InitializeInstitution>,
        institution_id: u64,
        name: String,
        treasury: Pubkey,
    ) -> Result<()> {
        instructions::institution::initialize_institution(
            ctx,
            institution_id,
            name,
            treasury,
        )
    }

    pub fn approve_institution(
        ctx: Context<ApproveInstitution>,
        institution_id: u64,
    ) -> Result<()> {
        instructions::institution::approve_institution(
            ctx,
            institution_id,
        )
    }

    pub fn replace_institution_admin(
        ctx: Context<ReplaceInstitutionAdmin>,
        institution_id: u64,
    ) -> Result<()> {
        instructions::institution::replace_institution_admin(
            ctx,
            institution_id,
        )
    }

    pub fn update_institution(
        ctx: Context<UpdateInstitution>,
        institution_id: u64,
        new_name: String,
        new_treasury: Pubkey,
    ) -> Result<()> {
        instructions::institution::update_institution(
            ctx,
            institution_id,
            new_name,
            new_treasury,
        )
    }

    // -------------------------------------------------
    // POLL
    // -------------------------------------------------

    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        poll_id: u64,
        institution_id: u64,
        description: String,
        poll_start: u64,
        poll_end: u64,
    ) -> Result<()> {
        instructions::poll::initialize_poll(
            ctx,
            poll_id,
            institution_id,
            description,
            poll_start,
            poll_end,
        )
    }

    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        candidate_name: String,
        poll_id: u64,
    ) -> Result<()> {
        instructions::poll::initialize_candidate(
            ctx,
            candidate_name,
            poll_id,
        )
    }

    // -------------------------------------------------
    // VOTE
    // -------------------------------------------------

    pub fn vote(
        ctx: Context<CastVote>,
        poll_id: u64,
        candidate_name: String,
    ) -> Result<()> {
        instructions::vote::vote(
            ctx,
            poll_id,
            candidate_name,
        )
    }

    pub fn register_voter(
        ctx: Context<RegisterVoter>,
        poll_id: u64,
        voter: Pubkey,
    ) -> Result<()> {
        instructions::vote::register_voter(
            ctx,
            poll_id,
            voter,
        )
    }

    pub fn deregister_voter(
        ctx: Context<DeregisterVoter>,
        poll_id: u64,
        voter: Pubkey,
    ) -> Result<()> {
        instructions::vote::deregister_voter(
            ctx,
            poll_id,
            voter,
        )
    }
}