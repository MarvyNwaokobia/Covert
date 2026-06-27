'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useRole } from '@/hooks/useRole'
import { Spinner } from '@/components/ui/Spinner'

const roleRoutes = {
  employer: '/employer',
  employee: '/employee',
  auditor:  '/auditor',
} as const

export default function HomePage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { role, isLoading } = useRole()

  useEffect(() => {
    if (!isConnected || isLoading) return
    const route = roleRoutes[role as keyof typeof roleRoutes]
    if (route) router.replace(route)
  }, [isConnected, role, isLoading, router])

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-employer/10 border border-employer/20 flex items-center justify-center">
            <span className="text-3xl font-bold text-employer">C</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Covert</h1>
            <p className="mt-2 text-text-muted text-sm">
              Confidential on-chain compensation. Powered by{' '}
              <span className="text-text-primary font-medium">Zama FHEVM</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {['Encrypted payroll', 'Private peer bonuses', 'Verifiable without exposure'].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-bg-elevated border border-border-subtle text-text-muted">
              {f}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-text-muted text-sm">Connect your wallet to continue</p>
              <ConnectButton />
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Spinner size="sm" />
              Checking your role on-chain...
            </div>
          ) : role === 'unknown' ? (
            <div className="space-y-2 text-center">
              <p className="text-text-muted text-sm">
                Your wallet has no role in this Covert deployment.
              </p>
              <p className="text-text-subtle text-xs">
                Contact the employer to be added as an employee or auditor.
              </p>
            </div>
          ) : null}
        </div>

        {isConnected && role === 'unknown' && !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Employer', colorClass: 'text-employer', desc: 'Upload & distribute payroll' },
              { label: 'Employee', colorClass: 'text-employee', desc: 'View your encrypted salary' },
              { label: 'Auditor',  colorClass: 'text-auditor',  desc: 'Verify aggregate totals' },
            ].map(({ label, colorClass, desc }) => (
              <div key={label} className="p-3 rounded-lg bg-bg-surface border border-border-subtle text-left">
                <div className={`text-xs font-semibold ${colorClass} mb-1`}>{label}</div>
                <div className="text-xs text-text-subtle">{desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
