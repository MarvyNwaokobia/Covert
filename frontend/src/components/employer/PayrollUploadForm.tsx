'use client'

import { useState } from 'react'
import { isAddress } from 'viem'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { usePayroll } from '@/hooks/usePayroll'
import { useFhevm } from '@/hooks/useFhevm'
import { type PayrollEntry } from '@/types'

interface Row {
  id: string
  address: string
  amount: string
}

function newRow(): Row {
  return { id: Math.random().toString(36).slice(2), address: '', amount: '' }
}

function formatUSDT(value: string): bigint | null {
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) return null
  // cUSDT uses 6 decimals like USDT
  return BigInt(Math.round(num * 1_000_000))
}

function rowErrors(row: Row) {
  const errs: string[] = []
  if (row.address && !isAddress(row.address)) errs.push('Invalid address')
  if (row.amount && formatUSDT(row.amount) === null) errs.push('Invalid amount')
  return errs
}

export function PayrollUploadForm() {
  const [rows, setRows] = useState<Row[]>([newRow()])
  const { uploadPayroll, txState, isEncrypting } = usePayroll()
  const { isReady } = useFhevm()

  function updateRow(id: string, field: keyof Omit<Row, 'id'>, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()])
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entries: PayrollEntry[] = []
    for (const row of rows) {
      if (!row.address || !row.amount) continue
      if (!isAddress(row.address)) continue
      const amount = formatUSDT(row.amount)
      if (!amount) continue
      entries.push({ address: row.address as `0x${string}`, amount })
    }
    if (!entries.length) return
    await uploadPayroll(entries)
  }

  const validCount = rows.filter(
    (r) => r.address && isAddress(r.address) && formatUSDT(r.amount) !== null
  ).length

  const isBusy = isEncrypting || txState.status === 'pending'

  return (
    <Card glow="employer">
      <CardHeader>
        <CardTitle>Upload Payroll</CardTitle>
        <CardDescription>
          Salary amounts are encrypted in your browser before the transaction is sent.
          The contract stores only ciphertext — no plaintext ever touches the chain.
        </CardDescription>
      </CardHeader>

      {!isReady && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-auditor/10 border border-auditor/20 text-xs text-auditor">
          Connect to Sepolia to enable FHE encryption
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-1">
          <span className="text-xs text-text-muted">Employee wallet address</span>
          <span className="text-xs text-text-muted">Salary (cUSDT)</span>
          <span />
        </div>

        {/* Entry rows */}
        {rows.map((row, i) => {
          const errs = rowErrors(row)
          return (
            <div key={row.id} className="space-y-1">
              <div className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                <input
                  type="text"
                  placeholder="0x…"
                  value={row.address}
                  onChange={(e) => updateRow(row.id, 'address', e.target.value)}
                  disabled={isBusy}
                  className="w-full px-3 py-2 text-sm bg-bg-elevated border border-border-default rounded-lg
                    text-text-primary placeholder:text-text-subtle font-mono
                    focus:outline-none focus:border-employer/50 focus:ring-1 focus:ring-employer/20
                    disabled:opacity-40"
                />
                <input
                  type="number"
                  placeholder="0.00"
                  value={row.amount}
                  min="0"
                  step="0.01"
                  onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                  disabled={isBusy}
                  className="w-full px-3 py-2 text-sm bg-bg-elevated border border-border-default rounded-lg
                    text-text-primary placeholder:text-text-subtle
                    focus:outline-none focus:border-employer/50 focus:ring-1 focus:ring-employer/20
                    disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => rows.length > 1 && removeRow(row.id)}
                  disabled={rows.length === 1 || isBusy}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-subtle
                    hover:text-red-400 hover:bg-red-500/10 transition-colors
                    disabled:opacity-20 disabled:cursor-not-allowed"
                >✕</button>
              </div>
              {errs.length > 0 && (
                <p className="text-xs text-red-400 pl-1">{errs.join(' · ')}</p>
              )}
            </div>
          )
        })}

        {/* Add row */}
        <button
          type="button"
          onClick={addRow}
          disabled={isBusy}
          className="w-full py-2 text-sm text-text-muted border border-dashed border-border-default
            rounded-lg hover:border-employer/40 hover:text-employer transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add employee
        </button>

        {/* FHE notice */}
        {validCount > 0 && (
          <div className="px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-xs text-text-muted">
            <span className="text-employer font-medium">{validCount} salary{validCount !== 1 ? 'ies' : ''}</span>
            {' '}will be encrypted with TFHE before leaving your browser.
            {isEncrypting && ' Encrypting now…'}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="employer"
          className="w-full"
          loading={isBusy}
          disabled={!isReady || validCount === 0 || isBusy}
        >
          {isEncrypting
            ? 'Encrypting…'
            : txState.status === 'pending'
            ? 'Sending to chain…'
            : `Upload ${validCount > 0 ? validCount : ''} Encrypted Salary${validCount !== 1 ? 'ies' : ''}`
          }
        </Button>

        {txState.status === 'success' && (
          <div className="text-center text-xs text-employee">
            ✓ Payroll stored on-chain. Run distribution when ready.
          </div>
        )}
      </form>
    </Card>
  )
}
