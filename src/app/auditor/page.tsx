'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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
            Verify solvency and disbursement totals without accessing any individual amount.
          </p>
        </div>

        {/* Aggregate stats — F-07 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Disbursed',
              value: '••••••',
              sub: 'cUSDT · encrypted aggregate',
              color: 'text-auditor',
            },
            {
              label: 'Bonus Pool Allocated',
              value: '••••••',
              sub: 'cUSDT · encrypted aggregate',
              color: 'text-auditor',
            },
            {
              label: 'Payroll Cycles',
              value: '—',
              sub: 'Total distributions run',
              color: 'text-text-primary',
            },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} glow="auditor">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-xs text-text-subtle mt-1">{sub}</p>
            </Card>
          ))}
        </div>

        {/* Decrypt aggregates */}
        <Card glow="auditor">
          <CardHeader>
            <CardTitle>Decrypt Aggregate Totals</CardTitle>
            <CardDescription>
              Sign with your auditor wallet to reveal the aggregate sums. Individual salaries remain hidden.
              This is the FHE paradox: the total is provable without exposing the parts.
            </CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle text-sm text-text-muted space-y-1">
              <p>✓ You will see: total payroll disbursed, total bonus pool used, number of recipients</p>
              <p>✗ You will never see: any individual salary, who received what amount</p>
            </div>
            <Button variant="auditor" className="w-full" disabled>
              🔓 Decrypt Aggregates
            </Button>
            <p className="text-xs text-text-subtle text-center">
              Auditor decryption flow — coming in F-07
            </p>
          </div>
        </Card>

        {/* Distribution history */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution History</CardTitle>
            <CardDescription>
              On-chain events — PayrollTriggered. No amounts recorded in events.
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
