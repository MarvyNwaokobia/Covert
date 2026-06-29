'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { type FhevmInstance } from '@/lib/fhevm'
import { SUPPORTED_CHAIN } from '@/lib/constants'

interface FhevmContextValue {
  instance: FhevmInstance | null
  isReady: boolean
  error: string | null
}

const FhevmContext = createContext<FhevmContextValue>({
  instance: null,
  isReady: false,
  error: null,
})

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isConnected } = useAccount()
  const chainId = useChainId()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isConnected) return
    if (chainId !== SUPPORTED_CHAIN.id) return

    let isMounted = true
    setError(null)

    // Dynamic import keeps the relayer-sdk (WASM) out of the SSR/initial bundle
    import('@/lib/fhevm').then(({ getFhevmInstance }) => {
      if (!isMounted) return
      getFhevmInstance()
        .then((inst) => {
          if (isMounted) {
            setInstance(inst)
            setIsReady(true)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError('Failed to initialize FHE engine. Make sure your wallet is connected to Sepolia.')
            console.error('[FHEVM]', err)
          }
        })
    })

    return () => {
      isMounted = false
      setInstance(null)
      setIsReady(false)
      // Singleton reset happens lazily — no need to import fhevm here
    }
  }, [isConnected, chainId])

  return (
    <FhevmContext.Provider value={{ instance, isReady, error }}>
      {children}
    </FhevmContext.Provider>
  )
}

export const useFhevmContext = () => useContext(FhevmContext)
