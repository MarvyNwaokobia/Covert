import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * Covert — confidential compensation tests (FHEVM mock coprocessor).
 *
 * Run: npm test
 *
 * Encrypted-input + user-decrypt helpers come from @fhevm/hardhat-plugin (the `fhevm` runtime):
 *   - fhevm.createEncryptedInput(contract, user).add64(x).encrypt()  → { handles, inputProof }
 *   - fhevm.userDecryptEuint(FhevmType.euint64, handle, contract, signer) → bigint
 * userDecrypt enforces the on-chain ACL, so an account without FHE.allow rights cannot decrypt.
 */
describe("CovertPayroll (confidential compensation)", function () {
  const SALARIES = [5_000_000000n, 3_000_000000n, 8_000_000000n]; // 5k / 3k / 8k cUSDT (6 decimals)
  const BUDGET = 500_000000n; // 500 cUSDT peer-bonus budget each

  async function deploy() {
    const [employer, alice, bob, carol, auditor, outsider] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("ConfidentialMockToken");
    const cUSDT = await Mock.deploy("Confidential USDT", "cUSDT", 6);
    await cUSDT.waitForDeployment();
    const cUSDTAddr = await cUSDT.getAddress();

    const Covert = await ethers.getContractFactory("CovertPayroll");
    const covert = await Covert.deploy(cUSDTAddr);
    await covert.waitForDeployment();
    const covertAddr = await covert.getAddress();

    // Fund the payroll contract with cUSDT so it can pay salaries + bonuses.
    await (await cUSDT.mint(covertAddr, 1_000_000_000000n)).wait(); // 1,000,000 cUSDT

    return { employer, alice, bob, carol, auditor, outsider, cUSDT, cUSDTAddr, covert, covertAddr };
  }

  async function encSalary(covertAddr: string, employer: string, amount: bigint) {
    const input = fhevm.createEncryptedInput(covertAddr, employer);
    input.add64(amount);
    return input.encrypt(); // { handles, inputProof }
  }

  async function decU64(handle: string, contractAddr: string, signer: any): Promise<bigint> {
    return fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, signer);
  }

  async function expectDecryptDenied(handle: string, contractAddr: string, signer: any) {
    let denied = false;
    try {
      await fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, signer);
    } catch {
      denied = true;
    }
    expect(denied, "expected decryption to be denied by ACL").to.equal(true);
  }

  // Robust revert check. The @fhevm/hardhat-plugin surfaces `onlyEmployer` modifier reverts
  // through eth_sendTransaction (which it wraps), so `revertedWithCustomError` can't always read
  // the custom-error name on the local mock. A guard that fires MUST throw; one that doesn't fire
  // returns normally — so "did it throw?" is a faithful test of the access guard.
  async function expectReverts(call: Promise<any>, label: string) {
    let threw = false;
    try {
      const tx = await call;
      if (tx && typeof tx.wait === "function") await tx.wait();
    } catch {
      threw = true;
    }
    expect(threw, label).to.equal(true);
  }

  // Upload the three salaries (auto-registers alice/bob/carol as employees).
  async function uploadThree(ctx: Awaited<ReturnType<typeof deploy>>) {
    const { covert, covertAddr, employer, alice, bob, carol } = ctx;
    const emps = [alice.address, bob.address, carol.address];
    const handles: string[] = [];
    const proofs: string[] = [];
    for (let i = 0; i < emps.length; i++) {
      const e = await encSalary(covertAddr, employer.address, SALARIES[i]);
      handles.push(e.handles[0]);
      proofs.push(e.inputProof);
    }
    await (await covert.connect(employer).uploadPayroll(emps, handles, proofs)).wait();
  }

  // ---------------------------------------------------------------- deploy & roles

  it("sets the deployer as employer and stores the cUSDT token", async () => {
    const { covert, employer, cUSDTAddr } = await deploy();
    expect(await covert.employer()).to.equal(employer.address);
    expect(await covert.cUSDT()).to.equal(cUSDTAddr);
    expect(await covert.getEmployeeCount()).to.equal(0n);
    expect(await covert.getCycleCount()).to.equal(0n);
  });

  it("enforces employer-only guards (C-03)", async () => {
    const { covert, employer, alice, outsider } = await deploy();
    // non-employer is blocked from every admin action...
    await expectReverts(covert.connect(outsider).addEmployee(alice.address), "outsider addEmployee");
    await expectReverts(covert.connect(outsider).addAuditor(alice.address), "outsider addAuditor");
    await expectReverts(covert.connect(outsider).triggerDistribution(), "outsider triggerDistribution");
    // ...while the employer can (positive control proves the guard, not a broken call, is at fault).
    await (await covert.connect(employer).addEmployee(alice.address)).wait();
    expect(await covert.isEmployee(alice.address)).to.equal(true);
  });

  it("registers employees and auditors, with dedup guards", async () => {
    const { covert, employer, alice, auditor } = await deploy();
    await (await covert.connect(employer).addEmployee(alice.address)).wait();
    expect(await covert.isEmployee(alice.address)).to.equal(true);
    expect(await covert.getEmployeeCount()).to.equal(1n);
    await expect(covert.connect(employer).addEmployee(alice.address)).to.be.revertedWithCustomError(
      covert,
      "AlreadyEmployee"
    );

    await (await covert.connect(employer).addAuditor(auditor.address)).wait();
    expect(await covert.isAuditor(auditor.address)).to.equal(true);
    await expect(covert.connect(employer).addAuditor(auditor.address)).to.be.revertedWithCustomError(
      covert,
      "AlreadyAuditor"
    );
  });

  // ---------------------------------------------------------------- C-04 upload

  it("stores encrypted salaries; each employee decrypts ONLY their own (C-04/C-06)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, alice, bob, carol } = ctx;
    await uploadThree(ctx);

    expect(await covert.getEmployeeCount()).to.equal(3n);
    expect(await covert.isEmployee(alice.address)).to.equal(true);

    const aliceSalary = await decU64(await covert.connect(alice).getMySalary(), covertAddr, alice);
    const bobSalary = await decU64(await covert.connect(bob).getMySalary(), covertAddr, bob);
    const carolSalary = await decU64(await covert.connect(carol).getMySalary(), covertAddr, carol);
    expect(aliceSalary).to.equal(SALARIES[0]);
    expect(bobSalary).to.equal(SALARIES[1]);
    expect(carolSalary).to.equal(SALARIES[2]);
  });

  it("denies cross-employee salary decryption via the ACL (C-06)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, alice, bob, outsider } = ctx;
    await uploadThree(ctx);

    // bob tries to decrypt alice's salary handle — ACL must reject.
    const aliceHandle = await covert.getSalaryHandle(alice.address);
    await expectDecryptDenied(aliceHandle, covertAddr, bob);
    await expectDecryptDenied(aliceHandle, covertAddr, outsider);
  });

  it("rejects mismatched array lengths and empty input on upload", async () => {
    const { covert, covertAddr, employer, alice } = await deploy();
    const e = await encSalary(covertAddr, employer.address, SALARIES[0]);
    await expect(
      covert.connect(employer).uploadPayroll([alice.address], [], [e.inputProof])
    ).to.be.revertedWithCustomError(covert, "LengthMismatch");
    await expect(covert.connect(employer).uploadPayroll([], [], [])).to.be.revertedWithCustomError(
      covert,
      "EmptyInput"
    );
  });

  // ---------------------------------------------------------------- C-04 distribution

  it("distributes encrypted salaries in cUSDT and accrues the encrypted total (C-04/C-07)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, cUSDT, cUSDTAddr, employer, alice, bob, carol } = ctx;
    await uploadThree(ctx);

    await (await covert.connect(employer).triggerDistribution()).wait();
    expect(await covert.getCycleCount()).to.equal(1n);

    // each employee actually received their salary in cUSDT
    const aliceBal = await decU64(await cUSDT.confidentialBalanceOf(alice.address), cUSDTAddr, alice);
    const bobBal = await decU64(await cUSDT.confidentialBalanceOf(bob.address), cUSDTAddr, bob);
    const carolBal = await decU64(await cUSDT.confidentialBalanceOf(carol.address), cUSDTAddr, carol);
    expect(aliceBal).to.equal(SALARIES[0]);
    expect(bobBal).to.equal(SALARIES[1]);
    expect(carolBal).to.equal(SALARIES[2]);

    // employer can decrypt the aggregate total cost
    const total = await decU64(await covert.getTotalDisbursed(), covertAddr, employer);
    expect(total).to.equal(SALARIES[0] + SALARIES[1] + SALARIES[2]);
  });

  it("accumulates totals across multiple distribution rounds", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, employer } = ctx;
    await uploadThree(ctx);

    await (await covert.connect(employer).triggerDistribution()).wait();
    await (await covert.connect(employer).triggerDistribution()).wait();
    expect(await covert.getCycleCount()).to.equal(2n);

    const total = await decU64(await covert.getTotalDisbursed(), covertAddr, employer);
    expect(total).to.equal(2n * (SALARIES[0] + SALARIES[1] + SALARIES[2]));
  });

  it("reverts distribution when there are no employees", async () => {
    const { covert, employer } = await deploy();
    await expect(covert.connect(employer).triggerDistribution()).to.be.revertedWithCustomError(
      covert,
      "NoEmployees"
    );
  });

  // ---------------------------------------------------------------- C-05 peer bonus

  it("funds a uniform encrypted bonus budget each employee can decrypt (C-05)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, employer, alice, bob } = ctx;
    await uploadThree(ctx);

    const e = await encSalary(covertAddr, employer.address, BUDGET);
    await (await covert.connect(employer).fundBonusPool(e.handles[0], e.inputProof)).wait();

    expect(await decU64(await covert.connect(alice).getMyBonusBudget(), covertAddr, alice)).to.equal(BUDGET);
    expect(await decU64(await covert.connect(bob).getMyBonusBudget(), covertAddr, bob)).to.equal(BUDGET);
  });

  it("allocates a peer bonus within budget; recipient is paid, budget + aggregate update (C-05)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, cUSDT, cUSDTAddr, employer, alice, bob } = ctx;
    await uploadThree(ctx);

    const fund = await encSalary(covertAddr, employer.address, BUDGET);
    await (await covert.connect(employer).fundBonusPool(fund.handles[0], fund.inputProof)).wait();

    const bonus = 120_000000n; // 120 cUSDT, well under the 500 budget
    const a = await encSalary(covertAddr, alice.address, bonus);
    await (await covert.connect(alice).allocatePeerBonus(bob.address, a.handles[0], a.inputProof)).wait();

    // bob received the bonus
    const bobBal = await decU64(await cUSDT.confidentialBalanceOf(bob.address), cUSDTAddr, bob);
    expect(bobBal).to.equal(bonus);

    // alice's remaining budget dropped by exactly the bonus
    const remaining = await decU64(await covert.connect(alice).getMyBonusBudget(), covertAddr, alice);
    expect(remaining).to.equal(BUDGET - bonus);

    // aggregate bonus total reflects it (employer view)
    const totalBonus = await decU64(await covert.getTotalBonusAllocated(), covertAddr, employer);
    expect(totalBonus).to.equal(bonus);
  });

  it("enforces the budget ceiling homomorphically: an over-budget allocation spends 0, no revert, no leak (C-05)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, cUSDT, cUSDTAddr, employer, alice, bob } = ctx;
    await uploadThree(ctx);

    const fund = await encSalary(covertAddr, employer.address, BUDGET);
    await (await covert.connect(employer).fundBonusPool(fund.handles[0], fund.inputProof)).wait();

    const tooMuch = 900_000000n; // 900 > 500 budget
    const a = await encSalary(covertAddr, alice.address, tooMuch);
    // the call SUCCEEDS (no revert) — confidentiality requires it be indistinguishable on-chain
    await (await covert.connect(alice).allocatePeerBonus(bob.address, a.handles[0], a.inputProof)).wait();

    // ...but nothing actually moved: bob got 0, alice's budget is intact, aggregate is 0
    const bobBal = await decU64(await cUSDT.confidentialBalanceOf(bob.address), cUSDTAddr, bob);
    expect(bobBal).to.equal(0n);
    const remaining = await decU64(await covert.connect(alice).getMyBonusBudget(), covertAddr, alice);
    expect(remaining).to.equal(BUDGET);
    const totalBonus = await decU64(await covert.getTotalBonusAllocated(), covertAddr, employer);
    expect(totalBonus).to.equal(0n);
  });

  it("blocks non-employees from allocating peer bonuses", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, outsider, alice } = ctx;
    await uploadThree(ctx);
    const a = await encSalary(covertAddr, outsider.address, 10n);
    await expect(
      covert.connect(outsider).allocatePeerBonus(alice.address, a.handles[0], a.inputProof)
    ).to.be.revertedWithCustomError(covert, "NotEmployee");
  });

  // ---------------------------------------------------------------- C-07 auditor

  it("lets an auditor decrypt aggregates but NOT individual salaries (C-07)", async () => {
    const ctx = await deploy();
    const { covert, covertAddr, employer, alice, auditor, outsider } = ctx;
    await uploadThree(ctx);
    await (await covert.connect(employer).addAuditor(auditor.address)).wait();
    await (await covert.connect(employer).triggerDistribution()).wait();

    // auditor sees the aggregate
    const total = await decU64(await covert.getTotalDisbursed(), covertAddr, auditor);
    expect(total).to.equal(SALARIES[0] + SALARIES[1] + SALARIES[2]);

    // auditor CANNOT see any individual salary
    await expectDecryptDenied(await covert.getSalaryHandle(alice.address), covertAddr, auditor);
    // a random outsider cannot read the aggregate either
    await expectDecryptDenied(await covert.getTotalDisbursed(), covertAddr, outsider);
  });
});
