'use client'

// 1. Update these to the new names we created in the exports file
import { getVotingProgram, getVotingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import * as anchor from '@coral-xyz/anchor'

export function useVotingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  
  // Update function names here
  const programId = useMemo(() => getVotingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getVotingProgram(provider, programId), [provider, programId])

  // Change 'counter' to 'poll' or 'candidate' based on your IDL
  const accounts = useQuery({
    queryKey: ['voting', 'all', { cluster }],
    queryFn: () => program.account.poll.all(), 
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  // Your IDL has 'initializePoll', not 'initialize'
  const initializePoll = useMutation({
    mutationKey: ['voting', 'initialize', { cluster }],
    mutationFn: ({ pollId, description, start, end }: { pollId: number, description: string, start: number, end: number }) =>
      program.methods
        .initializePoll(
          new anchor.BN(pollId), 
          description, 
          new anchor.BN(start), 
          new anchor.BN(end)
        )
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      accounts.refetch()
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initializePoll,
  }
}
export function useVotingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  
  // 1. Destructure programId here so it's available below
  const { program, accounts, programId } = useVotingProgram()

  const accountQuery = useQuery({
    queryKey: ['voting', 'fetch', { cluster, account }],
    queryFn: () => program.account.poll.fetch(account),
  })

const voteMutation = useMutation({
    mutationKey: ['voting', 'vote', { cluster, account }],
    mutationFn: async ({ candidateName, pollId }: { candidateName: string; pollId: number }) => {
      // We don't need to manually derive the PDA here 
      // because Anchor will use the arguments below to find them!
      return program.methods
        .vote(candidateName, new anchor.BN(pollId))
        .rpc()
    },
    onSuccess: (tx) => {
      transactionToast(tx)
      accountQuery.refetch()
    },
  })
  return {
    accountQuery,
    voteMutation,
  }
}