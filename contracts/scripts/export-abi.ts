import * as fs from "fs";
import * as path from "path";

/**
 * Exports the compiled ABIs to the frontend (S-01 shared artifact) and to a local abi/ folder
 * for the submission. Run after `npm run build`:  npm run export-abi
 */
function readAbi(contract: string): unknown {
  const artifact = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${contract}.sol`,
    `${contract}.json`
  );
  return JSON.parse(fs.readFileSync(artifact, "utf8")).abi;
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log("wrote", file);
}

function main() {
  const covertAbi = readAbi("CovertPayroll");
  const tokenAbi = readAbi("ConfidentialMockToken");

  const repoRoot = path.join(__dirname, "..", "..");
  const targets = [
    path.join(__dirname, "..", "abi", "CovertPayroll.json"), // local copy for submission
    path.join(repoRoot, "frontend", "src", "lib", "abi", "CovertPayroll.json"), // canonical frontend
    path.join(repoRoot, "src", "lib", "abi", "CovertPayroll.json"), // root frontend copy
  ];
  for (const t of targets) {
    if (t.includes(path.sep + "src" + path.sep) && !fs.existsSync(path.dirname(t))) {
      console.log("skip (no such frontend dir):", t);
      continue;
    }
    writeJson(t, covertAbi);
  }

  writeJson(path.join(__dirname, "..", "abi", "ConfidentialMockToken.json"), tokenAbi);
  console.log("\nABI export complete.");
}

main();
