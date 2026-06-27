'use client'

import { useState } from 'react'
import { isAddress } from 'viem'
import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PayslipCard } from '@/components/employee/PayslipCard'
import { useEmployeeData } from '@/hooks/useEmployeeData'

function PeerBonusPanel() {
  const { decryptBudget, allocatePeerBonus, decryptedBudget, decryptState } = useEmployeeData()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const validRecipient = isAddress(recipient.trim())
  const validAmount = parseFloat(amount) > 0

  async function handleSend() {
    if (!validRecipient || !validAmount) return
    setBusy(true)
    const raw = BigInt(Math.round(parseFloat(amount) * 1_000_000))
    await allocatePeerBonus(recipient.trim() as `0x${string}`, raw)
    setRecipient('')
    setAmount('')
    setBusy(false)
  }

  const budgetDisplay =
    decryptedBudget !== null
      ? `${(Number(decryptedBudget) / 1_000_000).toFixed(2)} cUSDT`
      : '••••'

  return (
    <Card glow="employee">
      <CardHeader>
        <CardTitle>Peer Bonuses</CardTitle>
        <CardDescription>
          Allocate part of your encrypted bonus budget to colleagues anonymously.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {/* Budget display */}
        <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">My budget</span>
            <span className="text-text-primary font-mono">{budgetDisplay}</span>
          </div>
          {decryptedBudget === null && (
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={decryptBudget}
              loading={decryptState === 'signing' || decryptState === 'fetching' || decryptState === 'decrypting'}
              disabled={decryptState !== 'idle' && decryptState !== 'error'}
            >
              Reveal budget
            </Button>
          )}
        </div>

        {/* Send form */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Recipient 0x…"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={busy}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-border-default rounded-lg
              text-text-primary placeholder:text-text-subtle font-mono
              focus:outline-none focus:border-employee/50 focus:ring-1 focus:ring-employee/20
              disabled:opacity-40"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount (cUSDT)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              disabled={busy}
              className="flex-1 px-3 py-2 text-sm bg-bg-elevated border border-border-default rounded-lg
                text-text-primary placeholder:text-text-subtle
                focus:outline-none focus:border-employee/50 focus:ring-1 focus:ring-employee/20
                disabled:opacity-40"
            />
            <Button
              variant="employee"
              loading={busy}
              disabled={!validRecipient || !validAmount || busy}
              onClick={handleSend}
            >
              Send
            </Button>
          </div>
        </div>

        <p className="text-xs text-text-subtle text-center">
          Bonus amount is encrypted before leaving your browser
        </p>
      </div>
    </Card>
  )
}

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
          <PayslipCard />
          <PeerBonusPanel />
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
