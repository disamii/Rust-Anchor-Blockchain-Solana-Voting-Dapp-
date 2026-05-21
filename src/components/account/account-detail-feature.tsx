'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ExplorerLink } from '../cluster/cluster-ui'
import { AccountBalance, AccountButtons, AccountTokens, AccountTransactions } from './account-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'
import { CopyIcon } from 'lucide-react'

import { IdCard as IdentificationIcon, History as HistoryIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react'
import RoleDashboard from './txn-ui'
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

              <button
                onClick={() => navigator.clipboard.writeText(address.toString())}
                className="ml-2 hover:text-blue-500 transition-colors"
                title="Copy address"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-500">This is your unique cryptographic ID on the Vote Chain.</p>
          </div>
        }
      >
        <div className="my-4">
          <AccountButtons address={address} />
        </div>
      </AppHero>

       <RoleDashboard address={address} />
       

    </div>
  )
}




