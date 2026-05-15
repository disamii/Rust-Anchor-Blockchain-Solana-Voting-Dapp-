'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import {  AccountTransactions } from './account-ui'
import {
  IdCard as IdentificationIcon,
  ShieldCheck,
  Users,
  ClipboardList,
  History,
  Vote,
  ChevronDown,
  Clock,
  PlusCircle,
  UserPlus,
  UserX,
  CheckCircle2,
  Timer,
  XCircle,
} from 'lucide-react'
import { Role, Poll, ApprovedCreator } from '../interface'
import { useWalletRole } from './account-data-access'

// ─────────────────────────────────────────────
// CONCEPT: Role Detection
//
// In production you would:
//   1. const { publicKey } = useWallet()
//   2. Derive Config PDA: PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)
//   3. Fetch it → compare config.admin === publicKey → SUPER_ADMIN
//   4. Derive ApprovedCreator PDA: findProgramAddressSync([Buffer.from("approved_creator"), publicKey.toBytes()], PROGRAM_ID)
//   5. Try to fetch it → if it exists → ADMIN (poll creator)
//   6. Otherwise → VOTER
//
// For now we hardcode 3 wallets. Swap `deriveRole` with real RPC calls later.
// ─────────────────────────────────────────────


const HARDCODED_ROLES: Record<string, Role> = {
  '9xK2mQ7RExampleSuperAdminWalletAddressHere111': 'superadmin',
  '3pL8nW4TExampleAdminWalletAddressHere22222222': 'admin',
}

function deriveRole(address: PublicKey): Role {
  return HARDCODED_ROLES[address.toString()] ?? 'admin'
}

// ─────────────────────────────────────────────
// MOCK DATA — replace with real Anchor fetches
// ─────────────────────────────────────────────


const MOCK_POLLS: Poll[] = [
  {
    id: 1,
    title: 'Protocol Upgrade v2.1',
    description: 'Should we upgrade the protocol to support batch transactions?',
    start: Date.now() - 86_400_000,
    end: Date.now() + 172_800_000,
    candidates: [
      { name: 'Yes', votes: 142 },
      { name: 'No', votes: 73 },
      { name: 'Abstain', votes: 21 },
    ],
    status: 'active',
  },
  {
    id: 2,
    title: 'Treasury Allocation Q3',
    description: 'Allocate 10% of treasury to developer grants this quarter.',
    start: Date.now() + 86_400_000,
    end: Date.now() + 604_800_000,
    candidates: [
      { name: 'Approve', votes: 0 },
      { name: 'Reject', votes: 0 },
    ],
    status: 'upcoming',
  },
  {
    id: 3,
    title: 'Fee Structure Change',
    description: 'Reduce base fees from 0.5% to 0.3% across all transactions.',
    start: Date.now() - 604_800_000,
    end: Date.now() - 86_400_000,
    candidates: [
      { name: 'Yes', votes: 312 },
      { name: 'No', votes: 88 },
    ],
    status: 'ended',
  },
]

