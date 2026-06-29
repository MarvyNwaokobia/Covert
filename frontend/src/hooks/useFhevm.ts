'use client'

import { useFhevmContext } from '@/providers/FhevmProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import { useAccount, useSignTypedData } from 'wagmi'

export function useFhevm() {
  const { instance, isReady, error } = useFhevmContext()
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()

  async function encryptUint64(value: bigint): Promise<{ handle: `0x${string}`; inputProof: `0x${string}` }> {
    if (!instance || !address) throw new Error('FHE instance not ready')

    const input = instance.createEncryptedInput(COVERT_CONTRACT_ADDRESS, address)
    input.add64(value)
    const encrypted = await input.encrypt()

    return {
      handle: encrypted.handles[0] as `0x${string}`,
      inputProof: `0x${Buffer.from(encrypted.inputProof).toString('hex')}` as `0x${string}`,
    }
  }

  // Decrypts one or more ciphertext handles off-chain via the Zama relayer.
  // One EIP-712 signature authorises the relayer to reveal all requested handles.
  async function userDecryptHandles(
    handles: Array<{ handle: string; contractAddress: `0x${string}` }>,
  ): Promise<Record<string, bigint>> {
    if (!instance || !address) throw new Error('FHE instance not ready')

    const keypair = instance.generateKeypair()
    const start = Math.floor(Date.now() / 1000).toString()
    const days = '7'
    const contracts = [...new Set(handles.map((h) => h.contractAddress))]

    const eip712 = instance.createEIP712(keypair.publicKey, contracts, start, days)
    const signature = await signTypedDataAsync({
      domain: eip712.domain,
      types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      primaryType: 'UserDecryptRequestVerification',
      message: eip712.message,
    })

    const res = await instance.userDecrypt(
      handles,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace(/^0x/, ''),
      contracts,
      address,
      start,
      days,
    )

    return res as Record<string, bigint>
  }

  return {
    isReady,
    error,
    encryptUint64,
    userDecryptHandles,
  }
}
