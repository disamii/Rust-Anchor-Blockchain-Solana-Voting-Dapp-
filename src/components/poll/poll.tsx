'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart2,
  CheckCircle2,
  Timer,
  XCircle,
  PlusCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Search,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Poll } from '@/components/interface'
import { useGetCandidates, useInitializePoll, useGetPolls, useGetRegisteredVoters } from './poll-data-access'
import { useGetMyInstitutions } from '../institution/institution-data-access'

// ─────────────────────────────────────────────────────────────
// CONCEPT: StatusBadge is a "pure" presentational component.
// It takes data (status) and renders UI — no side effects,
// no blockchain calls. This is a good pattern to follow.
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Poll['status'] }) {
  const map = {
    active: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'Live',
      className:
        'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800',
    },
    upcoming: {
      icon: <Timer className="h-3 w-3" />,
      label: 'Upcoming',
      className:
        'text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800',
    },
    ended: {
      icon: <XCircle className="h-3 w-3" />,
      label: 'Ended',
      className:
        'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700',
    },
  }
  const { icon, label, className } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}>
      {icon}
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// CONCEPT: Custom Hook — "usePollRegistrationStatus"
//
// In React + Web3, we often wrap on-chain data fetching into
// custom hooks. This hook:
//   1. Calls useGetRegisteredVoters → fetches the PDA accounts
//      that store voter registrations for this specific poll
//   2. Checks if the connected wallet (publicKey) is in that list
//
// WHY HOOK? Because multiple components need this same logic
// (the pill UI, AND now the filter). Hooks let us reuse it
// without duplicating blockchain calls.
// ─────────────────────────────────────────────────────────────
function usePollRegistrationStatus({ pollId, institutionId }: { pollId: number; institutionId: number }) {
  const { publicKey } = useWallet()
  const { data: registeredVoters = [], isLoading } = useGetRegisteredVoters({ pollId, institutionId })

  // useMemo: only recompute when registeredVoters or publicKey changes
  // This avoids re-running .some() on every render (performance optimization)
  const isRegistered = useMemo(() => {
    if (!publicKey) return false
    return registeredVoters.some((v) => v.voter === publicKey.toString())
  }, [registeredVoters, publicKey])

  return { registeredVoters, isRegistered, isLoading }
}

