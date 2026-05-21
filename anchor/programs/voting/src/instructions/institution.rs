use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::VotingError;

// -----------------------------------------------------
// CREATE INSTITUTION + ADMIN
// anyone can call
// institution starts pending approval
// -----------------------------------------------------

pub fn initialize_institution(
    ctx: Context<InitializeInstitution>,
    institution_id: u64,
    name: String,
    policy: String,
) -> Result<()> {

    let admin = &mut ctx.accounts.admin;

    admin.creator = ctx.accounts.admin_wallet.key();
    admin.added_by = Pubkey::default(); 
    admin.added_at = Clock::get()?.unix_timestamp;

    let institution = &mut ctx.accounts.institution;

    institution.institution_id = institution_id;
    institution.name = name;

    // institution owner
    institution.admin = ctx.accounts.admin_wallet.key();

    institution.policy = policy;

    institution.created_at = Clock::get()?.unix_timestamp;

    // pending state
    institution.is_approved = false;
    institution.approved_by = Pubkey::default();
    institution.approved_at = 0;

    institution.is_active = false;

    msg!("Institution created: {}", institution.name);

    Ok(())
}

// -----------------------------------------------------
// SUPER ADMIN APPROVES INSTITUTION
// -----------------------------------------------------

pub fn approve_institution(
    ctx: Context<ApproveInstitution>,
    _institution_id: u64,
) -> Result<()> {

    let institution = &mut ctx.accounts.institution;

    institution.is_approved = true;
    institution.is_active = true;

    institution.approved_by = ctx.accounts.super_admin.key();

    institution.approved_at = Clock::get()?.unix_timestamp;

    // admin approved by super admin
    let admin = &mut ctx.accounts.admin;

    admin.added_by = ctx.accounts.super_admin.key();

    msg!("Institution approved");

    Ok(())
}

// -----------------------------------------------------
// SUPER ADMIN REPLACES ADMIN
// -----------------------------------------------------

pub fn replace_institution_admin(
    ctx: Context<ReplaceInstitutionAdmin>,
    _institution_id: u64,
) -> Result<()> {

    let institution = &mut ctx.accounts.institution;

    institution.admin = ctx.accounts.new_admin_wallet.key();

    // initialize new admin account
    let new_admin = &mut ctx.accounts.new_admin;

    new_admin.creator = ctx.accounts.new_admin_wallet.key();

    new_admin.added_by = ctx.accounts.super_admin.key();

    new_admin.added_at = Clock::get()?.unix_timestamp;

    msg!("Institution admin replaced");

    Ok(())
}

// -----------------------------------------------------
// ADMIN EDITS INSTITUTION
// -----------------------------------------------------

pub fn update_institution(
    ctx: Context<UpdateInstitution>,
    _institution_id: u64,
    new_name: String,
    new_Policy: String,
) -> Result<()> {

    let institution = &mut ctx.accounts.institution;

    institution.name = new_name;

    institution.policy = new_Policy;

    msg!("Institution updated");

    Ok(())
}

// -----------------------------------------------------
// ACCOUNTS
// -----------------------------------------------------

#[derive(Accounts)]
#[instruction(institution_id: u64)]
pub struct InitializeInstitution<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    pub admin_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + Admin::INIT_SPACE,
        seeds = [b"admin", admin_wallet.key().as_ref()],
        bump
    )]
    pub admin: Account<'info, Admin>,

    #[account(
        init,
        payer = signer,
        space = 8 + Institution::INIT_SPACE,
        seeds = [b"institution", institution_id.to_le_bytes().as_ref()],
        bump
    )]
    pub institution: Account<'info, Institution>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_institution_id: u64)]
pub struct ApproveInstitution<'info> {

    #[account(mut)]
    pub super_admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump,
        constraint = config.admin == super_admin.key()
            @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"institution", _institution_id.to_le_bytes().as_ref()],
        bump
    )]
    pub institution: Account<'info, Institution>,

    #[account(
        mut,
        seeds = [b"admin", institution.admin.as_ref()],
        bump
    )]
    pub admin: Account<'info, Admin>,
}

#[derive(Accounts)]
#[instruction(_institution_id: u64)]
pub struct ReplaceInstitutionAdmin<'info> {

    #[account(mut)]
    pub super_admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump,
        constraint = config.admin == super_admin.key()
            @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"institution", _institution_id.to_le_bytes().as_ref()],
        bump
    )]
    pub institution: Account<'info, Institution>,

    /// CHECK:
    pub new_admin_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = super_admin,
        space = 8 + Admin::INIT_SPACE,
        seeds = [b"admin", new_admin_wallet.key().as_ref()],
        bump
    )]
    pub new_admin: Account<'info, Admin>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_institution_id: u64)]
pub struct UpdateInstitution<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"institution", _institution_id.to_le_bytes().as_ref()],
        bump,
        constraint = institution.admin == signer.key()
            @ VotingError::Unauthorized,
        constraint = institution.is_approved == true
            @ VotingError::Unauthorized
    )]
    pub institution: Account<'info, Institution>,
}