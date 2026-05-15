'use client'

import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
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
import { Program } from '@coral-xyz/anchor'
import { ApprovedCreator, Poll, Role } from '../interface'
import { useVotingProgram } from '../voting/voting-data-access'

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

  // Create instructions to send, in this case a simple transfer
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL,
    }),
  ]

  // Create a new TransactionMessage with version and compile it to legacy
  const messageLegacy = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToLegacyMessage()

  // Create a new VersionedTransaction which supports legacy and v0
  const transaction = new VersionedTransaction(messageLegacy)

  return {
    transaction,
    latestBlockhash,
  }
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
      } catch {
        // config not initialized yet
      }

      // =====================================
      // 2. Check if approved creator exists
      // =====================================

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
          // Correct field names from your IDL schema:
          wallet: account.creator.toString(),
          addedBy: account.addedBy.toString(),
          addedAt: account.addedAt ? new Date(account.addedAt.toNumber() * 1000).toISOString().split('T')[0] : 'N/A',
        }
      })
    },
  })
}

// export function useGetTokenAccounts({ address }: { address: PublicKey }) {
//   const { connection } = useConnection()

//   return useQuery({
//     queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address }],
//     queryFn: async () => {
//       const [tokenAccounts, token2022Accounts] = await Promise.all([
//         connection.getParsedTokenAccountsByOwner(address, {
//           programId: TOKEN_PROGRAM_ID,
//         }),
//         connection.getParsedTokenAccountsByOwner(address, {
//           programId: TOKEN_2022_PROGRAM_ID,
//         }),
//       ])
//       return [...tokenAccounts.value, ...token2022Accounts.value]
//     },
//   })
// }
