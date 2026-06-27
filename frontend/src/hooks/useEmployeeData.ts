'use client'

import { useState } from 'react'
import { useAccount, useSignTypedData, useWriteContract } from 'wagmi'
import { useFhevm } from './useFhevm'
import { useToast } from '@/providers/ToastProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import CovertABI from '@/lib/abi/CovertPayroll.json'
import { type Abi } from 'viem'

const abi = CovertABI as Abi

type DecryptState = 'idle' | 'signing' | 'fetching' | 'decrypting' | 'revealed' | 'error'

export function useEmployeeData() {
  const { address } = useAccount()
  const { generateDecryptionKeypair, buildEip712ForDecryption, decryptValue, encryptUint64, isReady } = useFhevm()
  const { signTypedDataAsync } = useSignTypedData()
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
      setDecryptState('signing')
      const { publicKey, privateKey } = await generateDecryptionKeypair()

      const eip712 = await buildEip712ForDecryption(publicKey)
      toast({ type: 'info', title: 'Sign to decrypt', message: 'Confirm the signature in your wallet — no gas needed' })

      const signature = await signTypedDataAsync({
        domain: eip712.domain,
        types: eip712.types,
        primaryType: eip712.primaryType as string,
        message: eip712.message,
      }) as `0x${string}`

      setDecryptState('fetching')
      const { readContract } = await import('wagmi/actions')
      const { wagmiConfig } = await import('@/lib/wagmi')

      const encryptedResult = await readContract(wagmiConfig, {
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'requestSalaryDecryption',
        args: [publicKey, signature],
      }) as `0x${string}`

      setDecryptState('decrypting')
      const encryptedBytes = Buffer.from(encryptedResult.slice(2), 'hex')
      const plaintext = decryptValue(privateKey, new Uint8Array(encryptedBytes))

      setDecryptedSalary(plaintext)
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
      setDecryptState('signing')
      const { publicKey, privateKey } = await generateDecryptionKeypair()
      const eip712 = await buildEip712ForDecryption(publicKey)

      const signature = await signTypedDataAsync({
        domain: eip712.domain,
        types: eip712.types,
        primaryType: eip712.primaryType as string,
        message: eip712.message,
      }) as `0x${string}`

      setDecryptState('fetching')
      const { readContract } = await import('wagmi/actions')
      const { wagmiConfig } = await import('@/lib/wagmi')

      const encryptedResult = await readContract(wagmiConfig, {
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'getPeerBonusBudget',
        args: [publicKey, signature],
      }) as `0x${string}`

      setDecryptState('decrypting')
      const encryptedBytes = Buffer.from(encryptedResult.slice(2), 'hex')
      const plaintext = decryptValue(privateKey, new Uint8Array(encryptedBytes))
      setDecryptedBudget(plaintext)
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
