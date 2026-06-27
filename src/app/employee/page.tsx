'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Spinner'

export default function EmployeePage() {
  return (
    <RoleGuard allowedRole="employee">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="employee">Employee</Badge>
            <span className="text-text-subtle text-xs">· Sepolia Testnet</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">My Compensation</h1>
          <p className="mt-1 text-text-muted text-sm">
            Your salary is encrypted on-chain. Only you can decrypt it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Payslip Card — F-05 */}
          <Card glow="employee">
            <CardHeader>
              <CardTitle>My Payslip</CardTitle>
              <CardDescription>
                Sign with your wallet to reveal your salary. Decryption happens locally.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-bg-elevated border border-border-subtle text-center space-y-2">
                <p className="text-xs text-text-muted uppercase tracking-widest">Monthly Salary</p>
                <p className="text-4xl font-bold text-text-primary font-mono tracking-widest">
                  ••••••
                </p>
                <p className="text-xs text-text-subtle">cUSDT · encrypted</p>
              </div>
              <Button variant="employee" className="w-full" disabled>
                🔓 Decrypt My Salary
              </Button>
              <p className="text-xs text-text-subtle text-center">
                EIP-712 decryption flow — coming in F-05
              </p>
            </div>
          </Card>

          {/* Peer Bonus — F-06 */}
          <Card glow="employee">
            <CardHeader>
              <CardTitle>Peer Bonuses</CardTitle>
              <CardDescription>
                Allocate part of your encrypted bonus budget to colleagues.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">My budget</span>
                  <span className="text-text-primary font-mono">••••</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Allocated</span>
                  <span className="text-text-primary font-mono">••••</span>
                </div>
                <div className="h-px bg-border-subtle" />
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Remaining</span>
                  <span className="text-employee font-mono font-semibold">••••</span>
                </div>
              </div>
              <SkeletonCard className="opacity-40" />
              <p className="text-xs text-text-subtle text-center">
                Peer bonus allocation — coming in F-06
              </p>
            </div>
          </Card>
        </div>

        {/* Received bonuses */}
        <Card>
          <CardHeader>
            <CardTitle>Received Bonuses</CardTitle>
            <CardDescription>
              Colleagues who sent you a peer bonus. Amounts are private.
            </CardDescription>
          </CardHeader>
          <div className="text-center py-6 text-text-subtle text-sm">
            No bonuses received yet.
          </div>
        </Card>

      </div>
    </RoleGuard>
  )
}
