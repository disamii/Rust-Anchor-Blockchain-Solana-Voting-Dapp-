'use client'

import { useState, useEffect } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { BarChart2, CheckCircle2, Plus, Timer, User, X, XCircle } from 'lucide-react'
import { useCastVote, useInitializeCandidate, useInitializePoll } from './account-data-access'
import { useWallet } from '@solana/wallet-adapter-react'
import { ChevronDown, Clock, PlusCircle } from 'lucide-react'
import { formatCountdown } from '@/lib/utils'
import { useGetCandidates, useGetPolls } from './account-data-access'
import { Poll } from '../interface'

interface CreatePollModalProps {
  isOpen: boolean
  onClose: () => void
}
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

function pollProgress(poll: Poll): number {
  const total = poll.end - poll.start
  const elapsed = Date.now() - poll.start
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

function PollCard({ poll, canVote, canCreate }: { poll: any; canVote: boolean; canCreate: boolean }) {
  const [open, setOpen] = useState(false)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      forceTick((v) => v + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])
  const { data: candidates = [], isLoading } = useGetCandidates({ pollId: poll.id })
  const totalVotes = candidates.reduce((a, c) => a + c.votes, 0)

  const nowMs = Date.now()
  const hasStarted = nowMs >= poll.start
  const hasEnded = nowMs >= poll.end
  const isUpcoming = !hasStarted

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
            {isLoading ? (
              <span className="text-xs animate-pulse">Loading choices...</span>
            ) : (
              `${candidates.length} candidates · ${totalVotes} votes`
            )}
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
              {/* Highlight-start */}
              <span className="text-slate-400 block mb-1">{isUpcoming ? 'Starts' : 'Ends'}</span>
              <span className="font-medium">{new Date(isUpcoming ? poll.start : poll.end).toLocaleDateString()}</span>
              {/* Highlight-end */}
            </div>
          </div>

          {/* Highlight-start */}
          {/* Dynamic Timelines and Countdowns */}
          {isUpcoming && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>
                  Voting begins in: <strong>{formatCountdown(poll.start)}</strong>
                </span>
              </div>
            </div>
          )}

          {poll.status === 'active' && hasStarted && !hasEnded && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300 mb-2">
                <Clock className="h-4 w-4" />
                {formatCountdown(poll.end)} remaining
              </div>

              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${pollProgress(poll)}%` }}
                />
              </div>
            </div>
          )}
          {/* Highlight-end */}

          {isLoading ? (
            <div className="py-4 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((c) => {
                const pct = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0

                return (
                  <div key={c.name} className="flex items-center gap-4">
                    <span className="text-sm w-28 flex-shrink-0 font-medium truncate" title={c.name}>
                      {c.name}
                    </span>

                    <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    <span className="text-sm text-slate-500 w-12 text-right font-medium">
                      {c.votes} ({pct}%)
                    </span>
                    {canVote && poll.status === 'active' && hasStarted && (
                      <VoteButton pollId={poll.id} candidateName={c.name} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {canCreate && <AddCandidateForm pollId={poll.id} pollStart={poll.start} />}

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

function CreatePollModal({ isOpen, onClose }: CreatePollModalProps) {
  const { publicKey } = useWallet()
  const mutation = useInitializePoll()

  // Form State
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!publicKey) {
      setErrorMsg('Wallet connection required.')
      return
    }

    // Convert local HTML datetime-local strings to unix timestamps (seconds)
    const startUnix = Math.floor(new Date(startDate).getTime() / 1000)
    const endUnix = Math.floor(new Date(endDate).getTime() / 1000)

    if (endUnix <= startUnix) {
      setErrorMsg('The poll end time must be further in the future than the start time.')
      return
    }

    // Generate a random u64 numeric ID safely within JavaScript numbers limitations
    const randomPollId = Math.floor(Math.random() * 1000000)

    mutation.mutate(
      {
        pollId: randomPollId,
        description: description.trim(),
        pollStart: startUnix,
        pollEnd: endUnix,
        signer: publicKey,
      },
      {
        onSuccess: () => {
          // Reset fields on success
          setDescription('')
          setStartDate('')
          setEndDate('')
          onClose()
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Transaction processing failed. Are you an Approved Creator?')
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-violet-600" />
            Create New Proposal Poll
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Proposal / Description
            </label>
            <textarea
              required
              rows={3}
              maxLength={280} // Bound to match your Rust contract `#[max_len(280)]`
              placeholder="What proposal rule should the DAO vote on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={mutation.isPending}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-1">{description.length}/280 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Start Window
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={mutation.isPending}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Window</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={mutation.isPending}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          {/* Actions */}
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

interface VoteButtonProps {
  pollId: number
  candidateName: string
}

export function VoteButton({ pollId, candidateName }: VoteButtonProps) {
  const { publicKey } = useWallet()
  const [showModal, setShowModal] = useState(false)
  const castVoteMutation = useCastVote({ pollId })

  const handleVoteConfirm = async () => {
    if (!publicKey) return

    try {
      await castVoteMutation.mutateAsync({
        candidateName,
        signer: publicKey,
      })
    } catch (e) {
      console.error('Voting failed:', e)
    } finally {
      setShowModal(false) // Close modal after TX finishes
    }
  }

  return (
    <>
      {/* 1. Main Action Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={castVoteMutation.isPending}
        className="text-sm px-4 py-2 rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {castVoteMutation.isPending ? 'Voting...' : 'Vote'}
      </button>

      {/* 2. Isolated Confirmation Popup Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Your Vote</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to cast your vote for{' '}
              <strong className="text-violet-600 dark:text-violet-400">"{candidateName}"</strong>? This will initiate a
              blockchain transaction.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={castVoteMutation.isPending}
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={castVoteMutation.isPending}
                onClick={handleVoteConfirm}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {castVoteMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    Signing...
                  </>
                ) : (
                  'Confirm Vote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
function AddCandidateForm({ pollId, pollStart }: { pollId: number; pollStart: number }) {
  const { publicKey } = useWallet()
  const mutation = useInitializeCandidate()
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Disable UI if the poll has already begun
  const isPolllStarted = Date.now() >= pollStart

  if (isPolllStarted) {
    return <p className="text-xs text-amber-500 italic">Voting window open. Candidate entries locked.</p>
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!publicKey) return
    if (!name.trim()) return

    mutation.mutate(
      {
        pollId,
        candidateName: name.trim(),
        signer: publicKey,
      },
      {
        onSuccess: () => {
          setName('') // Clear input on success
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Failed to add candidate. Are you the poll authority?')
        },
      },
    )
  }

  return (
    <form onSubmit={handleAdd} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        Add Option / Candidate
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            required
            maxLength={280} // Bound to match your Candidate account state constraint
            placeholder="e.g., Yes, No, John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={mutation.isPending}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !name.trim()}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add
            </>
          )}
        </button>
      </div>

      {errorMsg && <p className="text-xs font-medium text-red-500 mt-1">{errorMsg}</p>}
    </form>
  )
}

// Inside your main Component:
export function PollItemComponent({ poll, candidates, totalVotes, canVote, hasStarted }) {
  const { publicKey } = useWallet()
  const castVoteMutation = useCastVote({ pollId: poll.id })

  // Local state for handling the confirmation modal
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)

  const handleVoteConfirm = async () => {
    if (!publicKey || !selectedCandidate) return

    try {
      await castVoteMutation.mutateAsync({
        candidateName: selectedCandidate,
        signer: publicKey,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setSelectedCandidate(null) // Close popup
    }
  }

  return (
    <div className="relative">
      {/* CANDIDATES LIST */}
      <div className="space-y-4">
        {candidates.map((c) => {
          const pct = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0

          return (
            <div key={c.name} className="flex items-center gap-4">
              <span className="text-sm w-28 flex-shrink-0 font-medium truncate" title={c.name}>
                {c.name}
              </span>

              <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>

              <span className="text-sm text-slate-500 w-12 text-right font-medium">
                {c.votes} ({pct}%)
              </span>

              {canVote && poll.status === 'active' && hasStarted && (
                <button
                  onClick={() => setSelectedCandidate(c.name)}
                  disabled={castVoteMutation.isPending}
                  className="text-sm px-4 py-2 rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {castVoteMutation.isPending && selectedCandidate === c.name ? 'Voting...' : 'Vote'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* CONFIRMATION POPUP MODAL */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Your Vote</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to cast your vote for{' '}
              <strong className="text-violet-600 dark:text-violet-400">"{selectedCandidate}"</strong>? This action
              cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={castVoteMutation.isPending}
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={castVoteMutation.isPending}
                onClick={handleVoteConfirm}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {castVoteMutation.isPending ? 'Processing...' : 'Confirm & Cast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export function PollsTab({ canVote, canCreate }: { canVote: boolean; canCreate: boolean }) {
  const { data: polls = [], isLoading } = useGetPolls()
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="flex items-center justify-between">
          <p className="text-base text-slate-500 leading-relaxed">
            You have an{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">ApprovedCreator</code> PDA — you
            can create polls.
          </p>

          <button
            onClick={() => setIsPollModalOpen(true)}
            className="flex items-center gap-2 text-base px-5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            Create poll
          </button>
        </div>
      )}

      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="text-center text-slate-500 py-12">No polls found on-chain.</div>
        ) : (
          polls.map((p) => <PollCard key={p.id} poll={p} canVote={canVote} canCreate={canCreate} />)
        )}
      </div>
      <CreatePollModal isOpen={isPollModalOpen} onClose={() => setIsPollModalOpen(false)} />
    </div>
  )
}

export function VoteTab() {
  const { data: polls = [], isLoading } = useGetPolls()
  const active = polls.filter((p) => p.status === 'active')
  const other = polls.filter((p) => p.status !== 'active')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {active.length === 0 ? (
          <p className="text-base text-slate-400 py-8 text-center">No active polls right now.</p>
        ) : (
          active.map((p) => <PollCard key={p.id} poll={p} canVote={true} canCreate={false} />)
        )}

        {other.map((p) => (
          <PollCard key={p.id} poll={p} canVote={false} canCreate={false} />
        ))}
      </div>
    </div>
  )
}
