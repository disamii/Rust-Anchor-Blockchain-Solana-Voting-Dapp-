import { AppHero } from '@/components/app-hero'
import { CheckBadgeIcon, ShieldCheckIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'

export function DashboardFeature() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-slate-900 dark:text-slate-100">
      <AppHero 
        title="Vote Chain" 
        subtitle="Immutable. Private. Mathematically Provable." 
      />

      <div className="max-w-5xl mx-auto px-4 py-12">
        
        {/* 2. The "Web3 Benefit" Grid: Explaining why they are here */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-bold text-lg mb-2">Tamper-Proof</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Once your vote is cast on the chain, no admin or CEO can change the result.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
            <CheckBadgeIcon className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-bold text-lg mb-2">Verified Identity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your cryptographic signature proves you are authorized without revealing who you are.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
            <DocumentMagnifyingGlassIcon className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-bold text-lg mb-2">Public Ledger</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Anyone can audit the results in real-time, ensuring total Voing transparency.
            </p>
          </div>
        </div>

        {/* 3. The "Action" Center */}
        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0">
            <h2 className="text-2xl font-bold italic">Ready to make an impact?</h2>
            <p className="text-slate-300">View the active proposals for your organization.</p>
          </div>
          <div className="flex gap-4">
            <button className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors">
              Browse Proposals
            </button>
            <button className="border border-white/30 px-6 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors">
              View Analytics
            </button>
          </div>
        </div>

        {/* 4. Trust Proof Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">
            Powered by Secure Decentralized Infrastructure
          </p>
          <div className="flex justify-center gap-8 opacity-50 grayscale">
            {/* These represent 'Trust Marks' rather than technical links */}
            <span className="text-sm font-mono">ENCRYPTED_VOTE_v1.0</span>
            <span className="text-sm font-mono">PROVABLE_TRUST_STAMP</span>
            <span className="text-sm font-mono">ZERO_KNOWLEDGE_PROOF</span>
          </div>
        </div>
      </div>
    </div>
  )
}