// ─────────────────────────────────────────────────────────────
// VoterRegistrationPill — shows registration status in each row
// Uses the shared hook above
// ─────────────────────────────────────────────────────────────
function VoterRegistrationPill({
  pollId,
  institutionId,
  canCreate,
  canVote,
}: {
  pollId: number
  institutionId: number
  canCreate: boolean
  canVote: boolean
}) {
  const { publicKey } = useWallet()
  const { registeredVoters, isRegistered, isLoading } = usePollRegistrationStatus({ pollId, institutionId })

  if (isLoading) {
    return <span className="w-20 h-4 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse inline-block" />
  }

  if (canCreate) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <Users className="h-3.5 w-3.5" />
        {registeredVoters.length} registered
      </span>
    )
  }

  if (canVote && publicKey) {
    if (isRegistered) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <UserCheck className="h-3.5 w-3.5" />
          Registered
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400">
        <UserX className="h-3.5 w-3.5" />
        Not registered
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <Users className="h-3.5 w-3.5" />
      {registeredVoters.length} registered
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// CONCEPT: PollRow renders one poll entry
// It fetches candidates (on-chain accounts) to compute total votes
// ─────────────────────────────────────────────────────────────
function PollRow({
  poll,
  onClick,
  canCreate,
  canVote,
}: {
  poll: Poll
  onClick: () => void
  canCreate: boolean
  canVote: boolean
}) {
  const { data: candidates = [] } = useGetCandidates({ pollId: poll.id })
  const totalVotes = candidates.reduce((a, c) => a + c.votes, 0)

  const isActive = poll.status === 'active'
  const isUpcoming = poll.status === 'upcoming'
  const showRegistration = isActive || isUpcoming

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-center gap-5 px-6 py-5
                 bg-white dark:bg-slate-900
                 border border-slate-200 dark:border-slate-800
                 rounded-2xl
                 hover:border-violet-300 dark:hover:border-violet-700
                 hover:shadow-md hover:shadow-violet-500/5
                 transition-all duration-200"
    >
      <div
        className={`w-1 self-stretch rounded-full flex-shrink-0 transition-colors
          ${isActive ? 'bg-emerald-400' : isUpcoming ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-1.5">
          <span className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">{poll.title}</span>
          <StatusBadge status={poll.status} />
        </div>
        {poll.institution && (
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mb-1.5 inline-block">
            {poll.institution}
          </span>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{poll.description}</p>

        <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 flex-wrap">
          <span>{candidates.length} candidates</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>{totalVotes} votes cast</span>

          {showRegistration && (
            <>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
              <VoterRegistrationPill pollId={poll.id} institutionId={poll.institutionId} canCreate={canCreate} canVote={canVote} />
            </>
          )}

          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>
            {poll.status === 'upcoming'
              ? `Starts ${new Date(poll.start).toLocaleDateString()}`
              : `Ends ${new Date(poll.end).toLocaleDateString()}`}
          </span>
        </div>
      </div>

      <div
        className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                      bg-slate-100 dark:bg-slate-800
                      group-hover:bg-violet-600 group-hover:text-white
                      text-slate-400 transition-all duration-200"
      >
        <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// CREATE POLL MODAL
// ─────────────────────────────────────────────────────────────
function CreatePollModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { publicKey } = useWallet()
  const mutation = useInitializePoll()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const { data: institutions = [] } = useGetMyInstitutions({ adminWallet: publicKey })
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!publicKey) { setErrorMsg('Wallet connection required.'); return }
    if (!title.trim()) { setErrorMsg('Please provide a poll title.'); return }
    if (!selectedInstitutionId) { setErrorMsg('Please select an institution'); return }

    const startUnix = Math.floor(new Date(startDate).getTime() / 1000)
    const endUnix = Math.floor(new Date(endDate).getTime() / 1000)
    if (endUnix <= startUnix) { setErrorMsg('End time must be after start time.'); return }

    // CONCEPT: pollId is a random u64-compatible number used as a seed
    // for the PDA (Program Derived Address) on Solana. PDAs are
    // deterministic addresses derived from seeds + program ID.
    // No private key = safe to use as an on-chain account address.
    const randomPollId = Math.floor(Math.random() * 1_000_000)

    mutation.mutate(
      {
        pollId: randomPollId,
        institutionId: selectedInstitutionId,
        title: title.trim(),
        description: description.trim(),
        pollStart: startUnix,
        pollEnd: endUnix,
        signer: publicKey,
      },
      {
        onSuccess: () => {
          setTitle(''); setDescription(''); setStartDate(''); setEndDate('')
          onClose()
        },
        onError: (err: any) => setErrorMsg(err?.message || 'Transaction failed. Are you an Approved Creator?'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-violet-600" />
            Create New Poll
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Poll Title</label>
            <input
              type="text" required maxLength={50}
              placeholder="e.g., Q3 Budget Allocation"
              value={title} onChange={(e) => setTitle(e.target.value)}
              disabled={mutation.isPending}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Proposal / Description</label>
            <textarea
              required rows={3} maxLength={280}
              placeholder="What should the DAO vote on?"
              value={description} onChange={(e) => setDescription(e.target.value)}
              disabled={mutation.isPending}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-1">{description.length}/280</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Start Window', value: startDate, onChange: setStartDate },
              { label: 'End Window', value: endDate, onChange: setEndDate },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
                <input
                  type="datetime-local" required value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={mutation.isPending}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm outline-none"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Institution</label>
            <select
              required value={selectedInstitutionId ?? ''}
              onChange={(e) => setSelectedInstitutionId(Number(e.target.value))}
              disabled={mutation.isPending}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select institution</option>
              {institutions.map((inst) => (
                <option key={inst.publicKey} value={inst.institutionId}>{inst.name}</option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose} disabled={mutation.isPending}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-400 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              {mutation.isPending ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Broadcasting...</>
              ) : 'Initialize Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{count}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CONCEPT: PollWithRegistration — a helper component that
// checks registration for ONE poll and calls a callback.
//
// WHY THIS PATTERN?
// The registration filter needs to know "is the user registered
// in this poll?" for EVERY poll, to filter the list.
//
// Problem: hooks can't be called inside loops (React rules).
// Solution: render one component per poll, each calls the hook,
// and reports back to the parent via `onResult` callback.
//
// This is a common pattern when you need per-item async data
// to drive list-level filtering in React.
// ─────────────────────────────────────────────────────────────
function PollRegistrationChecker({
  poll,
  onResult,
}: {
  poll: Poll
  onResult: (pollId: number, isRegistered: boolean, isLoading: boolean) => void
}) {
  const { isRegistered, isLoading } = usePollRegistrationStatus({
    pollId: poll.id,
    institutionId: poll.institutionId,
  })

  // Report results up to parent on every render
  // useEffect would be cleaner but this works for our case
  onResult(poll.id, isRegistered, isLoading)

  return null // renders nothing — purely a data-fetching helper
}

/* ─────────────────────────────────────────────
   MAIN EXPORT: PollListPage
───────────────────────────────────────────── */
export function PollListPage({ canVote, canCreate }: { canVote: boolean; canCreate: boolean }) {
  const router = useRouter()
  const { publicKey } = useWallet()
  const { data: polls = [], isLoading } = useGetPolls()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  // NEW: status filter replaces institution filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all')
  const [registrationFilter, setRegistrationFilter] = useState<'all' | 'registered' | 'unregistered'>('all')

  // ─────────────────────────────────────────────────────────────
  // REGISTRATION STATE MAP
  //
  // We store { pollId → isRegistered } for every poll.
  // Each PollRegistrationChecker component fills this map
  // by calling onResult(). Then our filter logic reads from it.
  //
  // This is "lifting state up" — the child knows the data,
  // but the parent owns it so siblings (filter logic) can use it.
  // ─────────────────────────────────────────────────────────────
  const [registrationMap, setRegistrationMap] = useState<Record<number, boolean>>({})
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({})

  const handleRegistrationResult = (pollId: number, isRegistered: boolean, isLoading: boolean) => {
    setRegistrationMap((prev) => {
      if (prev[pollId] === isRegistered) return prev // avoid infinite re-renders
      return { ...prev, [pollId]: isRegistered }
    })
    setLoadingMap((prev) => {
      if (prev[pollId] === isLoading) return prev
      return { ...prev, [pollId]: isLoading }
    })
  }

  // Only active/upcoming polls need registration checking
  // (ended polls can't be voted on, so registration is irrelevant)
  const pollsNeedingRegistrationCheck = polls.filter(
    (p) => p.status === 'active' || p.status === 'upcoming'
  )

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      // 1. Search by title
      const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase())

      // 2. Status filter (NEW — replaces institution filter)
      const matchesStatus = statusFilter === 'all' || poll.status === statusFilter

      // 3. Registration filter (FIXED)
      // Only apply if the user is a voter (canVote) and is connected
      // and the filter isn't 'all'
      let matchesRegistration = true
      if (registrationFilter !== 'all' && canVote && publicKey) {
        const isLoading = loadingMap[poll.id]
        const isRegistered = registrationMap[poll.id] ?? false

        // While loading, don't hide the poll — show it until we know
        if (!isLoading) {
          matchesRegistration =
            registrationFilter === 'registered' ? isRegistered : !isRegistered
        }
      }

      return matchesSearch && matchesStatus && matchesRegistration
    })
  }, [polls, searchQuery, statusFilter, registrationFilter, registrationMap, loadingMap, canVote, publicKey])

  const active = filteredPolls.filter((p) => p.status === 'active')
  const upcoming = filteredPolls.filter((p) => p.status === 'upcoming')
  const ended = filteredPolls.filter((p) => p.status === 'ended')

  const handlePollClick = (poll: Poll) => {
    router.push(`/polls/${poll.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto px-4 py-10 space-y-8">
      {/*
        INVISIBLE HELPERS: These render nothing but fetch on-chain
        registration data for each active/upcoming poll.
        They call handleRegistrationResult to populate registrationMap.
      */}
      {pollsNeedingRegistrationCheck.map((poll) => (
        <PollRegistrationChecker
          key={`reg-check-${poll.id}`}
          poll={poll}
          onResult={handleRegistrationResult}
        />
      ))}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Governance Polls</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            {polls.length} proposal{polls.length !== 1 ? 's' : ''} on-chain
            {canCreate && (
              <span className="ml-2 inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Approved Creator
              </span>
            )}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm shadow-violet-500/20 flex-shrink-0"
          >
            <PlusCircle className="h-5 w-5" />
            New Poll
          </button>
        )}
      </div>

      {/* ── FILTER BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search polls by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
        </div>

        {/* Status Filter (replaces institution filter) */}
        <div className="flex rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
          {(['all', 'active', 'upcoming', 'ended'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg capitalize transition-all ${
                statusFilter === s
                  ? s === 'active'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : s === 'upcoming'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : s === 'ended'
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {s === 'all' ? 'All' : s === 'active' ? 'Live' : s === 'upcoming' ? 'Soon' : 'Ended'}
            </button>
          ))}
        </div>

        {/* Registration Filter — only show to voters */}
        {canVote && publicKey ? (
          <div className="flex rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
            {(['all', 'registered', 'unregistered'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setRegistrationFilter(type)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg capitalize transition-all ${
                  registrationFilter === type
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {type === 'all' ? 'All Voters' : type === 'registered' ? 'Registered' : 'Not Registered'}
              </button>
            ))}
          </div>
        ) : (
          // Placeholder to keep 3-column grid intact when filter is hidden
          <div className="hidden sm:block" />
        )}
      </div>

      {/* Empty state */}
      {filteredPolls.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No results match your selected filters.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); setRegistrationFilter('all') }}
            className="text-sm text-violet-600 dark:text-violet-400 mt-2 hover:underline"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Poll sections */}
      {active.length > 0 && (
        <section>
          <SectionHeader label="Live now" count={active.length} color="text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300" />
          <div className="space-y-3">
            {active.map((p) => (
              <PollRow key={p.id} poll={p} onClick={() => handlePollClick(p)} canCreate={canCreate} canVote={canVote} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeader label="Upcoming" count={upcoming.length} color="text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300" />
          <div className="space-y-3">
            {upcoming.map((p) => (
              <PollRow key={p.id} poll={p} onClick={() => handlePollClick(p)} canCreate={canCreate} canVote={canVote} />
            ))}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <SectionHeader label="Ended" count={ended.length} color="text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400" />
          <div className="space-y-3">
            {ended.map((p) => (
              <PollRow key={p.id} poll={p} onClick={() => handlePollClick(p)} canCreate={canCreate} canVote={canVote} />
            ))}
          </div>
        </section>
      )}

      <CreatePollModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}