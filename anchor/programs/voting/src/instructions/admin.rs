use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::VotingError;

pub const SUPER_ADMIN: Pubkey = pubkey!("GpUMEq99J518SMjgRMmKX6kcRCiudg3FoKxpzx7pGD7J");

pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
    require!(ctx.accounts.signer.key() == SUPER_ADMIN, VotingError::Unauthorized);
    let config = &mut ctx.accounts.config;
    config.admin = SUPER_ADMIN;
    Ok(())
}

pub fn update_superadmin(ctx: Context<UpdateSuperAdmin>, new_admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    msg!("Transferring admin from {} to {}", config.admin, new_admin);
    config.admin = new_admin;
    Ok(())
}



#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSuperAdmin<'info> {
    #[account(mut)]
    pub current_admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        constraint = config.admin == current_admin.key() @ VotingError::Unauthorized
    )]
    pub config: Account<'info, Config>,
}
