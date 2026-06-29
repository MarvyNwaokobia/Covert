'use client'

import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { useFhevm } from './useFhevm'
import { useToast } from '@/providers/ToastProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import CovertABI from '@/lib/abi/CovertPayroll.json'
import { type Abi } from 'viem'

const abi = CovertABI as Abi

export function useAuditorData() {
  const { userDecryptHandles, isReady } = useFhevm()
  const { toast } = useToast()

  const [isDecrypting, setIsDecrypting] = useState(false)
  const [totalDisbursed, setTotalDisbursed] = useState<bigint | null>(null)
  const [totalBonusAllocated, setTotalBonusAllocated] = useState<bigint | null>(null)

  const { data: employeeCount } = useReadContract({
    address: COVERT_CONTRACT_ADDRESS,
    abi,
    functionName: 'getEmployeeCount',
    query: { enabled: COVERT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' },
  })

  const { data: cycleCount } = useReadContract({
    address: COVERT_CONTRACT_ADDRESS,
    abi,
    functionName: 'getCycleCount',
    query: { enabled: COVERT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' },
  })

  async function decryptAggregates() {
    if (!isReady) {
      toast({ type: 'error', title: 'FHE not ready', message: 'Connect to Sepolia first' })
      return
    }

    setIsDecrypting(true)
    try {
      // 1. Read both ciphertext handles (no args — ACL gates access to employer/auditors)
      const { readContract } = await import('wagmi/actions')
      const { wagmiConfig } = await import('@/lib/wagmi')

      const [handleDisbursed, handleBonus] = await Promise.all([
        readContract(wagmiConfig, {
          address: COVERT_CONTRACT_ADDRESS,
          abi,
          functionName: 'getTotalDisbursed',
        }) as Promise<string>,
        readContract(wagmiConfig, {
          address: COVERT_CONTRACT_ADDRESS,
          abi,
          functionName: 'getTotalBonusAllocated',
        }) as Promise<string>,
      ])

      // 2. One signature decrypts both handles via the Zama relayer
      toast({ type: 'info', title: 'Sign to view aggregates', message: 'Confirms your auditor identity — no gas needed' })

      const result = await userDecryptHandles([
        { handle: handleDisbursed, contractAddress: COVERT_CONTRACT_ADDRESS },
        { handle: handleBonus, contractAddress: COVERT_CONTRACT_ADDRESS },
      ])

      setTotalDisbursed(result[handleDisbursed])
      setTotalBonusAllocated(result[handleBonus])

      toast({ type: 'success', title: 'Aggregates decrypted', message: 'Individual salaries remain hidden' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ type: 'error', title: 'Decryption failed', message: message.slice(0, 80) })
    } finally {
      setIsDecrypting(false)
    }
  }

  return {
    decryptAggregates,
    isDecrypting,
    totalDisbursed,
    totalBonusAllocated,
    employeeCount: employeeCount as bigint | undefined,
    cycleCount: cycleCount as bigint | undefined,
  }
}
