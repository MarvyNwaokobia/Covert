import { sepolia } from 'wagmi/chains'

export const SUPPORTED_CHAIN = sepolia

// Deployed + verified on Sepolia (see contracts/docs/FRONTEND_HANDOFF.md). Override via env if redeployed.
export const COVERT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '0x6ded5205331545437aAeF4897738D4ed7055Ce1c') as `0x${string}`
export const CUSDT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CUSDT_ADDRESS ?? '0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3') as `0x${string}`

// Zama KMS/ACL contract addresses on Sepolia testnet
export const ZAMA_KMS_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ZAMA_KMS_CONTRACT ?? '0x9D6891A6240D6130c54ae243d8005063D05fE14b') as `0x${string}`
export const ZAMA_ACL_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ZAMA_ACL_CONTRACT ?? '0xFee8407e2f5e3Ee68ad77cAE98c434e637f516e5') as `0x${string}`
export const ZAMA_GATEWAY_URL = process.env.NEXT_PUBLIC_ZAMA_GATEWAY_URL ?? 'https://gateway.sepolia.zama.ai'

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID'
