'use client'

/**
 * PAGE 2: Poll Detail Page
 *
 * CONCEPT: A focused voting room. One poll at a time. Big, clear candidate
 * cards that you click to vote — no more tiny "Vote" buttons crammed into a
 * progress bar row. The live countdown and progress live at the top as the
 * "hero" of the page.
 *
 * HOW IT FITS IN YOUR APP:
 *  - Create a route like  /polls/[pollId]/page.tsx
 *  - Receive pollId from URL params, pass it here as a prop.
 *  - Example:
 *      export default function PollDetailRoute({ params }) {
 *        return <PollDetailPage pollId={Number(params.pollId)} canVote canCreate />
 *      }
 *
 * LOGIC CHANGES: NONE. Same hooks, same mutations.
 *
 * WEB3 CONCEPT EXPLAINED (for learning):
 *  - Each poll and candidate lives in a "PDA" (Program Derived Address) on Solana.
 *  - A PDA is an account whose address is deterministically derived from seeds
 *    (e.g. poll_id + "poll") so your frontend can always compute the right
 *    address without storing it anywhere.
 *  - When you vote, a "VoteRecord" PDA is created for YOUR wallet + poll.
 *    Because PDAs are unique, Solana itself prevents double-voting — if you
 *    try to vote again, the account already exists and the TX fails.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Timer, XCircle, Clock,
  User, Plus, ShieldCheck, BarChart2, ExternalLink,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'

import { formatCountdown } from '@/lib/utils'
import { useCastVote, useInitializeCandidate, useGetPolls, useGetCandidates } from '@/components/account/account-data-access'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { Poll } from '@/components/interface'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function pollProgress(poll: Poll): number {
  const total = poll.end - poll.start
  const elapsed = Date.now() - poll.start
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

/* ─────────────────────────────────────────────
   COUNTDOWN HERO — top of the detail page
   Shows a live countdown + progress bar when active,
   or a "starts in" banner when upcoming.
───────────────────────────────────────────── */
function CountdownHero({ poll }: { poll: Poll }) {
  // Force re-render every second so the countdown ticks live
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()
  const hasStarted = now >= poll.start
  const hasEnded = now >= poll.end

  if (poll.status === 'ended') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm font-medium">
        <XCircle className="h-4 w-4" />
        This poll ended on {new Date(poll.end).toLocaleDateString()}
      </div>
    )
  }

  if (!hasStarted) {
    return (
      <div className="px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <Clock className="h-4 w-4 animate-pulse" />
          Voting opens in <strong className="ml-1">{formatCountdown(poll.start)}</strong>
        </div>
        <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
          Candidates can still be added until the poll starts.
        </p>
      </div>
    )
  }

  if (hasStarted && !hasEnded) {
    const pct = pollProgress(poll)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold text-violet-700 dark:text-violet-300">
            <Clock className="h-4 w-4" />
            {formatCountdown(poll.end)} remaining
          </span>
          <span className="text-slate-400 text-xs">{pct}% of voting window elapsed</span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return null
}

/* ─────────────────────────────────────────────
   CANDIDATE CARD — the main voting UI
   Each candidate is a full clickable card.
   Replaces the cramped progress-bar-row design.
───────────────────────────────────────────── */
interface CandidateCardProps {
  name: string
  votes: number
  totalVotes: number
  canVote: boolean
  isActive: boolean
  pollId: number
}

