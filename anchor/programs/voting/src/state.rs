use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,      
}

#[account]
#[derive(InitSpace)]
pub struct Admin {
    pub creator:   Pubkey,  
    pub added_by:  Pubkey,  
    pub added_at:  i64,     
}

#[account]
#[derive(InitSpace)]
pub struct Institution {
    pub institution_id: u64,
    #[max_len(100)]
    pub name: String,
    pub admin: Pubkey,
    #[max_len(500)]
    pub policy: String,
    pub created_at: i64,
    pub is_approved: bool,
    pub approved_by: Pubkey,
    pub approved_at: i64,
    pub is_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id:          u64,
    #[max_len(280)]
    pub description:      String,
    pub institution_id:   u64,   
    pub poll_start:       u64,
    pub poll_end:         u64,
    pub candidate_amount: u64,
    pub authority:        Pubkey,
    pub institution:      Pubkey,  
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
pub struct RegisteredVoter {
    pub voter:           Pubkey,
    pub poll:            Pubkey,
    pub registered_at:   i64,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub voter: Pubkey,  
    pub poll:  Pubkey,  
}