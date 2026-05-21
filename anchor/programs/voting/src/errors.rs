use anchor_lang::prelude::*;

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

    #[msg("You are not registered to vote in this poll")]
    NotRegisteredVoter,
    
    #[msg("This institution has been deactivated")]
    InstitutionFrozen,
    
    #[msg("Institution not found for this admin")]
    InstitutionNotFound,
}