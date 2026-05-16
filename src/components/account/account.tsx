import { LockClosedIcon } from "@heroicons/react/24/outline";
import { ShieldCheckIcon } from "lucide-react";
import { WalletButton } from "../solana/solana-provider";

export function ConnectWalletGate() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="relative overflow-hidden max-w-lg w-full rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.08)]">
        
        {/* glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-violet-500/10 pointer-events-none" />

        <div className="relative p-8 sm:p-10">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <LockClosedIcon className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Connect Your Wallet
              </h1>

              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 max-w-sm">
                Authenticate with your secure Web3 identity to access governance,
                verify voting rights, and participate in on-chain elections.
              </p>
            </div>
          </div>

          {/* Wallet Action */}
          <div className="mt-10 flex flex-col items-center gap-5">
            <div className="scale-110">
              <WalletButton />
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
              <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                End-to-End Secured
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />

          {/* Trust Note */}
          <div className="flex items-start gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
              <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="space-y-1 text-left">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Privacy First
              </h3>

              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Your private keys never leave your wallet. Signing only proves
                ownership of your identity and authorizes blockchain actions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}