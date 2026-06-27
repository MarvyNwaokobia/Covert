'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Badge } from './ui/Badge'
import { type Role } from '@/types'

const roleLabels: Record<Role, string> = {
  employer: 'Employer',
  employee: 'Employee',
  auditor:  'Auditor',
  unknown:  'No Role',
}

interface WalletButtonProps {
  role?: Role
}

export function WalletButton({ role }: WalletButtonProps) {
  return (
    <div className="flex items-center gap-3">
      {role && role !== 'unknown' && (
        <Badge variant={role}>{roleLabels[role]}</Badge>
      )}
      <ConnectButton
        accountStatus="avatar"
        chainStatus="icon"
        showBalance={false}
      />
    </div>
  )
}
