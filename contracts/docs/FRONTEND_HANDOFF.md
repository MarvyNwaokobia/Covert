# Covert — Frontend Handoff (S-01 ABI · S-02 decryption handshake · S-03 wallets)

Everything the frontend needs to integrate the **deployed, verified** contracts. The ABI is already
synced into `frontend/src/lib/abi/CovertPayroll.json` and `src/lib/abi/CovertPayroll.json`.

## Addresses + env (Sepolia)

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6ded5205331545437aAeF4897738D4ed7055Ce1c   # CovertPayroll (verified)
NEXT_PUBLIC_CUSDT_ADDRESS=0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3       # cUSDT (verified)
```

Employer (admin) = the deployer `0x3C343AD077983371b29fee386bdBC8a92E934C51`.

## S-03 — shared test wallets (already seeded on-chain)

Derived from the demo mnemonic `artist real liar material suspect tobacco palm window gallery fuel
horn together`. Import these into MetaMask for the demo (TEST ONLY):

| Role | Address | Private key |
| --- | --- | --- |
| employee1 | `0xe515db93D42a4682Fb9F517974bD419Cb2C00dE2` | `0x5ce1a95c64f79da8af685d4afe924af6a63764b39b3a727ab4eb1e862f009534` |
| employee2 | `0x625ad275312a1279bE7C7177C78305Fc89dD044c` | `0xb47181bda2a9bc2c833ea3327bb693c0967364a4141f07d14b7d99d81f653463` |
| employee3 | `0xCC3603df9dD362e2b7A1EfAC142dA44E12D691B5` | `0x076defc8e54e9f777ec903f4a8ed0b8e027e84570036baefacfeff3ff8bf8e47` |
| auditor   | `0x50c1c4085EAa5c91eeF03C94e34a6E22609F4abF` | `0x4133a07690a241fc1085b11a485177a7694238f30af77f0d4e608ff1538c4b43` |

Seeded state: 3 salaries (5k/3k/8k cUSDT), 1 distribution cycle, 500 cUSDT budget each, 2 peer
bonuses (emp1→emp2 120, emp2→emp3 75), 1 auditor. Use `getEmployees()` / `getAuditors()` to detect
roles, or `employer()` / `isEmployee(addr)` / `isAuditor(addr)`.

## S-01 — ABI is locked. What changed vs the earlier stub

The encryption (write) path is unchanged — your `usePayroll` upload and `allocatePeerBonus` already
match. **Only the decryption (read) functions changed**, because real FHEVM has *no on-chain reveal*.

| Stub (won't work) | Real contract | Notes |
| --- | --- | --- |
| `requestSalaryDecryption(publicKey, signature) → bytes` | `getMySalary() → euint64` | returns a ciphertext **handle** (bytes32); decrypt off-chain |
| `getPeerBonusBudget(publicKey, signature) → bytes` | `getMyBonusBudget() → euint64` | handle of the caller's remaining budget |
| `getTotalDisbursed(publicKey, signature) → bytes` | `getTotalDisbursed() → euint64` | **no args**; handle, ACL-gated to employer/auditors |
| `getTotalBonusAllocated(publicKey, signature) → bytes` | `getTotalBonusAllocated() → euint64` | **no args** |

Unchanged: `uploadPayroll`, `triggerDistribution`, `fundBonusPool`, `allocatePeerBonus`,
`addEmployee`, `addAuditor`, `employer`, `isEmployee`, `isAuditor`, `getEmployeeCount`,
`getCycleCount`, and all events.

`encryptedSalaries`/`encryptedAmount` are `bytes32` (`externalEuint64`) and proofs are `bytes` — i.e.
exactly your `{ handle, inputProof }` from `instance.createEncryptedInput(...).add64(x).encrypt()`.

## S-02 — the decryption handshake (off-chain via the relayer)

Decryption is **not** a contract call. Read the handle from the `view`, then ask the Zama relayer to
user-decrypt it, authenticated by an EIP-712 signature. The contract has already granted ACL:
salary/budget → that employee; totals → employer + auditors.

Recommended: switch from `fhevmjs` to **`@zama-fhe/relayer-sdk`** (same stack the contracts use). The
shape (re-confirm exact arg order against your installed SDK version):

```ts
import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/web'

const instance = await createInstance(SepoliaConfig)

// 1) read the ciphertext handle from the contract
const handle: string = await readContract(wagmiConfig, {
  address: COVERT, abi, functionName: 'getMySalary',
}) // bytes32 handle; for aggregates use getTotalDisbursed() (no args)

// 2) one EIP-712 signature authorizes user-decryption for a window
const keypair = instance.generateKeypair()
const start = Math.floor(Date.now() / 1000).toString()
const days = '7'
const contracts = [COVERT]
const eip712 = instance.createEIP712(keypair.publicKey, contracts, start, days)
const signature = await signTypedDataAsync({
  domain: eip712.domain,
  types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  primaryType: 'UserDecryptRequestVerification',
  message: eip712.message,
})

// 3) relayer returns the plaintext (only because the ACL allows this signer)
const res = await instance.userDecrypt(
  [{ handle, contractAddress: COVERT }],
  keypair.privateKey, keypair.publicKey,
  signature.replace(/^0x/, ''),
  contracts, userAddress, start, days,
)
const salary: bigint = res[handle] // amounts are 6-decimal cUSDT units
```

Hooks to update: `useEmployeeData` (`decryptSalary`→`getMySalary`, `decryptBudget`→`getMyBonusBudget`),
`useAuditorData` (`decryptAggregates`→`getTotalDisbursed`/`getTotalBonusAllocated`, no args), and
`lib/fhevm.ts` (`createFhevmInstance` → `createInstance(SepoliaConfig)`; replace `instance.decrypt(bytes)`
with the `userDecrypt` flow above). The encryption helpers in `useFhevm` stay as-is.

If you keep `fhevmjs@0.6`, use its `instance.userDecrypt(...)` equivalent on the handle — do **not**
expect bytes back from a contract call.

## Quick role/data wiring

- Employer dashboard: `uploadPayroll`, `triggerDistribution`, `fundBonusPool`; show aggregate via
  `getTotalDisbursed()` + userDecrypt.
- Employee dashboard: payslip = `getMySalary()` + userDecrypt; budget = `getMyBonusBudget()` +
  userDecrypt; allocate = `allocatePeerBonus(recipient, handle, proof)`.
- Auditor dashboard: `getEmployeeCount()`, `getCycleCount()` (cleartext) + `getTotalDisbursed()` /
  `getTotalBonusAllocated()` (userDecrypt). No individual data is ever accessible.
