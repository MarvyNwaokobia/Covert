import {
  ZAMA_KMS_CONTRACT_ADDRESS,
  ZAMA_ACL_CONTRACT_ADDRESS,
  ZAMA_GATEWAY_URL,
} from './constants'

// fhevmjs is browser-only (WASM). Never import server-side.
// Always use dynamic import or the useFhevm hook instead.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FhevmInstance = any

let instancePromise: Promise<FhevmInstance> | null = null

export async function createFhevmInstance(): Promise<FhevmInstance> {
  const { createInstance } = await import('fhevmjs')
  const instance = await createInstance({
    kmsContractAddress: ZAMA_KMS_CONTRACT_ADDRESS,
    aclContractAddress: ZAMA_ACL_CONTRACT_ADDRESS,
    network: (window as Window & { ethereum?: unknown }).ethereum,
    gatewayUrl: ZAMA_GATEWAY_URL,
  })
  return instance
}

// Singleton — reuse the same instance across the app
export function getFhevmInstance(): Promise<FhevmInstance> {
  if (!instancePromise) {
    instancePromise = createFhevmInstance().catch((err) => {
      instancePromise = null
      throw err
    })
  }
  return instancePromise
}

export function resetFhevmInstance() {
  instancePromise = null
}
