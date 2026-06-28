import { ethers, fhevm, network } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Decrypts the live on-chain state as each role to prove confidentiality + correctness end-to-end
 * against the real coprocessor:
 *   - employer/auditor decrypt the aggregate totals (the auditor paradox: total without the parts)
 *   - each employee decrypts ONLY their own salary + cUSDT balance
 * Amounts are shown in cUSDT (6 decimals). Run after seeding:  npm run verify-state  (custom).
 */
const DEMO_MNEMONIC = "artist real liar material suspect tobacco palm window gallery fuel horn together";
const wallet = (i: number) =>
  ethers.HDNodeWallet.fromPhrase(DEMO_MNEMONIC, undefined, `m/44'/60'/0'/0/${i}`).connect(ethers.provider);

const usd = (x: bigint) => (Number(x) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " cUSDT";

async function dec(handle: string, contractAddr: string, signer: any) {
  return fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, signer);
}

async function main() {
  await fhevm.initializeCLIApi();
  const [employer] = await ethers.getSigners();
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8"));
  const covert = await ethers.getContractAt("CovertPayroll", dep.CovertPayroll);
  const cUSDT = await ethers.getContractAt("ConfidentialMockToken", dep.cUSDT);
  console.log("CovertPayroll:", dep.CovertPayroll, "| network:", network.name);

  console.log("\n== Aggregates (employer view) ==");
  console.log("  total disbursed:       ", usd(await dec(await covert.getTotalDisbursed(), dep.CovertPayroll, employer)));
  console.log("  total bonus allocated: ", usd(await dec(await covert.getTotalBonusAllocated(), dep.CovertPayroll, employer)));

  const auditors = await covert.getAuditors();
  if (auditors.length) {
    const aud = wallet(4);
    console.log("\n== Aggregates (auditor view) ==", aud.address);
    console.log("  total disbursed:       ", usd(await dec(await covert.getTotalDisbursed(), dep.CovertPayroll, aud)));
    console.log("  total bonus allocated: ", usd(await dec(await covert.getTotalBonusAllocated(), dep.CovertPayroll, aud)));
  }

  console.log("\n== Per-employee (each decrypts only their own) ==");
  const emps = await covert.getEmployees();
  for (let i = 0; i < emps.length; i++) {
    const w = wallet(i + 1);
    const salary = await dec(await covert.getSalaryHandle(emps[i]), dep.CovertPayroll, w);
    const bal = await dec(await cUSDT.confidentialBalanceOf(emps[i]), dep.cUSDT, w);
    console.log(`  employee${i + 1} ${emps[i]}  salary=${usd(salary)}  cUSDT balance=${usd(bal)}`);
  }

  console.log("\n== Negative control: employee1 tries to read employee2's salary ==");
  try {
    await dec(await covert.getSalaryHandle(emps[1]), dep.CovertPayroll, wallet(1));
    console.log("  ERROR: decryption unexpectedly succeeded (ACL leak!)");
  } catch {
    console.log("  denied by ACL (correct) — individual salaries stay private");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
