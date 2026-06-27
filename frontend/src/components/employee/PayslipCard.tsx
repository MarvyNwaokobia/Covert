'use client'

import { useEmployeeData } from '@/hooks/useEmployeeData'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

function formatCUSDT(raw: bigint): string {
  const n = Number(raw) / 1_000_000
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const stateLabels: Record<string, string> = {
  idle:       'Your salary is stored as an encrypted value on-chain. Request decryption to view it.',
  signing:    'Waiting for wallet signature…',
  fetching:   'Fetching re-encrypted salary from contract…',
  decrypting: 'Decrypting locally in your browser…',
  revealed:   '',
  error:      'Decryption failed. Try again.',
}

export function PayslipCard() {
  const { decryptSalary, resetDecrypt, decryptState, decryptedSalary } = useEmployeeData()

  const isBusy = ['signing', 'fetching', 'decrypting'].includes(decryptState)

  return (
    <Card glow="employee">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Your Payslip</CardTitle>
            <CardDescription>
              Salary is stored as TFHE-encrypted cUSDT. Only you can decrypt it.
            </CardDescription>
          </div>
          {decryptState === 'revealed' && (
            <Badge variant="employee">Decrypted</Badge>
          )}
        </div>
      </CardHeader>

      <div className="space-y-4">
        {/* Encrypted placeholder / revealed value */}
        <div className="relative rounded-xl bg-bg-elevated border border-border-default overflow-hidden">
          {decryptState !== 'revealed' ? (
            <div className="px-6 py-8 text-center">
              {/* Blurred fake salary */}
              <p className="text-4xl font-bold text-text-primary blur-sm select-none">
                ████████
              </p>
              <p className="mt-2 text-sm text-text-muted">cUSDT · Encrypted</p>

              {/* Encryption badge */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                bg-employee/10 border border-employee/20">
                <span className="w-1.5 h-1.5 rounded-full bg-employee animate-pulse" />
                <span className="text-xs text-employee font-medium">TFHE Protected</span>
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-4xl font-bold text-employee font-mono">
                {decryptedSalary !== null ? formatCUSDT(decryptedSalary) : '0'}
              </p>
              <p className="mt-2 text-sm text-text-muted">cUSDT · This session only</p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                bg-employee/20 border border-employee/40">
                <span className="text-xs text-employee font-medium">✓ Decrypted locally</span>
              </div>
            </div>
          )}

          {/* Glitch scan-line effect when busy */}
          {isBusy && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-full h-px bg-employee/40 animate-[scan_1.5s_linear_infinite]" />
            </div>
          )}
        </div>

        {/* Status message */}
        {stateLabels[decryptState] && (
          <p className="text-xs text-text-muted text-center px-2">
            {stateLabels[decryptState]}
          </p>
        )}

        {/* Step indicators when busy */}
        {isBusy && (
          <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
            <Step label="Sign" active={decryptState === 'signing'} done={['fetching','decrypting'].includes(decryptState)} />
            <div className="w-4 h-px bg-border-default" />
            <Step label="Fetch" active={decryptState === 'fetching'} done={decryptState === 'decrypting'} />
            <div className="w-4 h-px bg-border-default" />
            <Step label="Decrypt" active={decryptState === 'decrypting'} done={false} />
          </div>
        )}

        {/* Action button */}
        {decryptState !== 'revealed' ? (
          <Button
            variant="employee"
            className="w-full"
            loading={isBusy}
            disabled={isBusy}
            onClick={decryptSalary}
          >
            {isBusy ? 'Decrypting…' : 'Decrypt My Salary'}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full text-text-muted"
            onClick={resetDecrypt}
          >
            Hide salary
          </Button>
        )}

        <p className="text-xs text-text-subtle text-center">
          EIP-712 · No gas · Decrypted only in your browser
        </p>
      </div>
    </Card>
  )
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1 transition-colors ${
      done ? 'text-employee' : active ? 'text-text-primary' : 'text-text-subtle'
    }`}>
      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${
        done
          ? 'border-employee bg-employee/20'
          : active
          ? 'border-text-primary'
          : 'border-border-default'
      }`}>
        {done ? '✓' : ''}
      </span>
      {label}
    </div>
  )
}
