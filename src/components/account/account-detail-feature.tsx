'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ExplorerLink } from '../cluster/cluster-ui'
import { AccountBalance, AccountButtons, AccountTokens, AccountTransactions } from './account-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'
import { IdCard as IdentificationIcon, History as HistoryIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react'
export default function AccountDetailFeature() {
  const params = useParams()
  
  const address = useMemo(() => {
    if (!params.address) return
    try {
      return new PublicKey(params.address)
    } catch (e) {
      console.error(`Invalid verification key`, e)
    }
  }, [params])

  if (!address) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-red-200 rounded-xl">
        <p className="text-red-500 font-bold">Error: Secure ID not found.</p>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* 1. Header: Focus on Voting Power & Verification */}
      <AppHero
        title={
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm uppercase tracking-widest text-slate-500 font-bold">Current Voting Power</span>
            <AccountBalance address={address} />
          </div>
        }
        subtitle={
          <div className="my-6 space-y-4">
            <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full w-fit mx-auto">
              <IdentificationIcon className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-mono">{ellipsify(address.toString())}</span>
            </div>
            <p className="text-sm text-slate-500">This is your unique cryptographic ID on the Vote Chain.</p>
          </div>
        }
      >
        <div className="my-4">
          <AccountButtons address={address} />
        </div>
      </AppHero>

      <div className="max-w-4xl mx-auto space-y-12 px-4">
        {/* 2. Voter Assets: Credentials or Tokens */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            <ShieldCheckIcon className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-bold">Voting Credentials</h2>
          </div>
          <div className="bg-white dark:bg-black/20 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
             <AccountTokens address={address} />
          </div>
        </section>

        {/* 3. Participation History: Proof of past votes */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            <HistoryIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Participation History</h2>
          </div>
          <div className="bg-white dark:bg-black/20 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
            <AccountTransactions address={address} />
          </div>
        </section>

        {/* 4. Transparency Link */}
        <div className="text-center pt-8">
          <p className="text-xs text-slate-400 mb-2">View raw ledger data for this identity:</p>
          <ExplorerLink 
            path={`account/${address}`} 
            label="View Immutable Ledger Record" 
            className="text-blue-500 underline text-sm"
          />
        </div>
      </div>
    </div>
  )
}