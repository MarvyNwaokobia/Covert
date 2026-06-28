import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploys the Covert confidential compensation contract.
 *
 *   Local (FHEVM mock):  npm run deploy:local
 *   Sepolia:             npm run deploy        (needs DEPLOYER_PK + SEPOLIA_RPC in .env)
 *
 * By default this deploys a self-contained ConfidentialMockToken as cUSDT and funds the payroll
 * contract with it (reliable for the demo). To settle in an existing ERC-7984 cUSDT instead, set
 * CUSDT_ADDRESS in .env (e.g. the official Sepolia mock 0x4E7B06D78965594eB5EF5414c357ca21E1554491).
 *
 * Writes the deployed addresses to deployments/<network>.json and prints the frontend env block.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Network: ", network.name);
  console.log("Deployer:", deployer.address, `(${ethers.formatEther(bal)} ETH)`);

  // --- cUSDT (ERC-7984 confidential USDT) ---
  let cUSDTAddr = process.env.CUSDT_ADDRESS?.trim();
  let deployedMock = false;
  if (!cUSDTAddr) {
    const Mock = await ethers.getContractFactory("ConfidentialMockToken");
    const cUSDT = await Mock.deploy("Confidential USDT", "cUSDT", 6);
    await cUSDT.waitForDeployment();
    cUSDTAddr = await cUSDT.getAddress();
    deployedMock = true;
    console.log("cUSDT (mock):", cUSDTAddr);
  } else {
    console.log("cUSDT (existing):", cUSDTAddr);
  }

  // --- Covert payroll ---
  const Covert = await ethers.getContractFactory("CovertPayroll");
  const covert = await Covert.deploy(cUSDTAddr);
  await covert.waitForDeployment();
  const covertAddr = await covert.getAddress();
  console.log("CovertPayroll:", covertAddr);

  // --- fund the payroll contract with cUSDT so it can pay salaries + bonuses ---
  // The mock + the official Sepolia cTokenMock both expose a public `mint(to, amount)` faucet.
  const FUND = 1_000_000_000000n; // 1,000,000 cUSDT (6 decimals)
  try {
    const token = await ethers.getContractAt("ConfidentialMockToken", cUSDTAddr);
    await (await token.mint(covertAddr, FUND)).wait();
    console.log(`Funded CovertPayroll with ${FUND} cUSDT units.`);
  } catch (e) {
    console.warn("Could not auto-fund cUSDT (token may lack a public mint). Fund it manually.", e);
  }

  // --- persist deployment ---
  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    employer: deployer.address,
    CovertPayroll: covertAddr,
    cUSDT: cUSDTAddr,
    cUSDTIsMock: deployedMock,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  console.log(`\nSaved deployments/${network.name}.json`);

  console.log("\n--- Frontend env (frontend/.env.local) ---");
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + covertAddr);
  console.log("NEXT_PUBLIC_CUSDT_ADDRESS=" + cUSDTAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
