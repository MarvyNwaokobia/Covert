'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/Button'

export default function UnauthorizedPage() {
  const { address } = useAccount()

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔒</span>
        </div>

        <div>
          <h1 className="text-xl font-bold text-text-primary">Access Restricted</h1>
          <p className="mt-2 text-text-muted text-sm">
            Your connected wallet does not have permission to view this dashboard.
          </p>
        </div>

        {address && (
          <div className="p-3 rounded-lg bg-bg-surface border border-border-subtle">
            <p className="text-xs text-text-muted mb-1">Connected as</p>
            <p className="text-xs font-mono text-text-primary break-all">{address}</p>
          </div>
        )}

        <p className="text-text-subtle text-xs">
          Connect with the correct wallet, or ask the employer to assign you a role in the contract.
        </p>

        <Link href="/">
          <Button variant="secondary" className="w-full">← Back to Home</Button>
        </Link>
      </div>
    </main>
  )
}
