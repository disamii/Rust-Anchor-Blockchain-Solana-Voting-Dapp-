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
import { Admin, Candidate, Poll, Role, Institution } from '../interface'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useVotingProgram } from '../poll/poll-data-access'

// ─────────────────────────────────────────────
// UNCHANGED HELPERS (kept exactly as-is)
// ─────────────────────────────────────────────

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
  return { transaction: new VersionedTransaction(messageLegacy), latestBlockhash }
}

// ─────────────────────────────────────────────
// UNCHANGED READ HOOKS
// ─────────────────────────────────────────────

export function useGetTokenAccounts({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address }],
    queryFn: async () => {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(address, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(address, { programId: TOKEN_2022_PROGRAM_ID }),
      ])
      return [...tokenAccounts.value, ...token2022Accounts.value]
    },
  })
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
        signature = await wallet.sendTransaction(transaction, connection)
        await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
        return signature
      } catch (error: unknown) {
        console.log('error', `Transaction failed! ${error}`, signature)
      }
    },
    onSuccess: async (signature) => {
      if (signature) console.log('Transaction sent', signature)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }] }),
        client.invalidateQueries({ queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }] }),
      ])
    },
    onError: (error) => console.error(`Transaction failed! ${error}`),
  })
}

export function useRequestAirdrop({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
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
      console.log('Airdrop sent', signature)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }] }),
        client.invalidateQueries({ queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }] }),
      ])
    },
  })
}

export function useWalletRole({ address }: { address: PublicKey }) {
  const { program } = useVotingProgram()

  return useQuery({
    enabled: !!address,
    queryKey: ['wallet-role', address?.toString()],
    queryFn: async (): Promise<Role> => {
      if (!address) return 'voter'

      // SUPER ADMIN
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId,
      )

      try {
        const config = await program.account.config.fetch(configPda)

        if (config.admin.toString() === address.toString()) {
          return 'superadmin'
        }
      } catch {}

      // INSTITUTION ADMIN
      const institutions = await program.account.institution.all()

      const mine = institutions.find(
        (i) =>
          i.account.admin.toString() === address.toString() &&
          i.account.isApproved,
      )

      if (mine) {
        return 'institution_admin'
      }

      return 'voter'
    },

    refetchInterval: 3000,
    staleTime: 0,
  })
}