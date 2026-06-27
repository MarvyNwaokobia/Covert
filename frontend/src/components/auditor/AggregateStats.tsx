'use client'

import { useAuditorData } from '@/hooks/useAuditorData'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

function formatCUSDT(raw: bigint): string {
  const n = Number(raw) / 1_000_000
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatCard({
  label,
  value,
  unit,
  encrypted,
}: {
  label: string
  value: string | bigint | undefined
  unit?: string
  encrypted?: boolean
}) {
  const display =
    value === undefined
      ? '—'
      : encrypted
      ? '████████'
      : typeof value === 'bigint'
      ? formatCUSDT(value)
      : String(value)

  return (
    <div className="flex flex-col gap-1.5 px-5 py-4 rounded-xl bg-bg-elevated border border-border-default">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-2xl font-bold font-mono ${encrypted ? 'blur-sm select-none text-text-subtle' : 'text-text-primary'}`}>
        {display}
      </span>
      {unit && !encrypted && value !== undefined && (
        <span className="text-xs text-text-muted">{unit}</span>
      )}
      {encrypted && (
        <span className="text-xs text-auditor">Decrypt to reveal</span>
      )}
    </div>
  )
}

export function AggregateStats() {
  const {
    decryptAggregates,
    isDecrypting,
    totalDisbursed,
    totalBonusAllocated,
    employeeCount,
    cycleCount,
  } = useAuditorData()

  const hasDecrypted = totalDisbursed !== null

  return (
    <Card glow="auditor">
      <CardHeader>
        <CardTitle>Aggregate Financials</CardTitle>
        <CardDescription>
          View protocol-wide totals without accessing any individual salary.
          Individual data stays encrypted — only aggregates are revealed.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Disbursed"
            value={totalDisbursed ?? undefined}
            unit="cUSDT"
            encrypted={!hasDecrypted}
          />
          <StatCard
            label="Total Bonuses"
            value={totalBonusAllocated ?? undefined}
            unit="cUSDT"
            encrypted={!hasDecrypted}
          />
          <StatCard label="Employee Count" value={employeeCount} />
          <StatCard label="Payroll Cycles" value={cycleCount} />
        </div>

        {/* Privacy note */}
        {hasDecrypted && (
          <div className="px-3 py-2 rounded-lg bg-auditor/10 border border-auditor/20 text-xs text-auditor">
            ✓ Aggregates decrypted. Individual salaries are not accessible — the contract enforces this.
          </div>
        )}

        {/* Decrypt button */}
        <Button
          variant="auditor"
          className="w-full"
          loading={isDecrypting}
          disabled={isDecrypting}
          onClick={decryptAggregates}
        >
          {isDecrypting
            ? 'Decrypting aggregates…'
            : hasDecrypted
            ? 'Refresh Aggregates'
            : 'Decrypt Aggregate View'
          }
        </Button>

        <p className="text-xs text-text-subtle text-center">
          EIP-712 · No gas · Aggregate-only access enforced on-chain
        </p>
      </div>
    </Card>
  )
}
