/**
 * Demo seeding script for Covert hackathon demo.
 *
 * Run with: npx ts-node scripts/seed-demo.ts
 *
 * Requires:
 *   EMPLOYER_PRIVATE_KEY   - private key of the employer wallet
 *   NEXT_PUBLIC_CONTRACT_ADDRESS - deployed CovertPayroll address
 *   NEXT_PUBLIC_SEPOLIA_RPC_URL  - Sepolia RPC endpoint
 *
 * What this does:
 *   1. Registers 3 demo employee wallets
 *   2. Registers 1 auditor wallet
 *   3. Uploads an encrypted payroll (3 salaries)
 *   4. Triggers distribution
 *
 * All salary amounts are encrypted client-side using fhevmjs before any
 * transaction is broadcast. The contract never sees plaintext values.
 */

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EMPLOYER_PK = process.env.EMPLOYER_PRIVATE_KEY as `0x${string}`
const CONTRACT    = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const RPC_URL     = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org'

if (!EMPLOYER_PK) throw new Error('EMPLOYER_PRIVATE_KEY not set in .env.local')
if (!CONTRACT || CONTRACT === '0x0000000000000000000000000000000000000000') {
  throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS not set — deploy the contract first')
}

// Demo wallets (pre-funded on Sepolia)
const DEMO_EMPLOYEES: `0x${string}`[] = [
  '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', // employee A
  '0x1db3439a222C519ab44bb1144fC28167b4Fa6EE6', // employee B
  '0xb794F5eA0ba39494cE839613fffBA74279579268', // employee C
]

const DEMO_AUDITOR: `0x${string}` = '0x4B0897b0513FdBe0d8F99fD2bB34E5e2Be3dB3f2'

// Salaries in cUSDT (6 decimals). Plaintext only exists here in this script.
const DEMO_SALARIES = [
  BigInt(5_000 * 1_000_000),  // 5,000 cUSDT
  BigInt(4_500 * 1_000_000),  // 4,500 cUSDT
  BigInt(6_200 * 1_000_000),  // 6,200 cUSDT
]

const abi = parseAbi([
  'function addEmployee(address employee) external',
  'function addAuditor(address auditor) external',
  'function uploadPayroll(address[] calldata employees, bytes32[] calldata handles, bytes[] calldata inputProofs) external',
  'function triggerDistribution() external',
])

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const account = privateKeyToAccount(EMPLOYER_PK)
  console.log(`Employer: ${account.address}`)
  console.log(`Contract: ${CONTRACT}`)
  console.log(`RPC:      ${RPC_URL}\n`)

  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) })
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) })

  // ------------------------------------------------------------------
  // Step 1: Register employees
  // ------------------------------------------------------------------
  console.log('Step 1: Registering employees...')
  for (const emp of DEMO_EMPLOYEES) {
    const hash = await walletClient.writeContract({
      address: CONTRACT,
      abi,
      functionName: 'addEmployee',
      args: [emp],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`  + ${emp} added (tx: ${hash})`)
  }

  // ------------------------------------------------------------------
  // Step 2: Register auditor
  // ------------------------------------------------------------------
  console.log('\nStep 2: Registering auditor...')
  const auditorHash = await walletClient.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'addAuditor',
    args: [DEMO_AUDITOR],
  })
  await publicClient.waitForTransactionReceipt({ hash: auditorHash })
  console.log(`  + ${DEMO_AUDITOR} added (tx: ${auditorHash})`)

  // ------------------------------------------------------------------
  // Step 3: Encrypt salaries and upload payroll
  // ------------------------------------------------------------------
  console.log('\nStep 3: Encrypting salaries and uploading payroll...')

  // fhevmjs must be loaded dynamically (it contains WASM)
  const fhevmjs = await import('fhevmjs')

  const KMS_CONTRACT = process.env.NEXT_PUBLIC_ZAMA_KMS_CONTRACT ?? '0x9D6891A6240D6130c54ae243d8005063D05fE14b'
  const ACL_CONTRACT = process.env.NEXT_PUBLIC_ZAMA_ACL_CONTRACT ?? '0xFee8407e2f5e3Ee68ad77cAE98c434e637f516e5'
  const GATEWAY_URL  = process.env.NEXT_PUBLIC_ZAMA_GATEWAY_URL  ?? 'https://gateway.sepolia.zama.ai'

  const instance = await fhevmjs.createInstance({
    kmsContractAddress:  KMS_CONTRACT as `0x${string}`,
    aclContractAddress:  ACL_CONTRACT as `0x${string}`,
    network:             RPC_URL,
    gatewayUrl:          GATEWAY_URL,
  })

  const handles: `0x${string}`[] = []
  const proofs:  `0x${string}`[] = []

  for (let i = 0; i < DEMO_EMPLOYEES.length; i++) {
    const salary = DEMO_SALARIES[i]
    const input = instance.createEncryptedInput(CONTRACT, account.address)
    input.add64(salary)
    const encrypted = await input.encrypt()
    handles.push(encrypted.handles[0] as `0x${string}`)
    proofs.push(encrypted.inputProof as `0x${string}`)
    console.log(`  Encrypted salary ${i + 1}: ${Number(salary) / 1_000_000} cUSDT`)
  }

  const uploadHash = await walletClient.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'uploadPayroll',
    args: [DEMO_EMPLOYEES, handles, proofs],
  })
  await publicClient.waitForTransactionReceipt({ hash: uploadHash })
  console.log(`  Payroll uploaded (tx: ${uploadHash})`)

  // ------------------------------------------------------------------
  // Step 4: Trigger distribution
  // ------------------------------------------------------------------
  console.log('\nStep 4: Triggering distribution...')
  const distHash = await walletClient.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'triggerDistribution',
  })
  await publicClient.waitForTransactionReceipt({ hash: distHash })
  console.log(`  Distribution complete (tx: ${distHash})`)

  console.log('\nDemo seed complete.')
  console.log('  Employees can now connect with demo wallets and decrypt their salaries.')
  console.log(`  Auditor wallet: ${DEMO_AUDITOR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
