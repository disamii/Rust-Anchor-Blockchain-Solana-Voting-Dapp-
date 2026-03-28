import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
// Update these paths to match your actual generated files
import VotingIDL from '../target/idl/voting.json'
import type { Voting } from '../target/types/voting'

export { Voting, VotingIDL }

export const VOTING_PROGRAM_ID = new PublicKey(VotingIDL.address)

export function getVotingProgram(provider: AnchorProvider, address?: PublicKey): Program<Voting> {
  return new Program({ ...VotingIDL, address: address ? address.toBase58() : VotingIDL.address } as Voting, provider)
}

export function getVotingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // If you haven't deployed yet, this might need updating later
      return new PublicKey(VotingIDL.address)
    case 'mainnet-beta':
    default:
      return VOTING_PROGRAM_ID
  }
}