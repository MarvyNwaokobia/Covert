'use client'

import { useState } from 'react'
import { useSignTypedData, useReadContract } from 'wagmi'
import { useFhevm } from './useFhevm'
import { useToast } from '@/providers/ToastProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import CovertABI from '@/lib/abi/CovertPayroll.json'
import { type Abi } from 'viem'

const abi = CovertABI as Abi

export function useAuditorData() {
  const { generateDecryptionKeypair, buildEip712ForDecryption, decryptValue, isReady } = useFhevm()
  const { signTypedDataAsync } = useSignTypedData()
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
      const { publicKey, privateKey } = await generateDecryptionKeypair()
      const eip712 = await buildEip712ForDecryption(publicKey)

      toast({ type: 'info', title: 'Sign to view aggregates', message: 'Confirms your auditor identity — no gas needed' })

      const signature = await signTypedDataAsync({
        domain: eip712.domain,
        types: eip712.types,
        primaryType: eip712.primaryType as string,
        message: eip712.message,
      }) as `0x${string}`

      const { readContract } = await import('wagmi/actions')
      const { wagmiConfig } = await import('@/lib/wagmi')

      const [encryptedTotal, encryptedBonus] = await Promise.all([
        readContract(wagmiConfig, {
          address: COVERT_CONTRACT_ADDRESS,
          abi,
          functionName: 'getTotalDisbursed',
          args: [publicKey, signature],
        }) as Promise<`0x${string}`>,
        readContract(wagmiConfig, {
          address: COVERT_CONTRACT_ADDRESS,
          abi,
          functionName: 'getTotalBonusAllocated',
          args: [publicKey, signature],
        }) as Promise<`0x${string}`>,
      ])

      const totalBytes = Buffer.from(encryptedTotal.slice(2), 'hex')
      const bonusBytes = Buffer.from(encryptedBonus.slice(2), 'hex')

      setTotalDisbursed(decryptValue(privateKey, new Uint8Array(totalBytes)))
      setTotalBonusAllocated(decryptValue(privateKey, new Uint8Array(bonusBytes)))

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
