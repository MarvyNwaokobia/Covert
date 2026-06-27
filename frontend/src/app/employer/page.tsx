'use client'

import { useState } from 'react'
import { isAddress } from 'viem'
import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PayrollUploadForm } from '@/components/employer/PayrollUploadForm'
import { DistributionButton } from '@/components/employer/DistributionButton'
import { usePayroll } from '@/hooks/usePayroll'
import { useReadContracts } from 'wagmi'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import CovertABI from '@/lib/abi/CovertPayroll.json'
import { type Abi } from 'viem'

const abi = CovertABI as Abi
const contractEnabled = COVERT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'

function AddEmployeePanel() {
  const [input, setInput] = useState('')
  const { addEmployee } = usePayroll()
  const [busy, setBusy] = useState(false)

  const valid = isAddress(input.trim())

  async function handleAdd() {
    if (!valid) return
    setBusy(true)
    await addEmployee(input.trim() as `0x${string}`)
    setInput('')
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Employee</CardTitle>
        <CardDescription>
          Register a wallet address as an employee so they can receive payroll.
        </CardDescription>
      </CardHeader>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          className="flex-1 px-3 py-2 text-sm bg-bg-elevated border border-border-default rounded-lg
            text-text-primary placeholder:text-text-subtle font-mono
            focus:outline-none focus:border-employer/50 focus:ring-1 focus:ring-employer/20
            disabled:opacity-40"
        />
        <Button
          variant="employer"
          loading={busy}
          disabled={!valid || busy}
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
    </Card>
  )
}

export default function EmployerPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: COVERT_CONTRACT_ADDRESS, abi, functionName: 'getEmployeeCount' },
      { address: COVERT_CONTRACT_ADDRESS, abi, functionName: 'getCycleCount' },
    ],
    query: { enabled: contractEnabled },
  })

  const employeeCount = data?.[0]?.result as bigint | undefined
  const cycleCount = data?.[1]?.result as bigint | undefined

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
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Employees', value: employeeCount !== undefined ? String(employeeCount) : '—' },
            { label: 'Payroll Cycles', value: cycleCount !== undefined ? String(cycleCount) : '—' },
            { label: 'Total Payroll', value: '•••••• cUSDT' },
            { label: 'Bonus Pool', value: '•••••• cUSDT' },
          ].map(({ label, value }) => (
            <Card key={label} className="py-4">
              <p className="text-xs text-text-muted mb-1">{label}</p>
              <p className="text-lg font-semibold text-text-primary font-mono">{value}</p>
            </Card>
          ))}
        </div>

        {/* Main action panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PayrollUploadForm />
          <DistributionButton />
        </div>

        {/* Add employee */}
        <AddEmployeePanel />

        {/* Bonus pool funding */}
        <Card>
          <CardHeader>
            <CardTitle>Peer Bonus Pool</CardTitle>
            <CardDescription>
              Fund the encrypted bonus pool that employees allocate among each other.
              The amount deposited stays private from non-employer roles.
            </CardDescription>
          </CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-text-muted text-sm">
              Pool balance: <span className="text-text-primary font-mono">••••</span>
            </div>
            <Button variant="secondary" size="sm" disabled>
              Fund Pool
            </Button>
          </div>
        </Card>

      </div>
    </RoleGuard>
  )
}