const MOCK_CREATORS: ApprovedCreator[] = [
  { wallet: '3pL8...nW4T', addedAt: '2025-03-10', polls: 2 },
  { wallet: 'Hv7J...kP2M', addedAt: '2025-04-01', polls: 1 },
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatCountdown(endMs: number): string {
  const diff = endMs - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h ${mins}m remaining`
}

function pollProgress(poll: Poll): number {
  const total = poll.end - poll.start
  const elapsed = Date.now() - poll.start
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: Poll['status'] }) {
  const map = {
    active: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'Live',
      className: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300',
    },
    upcoming: {
      icon: <Timer className="h-3 w-3" />,
      label: 'Upcoming',
      className: 'text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300',
    },
    ended: {
      icon: <XCircle className="h-3 w-3" />,
      label: 'Ended',
      className: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
    },
  }
  const { icon, label, className } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {icon}
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────
// POLL CARD — collapsible with countdown

function PollCard({ poll, canVote }: { poll: Poll; canVote: boolean }) {
  const [open, setOpen] = useState(false)
  const totalVotes = poll.candidates.reduce((a, c) => a + c.votes, 0)

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-base">{poll.title}</span>
            <StatusBadge status={poll.status} />
          </div>

          <p className="text-sm text-slate-500 mt-1.5">
            {poll.candidates.length} candidates · {totalVotes} votes
          </p>
        </div>

        <ChevronDown
          className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <p className="text-base text-slate-600 dark:text-slate-400 mt-5 mb-5 leading-relaxed">{poll.description}</p>

          <div className="grid grid-cols-2 gap-5 mb-5 text-sm">
            <div>
              <span className="text-slate-400 block mb-1">Poll ID (PDA seed)</span>

              <span className="font-mono font-medium break-all">{poll.id}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Ends</span>

              <span className="font-medium">{new Date(poll.end).toLocaleDateString()}</span>
            </div>
          </div>

          {poll.status === 'active' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300 mb-2">
                <Clock className="h-4 w-4" />
                {formatCountdown(poll.end)}
              </div>

              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${pollProgress(poll)}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {poll.candidates.map((c) => {
              const pct = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0

              return (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="text-sm w-28 flex-shrink-0 font-medium">{c.name}</span>

                  <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  <span className="text-sm text-slate-500 w-12 text-right font-medium">{c.votes}</span>

                  {canVote && poll.status === 'active' && (
                    <button className="text-sm px-4 py-2 rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors flex-shrink-0">
                      Vote
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
            <ExplorerLink
              path={`account/${poll.id}`}
              label="View Poll PDA on Explorer →"
              className="text-sm text-slate-400 hover:text-blue-500 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────
// TAB: Admins (super-admin only)
// ─────────────────────────────────────────────
function AdminsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-base text-slate-500 leading-relaxed">
          Wallets with an{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">ApprovedCreator</code> PDA can
          create polls.
        </p>

        <button className="flex items-center gap-2 text-base px-5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
          <UserPlus className="h-5 w-5" />
          Add creator
        </button>
      </div>

      <div className="space-y-4">
        {MOCK_CREATORS.map((c) => (
          <div
            key={c.wallet}
            className="flex items-center gap-4 px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"
          >
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-mono font-medium truncate">{c.wallet}</p>
              <p className="text-sm text-slate-500 mt-1">
                Approved {c.addedAt} · {c.polls} poll{c.polls !== 1 ? 's' : ''}
              </p>
            </div>

            <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
              <UserX className="h-4 w-4" />
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PollsTab({ canVote, canCreate }: { canVote: boolean; canCreate: boolean }) {
  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="flex items-center justify-between">
          <p className="text-base text-slate-500 leading-relaxed">
            You have an{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">ApprovedCreator</code> PDA — you
            can create polls.
          </p>

          <button className="flex items-center gap-2 text-base px-5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            <PlusCircle className="h-5 w-5" />
            Create poll
          </button>
        </div>
      )}

      <div className="space-y-4">
        {MOCK_POLLS.map((p) => (
          <PollCard key={p.id} poll={p} canVote={canVote} />
        ))}
      </div>
    </div>
  )
}

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

function VoteTab() {
  const active = MOCK_POLLS.filter((p) => p.status === 'active')
  const other = MOCK_POLLS.filter((p) => p.status !== 'active')

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {active.length === 0 ? (
          <p className="text-base text-slate-400 py-8 text-center">No active polls right now.</p>
        ) : (
          active.map((p) => <PollCard key={p.id} poll={p} canVote={true} />)
        )}

        {other.map((p) => (
          <PollCard key={p.id} poll={p} canVote={false} />
        ))}
      </div>
    </div>
  )
}

type TabDef = {
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

export default function RoleDashboard({ address }: { address: PublicKey }) {
const { data: role = 'voter' } = useWalletRole({ address })
  const [activeTab, setActiveTab] = useState(0)

  const tabs: TabDef[] = useMemo(() => {
    if (role  === 'superadmin')
      return [
        {
          label: 'Creators',
          icon: <Users className="h-5 w-5" />,
          content: <AdminsTab />,
        },
        {
          label: 'Polls',
          icon: <ClipboardList className="h-5 w-5" />,
          content: <PollsTab canVote={false} canCreate={false} />,
        },
        {
          label: 'Transactions',
          icon: <History className="h-5 w-5" />,
          content: <TransactionsTab address={address} />,
        },
      ]

    if (role  === 'admin')
      return [
        {
          label: 'My Polls',
          icon: <ClipboardList className="h-5 w-5" />,
          content: <PollsTab canVote={true} canCreate={true} />,
        },
        {
          label: 'Transactions',
          icon: <History className="h-5 w-5" />,
          content: <TransactionsTab address={address} />,
        },
      ]

    return [
      {
        label: 'Vote',
        icon: <Vote className="h-5 w-5" />,
        content: <VoteTab />,
      },
      {
        label: 'Transactions',
        icon: <History className="h-5 w-5" />,
        content: <TransactionsTab address={address} />,
      },
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
  }[role ]

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
          {role  === 'superadmin' && 'Wallet stored in Config PDA · full control'}

          {role  === 'admin' && 'ApprovedCreator PDA exists for this wallet'}

          {role  === 'voter' && 'Vote once per poll · enforced by VoteRecord PDA'}
        </span>
      </div>

      <div className="flex w-full p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-8">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
        ${
          activeTab === i
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
