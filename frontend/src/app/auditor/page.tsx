'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AggregateStats } from '@/components/auditor/AggregateStats'

export default function AuditorPage() {
  return (
    <RoleGuard allowedRole="auditor">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="auditor">Auditor</Badge>
            <span className="text-text-subtle text-xs">· Read-only · Sepolia Testnet</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Aggregate View</h1>
          <p className="mt-1 text-text-muted text-sm">
            Verify solvency and disbursement totals without accessing any individual salary.
          </p>
        </div>

        {/* Aggregate stats + decrypt */}
        <AggregateStats />

        {/* Privacy guarantee */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Guarantees</CardTitle>
            <CardDescription>
              What the FHEVM contract enforces on-chain
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium text-employee">What you can see</p>
              <ul className="space-y-1 text-text-muted">
                <li>✓ Total payroll disbursed (aggregate)</li>
                <li>✓ Total bonuses allocated (aggregate)</li>
                <li>✓ Number of employees</li>
                <li>✓ Number of payroll cycles run</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-red-400">What you cannot see</p>
              <ul className="space-y-1 text-text-muted">
                <li>✗ Any individual salary</li>
                <li>✗ Who received which amount</li>
                <li>✗ Individual bonus allocations</li>
                <li>✗ Employer's internal payroll data</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 px-3 py-2 rounded-lg bg-auditor/10 border border-auditor/20 text-xs text-auditor">
            These restrictions are enforced by the FHEVM smart contract — not by the UI.
            Even if you bypass this frontend, the on-chain logic prevents individual decryption.
          </div>
        </Card>

        {/* Distribution history */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution History</CardTitle>
            <CardDescription>
              PayrollTriggered on-chain events. No salary amounts are emitted.
            </CardDescription>
          </CardHeader>
          <div className="text-center py-6 text-text-subtle text-sm">
            No payroll cycles run yet.
          </div>
        </Card>

      </div>
    </RoleGuard>
  )
}
