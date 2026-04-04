'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { redirect } from 'next/navigation'
import { ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'

export default function AccountListFeature() {
  const { publicKey } = useWallet()

  // If already verified, send them to their profile immediately
  if (publicKey) {
    return redirect(`/account/${publicKey.toString()}`)
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 p-8 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-white/5 shadow-sm">
        
        {/* 1. Trust Icon */}
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <LockClosedIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* 2. Clear Messaging */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Verify Your Identity</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            To view your voting power and cast ballots, please connect your secure Web3 ID.
          </p>
        </div>

        {/* 3. The "Action" Button (The Wallet Button) */}
        <div className="flex flex-col items-center gap-4">
          <div className="transform scale-110">
             <WalletButton />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            Secured by End-to-End Encryption
          </p>
        </div>

        {/* 4. Safety Note */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-start gap-3 text-left">
          <ShieldCheckIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>Privacy First:</strong> Your company cannot see your private keys. Connecting only proves you own this ID and allows you to sign votes.
          </p>
        </div>
      </div>
    </div>
  )
}