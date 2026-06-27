'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useAccount } from 'wagmi'
import { useFhevm } from './useFhevm'
import { useToast } from '@/providers/ToastProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import { type TxState, type PayrollEntry } from '@/types'
import CovertABI from '@/lib/abi/CovertPayroll.json'
import { type Abi } from 'viem'

const abi = CovertABI as Abi

export function usePayroll() {
  const { address } = useAccount()
  const { encryptUint64, isReady } = useFhevm()
  const { writeContractAsync } = useWriteContract()
  const { toast, dismiss } = useToast()
  const [txState, setTxState] = useState<TxState>({ status: 'idle' })
  const [isEncrypting, setIsEncrypting] = useState(false)

  async function uploadPayroll(entries: PayrollEntry[]) {
    if (!isReady) { toast({ type: 'error', title: 'FHE not ready', message: 'Connect to Sepolia first' }); return }
    if (!address) { toast({ type: 'error', title: 'Wallet not connected' }); return }
    if (!entries.length) { toast({ type: 'error', title: 'No employees added' }); return }

    setIsEncrypting(true)
    const pendingId = toast({ type: 'pending', title: 'Encrypting salaries…', message: `${entries.length} amounts being encrypted in your browser` })

    try {
      const employees: `0x${string}`[] = []
      const handles: `0x${string}`[] = []
      const proofs: `0x${string}`[] = []

      for (const entry of entries) {
        const { handle, inputProof } = await encryptUint64(entry.amount)
        employees.push(entry.address)
        handles.push(handle)
        proofs.push(inputProof)
      }

      setIsEncrypting(false)
      dismiss(pendingId)

      const sendingId = toast({ type: 'pending', title: 'Sending to contract…', message: 'Confirm in your wallet' })
      setTxState({ status: 'pending' })

      const hash = await writeContractAsync({
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'uploadPayroll',
        args: [employees, handles, proofs],
      })

      dismiss(sendingId)
      setTxState({ status: 'success', hash })
      toast({ type: 'success', title: 'Payroll uploaded', txHash: hash })
    } catch (err) {
      setIsEncrypting(false)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setTxState({ status: 'error', error: message })
      toast({ type: 'error', title: 'Upload failed', message: message.slice(0, 80) })
    }
  }

  async function triggerDistribution() {
    const pendingId = toast({ type: 'pending', title: 'Sending distribution…', message: 'Confirm in your wallet' })
    setTxState({ status: 'pending' })
    try {
      const hash = await writeContractAsync({
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'triggerDistribution',
      })
      dismiss(pendingId)
      setTxState({ status: 'success', hash })
      toast({ type: 'success', title: 'Payroll distributed!', message: 'Encrypted cUSDT sent to all employees', txHash: hash })
    } catch (err) {
      dismiss(pendingId)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setTxState({ status: 'error', error: message })
      toast({ type: 'error', title: 'Distribution failed', message: message.slice(0, 80) })
    }
  }

  async function addEmployee(employeeAddress: `0x${string}`) {
    const pendingId = toast({ type: 'pending', title: 'Adding employee…', message: 'Confirm in your wallet' })
    try {
      const hash = await writeContractAsync({
        address: COVERT_CONTRACT_ADDRESS,
        abi,
        functionName: 'addEmployee',
        args: [employeeAddress],
      })
      dismiss(pendingId)
      toast({ type: 'success', title: 'Employee added', txHash: hash })
    } catch (err) {
      dismiss(pendingId)
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ type: 'error', title: 'Failed to add employee', message: message.slice(0, 80) })
    }
  }

  return { uploadPayroll, triggerDistribution, addEmployee, txState, isEncrypting }
}
