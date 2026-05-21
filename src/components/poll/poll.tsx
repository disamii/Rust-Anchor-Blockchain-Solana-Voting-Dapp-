'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import {} from // ← NEW hook
'@/components/account/account-data-access'
import { Poll } from '@/components/interface'
import { useGetCandidates, useInitializePoll, useGetPolls, useGetRegisteredVoters } from './poll-data-access'
import { PublicKey } from '@solana/web3.js'
import { useGetMyInstitutions } from '../institution/institution-data-access'

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

/* ─────────────────────────────────────────────
   VOTER REGISTRATION PILL
   
   CONCEPT: Shows the voter's registration status
   for THIS specific poll, right in the list row.
   
   Three states:
   - canCreate (poll creator/admin): shows total count with Users icon
     → They care about "how many people can vote?"
   - canVote + registered: green "Registered" pill
     → Reassures voter they can vote when it opens
   - canVote + NOT registered: amber "Not registered" pill
     → Signals they need to contact the creator
   
   We show this ONLY for active/upcoming polls because
   ended polls don't need this info anymore.
───────────────────────────────────────────── */
function VoterRegistrationPill({
  pollId,
  canCreate,
  canVote,
}: {
  pollId: number
  canCreate: boolean
  canVote: boolean
}) {
  const { publicKey } = useWallet()
  const { data: registeredVoters = [], isLoading } = useGetRegisteredVoters({ pollId })

  if (isLoading) {
    // Small skeleton while loading — avoids layout shift
    return <span className="w-20 h-4 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse inline-block" />
  }

  // Poll creator view: just show the count
  // They don't need to know if they're "registered" — they run the poll
  if (canCreate) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <Users className="h-3.5 w-3.5" />
        {registeredVoters.length} registered
      </span>
    )
  }

  // Voter view: show personal registration status
  if (canVote && publicKey) {
    const isRegistered = registeredVoters.some((v) => v.voter === publicKey.toString())

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

  // Fallback: wallet not connected — show total count neutrally
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <Users className="h-3.5 w-3.5" />
      {registeredVoters.length} registered
    </span>
  )
}

/* ─────────────────────────────────────────────
   POLL ROW — one row per poll in the list
   
   CHANGES from original:
   - Added VoterRegistrationPill to the meta row
   - Pill is only shown for active/upcoming polls
     (ended polls don't need registration info)
───────────────────────────────────────────── */
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
  // Only show registration info when the poll is still relevant (not ended)
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
      {/* Left accent bar — color reflects poll status */}
      <div
        className={`w-1 self-stretch rounded-full flex-shrink-0 transition-colors
          ${isActive ? 'bg-emerald-400' : isUpcoming ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'}`}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-1.5">
          <span className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">{poll.title}</span>
          <StatusBadge status={poll.status} />
        </div>
        {poll.institution && (
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {poll.institution}
          </span>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{poll.description}</p>

        {/* 
          Meta row — the registration pill slots in naturally
          between votes cast and the date, just like another stat.
          
          The separator dots (w-px h-3) only appear between items
          that both exist, keeping spacing clean.
        */}
        <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 flex-wrap">
          <span>{candidates.length} candidates</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>{totalVotes} votes cast</span>

          {/* Registration pill — only for active/upcoming polls */}
          {showRegistration && (
            <>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
              <VoterRegistrationPill pollId={poll.id} canCreate={canCreate} canVote={canVote} />
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

      {/* Right arrow — animates on hover */}
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

/* ─────────────────────────────────────────────
   CREATE POLL MODAL — unchanged from original
───────────────────────────────────────────── */
function CreatePollModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { publicKey } = useWallet()
  const mutation = useInitializePoll()
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const { data: institutions = [] } = useGetMyInstitutions({
    adminWallet: publicKey,
  })

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null)
  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!publicKey) {
      setErrorMsg('Wallet connection required.')
      return
    }
    if (!selectedInstitutionId) {
      setErrorMsg('Please select an institution')
      return
    }
    const startUnix = Math.floor(new Date(startDate).getTime() / 1000)
    const endUnix = Math.floor(new Date(endDate).getTime() / 1000)
    if (endUnix <= startUnix) {
      setErrorMsg('End time must be after start time.')
      return
    }

    const randomPollId = Math.floor(Math.random() * 1_000_000)
    mutation.mutate(
      {
        pollId: randomPollId,
        institutionId: selectedInstitutionId,
        description: description.trim(),
        pollStart: startUnix,
        pollEnd: endUnix,
        signer: publicKey,
      },
      {
        onSuccess: () => {
          setDescription('')
          setStartDate('')
          setEndDate('')
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Proposal / Description
            </label>
            <textarea
              required
              rows={3}
              maxLength={280}
              placeholder="What should the DAO vote on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  type="datetime-local"
                  required
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={mutation.isPending}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm outline-none"
                />
              </div>
            ))}
          </div>

          {errorMsg && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Institution</label>

            <select
              value={selectedInstitutionId ?? ''}
              onChange={(e) => setSelectedInstitutionId(Number(e.target.value))}
              disabled={mutation.isPending}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            >
              <option value="">Select institution</option>

              {institutions.map((inst) => (
                <option key={inst.publicKey} value={inst.institutionId}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-400 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              {mutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Broadcasting...
                </>
              ) : (
                'Initialize Poll'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SECTION HEADER — unchanged from original
───────────────────────────────────────────── */
function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{count}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN EXPORT: PollListPage
   
   CHANGES from original:
   - canCreate and canVote are now forwarded to PollRow
   - PollRow forwards them to VoterRegistrationPill
   - Everything else is identical
───────────────────────────────────────────── */
export function PollListPage({ canVote, canCreate }: { canVote: boolean; canCreate: boolean }) {
  const router = useRouter()
  const { data: polls = [], isLoading } = useGetPolls()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  console.log(polls)
  const active = polls.filter((p) => p.status === 'active')
  const upcoming = polls.filter((p) => p.status === 'upcoming')
  const ended = polls.filter((p) => p.status === 'ended')

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
    <div className="mx-auto px-4 py-10 space-y-10">
      {/* ── Page Header ── */}
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

      {/* ── Empty state ── */}
      {polls.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No polls on-chain yet.</p>
          {canCreate && <p className="text-sm mt-1">Create the first one above.</p>}
        </div>
      )}

      {/* ── Active Polls ── */}
      {active.length > 0 && (
        <section>
          <SectionHeader
            label="Live now"
            count={active.length}
            color="text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300"
          />
          <div className="space-y-3">
            {active.map((p) => (
              <PollRow key={p.id} poll={p} onClick={() => handlePollClick(p)} canCreate={canCreate} canVote={canVote} />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming Polls ── */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeader
            label="Upcoming"
            count={upcoming.length}
            color="text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300"
          />
          <div className="space-y-3">
            {upcoming.map((p) => (
              <PollRow key={p.id} poll={p} onClick={() => handlePollClick(p)} canCreate={canCreate} canVote={canVote} />
            ))}
          </div>
        </section>
      )}

      {/* ── Ended Polls ── */}
      {ended.length > 0 && (
        <section>
          <SectionHeader
            label="Ended"
            count={ended.length}
            color="text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
          />
          <div className="space-y-3">
            {ended.map((p) => (
              <PollRow key={p.id} poll={p} onClick={() => handlePollClick(p)} canCreate={canCreate} canVote={canVote} />
            ))}
          </div>
        </section>
      )}

      {/* ── Create Modal ── */}
      <CreatePollModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}
