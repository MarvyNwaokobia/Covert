// browser-only (WASM). Never import server-side.
// Always use dynamic import or the useFhevm hook instead.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FhevmInstance = any

let instancePromise: Promise<FhevmInstance> | null = null

export async function createFhevmInstance(): Promise<FhevmInstance> {
  const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web')
  await initSDK() // load TFHE/KMS WASM — required for the /web build before createInstance
  const network = (window as Window & { ethereum?: unknown }).ethereum
  // SepoliaConfig omits `network` (required) — supply the injected wallet provider.
  return createInstance({ ...SepoliaConfig, network })
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
