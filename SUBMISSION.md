# Covert: Submission Document
## Zama Season 3 Builder Track

---

## Project Name
**Covert**

## Tagline
Confidential on-chain payroll. Encrypt salaries before they leave the browser. Compute on them without ever decrypting. Pay your team on-chain without exposing what anyone earns.

## Category
DeFi / HR Infrastructure / Privacy

## GitHub
https://github.com/MarvyNwaokobia/Covert

## Live Demo
https://covert-zama.vercel.app *(update after deploy)*

---

## The Problem

Organizations cannot run payroll on-chain today. Not because the technology is not capable of it, but because of one fundamental property: **every transaction on a public blockchain is visible to everyone.**

If a company pays employees in crypto, any person with a wallet address can reconstruct the entire salary structure of the organization. Competitors poach based on it. Employees resent colleagues over it. Journalists publish it. This is not a hypothetical risk. It is the exact reason no serious organization runs compensation on-chain.

The problem is not trust in the contract. The problem is that the data itself is public.

---

## Why FHE Is the Only Solution

**Standard encryption** breaks down the moment a contract needs to compute on the data. To add salaries, check bonus limits, or trigger a transfer, the contract must first decrypt. And decrypting on-chain means the plaintext is visible to every node.

**Zero-knowledge proofs** let you prove facts without revealing data, but do not support the general arithmetic Covert needs: summing salaries, enforcing budget caps, computing aggregates across multiple encrypted inputs.

**Trusted execution environments (TEEs)** move trust from the math to Intel or AMD's chip. That is not trustless computation. That is hardware trust with extra steps.

**Fully Homomorphic Encryption** is the only primitive that lets a smart contract add, compare, and conditionally operate on encrypted values, returning an encrypted result, without any party ever holding a decryption key at compute time. The key never exists in plaintext on any server. This is a mathematical guarantee, not a policy.

Covert is the practical demonstration of this: a payroll system where the entire financial layer of an organization runs on-chain, and the only people who can see any salary figure are the person who earned it.

---

## How Covert Uses Zama FHEVM

### 1. Client-side Encryption with fhevmjs

Before any transaction leaves the employer's browser, `fhevmjs` encrypts each salary amount as a `euint64`. The contract only ever receives ciphertext handles and input proofs. No plaintext value exists anywhere on-chain, in any transaction, at any block.

```typescript
const input = instance.createEncryptedInput(contractAddress, employerAddress)
input.add64(salaryAmount)
const { handles, inputProof } = await input.encrypt()
// handles[0] and inputProof go into the transaction args
// salaryAmount never leaves the browser
```

### 2. Encrypted On-chain Storage

`CovertPayroll.sol` stores salaries as `euint64` values. All arithmetic performed by the contract (aggregating totals, enforcing budget caps, computing distributions) operates on the encrypted values directly. TFHE.sol handles this transparently.

```solidity
mapping(address => euint64) private salary;

function uploadPayroll(
    address[] calldata employees,
    bytes32[] calldata handles,
    bytes[] calldata inputProofs
) external onlyEmployer {
    for (uint i = 0; i < employees.length; i++) {
        euint64 encSalary = TFHE.asEuint64(handles[i], inputProofs[i]);
        salary[employees[i]] = encSalary;
        TFHE.allow(encSalary, employees[i]);
    }
}
```

### 3. EIP-712 User Decryption

Employees never receive their salary decrypted over the network. Instead:

1. The browser generates an ephemeral keypair
2. The employee signs a structured EIP-712 message containing their public key
3. The contract re-encrypts the salary specifically for that public key and returns the ciphertext
4. The browser decrypts locally with the ephemeral private key
5. The plaintext number is displayed in the UI and exists only in memory

This means the contract enforces access control cryptographically. No backend, no API key, no trust in a server. The math enforces who sees what.

### 4. Auditor Aggregate Access

The auditor role demonstrates the most counterintuitive property of FHE: **you can prove a total without revealing the parts.**

The contract computes `totalDisbursed = TFHE.add(salary[A], TFHE.add(salary[B], salary[C]))` entirely in the encrypted domain, and re-encrypts the result for the auditor's ephemeral key. The auditor decrypts and sees the total. They never see individual salaries. The contract enforces this at the bytecode level.

### 5. Peer Bonus Budget Enforcement

Employees hold an encrypted bonus budget (`euint64`). When they allocate a bonus, the contract computes the new remaining balance homomorphically and enforces the cap without revealing either the budget or the amount spent to any observer.

