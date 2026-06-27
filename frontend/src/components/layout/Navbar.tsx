'use client'

import Link from 'next/link'
import { useRole } from '@/hooks/useRole'
import { WalletButton } from '@/components/WalletButton'
import { useAccount } from 'wagmi'

const roleRoutes: Record<string, string> = {
  employer: '/employer',
  employee: '/employee',
  auditor: '/auditor',
}

export function Navbar() {
  const { role } = useRole()
  const { isConnected } = useAccount()

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href={isConnected && role !== 'unknown' ? (roleRoutes[role] ?? '/') : '/'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-employer/20 border border-employer/30 flex items-center justify-center">
              <span className="text-employer text-xs font-bold">C</span>
            </div>
            <span className="text-text-primary font-semibold tracking-tight">Covert</span>
            <span className="text-text-subtle text-xs hidden sm:block">/ confidential payroll</span>
          </Link>

          <WalletButton role={role} />
        </div>
      </div>
    </nav>
  )
}
