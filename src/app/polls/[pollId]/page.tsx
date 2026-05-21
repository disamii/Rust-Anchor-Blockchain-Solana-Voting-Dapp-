'use client'   // ← ADD THIS as line 1

import { useWalletRole } from '@/components/account/account-data-access'
import { PollDetailPage } from '@/components/poll/poll-detail'
import { useWallet } from '@solana/wallet-adapter-react'
import { ConnectWalletGate } from '@/components/account/account'

export default function PollDetailRoute({ params }) {
  const { publicKey } = useWallet()
  if (!publicKey) {
    return <ConnectWalletGate/>
  }
  const { data: role } = useWalletRole({ address: publicKey })
  return <PollDetailPage pollId={Number(params.pollId)} canVote={role !== 'superadmin'} canCreate={role === 'institution_admin'} />
}
