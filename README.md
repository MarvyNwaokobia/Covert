# Covert: Confidential Compensation Infrastructure

> Built for **Zama Season 3 Builder Track** · Deploy target: Sepolia testnet · Deadline: July 7, 2026

Covert is a confidential payroll protocol built on Ethereum using [Zama's FHEVM](https://docs.zama.ai/fhevm). It enables organizations to run their entire compensation cycle on-chain (salary distributions, performance bonuses, peer-to-peer recognition) without any participant ever seeing what anyone else earns.

---

## The Problem

Every organization that pays people has the same unspoken rule: **compensation is private.**

When people know what colleagues earn, things break. Resentment builds, political alliances form, low earners disengage, high earners get poached. The secrecy is not a bug in how organizations work. It is load-bearing infrastructure for team cohesion.

Blockchain destroys this norm entirely. Every transaction on a public chain is visible to everyone. If a company pays employees in crypto today, any employee (or competitor, or journalist) can look up the wallet addresses, find the transactions, and reconstruct the entire payroll. This is why no serious organization runs payroll on-chain today.

**The transparency that makes blockchain trustworthy is the exact same property that makes it unusable for compensation.**

---

## Why This Requires FHE, Not ZK, Not TEEs, Not Standard Encryption

This is the central technical argument. It needs to be airtight.

**Standard encryption** protects data at rest and in transit, but the moment a smart contract needs to process that data (add up salaries, check budget limits, trigger transfers), it must decrypt it first. And the moment it decrypts on-chain, the data is visible to every node in the network.

**Zero-knowledge proofs alone** let you prove a statement is true without revealing underlying data, but they do not allow general arithmetic on private inputs in the way Covert requires. Running a peer bonus budget enforcement check in ZK requires extremely complex circuit design outside reasonable scope.

**Trusted execution environments (TEEs)** reintroduce hardware trust assumptions and centralization. You are trusting Intel or AMD's chip, not the math.

**Fully Homomorphic Encryption is the only primitive** that allows a smart contract to perform arithmetic on encrypted values (addition, comparison, conditional logic) and produce an encrypted result, all without any party ever holding the decryption key during computation. The key never exists in plaintext on any server at any point. This is not a design choice. It is a mathematical property.

> **Covert is only possible because FHE exists.**

---

## How It Works: The Three Roles

Covert has three distinct roles. Each one sees a different slice of the system. This is by design.

### Employer
The employer is the organization running payroll. They are the only party who knows the salary list before it goes on-chain. When they upload payroll, each salary amount is encrypted **client-side in the browser** using `fhevmjs` before the transaction is broadcast. By the time the data hits the blockchain, it is already ciphertext.

The employer can:
- Upload encrypted salary list for all employees
- Trigger payroll distribution rounds (encrypted cUSDT sent to each wallet)
- Fund a peer bonus pool (separate encrypted budget employees allocate among themselves)
- See aggregate cost of payroll (cannot reconstruct individual salaries once submitted)

### Employee
The employee receives their salary as encrypted cUSDT. To see their own salary, they go through the **EIP-712 user-decryption flow**:
1. Sign a structured message with their private key (proving identity to the contract)
2. The contract releases a decryption handle scoped specifically to their address
3. Their browser decrypts the amount locally using `fhevmjs`
4. The decrypted number never touches the network

Employees also receive an encrypted peer bonus budget to distribute to colleagues who helped them during the month. The contract enforces they cannot exceed their budget without revealing how much has been used or to whom it has been allocated.

### Auditor
The auditor role exists for compliance and governance. A DAO treasurer, board member, or financial regulator might need to verify solvency: that the organization actually disbursed what it claims. Covert gives auditors access to **aggregate statistics only**: total payroll disbursed, total bonus pool allocated, number of recipients.

These are computed inside the encrypted domain. The contract adds up encrypted values and returns an encrypted total that the auditor can decrypt. They never see individual salaries.

> **The auditor paradox that FHE uniquely solves: you can prove the total without exposing the parts.**

---

## Architecture

```
+-------------------------------------------------------------+
|                        Browser (Client)                      |
|                                                              |
|  +-------------+    +--------------+    +---------------+  |
|  |  Employer   |    |   Employee   |    |    Auditor    |  |
|  |  Dashboard  |    |  Dashboard   |    |   Dashboard   |  |
|  +------+------+    +------+-------+    +-------+-------+  |
|         |                  |                     |          |
|         |    fhevmjs (WASM): client-side FHE     |          |
|         |   encrypt inputs |  decrypt outputs    |          |
|         +------------------+---------------------+          |
|                            |                                 |
|                     wagmi / viem                             |
|                            |                                 |
+----------------------------+--------------------------------+
                             | on-chain transactions
+----------------------------+--------------------------------+
|                   Ethereum (Sepolia Testnet)                 |
|                                                              |
|  +-------------------------------------------------------+  |
|  |              CovertPayroll.sol (FHEVM)                 |  |
|  |                                                        |  |
|  |  euint64 salaries  .  euint64 budgets  .  eaddress    |  |
|  |  All computation happens on encrypted values           |  |
|  |  No plaintext ever exists on-chain                     |  |
|  +-------------------------------------------------------+  |
|                            |                                 |
|  +-------------------------+-----------------------------+  |
|  |              cUSDT (Zama Confidential USDT)            |  |
|  |        Encrypted token transfers · Sepolia             |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  Zama KMS / Gateway: manages FHE key operations             |
+-------------------------------------------------------------+
```

---

## Tech Stack

### Frontend
| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Wallet | RainbowKit v2 + wagmi v2 + viem |
| FHE Client | fhevmjs 0.6.x (Zama) |
| Data fetching | @tanstack/react-query v5 |

### Smart Contracts
| Layer | Choice |
|---|---|
| Framework | Hardhat |
| Language | Solidity |
| FHE Library | Zama FHEVM (TFHE.sol) |
| Token | cUSDT (Zama Confidential USDT) |
| Network | Ethereum Sepolia testnet |

---

## Project Structure

```
frontend/
+-- src/
|   +-- app/
|   |   +-- layout.tsx              # Root layout: providers, navbar
|   |   +-- page.tsx                # Landing: wallet connect + role redirect
|   |   +-- employer/page.tsx       # Employer dashboard
|   |   +-- employee/page.tsx       # Employee dashboard
|   |   +-- auditor/page.tsx        # Auditor aggregate view
|   |   +-- unauthorized/page.tsx   # Clean unauthorized error state
|   |
|   +-- components/
|   |   +-- layout/Navbar.tsx       # Sticky nav with role badge
|   |   +-- RoleGuard.tsx           # Route protection, redirects wrong role
|   |   +-- WalletButton.tsx        # RainbowKit connect + role badge
|   |   +-- employer/               # PayrollUploadForm, DistributionButton
|   |   +-- employee/               # PayslipCard
|   |   +-- auditor/                # AggregateStats
|   |   +-- ui/                     # Button, Card, Badge, Spinner, Skeleton
|   |
|   +-- hooks/
|   |   +-- useRole.ts              # Reads employer/isEmployee/isAuditor from contract
|   |   +-- useFhevm.ts             # encrypt, keypair generation, EIP-712, decrypt
|   |   +-- usePayroll.ts           # Employer contract interactions
|   |   +-- useEmployeeData.ts      # Employee decrypt + peer bonus
|   |   +-- useAuditorData.ts       # Auditor aggregate decrypt
|   |
|   +-- providers/
|   |   +-- Providers.tsx           # wagmi + RainbowKit + react-query root
|   |   +-- FhevmProvider.tsx       # fhevmjs singleton context (lazy, browser-only)
|   |   +-- ToastProvider.tsx       # Toast notification system
|   |
|   +-- lib/
|   |   +-- wagmi.ts                # wagmi config: Sepolia chain
|   |   +-- fhevm.ts                # fhevmjs createInstance singleton
|   |   +-- constants.ts            # Contract addresses, Zama gateway, chain
|   |   +-- abi/CovertPayroll.json  # Contract ABI (stub, update after deployment)
|   |
|   +-- types/
|       +-- index.ts                # Role, Employee, TxState, AuditStats
|       +-- declarations.d.ts       # CSS module type declarations
|
+-- next.config.ts                  # Turbopack + webpack WASM config
+-- tailwind.config (via globals.css) # Tailwind 4 @theme design tokens
+-- .env.local                      # Environment variables (not committed)
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- A browser wallet (MetaMask, etc.)
- Sepolia testnet ETH (for gas)
- A [WalletConnect Cloud](https://cloud.walletconnect.com) project ID (free)

### Installation

```bash
git clone https://github.com/MarvyNwaokobia/Covert.git
cd Covert/frontend
npm install --legacy-peer-deps
```

### Environment Variables

Create `frontend/.env.local` with the following:

```env
# WalletConnect: get a free project ID at https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Deployed + verified on Sepolia (defaults already set in constants.ts; override only if redeployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6ded5205331545437aAeF4897738D4ed7055Ce1c
NEXT_PUBLIC_CUSDT_ADDRESS=0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3
```

> FHEVM coprocessor/KMS/relayer addresses are no longer set here — they ship with the
> `@zama-fhe/relayer-sdk` `SepoliaConfig`. (The old `NEXT_PUBLIC_ZAMA_*` vars are obsolete.)

### Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Role Flow

When you connect your wallet, the app reads your role from the contract and routes you automatically:

```
Connect wallet
      |
      v
  Read role from CovertPayroll contract
      |
      +-- employer()  == your address  ->  /employer
      +-- isEmployee(address) == true  ->  /employee
      +-- isAuditor(address)  == true  ->  /auditor
      +-- none match                   ->  / (home, no role assigned)
```

If you navigate to a dashboard that does not match your role, `RoleGuard` redirects you to `/unauthorized`.

---

## The EIP-712 Decryption Flow

This is the most important interaction in the app. Here is exactly what happens when an employee decrypts their salary:

1. The frontend calls `useFhevm().generateDecryptionKeypair()`, which generates an ephemeral keypair in the browser
2. `buildEip712ForDecryption(publicKey)` constructs a typed EIP-712 message containing the public key and the contract address
3. The user signs the message with MetaMask, proving they control the wallet without sending any transaction
4. The signature + public key are sent to `requestSalaryDecryption(publicKey, signature)` on the contract
5. The contract verifies the signature, re-encrypts the salary under the provided public key, and returns the ciphertext
6. `useFhevm().decryptValue(privateKey, encryptedBytes)` decrypts locally in the browser
7. The plaintext amount is displayed. It **never** leaves the browser.

The same flow applies to auditors querying aggregate totals.

---

## FHE Encryption Flow (Employer Upload)

When the employer uploads payroll:

1. For each employee + salary pair, `useFhevm().encryptUint64(salaryAmount)` is called
2. This calls `fhevmjs`'s `createEncryptedInput(contractAddress, employerAddress)`, which binds the ciphertext to this specific contract and sender
3. `input.add64(value)` encrypts the value as a `euint64`
4. `input.encrypt()` returns a `{ handles, inputProof }` pair. The handle is the on-chain ciphertext reference; the proof confirms the encryption was formed correctly.
5. The batch of `(address[], bytes32[] handles, bytes[] proofs)` is sent to `uploadPayroll()` on the contract
6. The contract stores the handles, never the plaintext values

---

## Contract Interface (ABI Summary)

The frontend ships with a stub ABI. Update `src/lib/abi/CovertPayroll.json` and `NEXT_PUBLIC_CONTRACT_ADDRESS` once the contract is deployed.

| Function | Role | Description |
|---|---|---|
| `employer()` | Public | Returns the employer address |
| `isEmployee(address)` | Public | Check if address is an employee |
| `isAuditor(address)` | Public | Check if address is an auditor |
| `addEmployee(address)` | Employer | Register a new employee |
| `addAuditor(address)` | Employer | Register an auditor |
| `uploadPayroll(address[], bytes32[], bytes[])` | Employer | Store encrypted salaries |
| `triggerDistribution()` | Employer | Distribute cUSDT to all employees |
| `fundBonusPool(bytes32, bytes)` | Employer | Add to peer bonus pool |
| `requestSalaryDecryption(bytes32, bytes)` | Employee | EIP-712 decryption, returns re-encrypted salary |
| `allocatePeerBonus(address, bytes32, bytes)` | Employee | Send peer bonus to colleague |
| `getTotalDisbursed(bytes32, bytes)` | Auditor | Encrypted aggregate: total payroll paid |
| `getTotalBonusAllocated(bytes32, bytes)` | Auditor | Encrypted aggregate: total bonuses sent |

**Events emitted (no amounts in any event):**
- `PayrollTriggered(uint256 timestamp, uint256 recipientCount)`
- `BonusAllocated(address indexed from, address indexed to)`
- `EmployeeAdded(address indexed employee)`

---

## Design System

Covert uses a dark, role-aware color system built with Tailwind CSS 4's `@theme` directive:

| Token | Color | Used for |
|---|---|---|
| `employer` | `#3B82F6` (blue) | Employer UI elements |
| `employee` | `#10B981` (emerald) | Employee UI elements |
| `auditor` | `#F59E0B` (amber) | Auditor UI elements |
| `bg-base` | `#070B14` | Page background |
| `bg-surface` | `#0F1623` | Card backgrounds |
| `text-primary` | `#F1F5F9` | Main text |
| `text-muted` | `#64748B` | Secondary text |

---

## Build Progress

### Frontend

#### Completed
- **F-01**: Project scaffold (Next.js 16, wagmi, RainbowKit, fhevmjs)
- **F-02**: Wallet connection + role detection
- **F-03**: Employer payroll upload form with client-side FHE encryption
- **F-04**: Distribution trigger with transaction feedback
- **F-05**: Employee payslip with EIP-712 decrypt reveal
- **F-07**: Auditor aggregate decrypt flow
- **F-08**: Role-gated routing (RoleGuard HOC)
- **F-09**: Toast notifications for all on-chain actions

#### Remaining
- **F-06**: Employee peer bonus allocation UI (inline panel shipped, full UX pass pending)
- **F-10**: Responsive polish + mobile layout
- **F-11**: Demo data seeding script (3 employees, active payroll cycle)
- **F-12/F-13**: Submission docs + 3-minute video pitch

### Smart Contracts (separate workstream)
- `CovertPayroll.sol`: core contract with FHEVM encrypted types
- cUSDT integration: encrypted token transfers
- Full test suite
- Deployment + Etherscan verification on Sepolia

---

## Deployment

Once the contract is on Sepolia:

1. Copy the deployed contract address
2. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `frontend/.env.local`
3. Replace `frontend/src/lib/abi/CovertPayroll.json` with the real exported ABI
4. Run `npm run build` to verify the production build

---

## Important Notes

### fhevmjs Deprecation
`fhevmjs@0.6.2` is currently deprecated in favour of `@zama-fhe/relayer-sdk`. We are using `fhevmjs` because the new package introduces a wagmi v3 dependency that conflicts with RainbowKit v2. Migration is planned once RainbowKit releases wagmi v3 support.

### WASM in Next.js
`fhevmjs` includes WebAssembly for the TFHE operations. The webpack config in `next.config.ts` enables `asyncWebAssembly` for production builds. In development, Turbopack handles WASM natively. The fhevmjs module is always lazily loaded via dynamic import. It is never included in the initial SSR bundle.

### Peer Dependency Warning
`wagmi@2.19.5` satisfies `@rainbow-me/rainbowkit@2.2.11`'s peer requirement of `wagmi@^2.9.0`. The `--legacy-peer-deps` flag is needed during install because npm v11 is stricter about peer resolution. This is cosmetic; no functionality is affected.

---

## Team

Built for the **Zama Season 3 Builder Track** hackathon.

- Smart Contract Dev: Solidity + FHEVM architecture
- Frontend Dev: Next.js UI, wallet integration, FHE client layer
