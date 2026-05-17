'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Timer, XCircle, Clock,
  User, Plus, ShieldCheck, Trash2, Users, UserCheck, UserX,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

import { formatCountdown } from '@/lib/utils'
import {
  useCastVote,
  useInitializeCandidate,
  useGetPolls,
  useGetCandidates,
  useRegisterVoter,         // ← NEW hook (add to account-data-access)
  useGetRegisteredVoters,   // ← NEW hook (add to account-data-access)
} from '@/components/account/account-data-access'
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
   COUNTDOWN HERO — unchanged from original
───────────────────────────────────────────── */
function CountdownHero({ poll }: { poll: Poll }) {
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
          Candidates and voters can still be registered until the poll starts.
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
   CANDIDATE CARD
   
   NEW: receives `isRegisteredVoter` prop
   - If voting is open AND user is NOT registered → show "Not Registered" badge instead of Vote button
   - If voting is open AND user IS registered → show Vote button as before
   
   WHY: The on-chain program will reject the tx anyway if not registered,
   but we give clear UI feedback so the user isn't confused by a failed tx.
───────────────────────────────────────────── */
interface CandidateCardProps {
  name: string
  votes: number
  totalVotes: number
  canVote: boolean
  isActive: boolean
  pollId: number
  isRegisteredVoter: boolean   // ← NEW PROP
}

function CandidateCard({
  name, votes, totalVotes, canVote, isActive, pollId, isRegisteredVoter
}: CandidateCardProps) {
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

  // Decide what to show in the right slot of the card
  // CONCEPT: We compute this once and render it below — keeps JSX clean
  const actionSlot = (() => {
    if (!isActive) return null                    // poll not active, show nothing

    if (!canVote) return null                     // superadmin / creator role, show nothing

    if (!isRegisteredVoter) {
      // Voter role but NOT registered for this specific poll
      return (
        <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium">
          <UserX className="h-3.5 w-3.5" />
          Not registered
        </span>
      )
    }

    // Registered voter — show the vote button
    return (
      <button
        onClick={() => !isPending && setShowConfirm(true)}
        disabled={isPending}
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700
                   text-white text-sm font-bold transition-colors disabled:opacity-60
                   flex items-center gap-2 shadow-sm"
      >
        {isPending
          ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          : 'Vote'}
      </button>
    )
  })()

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
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

          {/* Action slot — computed above */}
          {actionSlot}
        </div>
      </div>

      {/* Confirmation Modal — unchanged */}
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
                {isPending
                  ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />Signing...</>
                  : 'Confirm & Cast Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────
   ADD CANDIDATE FORM — unchanged from original
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
   NEW: REGISTER VOTER FORM
   
   CONCEPT: Mirrors AddCandidateForm exactly.
   - Only rendered when canCreate is true (poll creator)
   - Locked once voting starts (same rule as candidates)
   - Takes a wallet address string → converts to PublicKey → calls useRegisterVoter
   
   WHY lock it when voting starts?
   If you could add voters mid-vote, you could unfairly add wallets
   that you control right before they vote — undermining the integrity.
───────────────────────────────────────────── */
function RegisterVoterForm({ pollId, pollStart }: { pollId: number; pollStart: number }) {
  const { publicKey } = useWallet()
  const mutation = useRegisterVoter()
  const [walletInput, setWalletInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const isStarted = Date.now() >= pollStart

  if (isStarted) {
    return (
      <p className="text-xs text-amber-500 italic flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5" />
        Voting window open — voter registration is locked.
      </p>
    )
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!publicKey || !walletInput.trim()) return

    // Validate that the input is a real Solana public key before sending tx
    // PublicKey constructor throws if the string is invalid
    let voterKey: PublicKey
    try {
      voterKey = new PublicKey(walletInput.trim())
    } catch {
      setErrorMsg('Invalid Solana wallet address. Please double-check.')
      return
    }

    mutation.mutate(
      { pollId, voterWallet: voterKey, signer: publicKey },
      {
        onSuccess: () => setWalletInput(''),
        onError: (err: any) => setErrorMsg(err?.message || 'Failed to register voter.'),
      },
    )
  }

  return (
    <form onSubmit={handleRegister} className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Register Voter Wallet
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            required
            placeholder="Voter wallet address (e.g., GpUME...)"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            disabled={mutation.isPending}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-violet-500 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || !walletInput.trim()}
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
   NEW: REGISTERED VOTERS LIST
   
   Shows the creator a list of who they've registered.
   Each row has a wallet address + registered date.
   Only visible to the poll creator (canCreate gate).
   
   CONCEPT: This reads the RegisteredVoter PDAs filtered
   by this poll — same memcmp filter pattern as useGetCandidates.
───────────────────────────────────────────── */
function RegisteredVotersList({ pollId }: { pollId: number }) {
  const { data: voters = [], isLoading } = useGetRegisteredVoters({ pollId })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Registered Voters
        </h3>
        <span className="text-xs text-slate-400">
          {voters.length} wallet{voters.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : voters.length === 0 ? (
        <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Users className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
          <p className="text-xs">No voters registered yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {voters.map((v) => (
            <div
              key={v.voter}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
              {/* Green checkmark — registered */}
              <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
              </div>

              {/* Wallet address — truncated for display */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                  {v.voter}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Registered {v.registeredAt}</p>
              </div>

              {/* 
                OPTIONAL: Add a remove button here in the future.
                Would call useDeregisterVoter (the on-chain close instruction).
                Keeping it simple for now — just a visual indicator.
              */}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN EXPORT: PollDetailPage
   
   CHANGES from original:
   1. Fetches registeredVoters to check if current user is registered
   2. Passes isRegisteredVoter down to CandidateCard
   3. Renders RegisterVoterForm + RegisteredVotersList for canCreate users
   4. Shows a "not registered" callout for voters who can't vote this poll
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
  const { publicKey } = useWallet()

  const { data: allPolls = [], isLoading: pollsLoading } = useGetPolls()
  const poll = allPolls.find((p) => p.id === pollId)

  const { data: candidates = [], isLoading: candidatesLoading } = useGetCandidates({ pollId })

  // Fetch the registered voters list for this poll
  // We need this for TWO purposes:
  //   1. Creator: display the list of registered wallets
  //   2. Voter: check if the current user's wallet is in the list
  const { data: registeredVoters = [] } = useGetRegisteredVoters({ pollId })

  // Check if the currently connected wallet is registered for this specific poll
  // CONCEPT: We do this on the client for UX — the on-chain program enforces it regardless
  const isRegisteredVoter = publicKey
    ? registeredVoters.some((v) => v.voter === publicKey.toString())
    : false

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
    <div className="mx-auto px-4 py-10 space-y-8">

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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400 pt-1">
          <span>Poll ID <code className="font-mono ml-1">{poll.id}</code></span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>Started {new Date(poll.start).toLocaleDateString()}</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>Ends {new Date(poll.end).toLocaleDateString()}</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>{totalVotes} votes cast</span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          {/* registeredVoters is already fetched above for the isRegisteredVoter check
              so this is FREE — no extra network call, just .length on the same array */}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {registeredVoters.length} registered
          </span>
        </div>
      </div>

      {/* ── Countdown Hero ── */}
      <CountdownHero poll={poll} />

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
                isRegisteredVoter={isRegisteredVoter}   // ← NEW: pass registration status
              />
            ))}
          </div>
        )}

        {/* ── Add Candidate — only for poll creators ── */}
        {canCreate && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <AddCandidateForm pollId={poll.id} pollStart={poll.start} />
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────
          VOTER REGISTRATION SECTION
          
          Visible ONLY to poll creators (canCreate).
          Regular voters never see this section — same
          pattern as AddCandidateForm being hidden from voters.
          
          Divided into:
            - RegisterVoterForm: input to add a new wallet
            - RegisteredVotersList: shows all registered wallets
      ───────────────────────────────────────────── */}
      {canCreate && (
        <section className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Voter Management
            </h2>
          </div>

          {/* Explain why this exists — helps you understand the concept too */}
          <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            <strong>How it works:</strong> Each registered wallet gets a{' '}
            <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">RegisteredVoter</code> PDA
            on-chain. When they try to vote, Solana checks that PDA exists — if it doesn't,
            the transaction is rejected automatically before any code runs.
          </div>

          {/* Add voter form */}
          <RegisterVoterForm pollId={poll.id} pollStart={poll.start} />

          {/* List of already-registered voters */}
          <RegisteredVotersList pollId={poll.id} />
        </section>
      )}

      {/* ─────────────────────────────────────────────
          STATUS CALLOUTS — shown at the bottom
          
          Three cases:
          1. Active + registered voter → green "one vote" callout (original)
          2. Active + NOT registered voter → amber "not registered" callout (NEW)
          3. Upcoming → "come back when voting opens" (NEW)
          
          canCreate users (creators/admins) see none of these — they manage, don't vote.
      ───────────────────────────────────────────── */}

      {/* Case 1: Registered voter, voting is open */}
      {canVote && isActive && isRegisteredVoter && (
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

      {/* Case 2: Voter role but NOT registered for this poll */}
      {canVote && isActive && !isRegisteredVoter && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 px-5 py-4 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-semibold mb-0.5 flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Your wallet is not registered for this poll
          </p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
            The poll creator must register your wallet address before you can vote.
            Contact them with your wallet address to be added.
          </p>
        </div>
      )}

      {/* Case 3: Upcoming poll — tell voter to wait */}
      {canVote && isUpcoming && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold mb-0.5 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Voting hasn't opened yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Come back when the poll goes live. Your registration will be checked at that point.
          </p>
        </div>
      )}
    </div>
  )
}