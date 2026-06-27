import { sepolia } from 'wagmi/chains'

export const SUPPORTED_CHAIN = sepolia

// Zama FHEVM addresses on Sepolia — fill these in once your contract teammate shares them
export const COVERT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`

// Zama KMS/ACL contract addresses on Sepolia testnet
export const ZAMA_KMS_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ZAMA_KMS_CONTRACT ?? '0x9D6891A6240D6130c54ae243d8005063D05fE14b') as `0x${string}`
export const ZAMA_ACL_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ZAMA_ACL_CONTRACT ?? '0xFee8407e2f5e3Ee68ad77cAE98c434e637f516e5') as `0x${string}`
export const ZAMA_GATEWAY_URL = process.env.NEXT_PUBLIC_ZAMA_GATEWAY_URL ?? 'https://gateway.sepolia.zama.ai'

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID'
