'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApprovedCreator, Candidate, Poll, Role } from '../interface'
import { useVotingProgram } from '../voting/voting-data-access'
import { BN } from '@coral-xyz/anchor'

async function createTransaction({
  publicKey,
  destination,
  amount,
  connection,
}: {
  publicKey: PublicKey
  destination: PublicKey
  amount: number
  connection: Connection
}): Promise<{
  transaction: VersionedTransaction
  latestBlockhash: { blockhash: string; lastValidBlockHeight: number }
}> {
  // Get the latest blockhash to use in our transaction
  const latestBlockhash = await connection.getLatestBlockhash()

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL,
    }),
  ]

  const messageLegacy = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToLegacyMessage()

  const transaction = new VersionedTransaction(messageLegacy)

  return {
    transaction,
    latestBlockhash,
  }
}

export function useGetBalance({ address }: { address: PublicKey }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getBalance(address),
  })
}

export function useGetSignatures({ address }: { address: PublicKey }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address),
  })
}

export function useTransferSol({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  // const transactionToast = useTransactionToast()
  const wallet = useWallet()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['transfer-sol', { endpoint: connection.rpcEndpoint, address }],
    mutationFn: async (input: { destination: PublicKey; amount: number }) => {
      let signature: TransactionSignature = ''
      try {
        const { transaction, latestBlockhash } = await createTransaction({
          publicKey: address,
          destination: input.destination,
          amount: input.amount,
          connection,
        })

        // Send transaction and await for signature
        signature = await wallet.sendTransaction(transaction, connection)

        // Send transaction and await for signature
        await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

        console.log(signature)
        return signature
      } catch (error: unknown) {
        console.log('error', `Transaction failed! ${error}`, signature)

        return
      }
    },
    onSuccess: async (signature) => {
      if (signature) {
        // TODO: Add back Toast
        // transactionToast(signature)
        console.log('Transaction sent', signature)
      }
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
        }),
        client.invalidateQueries({
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
        }),
      ])
    },
    onError: (error) => {
      // TODO: Add Toast
      console.error(`Transaction failed! ${error}`)
    },
  })
}

export function useRequestAirdrop({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  // const transactionToast = useTransactionToast()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['airdrop', { endpoint: connection.rpcEndpoint, address }],
    mutationFn: async (amount: number = 1) => {
      const [latestBlockhash, signature] = await Promise.all([
        connection.getLatestBlockhash(),
        connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL),
      ])

      await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
      return signature
    },
    onSuccess: async (signature) => {
      // TODO: Add back Toast
      // transactionToast(signature)
      console.log('Airdrop sent', signature)
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
        }),
        client.invalidateQueries({
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
        }),
      ])
    },
  })
}

export function useInitializePoll() {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['initialize-poll', { programId: program.programId.toString() }],
    mutationFn: async (input: {
      pollId: number
      description: string
      pollStart: number
      pollEnd: number
      signer: PublicKey
    }) => {
      const pollIdBN = new BN(input.pollId)

      return await program.methods
        .initializePoll(pollIdBN, input.description, new BN(input.pollStart), new BN(input.pollEnd))
        .accounts({
          signer: input.signer,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      console.log('Poll initialization TX Sent:', signature)
      client.invalidateQueries({ queryKey: ['get-polls'] })
      client.invalidateQueries({ queryKey: ['get-candidates'] })
    },
  })
}

export function useInitializeCandidate() {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['initialize-candidate', { programId: program.programId.toString() }],
    mutationFn: async (input: { pollId: number; candidateName: string; signer: PublicKey }) => {
      const pollIdBN = new BN(input.pollId)

      return await program.methods
        .initializeCandidate(input.candidateName, pollIdBN)
        .accounts({
          signer: input.signer,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      console.log('Candidate created successfully:', signature)
      client.invalidateQueries({ queryKey: ['get-polls'] })
      client.invalidateQueries({ queryKey: ['get-candidates'] })
    },
  })
}

