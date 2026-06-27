export type Role = 'employer' | 'employee' | 'auditor' | 'unknown'

export interface Employee {
  address: `0x${string}`
  encryptedSalary?: string
  decryptedSalary?: bigint
}

export interface PayrollEntry {
  address: `0x${string}`
  amount: bigint
}

export interface PeerBonusAllocation {
  recipient: `0x${string}`
  encryptedAmount: string
}

export interface AuditStats {
  totalDisbursed?: bigint
  totalBonusAllocated?: bigint
  recipientCount?: number
  cycleCount?: number
}

export interface TxState {
  status: 'idle' | 'pending' | 'success' | 'error'
  hash?: `0x${string}`
  error?: string
}
