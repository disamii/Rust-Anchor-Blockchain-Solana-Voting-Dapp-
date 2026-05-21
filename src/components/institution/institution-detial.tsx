'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { PublicKey } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'

import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  Wallet,
  User,
  Pencil,
  Ban,
  Replace,
  Vote,
} from 'lucide-react'

import {
  useApproveInstitution,
  useGetInstitutions,
  useReplaceInstitutionAdmin,
} from '@/components/institution/institution-data-access'

import { useWalletRole } from '@/components/account/account-data-access'

// import your update modal here
// import UpdateInstitutionModal from './update-modal'

export default function InstitutionDetailPage() {
  const params = useParams()

  const institutionId = Number(params.id)

  const { publicKey } = useWallet()

  const { data: institutions = [] } =
    useGetInstitutions()

  const institution = useMemo(
    () =>
      institutions.find(
        (i) => i.institutionId === institutionId,
      ),
    [institutions, institutionId],
  )

  const roleQuery = useWalletRole({
    address: publicKey!,
  })

  const role = roleQuery.data

  const approveMutation = useApproveInstitution()

  const replaceAdminMutation =
    useReplaceInstitutionAdmin()

  if (!institution) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        Institution not found.
      </div>
    )
  }

  const isSuperAdmin = role === 'superadmin'

  const isInstitutionAdmin =
    role === 'institution_admin' &&
    publicKey?.toString() === institution.admin

  return (
    <div className="mx-auto px-6 py-10 space-y-8">

      {/* HEADER */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-white dark:bg-slate-900">

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

          {/* LEFT */}
          <div className="space-y-5">

            <div className="flex items-center gap-3">

              <div className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-violet-600" />
              </div>

              <div>
                <h1 className="text-3xl font-bold">
                  {institution.name}
                </h1>

                <p className="text-slate-500 mt-1">
                  Institution #{institution.institutionId}
                </p>
              </div>
            </div>

            {/* STATUS */}
            <div className="flex flex-wrap gap-3">

              {institution.isApproved ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                  <Clock3 className="h-4 w-4" />
                  Pending Approval
                </div>
              )}

              {institution.isActive && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Active
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3">

            {/* SUPER ADMIN ACTIONS */}
            {isSuperAdmin && (
              <>
                {!institution.isApproved && (
                  <button
                    onClick={() =>
                      approveMutation.mutate({
                        institutionId:
                          institution.institutionId,
                        superAdmin: publicKey!,
                      })
                    }
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Approve Institution
                  </button>
                )}

                <button
                  onClick={() => {
                    const newWallet = prompt(
                      'Enter new admin wallet',
                    )

                    if (!newWallet) return

                    replaceAdminMutation.mutate({
                      institutionId:
                        institution.institutionId,

                      superAdmin: publicKey!,

                      newAdminWallet:
                        new PublicKey(newWallet),
                    })
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <Replace className="h-5 w-5" />
                  Replace Admin
                </button>

                <button className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                  <Ban className="h-5 w-5" />
                  Disable Institution
                </button>
              </>
            )}

            {/* INSTITUTION ADMIN ACTIONS */}
            {isInstitutionAdmin && (
              <>
                <button
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <Pencil className="h-5 w-5" />
                  Edit Institution
                </button>

                <Link
                  href="/polls"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Vote className="h-5 w-5" />
                  Manage Polls
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-slate-900">

          <h2 className="text-xl font-semibold mb-6">
            Institution Details
          </h2>

          <div className="space-y-5">

            <div>
              <p className="text-sm text-slate-500 mb-1">
                Institution Name
              </p>

              <p className="font-medium">
                {institution.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">
                Description
              </p>

              <p className="font-mono text-sm break-all">
                {institution.policy}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">
                Created At
              </p>

              <p>{institution.createdAt}</p>
            </div>
          </div>
        </div>

        {/* ADMIN */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-slate-900">

          <h2 className="text-xl font-semibold mb-6">
            Administration
          </h2>

          <div className="space-y-5">

            <div>
              <p className="text-sm text-slate-500 mb-1">
                Institution Admin
              </p>

              <div className="flex items-start gap-3">

                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>

                <p className="font-mono text-sm break-all">
                  {institution.admin}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">
                Approved By
              </p>

              <p className="font-mono text-sm break-all">
                {institution.approvedBy}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">
                Approval Date
              </p>

              <p>
                {institution.approvedAt || 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}