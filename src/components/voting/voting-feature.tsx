'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
// 1. Update the import to use the new hook name
import { useVotingProgram } from './voting-data-access'
import { VotingCreate, VotingList } from './voting-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'

export default function VotingFeature() {
  const { publicKey } = useWallet()
  
  // 2. Call useVotingProgram instead of useVotingProgram
  const { programId } = useVotingProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="Voting Dapp"
        subtitle={
          'Create a new Poll by clicking the "Create" button. The state of the poll and candidates are stored on-chain on the Solana blockchain.'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <VotingCreate />
      </AppHero>
      <VotingList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}