function CandidateCard({ name, votes, totalVotes, canVote, isActive, pollId }: CandidateCardProps) {
  const { publicKey } = useWallet()
  const castVoteMutation = useCastVote({ pollId })
  const [showConfirm, setShowConfirm] = useState(false)

  const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0
  const isPending = castVoteMutation.isPending

  const handleConfirm = async () => {
    if (!publicKey) return
    try {
      await castVoteMutation.mutateAsync({ candidateName: name, signer: publicKey })
    } catch (e) {
      console.error('Vote failed:', e)
    } finally {
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Bottom fill bar showing vote % */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-emerald-400 dark:bg-emerald-500 transition-all duration-700"
          // style={{ width: `${pct}%` }}
        />

        <div className="px-5 py-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-slate-400" />
          </div>

          {/* Name + progress bar */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{name}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 flex-shrink-0">
                {votes} · {pct}%
              </span>
            </div>
          </div>

          {/* Vote button — always visible when voting is open */}
          {canVote && isActive && (
            <button
              onClick={() => !isPending && setShowConfirm(true)}
              disabled={isPending}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
            >
              {isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : 'Vote'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Your Vote</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You're about to cast a blockchain vote for{' '}
              <strong className="text-violet-600 dark:text-violet-400">"{name}"</strong>.
              This creates a <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">VoteRecord</code> PDA
              on-chain — it cannot be undone or changed.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                disabled={isPending}
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleConfirm}
                className="px-5 py-2 text-sm font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />Signing...</>
                ) : 'Confirm & Cast Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
/* ─────────────────────────────────────────────
   ADD CANDIDATE FORM (same logic, better layout)
───────────────────────────────────────────── */
function AddCandidateForm({ pollId, pollStart }: { pollId: number; pollStart: number }) {
  const { publicKey } = useWallet()
  const mutation = useInitializeCandidate()
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const isStarted = Date.now() >= pollStart

  if (isStarted) {
    return (
      <p className="text-xs text-amber-500 italic flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5" />
        Voting window open — candidate entries are locked.
      </p>
    )
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!publicKey || !name.trim()) return
    mutation.mutate(
      { pollId, candidateName: name.trim(), signer: publicKey },
      {
        onSuccess: () => setName(''),
        onError: (err: any) => setErrorMsg(err?.message || 'Failed to add candidate.'),
      },
    )
  }

  return (
    <form onSubmit={handleAdd} className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Add Candidate / Option
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" required maxLength={280}
            placeholder="e.g., Yes, No, Alice"
            value={name} onChange={(e) => setName(e.target.value)}
            disabled={mutation.isPending}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          type="submit" disabled={mutation.isPending || !name.trim()}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors hover:bg-slate-700"
        >
          {mutation.isPending
            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            : <><Plus className="h-4 w-4" />Add</>}
        </button>
      </div>
      {errorMsg && <p className="text-xs font-medium text-red-500">{errorMsg}</p>}
    </form>
  )
}

/* ─────────────────────────────────────────────
   MAIN EXPORT: PollDetailPage
   Props:
     pollId   — numeric id from URL param
     canVote  — from useWalletRole
     canCreate — from useWalletRole
───────────────────────────────────────────── */
export function PollDetailPage({
  pollId,
  canVote,
  canCreate,
}: {
  pollId: number
  canVote: boolean
  canCreate: boolean
}) {
  const router = useRouter()
  const { data: allPolls = [], isLoading: pollsLoading } = useGetPolls()
  const poll = allPolls.find((p) => p.id === pollId)
  const { data: candidates = [], isLoading: candidatesLoading } = useGetCandidates({ pollId })
  const totalVotes = candidates.reduce((a, c) => a + c.votes, 0)

  const isActive   = poll?.status === 'active'
  const isUpcoming = poll?.status === 'upcoming'

  if (pollsLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">Poll not found on-chain.</p>
        <button onClick={() => router.back()}
          className="text-sm text-violet-600 hover:underline">← Back to polls</button>
      </div>
    )
  }

  return (
    <div className=" mx-auto px-4 py-10 space-y-8">

      {/* ── Back button ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        All polls
      </button>

      {/* ── Poll Header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status pill */}
          {poll.status === 'active' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full
                             text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300
                             ring-1 ring-emerald-200 dark:ring-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          {poll.status === 'upcoming' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full
                             text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300
                             ring-1 ring-violet-200 dark:ring-violet-800">
              <Timer className="h-3 w-3" />Upcoming
            </span>
          )}
          {poll.status === 'ended' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full
                             text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400
                             ring-1 ring-slate-200 dark:ring-slate-700">
              <XCircle className="h-3 w-3" />Ended
            </span>
          )}

          {/* Explorer link */}
          <ExplorerLink
            path={`account/${poll.id}`}
            label="View on Explorer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors ml-auto"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {poll.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          {poll.description}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400 pt-1">
          <span>Poll ID <code className="font-mono ml-1">{poll.id}</code></span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>Started {new Date(poll.start).toLocaleDateString()}</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>Ends {new Date(poll.end).toLocaleDateString()}</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>{totalVotes} votes cast</span>
        </div>
      </div>

      {/* ── Countdown / Progress Hero ── */}
      <CountdownHero poll={poll} />

      {/* ── Divider ── */}
      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* ── Candidates Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Candidates
          </h2>
          <span className="text-xs text-slate-400">
            {candidates.length} option{candidates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {candidatesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No candidates yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => (
              <CandidateCard
                key={c.name}
                name={c.name}
                votes={c.votes}
                totalVotes={totalVotes}
                pollId={poll.id}
                canVote={canVote}
                isActive={isActive && Date.now() >= poll.start}
              />
            ))}
          </div>
        )}

        {/* ── Add Candidate (only for creators, before poll starts) ── */}
        {canCreate && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <AddCandidateForm pollId={poll.id} pollStart={poll.start} />
          </div>
        )}
      </section>

      {/* ── Voter info callout ── */}
      {canVote && isActive && (
        <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-5 py-4 text-sm text-violet-700 dark:text-violet-300">
          <p className="font-semibold mb-0.5 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            One vote per wallet — enforced on-chain
          </p>
          <p className="text-xs text-violet-600/70 dark:text-violet-400/70">
            Solana creates a <code>VoteRecord</code> PDA tied to your wallet + this poll.
            Voting twice would fail because that account already exists.
          </p>
        </div>
      )}
    </div>
  )
}