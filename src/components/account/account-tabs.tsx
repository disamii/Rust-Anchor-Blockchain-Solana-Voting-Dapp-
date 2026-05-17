'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { AccountTransactions } from './account-ui'

import {
  ShieldCheck,
  Users,
  ClipboardList,
  History,
  Vote,
  UserPlus,
  UserX,
  AlertTriangle,
  X,
} from 'lucide-react'
import {
  useGetApprovedCreators,
  useWalletRole,
  useAddApprovedCreator,
  useRemoveApprovedCreator,   // ← NEW hook (add to account-data-access)
} from './account-data-access'
import { useWallet } from '@solana/wallet-adapter-react'

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface AddCreatorModalProps {
  isOpen: boolean
  onClose: () => void
}

// What we need to confirm before revoking
// Keeping it as a type makes the confirm dialog self-contained
interface RevokeTarget {
  wallet: string    // the creator wallet address to revoke
  addedAt: string   // shown in the confirm dialog so admin knows which one
}

type TabDef = {
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

/* ─────────────────────────────────────────────
   REVOKE CONFIRM DIALOG
   
   CONCEPT: We don't revoke on a single click because it's
   a destructive on-chain action — it closes the ApprovedCreator
   PDA permanently. The dialog forces intentional confirmation.
   
   Pattern: parent holds `revokeTarget` state (null = closed).
   Clicking Revoke on a row sets revokeTarget → dialog opens.
   Cancel sets it back to null. Confirm calls the mutation.
───────────────────────────────────────────── */
interface RevokeConfirmDialogProps {
  target: RevokeTarget
  onCancel: () => void
  onConfirmed: () => void   // called after successful tx so parent can reset state
}

function RevokeConfirmDialog({ target, onCancel, onConfirmed }: RevokeConfirmDialogProps) {
  const { publicKey } = useWallet()
  const mutation = useRemoveApprovedCreator()
  const [errorMsg, setErrorMsg] = useState('')

  const handleConfirm = () => {
    if (!publicKey) { setErrorMsg('Wallet not connected.'); return }
    setErrorMsg('')

    mutation.mutate(
      {
        creatorWallet: new PublicKey(target.wallet),
        superAdmin: publicKey,
      },
      {
        onSuccess: () => {
          onConfirmed()   // parent closes dialog + clears revokeTarget
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Transaction failed. Are you the Super Admin?')
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Revoke Creator Access
          </h3>
          <button
            onClick={onCancel}
            disabled={mutation.isPending}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Warning banner — makes the weight of this action clear */}
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-xs text-red-700 dark:text-red-300 leading-relaxed">
            <strong>This is permanent.</strong> Revoking closes the{' '}
            <code className="bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded">ApprovedCreator</code> PDA
            on-chain. This wallet will immediately lose the ability to create new polls.
            Their existing polls are unaffected.
          </div>

          {/* Show the wallet being revoked so admin can double-check */}
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Wallet to revoke</p>
            <p className="font-mono text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl break-all">
              {target.wallet}
            </p>
            <p className="text-xs text-slate-400">Approved on {target.addedAt}</p>
          </div>

          {errorMsg && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={onCancel}
              disabled={mutation.isPending}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              {mutation.isPending ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Revoking...</>
              ) : (
                <><UserX className="h-4 w-4" />Yes, Revoke Access</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ADMINS TAB
   
   CHANGES from original:
   - Holds `revokeTarget` state (null = no dialog open)
   - Revoke button sets revokeTarget → opens RevokeConfirmDialog
   - Dialog calls mutation; on success clears revokeTarget
   - React Query cache invalidation in useRemoveApprovedCreator
     means the list auto-refreshes after revoke
───────────────────────────────────────────── */
function AdminsTab() {
  const { data: creators = [], isLoading } = useGetApprovedCreators()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // null = dialog closed; set to a RevokeTarget object to open the dialog
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-base text-slate-500 leading-relaxed">
          Wallets with an{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">ApprovedCreator</code> PDA can
          create polls.
        </p>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 text-base px-5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Add creator
        </button>
      </div>

      <div className="space-y-4">
        {creators.length === 0 ? (
          <div className="text-center text-slate-500 py-12">No approved creators found on-chain.</div>
        ) : (
          creators.map((c) => (
            <div
              key={c.wallet}
              className="flex items-center gap-4 px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-base font-mono font-medium truncate" title={c.wallet}>
                  {c.wallet.slice(0, 4)}...{c.wallet.slice(-4)}
                </p>
                <p className="text-sm text-slate-500 mt-1">Approved on {c.addedAt} by administrative action</p>
              </div>

              {/* 
                Revoke button — sets revokeTarget to open the confirm dialog.
                We pass the full wallet + addedAt so the dialog can display them.
                The actual mutation happens inside the dialog, not here.
              */}
              <button
                onClick={() => setRevokeTarget({ wallet: c.wallet, addedAt: c.addedAt })}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <UserX className="h-4 w-4" />
                Revoke
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add creator modal */}
      <AddCreatorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Revoke confirm dialog — only mounts when a target is selected */}
      {revokeTarget && (
        <RevokeConfirmDialog
          target={revokeTarget}
          onCancel={() => setRevokeTarget(null)}
          onConfirmed={() => setRevokeTarget(null)}  // close dialog after success
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ADD CREATOR MODAL — unchanged from original
───────────────────────────────────────────── */
interface AddCreatorModalProps {
  isOpen: boolean
  onClose: () => void
}

function AddCreatorModal({ isOpen, onClose }: AddCreatorModalProps) {
  const { publicKey } = useWallet()
  const mutation = useAddApprovedCreator()
  const [walletInput, setWalletInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!publicKey) {
      setErrorMsg('Please connect your wallet first.')
      return
    }

    try {
      const creatorPublicKey = new PublicKey(walletInput.trim())
      mutation.mutate(
        { creatorWallet: creatorPublicKey, superAdmin: publicKey },
        {
          onSuccess: () => { setWalletInput(''); onClose() },
          onError: (err: any) => setErrorMsg(err?.message || 'Transaction failed. Are you the Super Admin?'),
        },
      )
    } catch {
      setErrorMsg('Invalid Solana wallet address format.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-600" />
            Approve New Creator
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Creator Wallet Address
            </label>
            <input
              type="text" required
              placeholder="e.g. GpUMEq99J518SMjgRMm..."
              value={walletInput} onChange={(e) => setWalletInput(e.target.value)}
              disabled={mutation.isPending}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
            />
          </div>

          {errorMsg && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={mutation.isPending}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-400 rounded-xl flex items-center gap-2 shadow-sm transition-colors">
              {mutation.isPending
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Approving...</>
                : 'Approve Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState(0)

  const tabs: TabDef[] = useMemo(() => {
    if (role === 'superadmin')
      return [
        { label: 'Creators', icon: <Users className="h-5 w-5" />, content: <AdminsTab /> },
        { label: 'Transactions', icon: <History className="h-5 w-5" />, content: <TransactionsTab address={address} /> },
      ]

    if (role === 'admin')
      return [
        { label: 'Transactions', icon: <History className="h-5 w-5" />, content: <TransactionsTab address={address} /> },
      ]

    return [
      { label: 'Transactions', icon: <History className="h-5 w-5" />, content: <TransactionsTab address={address} /> },
    ]
  }, [role, address])

  const roleMeta = {
    superadmin: {
      label: 'Super Admin',
      className: 'text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    admin: {
      label: 'Poll Creator',
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
        <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full ${roleMeta.className}`}>
          {roleMeta.icon}
          {roleMeta.label}
        </span>
        <span className="text-sm text-slate-400">
          {role === 'superadmin' && 'Wallet stored in Config PDA · full control'}
          {role === 'admin' && 'ApprovedCreator PDA exists for this wallet'}
          {role === 'voter' && 'Vote once per poll · enforced by VoteRecord PDA'}
        </span>
      </div>

      <div className="flex w-full p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-8">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${activeTab === i
                ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div>{tabs[activeTab]?.content}</div>
    </div>
  )
}