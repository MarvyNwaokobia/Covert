'use client'

import { useAccount, useReadContracts } from 'wagmi'
import { type Abi } from 'viem'
import { type Role } from '@/types'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import CovertABI from '@/lib/abi/CovertPayroll.json'

const abi = CovertABI as Abi

export function useRole(): { role: Role; isLoading: boolean } {
  const { address, isConnected } = useAccount()

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: COVERT_CONTRACT_ADDRESS, abi, functionName: 'employer' },
      { address: COVERT_CONTRACT_ADDRESS, abi, functionName: 'isEmployee', args: address ? [address] : undefined },
      { address: COVERT_CONTRACT_ADDRESS, abi, functionName: 'isAuditor',  args: address ? [address] : undefined },
    ],
    query: {
      enabled: isConnected && !!address && COVERT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  })

  if (!isConnected || !address) return { role: 'unknown', isLoading: false }

  // Contract not deployed yet — return unknown so UI shows connect state
  if (COVERT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return { role: 'unknown', isLoading: false }
  }

  if (isLoading) return { role: 'unknown', isLoading: true }

  const employerAddress = data?.[0]?.result as `0x${string}` | undefined
  const isEmployee = data?.[1]?.result as boolean | undefined
  const isAuditor = data?.[2]?.result as boolean | undefined

  if (employerAddress?.toLowerCase() === address.toLowerCase()) return { role: 'employer', isLoading: false }
  if (isEmployee) return { role: 'employee', isLoading: false }
  if (isAuditor) return { role: 'auditor', isLoading: false }

  return { role: 'unknown', isLoading: false }
}
