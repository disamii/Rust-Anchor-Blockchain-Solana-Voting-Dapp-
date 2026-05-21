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

// #[derive(Accounts)]
// #[instruction(_creator: Pubkey)]
// pub struct AddAdmin<'info> {
//     #[account(mut)]
//     pub super_admin: Signer<'info>,
//     #[account(
//         seeds = [b"config"],
//         bump,
//         constraint = config.admin == super_admin.key() @ VotingError::Unauthorized
//     )]
//     pub config: Account<'info, Config>,
//     /// CHECK: Address used purely to safely derive target PDA below
//     pub creator_wallet: UncheckedAccount<'info>,
//     #[account(
//         init,
//         payer = super_admin,
//         space = 8 + Admin::INIT_SPACE,
//         seeds = [b"admin", creator_wallet.key().as_ref()],
//         bump
//     )]
//     pub admin: Account<'info, Admin>,
//     pub system_program: Program<'info, System>,
// }


// #[derive(Accounts)]
// #[instruction(_creator: Pubkey)]
// pub struct RemoveAdmin<'info> {
//     #[account(mut)]
//     pub super_admin: Signer<'info>,
//     #[account(
//         seeds = [b"config"],
//         bump,
//         constraint = config.admin == super_admin.key() @ VotingError::Unauthorized
//     )]
//     pub config: Account<'info, Config>,
//     /// CHECK: Address used purely to safely derive target PDA below
//     pub creator_wallet: UncheckedAccount<'info>,
//     #[account(
//         mut,
//         seeds = [b"admin", creator_wallet.key().as_ref()],
//         bump,
//         close = super_admin
//     )]
//     pub admin: Account<'info, Admin>,
// }

// pub fn add_admin(ctx: Context<AddAdmin>, _creator: Pubkey) -> Result<()> {
//     let approved = &mut ctx.accounts.admin;
//     approved.creator = ctx.accounts.creator_wallet.key();
//     approved.added_by = ctx.accounts.super_admin.key();
//     approved.added_at = Clock::get()?.unix_timestamp;
//     msg!("Approved creator: {}", approved.creator);
//     Ok(())
// }

// pub fn remove_admin(ctx: Context<RemoveAdmin>, _creator: Pubkey) -> Result<()> {
//     msg!("Removed creator: {}", ctx.accounts.admin.creator);
//     Ok(())
// }