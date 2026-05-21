'use client'  

import { ConnectWalletGate } from '@/components/account/account'
import { useWalletRole } from '@/components/account/account-data-access'
import { PollListPage } from '@/components/poll/poll'
import { useWallet } from '@solana/wallet-adapter-react'

export default function PollsPage() {
  const { publicKey } = useWallet()
   if (!publicKey) {
      return <ConnectWalletGate/>
    }
  const { data: role } = useWalletRole({ address: publicKey })
  return <PollListPage canVote={role !== 'superadmin'} canCreate={role === 'institution_admin'} />
}

