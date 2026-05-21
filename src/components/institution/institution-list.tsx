'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'

import { Building2, CheckCircle2, Clock3, ShieldCheck, Search, Plus, ArrowRight, X, Wallet } from 'lucide-react'

import { useGetInstitutions, useInitializeInstitution } from './institution-data-access'
import { WalletButton } from '../solana/solana-provider'
// Import your WalletButton component here if it's a custom one,
// or from @solana/wallet-adapter-react-ui
// import { WalletMultiButton as WalletButton } from '@solana/wallet-adapter-react-ui'

interface InstitutionSignupModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InstitutionsPage() {
  const { data: institutions = [], isLoading } = useGetInstitutions()

  const [search, setSearch] = useState('')

  const [isSignupOpen, setIsSignupOpen] = useState(false)

  const filtered = institutions.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className=" mx-auto px-6 py-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institutions</h1>

          <p className="text-slate-500 mt-2">Public registry of institutions on-chain.</p>
        </div>

        <button
          onClick={() => setIsSignupOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Register Institution
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />

        <input
          type="text"
          placeholder="Search institution..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      )}

      {/* EMPTY */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
          <Building2 className="h-10 w-10 mx-auto text-slate-400 mb-4" />

          <p className="text-slate-500">No institutions found.</p>
        </div>
      )}

      {/* LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((institution) => (
          <Link
            key={institution.publicKey}
            href={`/institutions/${institution.institutionId}`}
            className="group border border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-slate-900 hover:border-violet-500 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-violet-600" />

                  <h2 className="text-xl font-semibold">{institution.name}</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {institution.isApproved ? (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approved
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                      <Clock3 className="h-3.5 w-3.5" />
                      Pending Approval
                    </div>
                  )}

                  {institution.isActive && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Active
                    </div>
                  )}
                </div>

                <div className="space-y-1 pt-2">
                  <p className="text-sm text-slate-500">Institution ID</p>

                  <p className="font-medium">#{institution.institutionId}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Admin Wallet</p>

                  <p className="font-mono text-sm break-all">{institution.admin}</p>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      <InstitutionSignupModal isOpen={isSignupOpen} onClose={() => setIsSignupOpen(false)} />
    </div>
  )
}

function InstitutionSignupModal({ isOpen, onClose }: InstitutionSignupModalProps) {
  const { publicKey } = useWallet()
  const mutation = useInitializeInstitution()
  const [name, setName] = useState('')
  const [policy, setpolicy] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!publicKey) {
      setError('Connect wallet first.')
      return
    }

    try {
      const institutionId = Math.floor(Math.random() * 1_000_000)
      mutation.mutate(
        {
          institutionId: institutionId,
          name,
          policy: policy.trim(),
          signer: publicKey,
          adminWallet: publicKey,
        },
        {
          onSuccess: () => {
            onClose()
            setName('')
            setpolicy('')
          },
          onError: (err: any) => {
            setError(err?.message || 'Institution creation failed.')
          },
        },
      )
    } catch {
      setError('Invalid policy wallet.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-semibold">Register Institution</h2>
            <p className="text-sm text-slate-500 mt-1">
              Institution will require super admin approval before operating.
            </p>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!publicKey ? (
          <div className="p-8 flex flex-col items-center text-center space-y-5">
            <div className="h-14 w-14 bg-violet-50 dark:bg-violet-950/50 rounded-2xl flex items-center justify-center text-violet-600">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Wallet Connection Required</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                Please connect your Solana wallet to register a new institution on-chain.
              </p>
            </div>

            <div className="pt-2">
              <WalletButton />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* <div>
              <label className="block text-sm font-medium mb-2">Institution ID</label>
              <input
                type="number"
                required
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
              />
            </div> */}

            <div>
              <label className="block text-sm font-medium mb-2">Institution Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>

              <textarea
                required
                value={policy}
                onChange={(e) => setpolicy(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none font-mono text-sm resize-none"
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-2xl">{error}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                {mutation.isPending ? 'Creating...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
