'use client'

import { useFhevmContext } from '@/providers/FhevmProvider'
import { COVERT_CONTRACT_ADDRESS } from '@/lib/constants'
import { useAccount } from 'wagmi'

export function useFhevm() {
  const { instance, isReady, error } = useFhevmContext()
  const { address } = useAccount()

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

  async function generateDecryptionKeypair(): Promise<{ publicKey: `0x${string}`; privateKey: string }> {
    if (!instance) throw new Error('FHE instance not ready')
    const { publicKey, privateKey } = instance.generateKeypair()
    return {
      publicKey: `0x${publicKey}` as `0x${string}`,
      privateKey,
    }
  }

  async function buildEip712ForDecryption(publicKey: `0x${string}`) {
    if (!instance) throw new Error('FHE instance not ready')
    return instance.createEIP712(publicKey.slice(2), COVERT_CONTRACT_ADDRESS)
  }

  function decryptValue(privateKey: string, encryptedBytes: Uint8Array): bigint {
    if (!instance) throw new Error('FHE instance not ready')
    return instance.decrypt(COVERT_CONTRACT_ADDRESS, privateKey, encryptedBytes)
  }

  return {
    isReady,
    error,
    encryptUint64,
    generateDecryptionKeypair,
    buildEip712ForDecryption,
    decryptValue,
  }
}
