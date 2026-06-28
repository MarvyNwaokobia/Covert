# Covert — Smart Contract Layer

Confidential compensation infrastructure on **Zama FHEVM**. Salaries, payroll distribution, and peer
bonuses run on-chain as Fully-Homomorphically-Encrypted `euint64` values and settle in ERC-7984
confidential USDT (cUSDT). No one — validators, deployer, or Covert — can read an individual amount.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design and the FHE-necessity argument, and
[`docs/FRONTEND_HANDOFF.md`](docs/FRONTEND_HANDOFF.md) for the locked ABI + decryption handshake.

## Stack

`@fhevm/solidity` 0.11 · `@fhevm/hardhat-plugin` 0.4 · `@zama-fhe/relayer-sdk` 0.4 · Solidity 0.8.27
(viaIR, optimizer 200) · Hardhat · Ethers v6.

## Contracts

| File | Purpose |
| --- | --- |
| [`contracts/CovertPayroll.sol`](contracts/CovertPayroll.sol) | roles, encrypted payroll + distribution, peer-bonus budgets, aggregates, ACL-based decryption |
| [`contracts/ConfidentialMockToken.sol`](contracts/ConfidentialMockToken.sol) | self-contained ERC-7984 cUSDT (faucet + clamped confidential transfers) |
| [`contracts/interfaces/IConfToken.sol`](contracts/interfaces/IConfToken.sol) | minimal ERC-7984 interface Covert depends on |

## Deployed (Sepolia, verified)

| Contract | Address |
| --- | --- |
| `CovertPayroll` | [`0x6ded5205331545437aAeF4897738D4ed7055Ce1c`](https://sepolia.etherscan.io/address/0x6ded5205331545437aAeF4897738D4ed7055Ce1c#code) |
| `cUSDT` | [`0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3`](https://sepolia.etherscan.io/address/0xDC9dDdB20D1D57Ef916738EAeB87B0943d1307d3#code) |

## Setup

```bash
cd contracts
npm install
cp .env.example .env   # fill SEPOLIA_RPC, DEPLOYER_PK, ETHERSCAN_API_KEY
```

## Commands

```bash
npm run build          # compile
npm test               # 14 tests against the FHEVM mock coprocessor
npm run deploy         # deploy cUSDT + CovertPayroll to Sepolia, fund the pool, write deployments/
npm run seed           # seed demo state: 3 salaries, distribution, budgets, 2 peer bonuses, 1 auditor
npm run export-abi     # sync ABI to frontend (+ local abi/)
npm run verify -- <addr> [args...]   # Etherscan + Sourcify verification
hardhat run scripts/verify-state.ts --network sepolia   # decrypt live state by role (proof of correctness)
```

`DEPLOYER_PK`'s wallet becomes the **Employer (admin)**. The deploy script funds `CovertPayroll` with
1,000,000 cUSDT (its mock `mint` faucet) so it can pay salaries/bonuses. To settle in an existing
cUSDT instead, set `CUSDT_ADDRESS` in `.env`.

## Tests (14 passing)

Role guards (C-03) · encrypted storage + per-employee self-decryption with cross-employee ACL denial
(C-04/C-06) · distribution + encrypted aggregate accrual across rounds (C-04/C-07) · uniform bonus
budget (C-05) · in-budget allocation pays the colleague and updates budget+aggregate (C-05) ·
**over-budget allocation spends 0 with no revert and no leak** (C-05) · auditor decrypts aggregates
but not individuals (C-07).
