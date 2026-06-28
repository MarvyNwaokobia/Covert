# Covert — Contract Architecture (one page)

**Confidential compensation infrastructure on Zama FHEVM.** Salaries, payroll distribution, and
peer bonuses run entirely on-chain as Fully-Homomorphically-Encrypted values. No participant — not
validators, not the deployer, not Covert — can read any individual amount. The contract computes on
ciphertext and settles in ERC-7984 confidential USDT (cUSDT).

## Deployed (Sepolia, chainId 11155111)

| Contract | Address |
| --- | --- |
| `CovertPayroll` | [`0x6ded5205331545437aAeF4897738D4ed7055Ce1c`](https://sepolia.etherscan.io/address/0x6ded5205331545437aAeF4897738D4ed7055Ce1c#code) (verified) |
| `cUSDT` (ConfidentialMockToken) | [`0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3`](https://sepolia.etherscan.io/address/0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3#code) (verified) |
| Employer (admin) | `0x3C343AD077983371b29fee386bdBC8a92E934C51` |

## Why this needs FHE (not encryption, ZK, or a TEE)

The contract must *do arithmetic on amounts it cannot see*: sum salaries into an auditable total,
check `bonus <= remaining budget`, and pay out — all while the amounts stay encrypted on a public
chain. Standard encryption forces decryption before compute (visible to every node). ZK proves a
statement but does not run general private computation across stored state. A TEE reintroduces
hardware trust. FHE is the only primitive where the contract adds, compares, and conditionally
selects on ciphertext and emits an encrypted result, with the decryption key never in plaintext
anywhere. Covert is *only possible because FHE exists.*

## Three roles, three views (enforced by the FHEVM ACL)

- **Employer** (deployer/admin) — uploads encrypted payroll, triggers distribution rounds, funds the
  peer-bonus budget. Can decrypt the **aggregate** cost; cannot reconstruct individuals.
- **Employee** — receives encrypted cUSDT; can decrypt **only their own** salary and remaining bonus
  budget; allocates peer bonuses capped by an encrypted budget ceiling.
- **Auditor** — can decrypt **only the aggregate totals** (total disbursed, total bonus allocated) to
  prove solvency. Never sees an individual amount. *Prove the total without exposing the parts.*

## Encrypted data model

```
euint64  _salaryOf[employee]          // latest uploaded salary (employee-decryptable)
euint64  _bonusBudgetOf[employee]     // remaining peer-bonus budget (employee-decryptable)
euint64  _totalDisbursed              // running payroll total (employer + auditors)
euint64  _totalBonusAllocated         // running bonus total   (employer + auditors)
```

All amounts are `euint64` ciphertext handles. Encrypted inputs arrive as `externalEuint64` (a
`bytes32` handle) + a zk `inputProof`, produced client-side and verified on-chain via
`FHE.fromExternal`.

## The decryption model (no on-chain reveal)

There is **no function that returns a plaintext amount.** Confidentiality is the FHEVM **Access
Control List (ACL)**:

1. The contract grants rights with `FHE.allow(handle, account)` (e.g. salary → employee, totals →
   employer + auditors) and `FHE.allowThis(handle)` for its own compute.
2. Because every homomorphic op yields a *new* handle, the aggregate ACL is re-granted on each update
   (`_grantAggregateAcl`).
3. The authorized account reads the ciphertext handle from a `view` (`getMySalary`,
   `getTotalDisbursed`, …) and decrypts it **off-chain via the Zama relayer**, authenticating with an
   EIP-712 signature. Plaintext only ever exists in that account's own session.

## Function reference (ABI-stable surface)

| Function | Role | Effect |
| --- | --- | --- |
| `addEmployee(addr)` / `addAuditor(addr)` | Employer | register roles; auditor gets aggregate ACL |
| `uploadPayroll(addr[], externalEuint64[], bytes[])` | Employer | store encrypted salaries (auto-registers) |
| `triggerDistribution()` | Employer | pay each salary in cUSDT, accrue encrypted total, ++cycle |
| `fundBonusPool(externalEuint64, bytes)` | Employer | give every employee an encrypted budget |
| `allocatePeerBonus(addr, externalEuint64, bytes)` | Employee | pay a colleague, clamped to budget |
| `getMySalary()` / `getMyBonusBudget()` | Employee | own ciphertext handle (off-chain decrypt) |
| `getTotalDisbursed()` / `getTotalBonusAllocated()` | Employer/Auditor | aggregate handle |
| `getEmployeeCount` / `getCycleCount` / `getEmployees` / `getAuditors` | anyone | non-sensitive reads |

Events leak nothing sensitive: `PayrollTriggered(timestamp, recipientCount)`,
`BonusAllocated(from, to)` (no amount), `EmployeeAdded`, `AuditorAdded`, `BonusPoolFunded`,
`PayrollUploaded`.

## Key design decisions

- **Budget ceiling without leaks.** `allocatePeerBonus` never reverts on over-budget. It computes
  `spend = select(amount <= budget, amount, 0)` and pays `spend`. An over-limit attempt is
  *indistinguishable on-chain* from a normal one (same gas path, same event) — verified live:
  spending 900 against a 500 budget moves 0 and leaves the budget intact.
- **Bonuses paid from the company pool.** The per-employee budget is a *spending allowance*; the cUSDT
  comes from the contract's employer-funded balance, not the employee's wallet (matches "the employer
  funds a peer-bonus pool").
- **cUSDT clamps, never reverts.** ERC-7984 `confidentialTransfer` clamps to the sender's balance, so
  a shortfall cannot leak via a revert. Fund the contract generously.
- **Uniform budget.** `fundBonusPool` gives each employee the same encrypted budget (each as a fresh
  handle, ACL-scoped to its owner) — intentional and privacy-preserving.

## Threat model & known tradeoffs (deliberate)

A 10-agent adversarial FHEVM review confirmed **0 real findings**. The following are intentional
design choices under the documented trust model, surfaced here for transparency:

- **Amounts are never revealed; the recognition graph is.** `BonusAllocated(from, to)` exposes *who
  recognized whom* (addresses, never amounts) — intended per the spec ("colleagues know they received
  a peer bonus"). Over-budget attempts emit the same event and move 0, so the *amount* and *success*
  stay private; only the social edge is public.
- **Aggregates assume a funded pool.** Totals accrue the requested amount; cUSDT transfers clamp to the
  contract's balance. The deploy funds the pool to 1,000,000 cUSDT (≫ any demo payroll), so transferred
  == requested and the auditor total is exact. Keep the pool funded above the payroll run.
- **Single immutable employer.** The deployer is the sole admin (no transfer/renounce) — matches "one
  organization runs payroll"; key management is the org's responsibility.
- **Per-round budgets.** `fundBonusPool` sets each employee's budget fresh for the round (it does not
  accumulate across rounds).

## Verified end-to-end on Sepolia

Decrypting the live seeded state by role: employer/auditor read **16,000 cUSDT disbursed** and
**195 cUSDT bonuses**; each employee reads only their own salary (5k / 3k / 8k); employee1 is
**denied** by the ACL when reading employee2's salary. (`npm run build && hardhat run
scripts/verify-state.ts --network sepolia`.)
