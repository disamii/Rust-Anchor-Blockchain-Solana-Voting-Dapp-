'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVotingProgram } from './voting-data-access'
import { VotingCreate, VotingList } from './voting-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'
import { PlusIcon, ClipboardDocumentCheckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function VotingFeature() {
  const { publicKey } = useWallet()
  const { programId } = useVotingProgram()

  return publicKey ? (
    <div className="space-y-10 pb-20">
      {/* 1. Hero: Strategic Governance Header */}
      <AppHero
        title="Proposals & Governance"
        subtitle={
          'Initiate a new organizational vote or participate in active ballots. Every interaction is cryptographically secured and permanently recorded.'
        }
      >
        <div className="flex flex-col items-center gap-4 mt-6">
          {/* Action: Create a Proposal */}
          <VotingCreate />
          
          {/* Transparency: Link to the Governance Protocol Record */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            <ShieldCheckIcon className="h-3 w-3" />
            <span>Protocol ID:</span>
            <ExplorerLink 
              path={`account/${programId}`} 
              label={ellipsify(programId.toString())} 
              className="font-mono hover:text-blue-500 transition-colors"
            />
          </div>
        </div>
      </AppHero>

      {/* 2. Content: The List of Active/Past Votes */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
          <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Active Ballots
          </h2>
        </div>
        
        {/* The VotingList component handles the individual cards */}
        <div className="bg-white dark:bg-transparent rounded-xl">
           <VotingList />
        </div>
      </div>
    </div>
  ) : (
    /* 3. Unauthenticated State: Clean "Login" view */
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 p-10 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-white/5 max-w-md">
        <ShieldCheckIcon className="h-12 w-12 text-slate-400 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Secure Access Required</h2>
          <p className="text-sm text-slate-500">
            Please connect your authorized identity to participate in organizational voting.
          </p>
        </div>
        <div className="pt-4">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}