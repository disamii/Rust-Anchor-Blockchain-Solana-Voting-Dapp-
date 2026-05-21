'use client'

import { PublicKey } from '@solana/web3.js'
import { ExplorerLink } from '../cluster/cluster-ui'
import { AccountTransactions } from './account-ui'
import { ShieldCheck, ClipboardList, Vote } from 'lucide-react'
import { useWalletRole } from './account-data-access'
/* ─────────────────────────────────────────────
   TRANSACTIONS TAB — unchanged
───────────────────────────────────────────── */
function TransactionsTab({ address }: { address: PublicKey }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-5">
        <p className="text-base leading-8 text-slate-600 dark:text-slate-300">
          Every vote, poll creation, and approval is permanently recorded on Solana. Your{' '}
          <code className="mx-1 rounded-md bg-violet-100 dark:bg-violet-950 px-2 py-1 text-sm font-semibold text-violet-700 dark:text-violet-300">
            VoteRecord
          </code>
          PDA acts as on-chain proof that you voted — without exposing which candidate you selected.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <AccountTransactions address={address} />
      </div>

      <div className="text-center pt-4">
        <ExplorerLink
          path={`account/${address}`}
          label="View full ledger record →"
          className="text-sm text-slate-400 hover:text-blue-500 transition-colors"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN EXPORT — unchanged
───────────────────────────────────────────── */
export default function RoleDashboard({ address }: { address: PublicKey }) {
  const { data: role = 'voter' } = useWalletRole({ address })

  const roleMeta = {
    superadmin: {
      label: 'Super Admin',
      className: 'text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    institution_admin: {
      label: 'Institution Admin',
      className: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300',
      icon: <ClipboardList className="h-4 w-4" />,
    },
    voter: {
      label: 'Voter',
      className: 'text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300',
      icon: <Vote className="h-4 w-4" />,
    },
  }[role]

  return (
    <div className="max-w-5xl mx-auto px-8 py-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <span
          className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full ${roleMeta.className}`}
        >
          {roleMeta.icon}
          {roleMeta.label}
        </span>

        <span className="text-sm text-slate-400">
          {role === 'superadmin' && 'Wallet stored in Config PDA · full control'}
          {role === 'institution_admin' && 'Admin PDA exists for this wallet'}
          {role === 'voter' && 'Vote once per poll · enforced by VoteRecord PDA'}
        </span>
      </div>

      <TransactionsTab address={address} />
    </div>
  )
}
