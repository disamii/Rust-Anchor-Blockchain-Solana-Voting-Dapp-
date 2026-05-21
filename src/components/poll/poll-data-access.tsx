'use client'

import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Candidate, Poll } from '../interface'
import { BN } from '@coral-xyz/anchor'
import { deriveInstitutionPda } from '../institution/institution-data-access'
import { useConnection } from '@solana/wallet-adapter-react'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'

import { getVotingProgram, getVotingProgramId } from '@project/anchor'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import * as anchor from '@coral-xyz/anchor'
import { SystemProgram } from '@solana/web3.js'

export function useGetPolls() {
  const { program } = useVotingProgram()

  return useQuery({
    queryKey: ['get-polls', { programId: program.programId.toString() }],
    queryFn: async (): Promise<Poll[]> => {
      const polls = await program.account.poll.all()

      return polls.map((p) => {
        const account = p.account
        const now = Date.now()
        const start = account.pollStart.toNumber() * 1000
        const end = account.pollEnd.toNumber() * 1000

        let status: 'upcoming' | 'active' | 'ended' = 'active'
        if (now < start) status = 'upcoming'
        else if (now > end) status = 'ended'

        // poll-data-access.tsx
        return {
          id: account.pollId.toNumber(),
          title: account.title,
          description: account.description,
          start,
          end,
          candidateAmount: account.candidateAmount.toNumber(),
          authority: account.authority.toString(),
          institution: account.institution.toString(),
          institutionId: account.institutionId?.toNumber() ?? 0, // ← ADD THIS
          status,
          candidates: [],
        }
      })
    },
    refetchInterval: 2000,
    staleTime: 0,
  })
}
export function useInitializePoll() {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      pollId: number
      institutionId: number
      title:string
      description: string
      pollStart: number
      pollEnd: number
      signer: PublicKey
    }) => {
      return await program.methods
        .initializePoll(
          new BN(input.pollId),
          new BN(input.institutionId),
          input.title,
          input.description,
          new BN(input.pollStart),
          new BN(input.pollEnd),
        )
        .accounts({
          signer: input.signer,
        })
        .rpc()
    },

    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['get-polls'] })
    },
  })
}
export function useGetPollsByInstitution({ institutionId }: { institutionId: number | null }) {
  const { program } = useVotingProgram()

  return useQuery({
    enabled: institutionId !== null,
    queryKey: ['get-polls-by-institution', { institutionId }],
    queryFn: async (): Promise<Poll[]> => {
      if (institutionId === null) return []

      const institutionPda = deriveInstitutionPda(institutionId, program.programId)
      const polls = await program.account.poll.all([
        {
          memcmp: {
            offset: 8 + 8 + (4 + 280) + 8 + 8 + 8 + 32, // = 356
            bytes: institutionPda.toBase58(),
          },
        },
      ])

      return polls.map((p) => {
        const account = p.account
        const now = Date.now()
        const start = account.pollStart.toNumber() * 1000
        const end = account.pollEnd.toNumber() * 1000
        let status: 'upcoming' | 'active' | 'ended' = 'active'
        if (now < start) status = 'upcoming'
        else if (now > end) status = 'ended'

        // poll-data-access.tsx
        return {
          id: account.pollId.toNumber(),
          title: `Poll #${account.pollId.toString()}`,
          description: account.description,
          start,
          end,
          candidateAmount: account.candidateAmount.toNumber(),
          authority: account.authority.toString(),
          institution: account.institution.toString(),
          institutionId: account.institutionId?.toNumber() ?? 0, // ← ADD THIS
          status,
          candidates: [],
        }
      })
    },
    refetchInterval: 2000,
    staleTime: 0,
  })
}

