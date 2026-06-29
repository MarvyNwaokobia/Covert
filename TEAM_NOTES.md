# Covert — Team Notes (contract layer → frontend handoff)

_Last updated: 2026-06-29 · Owner of this note: smart-contract side_

The **smart contract layer is done, deployed, verified, and live on Sepolia.** This file is the
quick "what's going on" for the frontend side. Deep detail lives in:
- [`contracts/docs/FRONTEND_HANDOFF.md`](contracts/docs/FRONTEND_HANDOFF.md) — ABI, decryption handshake, demo wallets (read this before touching the dashboards)
- [`contracts/docs/ARCHITECTURE.md`](contracts/docs/ARCHITECTURE.md) — design + FHE-necessity argument (good for README/video)
- [`contracts/README.md`](contracts/README.md) — how to build/test/deploy

---

## TL;DR

- All 12 contract tasks (C-01 → C-12) are complete. 14 tests pass. Deployed + **verified** on Etherscan & Sourcify. Seeded with demo data. A 10-agent adversarial review found **0 real issues**.
- **The frontend's decryption code needs to change** — the old stub ABI used a pattern that does not exist in real FHEVM. Details below. The *encryption* (upload/allocate) code is already correct.
- The ABI is already synced into `frontend/src/lib/abi/CovertPayroll.json` (and the `src/` copy), and the deployed addresses are now the defaults in both `constants.ts`.

## Deployed on Sepolia (verified)

