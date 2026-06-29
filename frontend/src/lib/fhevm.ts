// browser-only (WASM). Never import server-side.
// Always use dynamic import or the useFhevm hook instead.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FhevmInstance = any

let instancePromise: Promise<FhevmInstance> | null = null

export async function createFhevmInstance(): Promise<FhevmInstance> {
  const { createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web')
  return createInstance(SepoliaConfig)
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
