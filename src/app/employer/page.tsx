'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Spinner'

export default function EmployerPage() {
  return (
    <RoleGuard allowedRole="employer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="employer">Employer</Badge>
              <span className="text-text-subtle text-xs">· Sepolia Testnet</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Payroll Dashboard</h1>
            <p className="mt-1 text-text-muted text-sm">
              Manage encrypted compensation for your team.
            </p>
          </div>
          <Button variant="employer" size="sm" disabled>
            + Add Employee
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Employees', value: '—' },
            { label: 'Payroll Cycles', value: '—' },
            { label: 'Bonus Pool', value: '••••' },
            { label: 'Last Distribution', value: '—' },
          ].map(({ label, value }) => (
            <Card key={label} className="py-4">
              <p className="text-xs text-text-muted mb-1">{label}</p>
              <p className="text-xl font-semibold text-text-primary">{value}</p>
            </Card>
          ))}
        </div>

        {/* Main panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upload Payroll — F-03 */}
          <Card glow="employer">
            <CardHeader>
              <CardTitle>Upload Payroll</CardTitle>
              <CardDescription>
                Salary amounts are encrypted in your browser before reaching the contract.
              </CardDescription>
            </CardHeader>
            <div className="space-y-3">
              <SkeletonCard className="opacity-40" />
              <p className="text-xs text-text-subtle text-center">
                Payroll upload form — coming in F-03
              </p>
            </div>
          </Card>

          {/* Distribution Trigger — F-04 */}
          <Card glow="employer">
            <CardHeader>
              <CardTitle>Trigger Distribution</CardTitle>
              <CardDescription>
                Execute the payroll round. Encrypted cUSDT sent to each employee.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Ready to distribute</span>
                  <span className="text-text-primary font-medium">0 employees</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total (encrypted)</span>
                  <span className="text-text-primary font-mono">••••••</span>
                </div>
              </div>
              <Button variant="employer" className="w-full" disabled>
                Run Payroll
              </Button>
              <p className="text-xs text-text-subtle text-center">
                Distribution trigger — coming in F-04
              </p>
            </div>
          </Card>
        </div>

        {/* Bonus Pool */}
        <Card>
          <CardHeader>
            <CardTitle>Peer Bonus Pool</CardTitle>
            <CardDescription>
              Fund the encrypted bonus pool that employees allocate among each other.
            </CardDescription>
          </CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-text-muted text-sm">Pool balance: <span className="text-text-primary font-mono">••••</span></div>
            <Button variant="secondary" size="sm" disabled>Fund Pool</Button>
          </div>
        </Card>

      </div>
    </RoleGuard>
  )
}