| | Address |
| --- | --- |
| **CovertPayroll** | [`0x6ded5205331545437aAeF4897738D4ed7055Ce1c`](https://sepolia.etherscan.io/address/0x6ded5205331545437aAeF4897738D4ed7055Ce1c#code) |
| **cUSDT** | [`0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3`](https://sepolia.etherscan.io/address/0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3#code) |
| **Employer (admin)** | `0x3C343AD077983371b29fee386bdBC8a92E934C51` |

`.env.local` for the frontend:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6ded5205331545437aAeF4897738D4ed7055Ce1c
NEXT_PUBLIC_CUSDT_ADDRESS=0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3
```

## Demo wallets (already seeded — import into MetaMask, TEST ONLY)

Mnemonic: `artist real liar material suspect tobacco palm window gallery fuel horn together`

| Role | Address | Private key |
| --- | --- | --- |
| employee1 | `0xe515db93D42a4682Fb9F517974bD419Cb2C00dE2` | `0x5ce1a95c64f79da8af685d4afe924af6a63764b39b3a727ab4eb1e862f009534` |
| employee2 | `0x625ad275312a1279bE7C7177C78305Fc89dD044c` | `0xb47181bda2a9bc2c833ea3327bb693c0967364a4141f07d14b7d99d81f653463` |
| employee3 | `0xCC3603df9dD362e2b7A1EfAC142dA44E12D691B5` | `0x076defc8e54e9f777ec903f4a8ed0b8e027e84570036baefacfeff3ff8bf8e47` |
| auditor   | `0x50c1c4085EAa5c91eeF03C94e34a6E22609F4abF` | `0x4133a07690a241fc1085b11a485177a7694238f30af77f0d4e608ff1538c4b43` |

**Seeded state:** 3 salaries (5k / 3k / 8k cUSDT), 1 payroll distribution cycle, 500 cUSDT bonus
budget each, 2 peer bonuses (emp1→emp2 120, emp2→emp3 75), 1 auditor. Verified by decryption:
employer/auditor see **16,000 disbursed / 195 bonuses**; each employee sees only their own salary;
cross-employee reads are denied by the ACL.

## ⚠️ The one thing that changed: decryption (S-01 / S-02)

Real FHEVM has **no on-chain "reveal" function.** The old stub ABI had
`requestSalaryDecryption(publicKey, signature) → bytes` and used `fhevmjs.decrypt(bytes)`. That
isn't how it works. Instead:

1. The contract grants ACL rights (`FHE.allow`) and exposes the ciphertext **handle** via a `view`.
2. The frontend reads the handle, then **decrypts off-chain via the Zama relayer**, authenticated by
   one EIP-712 signature.

**ABI changes (only the read/decrypt side):**

| Old stub (remove) | New contract (use) |
| --- | --- |
| `requestSalaryDecryption(pk, sig) → bytes` | `getMySalary() → euint64` (handle) |
| `getPeerBonusBudget(pk, sig) → bytes` | `getMyBonusBudget() → euint64` |
| `getTotalDisbursed(pk, sig) → bytes` | `getTotalDisbursed() → euint64` (no args) |
| `getTotalBonusAllocated(pk, sig) → bytes` | `getTotalBonusAllocated() → euint64` (no args) |

**Unchanged** (your upload/allocate code already matches): `uploadPayroll`, `triggerDistribution`,
`fundBonusPool`, `allocatePeerBonus`, `addEmployee`, `addAuditor`, `employer`, `isEmployee`,
`isAuditor`, `getEmployeeCount`, `getCycleCount`, and all events.

## Frontend TODO (the F-tasks still open)

1. **Switch the FHE lib** in `lib/fhevm.ts` from `fhevmjs` → `@zama-fhe/relayer-sdk` (matches the
   contract stack). `createInstance(SepoliaConfig)`.
2. **Rewrite the 3 decrypt flows** to read the handle then call `instance.userDecrypt(...)` —
   exact code snippet + arg order is in `contracts/docs/FRONTEND_HANDOFF.md`:
   - `useEmployeeData`: `decryptSalary` → `getMySalary()`, `decryptBudget` → `getMyBonusBudget()`
   - `useAuditorData`: `decryptAggregates` → `getTotalDisbursed()` / `getTotalBonusAllocated()` (no args)
3. Wire role detection from `employer()` / `isEmployee(addr)` / `isAuditor(addr)` (or `getEmployees()` / `getAuditors()`).
4. Amounts are **6-decimal cUSDT units** (e.g. `5_000_000000` = 5,000 cUSDT).

I can do this migration if you want — just say the word. Otherwise it's yours.

## Gotchas I hit (so you don't lose hours)

- **drpc.org RPC** chokes on plain ETH transfers (`estimateGas → execution reverted`). Contract calls
  work, but value transfers fail. I switched the deploy RPC to `ethereum-sepolia-rpc.publicnode.com`.
  If you do raw ETH sends from a script, use publicnode.
- **The famous hardhat mnemonic addresses** (`test test … junk`) are **EIP-7702-delegated contracts**
  on Sepolia that *reject incoming ETH* — that's why the demo wallets use a project-specific mnemonic.
- **Peer bonuses are paid from the company pool** (the contract's funded cUSDT), not the employee's
  own balance. The per-employee budget is a *spending limit*, not their money.
- **Over-budget allocation does not revert** — it spends 0. This is intentional: a revert would leak
  that the amount exceeded the (secret) budget. Handle the "looks like success but 0 moved" case in UI
  copy if needed.
- **Etherscan verify needs Sourcify enabled** (viaIR quirk). Already configured in `hardhat.config.ts`.
- **`next build` must use webpack, not Turbopack.** Turbopack's production optimizer hangs forever on
  the relayer-sdk WASM (0% CPU, no output). The `build` script is set to `next build --webpack`
  (verified: builds clean, all routes prerender). `npm run dev` (Turbopack) is fine for local work; if
  it ever hangs, add `--webpack` there too.

## Repo layout note

Resolved: the canonical app is **`frontend/`**. The old repo-root copy (`src/` + root Next config)
was the abandoned day-1 scaffold (a strict subset) and has been **deleted**. Repo root is now just
docs + `frontend/` (app) + `contracts/` (Solidity). This also cleared the duplicate-lockfile /
workspace-root warning.
