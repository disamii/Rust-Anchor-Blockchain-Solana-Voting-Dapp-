'use client'
import { useWallet } from '@solana/wallet-adapter-react'
import { redirect } from 'next/navigation'
import { ConnectWalletGate } from './account'

export default function AccountListFeature() {
  const { publicKey } = useWallet()

  if (publicKey) {
    return redirect(`/account/${publicKey.toString()}`)
  }

  return <ConnectWalletGate/>
}