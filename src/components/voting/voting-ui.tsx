'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo,useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVotingProgram, useVotingProgramAccount } from './voting-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ClipboardDocumentCheckIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { CustomDropdown } from '../ui/custom-drop-down'

export function VotingCreate() {
  const { initializePoll } = useVotingProgram()

  return (
    <Button 
      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl shadow-lg transition-all"
      onClick={() => initializePoll.mutateAsync({
        pollId: Math.floor(Math.random() * 1000), 
        description: "Annual Board Member Election 2026", // Real-world example
        start: Math.floor(Date.now() / 1000),
        end: Math.floor(Date.now() / 1000) + (86400 * 7), // Set for 1 week
      })} 
      disabled={initializePoll.isPending}
    >
      <PlusIcon className="h-5 w-5 mr-2" />
      Initiate New Proposal {initializePoll.isPending && '...'}
    </Button>
  )
}

export function VotingList() {
  const { accounts, getProgramAccount } = useVotingProgram()

  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center p-12">
        <span className="loading loading-spinner loading-lg text-blue-600"></span>
      </div>
    )
  }

  return (
    <div className={'space-y-8'}>
      {accounts.isLoading ? (
        <div className="flex justify-center"><span className="loading loading-spinner loading-lg"></span></div>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-6">
          {accounts.data?.map((account) => (
            <VotingCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <ClipboardDocumentCheckIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No Active Proposals</h2>
          <p className="text-slate-500">There are currently no ballots requiring your attention.</p>
        </div>
      )}
    </div>
  )
}
function VotingCard({ account }: { account: PublicKey }) {
  const { accountQuery, voteMutation } = useVotingProgramAccount({ account })
  // 1. Keep track of the selection in local state
  const [selectedCandidate, setSelectedCandidate] = useState<string>('')

  const description = useMemo(() => accountQuery.data?.description ?? 'Untitled Proposal', [accountQuery.data])
  const pollId = useMemo(() => accountQuery.data?.pollId?.toNumber() ?? 0, [accountQuery.data])

  // 2. FOR DEMO: If your Rust program initialized "Yes" and "No", use these.
  // If you used different names during 'initializeCandidate', change these strings.
  const candidates = ['Board Chair', 'Vice Chair', 'Treasurer', 'Secretary']

  return accountQuery.isLoading ? (
    <div className="h-40 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
  ) : (
    <Card className="border-none shadow-md bg-white dark:bg-white/5 hover:ring-1 hover:ring-blue-500 transition-all overflow-hidden">
      <div className="h-2 bg-blue-600 w-full" />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Proposal ID: {pollId}
            </span>
            <CardTitle className="text-xl">{description}</CardTitle>
          </div>
          <UserGroupIcon className="h-6 w-6 text-slate-400" />
        </div>
        <CardDescription className="flex items-center gap-1 font-mono text-[11px] mt-2">
          <span>Ledger Proof:</span>
          <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* 3. The Dropdown Implementation */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Select Candidate</label>
            <CustomDropdown 
              options={candidates} 
              value={selectedCandidate} 
              onChange={setSelectedCandidate} 
              placeholder="Choose wisely..."
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-slate-500">
              Status: <span className="text-green-600 font-bold uppercase">Active</span>
            </div>
            
            <Button
              className="rounded-full px-6 bg-slate-900 dark:bg-slate-100 dark:text-black hover:scale-105 transition-transform disabled:opacity-50"
              onClick={() => {
                // 4. Only mutate if a selection exists
                if (selectedCandidate) {
                  voteMutation.mutateAsync({ 
                    candidateName: selectedCandidate, 
                    pollId 
                  })
                }
              }}
              disabled={voteMutation.isPending || !selectedCandidate}
            >
              {voteMutation.isPending ? 'Processing...' : 'Cast Ballot'}
            </Button>
          </div>
        </div>
      </CardContent>


      
    </Card>
  )
}