---

## Architecture

```
Browser
  fhevmjs (WASM)
    |
    +-- Employer: encrypt salary amounts -> send handles + proofs
    +-- Employee: generate ephemeral keypair -> sign EIP-712 -> decrypt locally
    +-- Auditor: generate ephemeral keypair -> sign EIP-712 -> decrypt aggregate

Ethereum (Sepolia)
  CovertPayroll.sol
    |
    +-- TFHE.sol: all arithmetic stays encrypted
    +-- Zama ACL: per-address decryption permissions
    +-- Zama KMS / Gateway: key management for re-encryption
    |
    +-- cUSDT (Zama Confidential USDT): encrypted token transfers
```

**Frontend:** Next.js 16, wagmi v2, RainbowKit v2, fhevmjs 0.6.x, Tailwind CSS 4
**Contracts:** Solidity, Hardhat, Zama FHEVM (TFHE.sol), Sepolia testnet

---

## Three Roles, Three Views of the Same Data

| What they see | Employer | Employee | Auditor |
|---|---|---|---|
| Their own salary | n/a | Yes, after EIP-712 decrypt | No |
| Other salaries | No | No | No |
| Total payroll disbursed | No | No | Yes, after EIP-712 decrypt |
| Bonus budget balance | No | Yes, after EIP-712 decrypt | No |
| Number of employees | Yes | No | Yes |

The contract enforces every cell in this table. Not the UI. Not a backend. The FHEVM bytecode.

---

## What Makes This Different from Other Payroll Projects

Most "private payroll" projects on blockchain use one of:
- **Off-chain computation** with on-chain settlement (you trust a server)
- **ZK proofs** for specific predicates (cannot support general compensation arithmetic)
- **Multisig + secret sharing** (N-of-M parties can reconstruct; trust is distributed but still exists)
- **Layer 2 privacy** (hides amounts in aggregate but not per-transaction in the base settlement)

Covert uses none of these. Every salary figure, every budget amount, every aggregate total is computed in the encrypted domain on Ethereum mainnet (Sepolia for this submission). No trusted party. No off-chain component that holds secrets. No ZK circuit complexity. The FHE VM does the work.

---

## Demo Walkthrough

### Setup
1. Deploy `CovertPayroll.sol` to Sepolia
2. Run `npx ts-node frontend/scripts/seed-demo.ts` to pre-populate 3 employees and trigger a payroll cycle

### Employer flow (wallet A)
1. Connect wallet -> auto-routes to `/employer`
2. Add a new employee address via the Add Employee panel
3. Fill in the payroll form: addresses + salary amounts
4. Click "Upload Encrypted Salaries" -> fhevmjs encrypts each amount, MetaMask prompts for one transaction
5. Click "Run Payroll Distribution" -> encrypted cUSDT sent to each wallet

### Employee flow (wallet B, C, or D)
1. Connect wallet -> auto-routes to `/employee`
2. Payslip card shows blurred placeholder
3. Click "Decrypt My Salary" -> MetaMask prompts for EIP-712 signature (no gas)
4. Salary amount reveals with animation -> number visible only in this browser session
5. Peer bonus panel: enter a colleague's address and amount, click Send

### Auditor flow (wallet E)
1. Connect wallet -> auto-routes to `/auditor`
2. Stats cards show encrypted placeholders
3. Click "Decrypt Aggregate View" -> MetaMask prompts for EIP-712 signature (no gas)
4. Total disbursed and total bonuses reveal
5. Individual salary breakdown is never shown, not even in the network tab

---

## Technical Choices and Trade-offs

### fhevmjs vs @zama-fhe/relayer-sdk
We use `fhevmjs@0.6.2` rather than the newer `@zama-fhe/relayer-sdk` because the relayer SDK requires wagmi v3, which conflicts with RainbowKit v2. The encryption and decryption primitives are identical; the API surface used is the same.

### No backend
There is no backend. The dApp talks directly to the Sepolia RPC and the Zama gateway. All sensitive operations happen in the browser via WASM. This is not a constraint we worked around. It is the point.

### Stub ABI during development
The frontend ships with a stub ABI so UI development can proceed in parallel with smart contract development. Swapping in the real ABI is a one-file change.

---

## Team

- **Smart Contract:** Solidity, FHEVM architecture, cUSDT integration
- **Frontend:** Next.js 16, wagmi/viem, fhevmjs client-side FHE, UI/UX

Built for **Zama Season 3 Builder Track**, June-July 2026.
