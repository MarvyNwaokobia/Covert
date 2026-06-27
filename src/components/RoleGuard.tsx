'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useRole } from '@/hooks/useRole'
import { type Role } from '@/types'
import { Spinner } from './ui/Spinner'

interface RoleGuardProps {
  allowedRole: Role
  children: React.ReactNode
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { role, isLoading } = useRole()

  useEffect(() => {
    if (!isConnected) {
      router.replace('/')
      return
    }
    if (!isLoading && role !== 'unknown' && role !== allowedRole) {
      router.replace('/unauthorized')
    }
  }, [isConnected, role, isLoading, allowedRole, router])

  if (!isConnected) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-text-muted">
        <Spinner size="md" />
        <span className="text-sm">Detecting role...</span>
      </div>
    )
  }

  if (role !== allowedRole) return null

  return <>{children}</>
}