export function useInitializeCandidate() {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (input: { pollId: number; candidateName: string; signer: PublicKey; institution: PublicKey }) => {
      const pollIdBN = new BN(input.pollId)

      // 1. Manually calculate the Poll PDA to find out what it is
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), input.institution.toBuffer(), pollIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      // 2. Manually calculate the Candidate PDA
      const [candidatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('candidate'), pollPda.toBuffer(), Buffer.from(input.candidateName)],
        program.programId,
      )

      return await program.methods
        .initializeCandidate(input.candidateName, pollIdBN)
        .accountsPartial({
          signer: input.signer,
          institution: input.institution,
          poll: pollPda,
          candidate: candidatePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },

    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['get-polls'] })
      client.invalidateQueries({ queryKey: ['get-candidates'] })
    },
  })
}
export function useVotingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()

  // Update function names here
  const programId = useMemo(() => getVotingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getVotingProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['voting', 'all', { cluster }],
    queryFn: () => program.account.poll.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializePoll = useMutation({
    mutationKey: ['voting', 'initialize', { cluster }],

    mutationFn: ({
      pollId,
      institutionId,
      title,
      description,
      start,
      end,
    }: {
      pollId: number
      institutionId: number
      title:string
      description: string
      start: number
      end: number
    }) =>
      program.methods
        .initializePoll(
          new anchor.BN(pollId),
          new anchor.BN(institutionId),
          title,
          description,
          new anchor.BN(start),
          new anchor.BN(end),
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

  // 1. Add useConnection() here
  const { connection } = useConnection()
  const { program, programId } = useVotingProgram()

  const accountQuery = useQuery({
    queryKey: ['voting', 'fetch', { cluster, account }],
    queryFn: () => program.account.poll.fetch(account),
  })

  const voteMutation = useMutation({
    mutationKey: ['voting', 'vote', { cluster, account }],
    mutationFn: async ({ candidateName, pollId }: { candidateName: string; pollId: number }) => {
      const [candidateAddress] = PublicKey.findProgramAddressSync(
        [new anchor.BN(pollId).toArrayLike(Buffer, 'le', 8), Buffer.from(candidateName)],
        programId,
      )

      const candidateAccount = await connection.getAccountInfo(candidateAddress)

      if (!candidateAccount) {
        toast.info('Initializing new candidate...')
        await program.methods.initializeCandidate(candidateName, new anchor.BN(pollId)).rpc()
      }

      return program.methods.vote(candidateName, new anchor.BN(pollId)).rpc()
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

interface GetCandidatesArgs {
  pollId: number
  institution: string | PublicKey // ← Need this to correctly calculate the Poll PDA
}
export function useGetCandidates({
  pollId,
  institution,
}: {
  pollId: number
  institution?: string // ← Make this optional
}) {
  const { program } = useVotingProgram()

  return useQuery({
    queryKey: ['get-candidates', { programId: program.programId.toString(), pollId, institution }],
    queryFn: async (): Promise<Candidate[]> => {
      // This check keeps TypeScript happy, though 'enabled' guards it at runtime
      if (!institution) return []

      const pollIdBN = new BN(pollId)
      const institutionKey = new PublicKey(institution)

      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), institutionKey.toBuffer(), pollIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      const candidates = await program.account.candidate.all([
        {
          memcmp: {
            offset: 8,
            bytes: pollPda.toBase58(),
          },
        },
      ])

      return candidates.map((c) => ({
        name: c.account.candidateName,
        votes: c.account.candidateVotes.toNumber(),
      }))
    },
    // ── THE FIX ──
    // Only run this query if we actually have the institution string ready!
    enabled: !!institution,
    refetchInterval: institution ? 2000 : false,
    staleTime: 0,
  })
}

export function useRegisterVoter() {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['register-voter', { programId: program.programId.toString() }],
    mutationFn: async (input: {
      pollId: number
      institutionId: number // ← NEW: needed to derive poll PDA
      voterWallet: PublicKey
      signer: PublicKey
    }) => {
      const pollIdBN = new BN(input.pollId)
      const institutionIdBN = new BN(input.institutionId)

      const [institutionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('institution'), institutionIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), institutionPda.toBuffer(), pollIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      const [registeredVoterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('registered_voter'), pollPda.toBuffer(), input.voterWallet.toBuffer()],
        program.programId,
      )

      return await program.methods
        .registerVoter(pollIdBN, input.voterWallet)
        .accountsPartial({
          signer: input.signer,
          institution: institutionPda,
          poll: pollPda,
          voterWallet: input.voterWallet,
          registeredVoter: registeredVoterPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ['get-registered-voters', { pollId: variables.pollId }] })
    },
  })
}

export function useCastVote({ pollId }: { pollId: number }) {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['cast-vote', { programId: program.programId.toString(), pollId }],
    mutationFn: async (input: {
      candidateName: string
      institutionId: number // ← NEW
      signer: PublicKey
    }) => {
      const pollIdBN = new BN(pollId)
      const institutionIdBN = new BN(input.institutionId)

      const [institutionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('institution'), institutionIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), institutionPda.toBuffer(), pollIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      const [candidatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('candidate'), pollPda.toBuffer(), Buffer.from(input.candidateName)],
        program.programId,
      )

      const [registeredVoterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('registered_voter'), pollPda.toBuffer(), input.signer.toBuffer()],
        program.programId,
      )

      const [voteRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vote_record'), pollPda.toBuffer(), input.signer.toBuffer()],
        program.programId,
      )

      return await (program.methods as any)
        .vote(pollIdBN, input.candidateName)
        .accounts({
          signer: input.signer,
          institution: institutionPda, // ← NEW
          poll: pollPda,
          registeredVoter: registeredVoterPda,
          candidate: candidatePda,
          voteRecord: voteRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['get-polls'] })
      client.invalidateQueries({ queryKey: ['get-candidates', { pollId }] })
    },
    onError: (error) => console.error('Voting failed:', error),
  })
}
// Change the function signature to accept institutionId
export function useGetRegisteredVoters({ pollId, institutionId }: { pollId: number; institutionId: number }) {
  const { program } = useVotingProgram()

  return useQuery({
    queryKey: ['get-registered-voters', { pollId, institutionId }],
    queryFn: async () => {
      const pollIdBN = new BN(pollId)
      const institutionIdBN = new BN(institutionId)

      // Step 1: derive institution PDA (matches your Rust seeds: ["institution", institution_id])
      const [institutionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('institution'), institutionIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      // Step 2: derive poll PDA (matches your Rust seeds: ["poll", institution.key(), poll_id])
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), institutionPda.toBuffer(), pollIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId,
      )

      // Step 3: filter RegisteredVoter accounts by their poll field (offset 8+32 = after discriminator + voter pubkey)
      const voters = await program.account.registeredVoter.all([
        {
          memcmp: {
            offset: 8 + 32, // discriminator (8) + voter pubkey (32)
            bytes: pollPda.toBase58(),
          },
        },
      ])

      return voters.map((v) => ({
        voter: v.account.voter.toString(),
        poll: v.account.poll.toString(),
        registeredAt: new Date(v.account.registeredAt.toNumber() * 1000).toISOString().split('T')[0],
      }))
    },
    refetchInterval: 2000,
    staleTime: 0,
  })
}