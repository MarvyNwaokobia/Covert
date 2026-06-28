import { ethers, fhevm, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Seeds a deployed CovertPayroll with a complete demo state so judges can explore immediately:
 *   - 3 employees with encrypted salaries, uploaded + distributed (1 payroll cycle)
 *   - a funded peer-bonus budget for each employee
 *   - 2 peer-bonus rounds (employee -> colleague), so the auditor's bonus total is non-zero
 *   - 1 auditor registered (can decrypt aggregates)
 *
 * Run AFTER deploy:   npm run seed         (Sepolia)   /   hardhat run scripts/seed.ts (local)
 *
 * Demo wallets are derived from a fixed TEST-ONLY mnemonic (overridable via EMPLOYEE_1..3 and
 * AUDITOR_1 in .env). Their addresses + keys are printed so the frontend dev and judges can import
 * them (S-03: both devs use the same test wallets against the same deployed contract).
 *
 * NOTE: the peer-bonus rounds are sent by the employee wallets themselves. We fund their gas and
 * send those txs through a plain JSON-RPC provider (not the Hardhat signer wrapper), which avoids
 * a value-transfer quirk in the wrapped provider. Encryption still uses the FHEVM relayer runtime.
 */
// Project-specific demo mnemonic (TEST ONLY). NOT the famous hardhat mnemonic, whose addresses are
// EIP-7702-delegated contracts on public Sepolia that reject plain ETH transfers.
const DEMO_MNEMONIC = "artist real liar material suspect tobacco palm window gallery fuel horn together";
const SALARIES = [5_000_000000n, 3_000_000000n, 8_000_000000n]; // 5k / 3k / 8k cUSDT (6 decimals)
const BUDGET = 500_000000n; // 500 cUSDT peer-bonus budget each
const GAS_TOPUP = ethers.parseEther("0.01"); // sent to employee wallets so they can allocate

function demoWallet(index: number) {
  return ethers.HDNodeWallet.fromPhrase(DEMO_MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`);
}

async function main() {
  const [employer] = await ethers.getSigners();
  await fhevm.initializeCLIApi(); // relayer client for createEncryptedInput against the live coprocessor

  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment found at ${file}. Run deploy first.`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const covertAddr: string = dep.CovertPayroll;
  console.log("Network:", network.name, "| CovertPayroll:", covertAddr);

  const covert = await ethers.getContractAt("CovertPayroll", covertAddr);

  // Plain provider + raw deployer wallet for ETH top-ups (bypasses the wrapped-signer quirk).
  const rawProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const rawDeployer = new ethers.Wallet(process.env.DEPLOYER_PK as string, rawProvider);

  // --- resolve demo wallets (employees 1..3, auditor 4) ---
  const e1 = process.env.EMPLOYEE_1?.trim() || demoWallet(1).address;
  const e2 = process.env.EMPLOYEE_2?.trim() || demoWallet(2).address;
  const e3 = process.env.EMPLOYEE_3?.trim() || demoWallet(3).address;
  const auditor = process.env.AUDITOR_1?.trim() || demoWallet(4).address;
  const employees = [e1, e2, e3];

  // --- C-04: upload encrypted payroll (auto-registers employees) ---
  console.log("Encrypting + uploading payroll...");
  const handles: string[] = [];
  const proofs: string[] = [];
  for (let i = 0; i < employees.length; i++) {
    const enc = await fhevm.createEncryptedInput(covertAddr, employer.address).add64(SALARIES[i]).encrypt();
    handles.push(enc.handles[0] as unknown as string);
    proofs.push(enc.inputProof as unknown as string);
  }
  await (await covert.uploadPayroll(employees, handles, proofs)).wait();
  console.log("  uploaded 3 encrypted salaries");

  // --- C-05: fund peer-bonus budget (500 cUSDT each) ---
  const budgetEnc = await fhevm.createEncryptedInput(covertAddr, employer.address).add64(BUDGET).encrypt();
  await (await covert.fundBonusPool(budgetEnc.handles[0], budgetEnc.inputProof)).wait();
  console.log("  funded peer-bonus budget (500 cUSDT each)");

  // --- C-04: trigger the first payroll distribution ---
  await (await covert.triggerDistribution()).wait();
  console.log("  triggered payroll distribution (cycle 1)");

  // --- C-07: register the auditor ---
  await (await covert.addAuditor(auditor)).wait();
  console.log("  registered auditor", auditor);

  // --- 2 peer-bonus rounds, sent by the employees themselves ---
  // Round A: employee1 -> employee2 (120 cUSDT).  Round B: employee2 -> employee3 (75 cUSDT).
  const rounds = [
    { fromIdx: 1, to: e2, amount: 120_000000n, label: "employee1 -> employee2 (120 cUSDT)" },
    { fromIdx: 2, to: e3, amount: 75_000000n, label: "employee2 -> employee3 (75 cUSDT)" },
  ];
  for (const r of rounds) {
    try {
      const w = demoWallet(r.fromIdx).connect(rawProvider);
      const wBal = await rawProvider.getBalance(w.address);
      if (wBal < GAS_TOPUP) {
        await (await rawDeployer.sendTransaction({ to: w.address, value: GAS_TOPUP })).wait();
      }
      const enc = await fhevm.createEncryptedInput(covertAddr, w.address).add64(r.amount).encrypt();
      await (await covert.connect(w).allocatePeerBonus(r.to, enc.handles[0], enc.inputProof)).wait();
      console.log(`  peer bonus: ${r.label}`);
    } catch (e) {
      console.warn(`  skipped peer bonus (${r.label}):`, (e as Error).message);
    }
  }

  console.log("\nSeed complete. State:");
  console.log("  employees:", Number(await covert.getEmployeeCount()), "| cycles:", Number(await covert.getCycleCount()));
  console.log("\n--- Demo wallets (TEST ONLY — derived from the Covert demo mnemonic) ---");
  for (let i = 1; i <= 3; i++) console.log(`  employee${i}:`, demoWallet(i).address, " key:", demoWallet(i).privateKey);
  console.log("  auditor:  ", demoWallet(4).address, " key:", demoWallet(4).privateKey);
  console.log("  (employer = deployer:", employer.address + ")");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
