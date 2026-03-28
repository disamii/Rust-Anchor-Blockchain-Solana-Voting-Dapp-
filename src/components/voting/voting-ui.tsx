'use client'

import { Keypair, PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
// 1. Updated Imports
import { useVotingProgram, useVotingProgramAccount } from './voting-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

export function VotingCreate() {
  const { initializePoll } = useVotingProgram()

  return (
    <Button 
      onClick={() => initializePoll.mutateAsync({
        pollId: Math.floor(Math.random() * 1000), // Temporary: generating a random ID
        description: "Best Programming Language?",
        start: Math.floor(Date.now() / 1000),
        end: Math.floor(Date.now() / 1000) + 3600,
      })} 
      disabled={initializePoll.isPending}
    >
      Initialize Poll {initializePoll.isPending && '...'}
    </Button>
  )
}

export function VotingList() {
  const { accounts, getProgramAccount } = useVotingProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <VotingCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No polls</h2>
          No polls found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function VotingCard({ account }: { account: PublicKey }) {
  // 2. Updated hook and available mutations
  const { accountQuery, voteMutation } = useVotingProgramAccount({
    account,
  })

  // 3. Mapping Poll Data (matching your IDL structure)
  const description = useMemo(() => accountQuery.data?.description ?? 'No description', [accountQuery.data])
  const pollId = useMemo(() => accountQuery.data?.pollId?.toNumber() ?? 0, [accountQuery.data])

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Poll #{pollId}: {description}</CardTitle>
        <CardDescription>
          PDA: <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              const candidate = window.prompt('Enter Candidate Name:')
              if (candidate) {
                voteMutation.mutateAsync({ candidateName: candidate, pollId })
              }
            }}
            disabled={voteMutation.isPending}
          >
            Vote
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}