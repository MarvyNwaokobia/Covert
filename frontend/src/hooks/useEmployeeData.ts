'use client'

import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { useFhevm } from './useFhevm'
import { useToast } from '@/providers/ToastProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import CovertABI from '@/lib/abi/CovertPayroll.json'
import { type Abi } from 'viem'

const abi = CovertABI as Abi

type DecryptState = 'idle' | 'signing' | 'fetching' | 'decrypting' | 'revealed' | 'error'

export function useEmployeeData() {
  const { address } = useAccount()
  const { userDecryptHandles, encryptUint64, isReady } = useFhevm()
  const { writeContractAsync } = useWriteContract()
  const { toast, dismiss } = useToast()

  const [decryptState, setDecryptState] = useState<DecryptState>('idle')
  const [decryptedSalary, setDecryptedSalary] = useState<bigint | null>(null)
  const [decryptedBudget, setDecryptedBudget] = useState<bigint | null>(null)

  async function decryptSalary() {
    if (!isReady || !address) {
      toast({ type: 'error', title: 'FHE not ready', message: 'Connect to Sepolia first' })
      return
    }

    try {
      // 1. Read the ciphertext handle from the contract
      setDecryptState('fetching')
      const { readContract } = await import('wagmi/actions')
      const { wagmiConfig } = await import('@/lib/wagmi')

      const handle = await readContract(wagmiConfig, {
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'getMySalary',
        account: address, // getMySalary uses msg.sender — without `account` the call's from is 0x0
      }) as string

      // 2. One EIP-712 signature → relayer decrypts off-chain
      toast({ type: 'info', title: 'Sign to decrypt', message: 'Confirm the signature in your wallet — no gas needed' })
      setDecryptState('signing')

      const result = await userDecryptHandles([{ handle, contractAddress: COVERT_CONTRACT_ADDRESS }])

      setDecryptedSalary(result[handle])
      setDecryptState('revealed')
      toast({ type: 'success', title: 'Salary decrypted', message: 'Only visible to you in this session' })
    } catch (err) {
      setDecryptState('error')
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ type: 'error', title: 'Decryption failed', message: message.slice(0, 80) })
    }
  }

  async function decryptBudget() {
    if (!isReady || !address) return
    try {
      setDecryptState('fetching')
      const { readContract } = await import('wagmi/actions')
      const { wagmiConfig } = await import('@/lib/wagmi')

      const handle = await readContract(wagmiConfig, {
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'getMyBonusBudget',
        account: address, // getMyBonusBudget uses msg.sender — must set the call's from
      }) as string

      setDecryptState('signing')
      const result = await userDecryptHandles([{ handle, contractAddress: COVERT_CONTRACT_ADDRESS }])

      setDecryptedBudget(result[handle])
      setDecryptState('idle')
    } catch (err) {
      setDecryptState('error')
      toast({ type: 'error', title: 'Budget decryption failed' })
    }
  }

  async function allocatePeerBonus(recipient: `0x${string}`, amount: bigint) {
    const { handle, inputProof } = await encryptUint64(amount)
    const pendingId = toast({ type: 'pending', title: 'Sending peer bonus…', message: 'Confirm in your wallet' })
    try {
      const hash = await writeContractAsync({
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'allocatePeerBonus',
        args: [recipient, handle, inputProof],
      })
      dismiss(pendingId)
      toast({ type: 'success', title: 'Bonus sent!', txHash: hash })
    } catch (err) {
      dismiss(pendingId)
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ type: 'error', title: 'Bonus failed', message: message.slice(0, 80) })
    }
  }

  function resetDecrypt() {
    setDecryptState('idle')
    setDecryptedSalary(null)
  }

  return {
    decryptSalary,
    decryptBudget,
    allocatePeerBonus,
    resetDecrypt,
    decryptState,
    decryptedSalary,
    decryptedBudget,
  }
}