export function useAddApprovedCreator() {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['add-approved-creator', { programId: program.programId.toString() }],
    mutationFn: async (input: { creatorWallet: PublicKey; superAdmin: PublicKey }) => {
      return await program.methods
        .addApprovedCreator(input.creatorWallet)
        .accounts({
          superAdmin: input.superAdmin,
          creatorWallet: input.creatorWallet,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      console.log('Creator approved on-chain:', signature)
      client.invalidateQueries({ queryKey: ['get-approved-creators'] })
      client.invalidateQueries({ queryKey: ['wallet-role'] })
    },
  })
}

export function useCastVote({ pollId }: { pollId: number }) {
  const { program } = useVotingProgram()
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['cast-vote', { programId: program.programId.toString(), pollId }],
    mutationFn: async (input: { candidateName: string; signer: PublicKey }) => {
      const pollIdBN = new BN(pollId)
      const [pollPda] = PublicKey.findProgramAddressSync([pollIdBN.toArrayLike(Buffer, 'le', 8)], program.programId)
      const [candidatePda] = PublicKey.findProgramAddressSync(
        [pollIdBN.toArrayLike(Buffer, 'le', 8), Buffer.from(input.candidateName)],
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
          poll: pollPda,
          candidate: candidatePda,
          voteRecord: voteRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      console.log('Vote cast successfully!', signature)
      client.invalidateQueries({ queryKey: ['get-polls'] })
      client.invalidateQueries({ queryKey: ['get-candidates', { pollId }] })
    },
    onError: (error) => {
      console.error('Voting failed:', error)
    },
  })
}

export function useWalletRole({ address }: { address: PublicKey }) {
  const { program, programId } = useVotingProgram()

  const { connection } = useConnection()

  return useQuery({
    enabled: !!address,
    queryKey: ['wallet-role', address?.toString()],
    queryFn: async (): Promise<Role> => {
      if (!address) return 'voter'

      const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], program.programId)

      try {
        const config = await program.account.config.fetch(configPda)

        if (config.admin.toString() === address.toString()) {
          return 'superadmin'
        }
      } catch {}

      const [approvedCreatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('approved_creator'), address.toBuffer()],
        program.programId,
      )

      const approvedCreator = await connection.getAccountInfo(approvedCreatorPda)

      if (approvedCreator) {
        return 'admin'
      }

      return 'voter'
    },
    refetchInterval: 2000,
    staleTime: 0,
  })
}

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
        if (now < start) {
          status = 'upcoming'
        } else if (now > end) {
          status = 'ended'
        }

        return {
          id: account.pollId.toNumber(),
          title: `Poll #${account.pollId.toString()}`,
          description: account.description,
          start,
          end,
          candidateAmount: account.candidateAmount.toNumber(),
          authority: account.authority.toString(),
          status,
          candidates: [],
        }
      })
    },
    refetchInterval: 2000,
    staleTime: 0,
  })
}

export function useGetApprovedCreators() {
  const { program } = useVotingProgram()

  return useQuery({
    queryKey: ['get-approved-creators', { programId: program.programId.toString() }],
    queryFn: async (): Promise<ApprovedCreator[]> => {
      const creators = await program.account.approvedCreator.all()

      return creators.map((c) => {
        const account = c.account

        return {
          wallet: account.creator.toString(),
          addedBy: account.addedBy.toString(),
          addedAt: account.addedAt ? new Date(account.addedAt.toNumber() * 1000).toISOString().split('T')[0] : 'N/A',
        }
      })
    },
  })
}

export function useGetCandidates({ pollId }: { pollId: number }) {
  const { program } = useVotingProgram()
  return useQuery({
    queryKey: ['get-candidates', { programId: program.programId.toString(), pollId }],
    queryFn: async (): Promise<Candidate[]> => {
      const pollIdBN = new BN(pollId)
      const [pollPda] = PublicKey.findProgramAddressSync([pollIdBN.toArrayLike(Buffer, 'le', 8)], program.programId)
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
    refetchInterval: 2000,
    staleTime: 0,
  })
}
