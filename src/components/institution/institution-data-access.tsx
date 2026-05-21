'use client'

import { PublicKey } from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BN } from '@coral-xyz/anchor'

import { Institution, Admin } from '../interface'
import { useVotingProgram } from '../poll/poll-data-access'

// -----------------------------------------------------
// PDA
// -----------------------------------------------------

export function deriveInstitutionPda(
  institutionId: number,
  programId: PublicKey,
): PublicKey {
  const idBN = new BN(institutionId)

  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('institution'), idBN.toArrayLike(Buffer, 'le', 8)],
    programId,
  )

  return pda
}

export function deriveAdminPda(
  adminWallet: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('admin'), adminWallet.toBuffer()],
    programId,
  )

  return pda
}

// -----------------------------------------------------
// CREATE INSTITUTION
// creates:
// - admin PDA
// - institution PDA
// starts pending approval
// -----------------------------------------------------

export function useInitializeInstitution() {
  const { program } = useVotingProgram()

  const client = useQueryClient()

  return useMutation({
    mutationKey: ['initialize-institution'],

    mutationFn: async (input: {
      institutionId: number
      name: string
      treasury: PublicKey
      signer: PublicKey
      adminWallet: PublicKey
    }) => {
      const idBN = new BN(input.institutionId)

      return await program.methods
        .initializeInstitution(
          idBN,
          input.name,
          input.treasury,
        )
        .accounts({
          signer: input.signer,
          adminWallet: input.adminWallet,
        })
        .rpc()
    },

    onSuccess: (sig) => {
      console.log('Institution created:', sig)

      client.invalidateQueries({
        queryKey: ['get-institutions'],
      })

      client.invalidateQueries({
        queryKey: ['get-admins'],
      })
    },
  })
}

// -----------------------------------------------------
// APPROVE INSTITUTION
// super admin only
// -----------------------------------------------------

export function useApproveInstitution() {
  const { program } = useVotingProgram()

  const client = useQueryClient()

  return useMutation({
    mutationKey: ['approve-institution'],

    mutationFn: async (input: {
      institutionId: number
      superAdmin: PublicKey
    }) => {
      const idBN = new BN(input.institutionId)

      return await program.methods
        .approveInstitution(idBN)
        .accounts({
          superAdmin: input.superAdmin,
        })
        .rpc()
    },

    onSuccess: (sig) => {
      console.log('Institution approved:', sig)

      client.invalidateQueries({
        queryKey: ['get-institutions'],
      })
    },
  })
}

// -----------------------------------------------------
// REPLACE INSTITUTION ADMIN
// super admin only
// -----------------------------------------------------

export function useReplaceInstitutionAdmin() {
  const { program } = useVotingProgram()

  const client = useQueryClient()

  return useMutation({
    mutationKey: ['replace-institution-admin'],

    mutationFn: async (input: {
      institutionId: number
      superAdmin: PublicKey
      newAdminWallet: PublicKey
    }) => {
      const idBN = new BN(input.institutionId)

      return await program.methods
        .replaceInstitutionAdmin(idBN)
        .accounts({
          superAdmin: input.superAdmin,
          newAdminWallet: input.newAdminWallet,
        })
        .rpc()
    },

    onSuccess: (sig) => {
      console.log('Institution admin replaced:', sig)

      client.invalidateQueries({
        queryKey: ['get-institutions'],
      })

      client.invalidateQueries({
        queryKey: ['get-admins'],
      })
    },
  })
}

// -----------------------------------------------------
// UPDATE INSTITUTION
// institution admin only
// -----------------------------------------------------

export function useUpdateInstitution() {
  const { program } = useVotingProgram()

  const client = useQueryClient()

  return useMutation({
    mutationKey: ['update-institution'],

    mutationFn: async (input: {
      institutionId: number
      signer: PublicKey
      newName: string
      newTreasury: PublicKey
    }) => {
      const idBN = new BN(input.institutionId)

      return await program.methods
        .updateInstitution(
          idBN,
          input.newName,
          input.newTreasury,
        )
        .accounts({
          signer: input.signer,
        })
        .rpc()
    },

    onSuccess: (sig) => {
      console.log('Institution updated:', sig)

      client.invalidateQueries({
        queryKey: ['get-institutions'],
      })

      client.invalidateQueries({
        queryKey: ['get-my-institution'],
      })
    },
  })
}

// -----------------------------------------------------
// GET ALL ADMINS
// -----------------------------------------------------

export function useGetAdmins() {
  const { program } = useVotingProgram()

  return useQuery({
    queryKey: ['get-admins'],

    queryFn: async (): Promise<Admin[]> => {
      const admins = await program.account.admin.all()

      return admins.map((a) => ({
        wallet: a.account.creator.toString(),

        addedBy: a.account.addedBy.toString(),

        addedAt: new Date(
          a.account.addedAt.toNumber() * 1000,
        )
          .toISOString()
          .split('T')[0],
      }))
    },
  })
}

// -----------------------------------------------------
// GET ALL INSTITUTIONS
// -----------------------------------------------------

export function useGetInstitutions() {
  const { program } = useVotingProgram()

  return useQuery({
    queryKey: ['get-institutions'],

    queryFn: async (): Promise<Institution[]> => {
      const institutions =
        await program.account.institution.all()

      return institutions.map((i) => {
        const acc = i.account

        return {
          publicKey: i.publicKey.toString(),

          institutionId: acc.institutionId.toNumber(),

          name: acc.name,

          admin: acc.admin.toString(),

          treasury: acc.treasury.toString(),

          createdAt: new Date(
            acc.createdAt.toNumber() * 1000,
          )
            .toISOString()
            .split('T')[0],

          isActive: acc.isActive,

          isApproved: acc.isApproved,

          approvedBy: acc.approvedBy.toString(),

          approvedAt:
            acc.approvedAt.toNumber() === 0
              ? null
              : new Date(
                  acc.approvedAt.toNumber() * 1000,
                )
                  .toISOString()
                  .split('T')[0],
        }
      })
    },

    refetchInterval: 5000,

    staleTime: 0,
  })
}

// -----------------------------------------------------
// GET MY INSTITUTION
// -----------------------------------------------------

export function useGetMyInstitutions({ adminWallet }: { adminWallet: PublicKey | null }) {
  const { program } = useVotingProgram()

  return useQuery({
    enabled: !!adminWallet,

    queryKey: ['my-institutions', adminWallet?.toString()],

    queryFn: async (): Promise<Institution[]> => {
      if (!adminWallet) return []

      const institutions = await program.account.institution.all()

      return institutions
        .filter((i) => i.account.admin.toString() === adminWallet.toString())
        .map((i) => {
          const acc = i.account

          return {
            publicKey: i.publicKey.toString(),
            institutionId: acc.institutionId.toNumber(),
            name: acc.name,
            admin: acc.admin.toString(),
            treasury: acc.treasury.toString(),
            createdAt: new Date(acc.createdAt.toNumber() * 1000).toISOString(),
            isActive: acc.isActive,
            isApproved: acc.isApproved,
            approvedBy: acc.approvedBy.toString(),
            approvedAt:
              acc.approvedAt.toNumber() === 0
                ? null
                : new Date(acc.approvedAt.toNumber() * 1000).toISOString(),
          }
        })
    },
  })
}