'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { usePayroll } from '@/hooks/usePayroll'

export function DistributionButton() {
  const { triggerDistribution, txState } = usePayroll()

  const isPending = txState.status === 'pending'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trigger Distribution</CardTitle>
        <CardDescription>
          Sends encrypted cUSDT to all employees based on the last uploaded payroll.
          On-chain balances remain confidential.
        </CardDescription>
      </CardHeader>

      <div className="space-y-3">
        {txState.status === 'success' && txState.hash && (
          <div className="px-3 py-2 rounded-lg bg-employee/10 border border-employee/20 text-xs">
            <p className="text-employee font-medium">Distribution complete</p>
            <p className="font-mono text-text-muted mt-0.5 break-all">
              {txState.hash}
            </p>
          </div>
        )}

        {txState.status === 'error' && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {txState.error}
          </div>
        )}

        <Button
          variant="employer"
          className="w-full"
          loading={isPending}
          disabled={isPending}
          onClick={triggerDistribution}
        >
          {isPending ? 'Distributing…' : 'Run Payroll Distribution'}
        </Button>

        <p className="text-xs text-text-subtle text-center">
          Only the employer can call this. Employees receive cUSDT automatically.
        </p>
      </div>
    </Card>
  )
}
