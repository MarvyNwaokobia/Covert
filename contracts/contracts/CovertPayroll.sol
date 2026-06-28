// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfToken} from "./interfaces/IConfToken.sol";

/**
 * @title CovertPayroll
 * @author Covert — Confidential Compensation Infrastructure (Zama Season 3, Builder Track)
 * @notice Runs an organization's entire compensation cycle on-chain — salaries, payroll
 *         distribution, and peer-to-peer bonuses — without any participant ever seeing what
 *         anyone else earns. Every amount is a Fully-Homomorphically-Encrypted `euint64`
 *         ciphertext: it is encrypted client-side before it reaches the chain and stays
 *         encrypted while the contract stores it, sums it, and pays it out.
 *
 * @dev Three roles, three views of the system (by design):
 *
 *      - EMPLOYER (admin / deployer): uploads encrypted payroll, triggers distribution rounds,
 *        funds the peer-bonus budget. Can decrypt the aggregate cost (total disbursed) but not
 *        individual salaries from contract state.
 *      - EMPLOYEE (recipient): receives encrypted cUSDT; can decrypt ONLY their own salary and
 *        their own remaining bonus budget via the relayer user-decryption flow. May allocate
 *        peer bonuses to colleagues up to their (encrypted) budget — the ceiling is enforced
 *        homomorphically, so neither the amount nor the remaining budget is ever revealed.
 *      - AUDITOR (compliance): can decrypt aggregate totals (total disbursed, total bonus
 *        allocated) to prove solvency — without access to any individual amount. This is the
 *        auditor paradox FHE uniquely solves: prove the total without exposing the parts.
 *
 *      DECRYPTION MODEL (important): there is NO on-chain "reveal" function. Confidentiality is
 *      enforced by the FHEVM Access-Control List (ACL). This contract grants decryption rights
 *      with `FHE.allow(ciphertext, account)`; the authorized account then reads the ciphertext
 *      HANDLE from a `view` (e.g. {getMySalary}) and decrypts it OFF-CHAIN via the Zama relayer,
 *      proving identity with an EIP-712 signature. The plaintext only ever exists in that
 *      account's own browser session. No node, validator, or admin can read it.
 *
 *      Settlement uses ERC-7984 confidential USDT (cUSDT): {confidentialTransfer} moves an
 *      encrypted amount, clamped to the sender's balance (it never reverts on insufficient
 *      funds — the moved amount is itself a ciphertext). The Employer funds this contract with
 *      cUSDT so it can pay out salaries and bonuses.
 */
contract CovertPayroll is ZamaEthereumConfig {
    // ----------------------------------------------------------------------------------
    // Roles & state
    // ----------------------------------------------------------------------------------

    /// @notice The organization running payroll. Set to the deployer; the only admin.
    address public employer;

    /// @notice The ERC-7984 confidential USDT (cUSDT) used to settle all payments.
    IConfToken public immutable cUSDT;

    /// @notice True for addresses registered as employees (salary recipients).
    mapping(address => bool) public isEmployee;

    /// @notice True for addresses registered as auditors (aggregate-only viewers).
    mapping(address => bool) public isAuditor;

    /// @notice Enumerable employee set, used to iterate distribution rounds.
    address[] private _employees;

    /// @notice Enumerable auditor set, used to (re)grant aggregate ACL on each update.
    address[] private _auditors;

    /// @notice Encrypted salary per employee (the latest amount uploaded for them).
    mapping(address => euint64) private _salaryOf;

    /// @notice Encrypted REMAINING peer-bonus budget per employee.
    mapping(address => euint64) private _bonusBudgetOf;

    /// @notice Encrypted running total of all cUSDT disbursed via payroll (auditor + employer view).
    euint64 private _totalDisbursed;

    /// @notice Encrypted running total of all peer bonuses allocated (auditor + employer view).
    euint64 private _totalBonusAllocated;

    /// @notice Number of completed payroll distribution rounds.
    uint256 private _cycleCount;

    // ----------------------------------------------------------------------------------
    // Events (deliberately leak NOTHING sensitive — no amounts, ever)
    // ----------------------------------------------------------------------------------

    event EmployeeAdded(address indexed employee);
    event AuditorAdded(address indexed auditor);
    event PayrollUploaded(uint256 employeeCount);
    event PayrollTriggered(uint256 timestamp, uint256 recipientCount);
    event BonusPoolFunded(uint256 employeeCount);
    event BonusAllocated(address indexed from, address indexed to);

    // ----------------------------------------------------------------------------------
    // Errors
    // ----------------------------------------------------------------------------------

    error NotEmployer();
    error NotEmployee();
    error ZeroAddress();
    error LengthMismatch();
    error EmptyInput();
    error NoEmployees();
    error AlreadyEmployee();
    error AlreadyAuditor();
    error SelfAllocation();

    // ----------------------------------------------------------------------------------
    // Modifiers
    // ----------------------------------------------------------------------------------

    modifier onlyEmployer() {
        if (msg.sender != employer) revert NotEmployer();
        _;
    }

    // ----------------------------------------------------------------------------------
    // Construction
    // ----------------------------------------------------------------------------------

    /**
     * @param cUSDTToken Address of the ERC-7984 confidential USDT used for settlement.
     *                   The deployer becomes the Employer (admin) and must fund this contract
     *                   with cUSDT before triggering distributions.
     */
    constructor(address cUSDTToken) {
        if (cUSDTToken == address(0)) revert ZeroAddress();
        employer = msg.sender;
        cUSDT = IConfToken(cUSDTToken);

        // Initialize encrypted aggregates to a real ciphertext of 0 and seed their ACL.
        _totalDisbursed = FHE.asEuint64(0);
        _totalBonusAllocated = FHE.asEuint64(0);
        _grantAggregateAcl();
    }

    // ----------------------------------------------------------------------------------
    // C-03 — Role management (Employer-only)
    // ----------------------------------------------------------------------------------

    /// @notice Register an employee (salary recipient). Idempotent guard prevents duplicates.
    function addEmployee(address employee) external onlyEmployer {
        if (employee == address(0)) revert ZeroAddress();
        if (isEmployee[employee]) revert AlreadyEmployee();
        _registerEmployee(employee);
    }

    /**
     * @notice Register an auditor (aggregate-only viewer) and immediately grant them decryption
     *         rights on the current aggregate totals.
     */
    function addAuditor(address auditor) external onlyEmployer {
        if (auditor == address(0)) revert ZeroAddress();
        if (isAuditor[auditor]) revert AlreadyAuditor();
        isAuditor[auditor] = true;
        _auditors.push(auditor);
        // Grant decryption rights on the totals as they stand right now.
        FHE.allow(_totalDisbursed, auditor);
        FHE.allow(_totalBonusAllocated, auditor);
        emit AuditorAdded(auditor);
    }

    // ----------------------------------------------------------------------------------
    // C-04 — Payroll upload & distribution (Employer-only)
    // ----------------------------------------------------------------------------------

    /**
     * @notice Upload encrypted salaries. Each salary is encrypted in the employer's browser and
     *         arrives as an `externalEuint64` handle (bytes32) plus a zk input proof. Unknown
     *         addresses are auto-registered as employees, so {addEmployee} is optional.
     * @param employees          Recipient addresses, one per salary.
     * @param encryptedSalaries  Encrypted salary handles, aligned with `employees`.
     * @param inputProofs         Input proofs, aligned with `encryptedSalaries`.
     */
    function uploadPayroll(
        address[] calldata employees,
        externalEuint64[] calldata encryptedSalaries,
        bytes[] calldata inputProofs
    ) external onlyEmployer {
        uint256 n = employees.length;
        if (n == 0) revert EmptyInput();
        if (encryptedSalaries.length != n || inputProofs.length != n) revert LengthMismatch();

        for (uint256 i; i < n; ++i) {
            address emp = employees[i];
            if (emp == address(0)) revert ZeroAddress();
            if (!isEmployee[emp]) _registerEmployee(emp);

            // Verify + import the encrypted salary, then store it and scope its ACL:
            // the contract may operate on it (allowThis) and the employee may decrypt it (allow).
            euint64 salary = FHE.fromExternal(encryptedSalaries[i], inputProofs[i]);
            _salaryOf[emp] = salary;
            FHE.allowThis(salary);
            FHE.allow(salary, emp);
        }

        emit PayrollUploaded(n);
    }

    /**
     * @notice Run a payroll distribution round: pay each employee their encrypted salary in
     *         cUSDT and add it to the encrypted running total. The per-employee amount stays a
     *         ciphertext end-to-end; `confidentialTransfer` clamps to this contract's funded
     *         balance, so it never reverts and never leaks whether funds were short.
     */
    function triggerDistribution() external onlyEmployer {
        uint256 n = _employees.length;
        if (n == 0) revert NoEmployees();

        uint256 recipients;
        for (uint256 i; i < n; ++i) {
            address emp = _employees[i];
            euint64 salary = _salaryOf[emp];
            if (!FHE.isInitialized(salary)) continue; // employee without an uploaded salary yet

            // Let the token operate on this ciphertext for the duration of this tx only.
            FHE.allowTransient(salary, address(cUSDT));
            cUSDT.confidentialTransfer(emp, salary);

            _totalDisbursed = FHE.add(_totalDisbursed, salary);
            unchecked {
                ++recipients;
            }
        }

        _grantAggregateAcl();
        unchecked {
            ++_cycleCount;
        }
        emit PayrollTriggered(block.timestamp, recipients);
    }

    // ----------------------------------------------------------------------------------
    // C-05 — Peer-bonus pool & allocation
    // ----------------------------------------------------------------------------------

    /**
     * @notice Fund the peer-bonus round: give every current employee the same encrypted budget
     *         (e.g. 500 cUSDT) to distribute to colleagues. The budget value is encrypted; each
     *         employee gets their own fresh ciphertext handle, decryptable only by them.
     * @dev Run this AFTER employees are registered (or after {uploadPayroll}). Ensure the
     *      contract holds enough cUSDT to cover allocations.
     */
    function fundBonusPool(externalEuint64 encryptedAmount, bytes calldata inputProof) external onlyEmployer {
        uint256 n = _employees.length;
        if (n == 0) revert NoEmployees();

        euint64 budget = FHE.fromExternal(encryptedAmount, inputProof);
        for (uint256 i; i < n; ++i) {
            address emp = _employees[i];
            // Fresh per-employee handle (same value) so each budget's ACL is private to its owner.
            euint64 b = FHE.add(FHE.asEuint64(0), budget);
            _bonusBudgetOf[emp] = b;
            FHE.allowThis(b);
            FHE.allow(b, emp);
        }

        emit BonusPoolFunded(n);
    }

    /**
     * @notice Allocate a peer bonus to a colleague. The amount is encrypted client-side. The
     *         budget ceiling is enforced HOMOMORPHICALLY: if the request exceeds the caller's
     *         remaining budget, the spent amount is clamped to 0 — the call still succeeds and
     *         leaks nothing about the amount, the budget, or whether it was over the limit.
     * @param recipient        Colleague receiving the bonus (any address, not the caller).
     * @param encryptedAmount  Encrypted bonus amount handle.
     * @param inputProof        Input proof for `encryptedAmount`.
     */
    function allocatePeerBonus(address recipient, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
    {
        if (!isEmployee[msg.sender]) revert NotEmployee();
        if (recipient == address(0)) revert ZeroAddress();
        if (recipient == msg.sender) revert SelfAllocation();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        euint64 budget = _bonusBudgetOf[msg.sender];
        if (!FHE.isInitialized(budget)) budget = FHE.asEuint64(0);

        // Clamp the spend to the remaining budget without revealing anything (no branch on plaintext).
        ebool withinBudget = FHE.le(amount, budget);
        euint64 spend = FHE.select(withinBudget, amount, FHE.asEuint64(0));

        // Deduct from the caller's remaining budget; keep it decryptable only by them.
        budget = FHE.sub(budget, spend);
        _bonusBudgetOf[msg.sender] = budget;
        FHE.allowThis(budget);
        FHE.allow(budget, msg.sender);

        // Pay the colleague in cUSDT (clamped to this contract's funded balance).
        FHE.allowThis(spend);
        FHE.allowTransient(spend, address(cUSDT));
        cUSDT.confidentialTransfer(recipient, spend);

        // Roll the encrypted aggregate forward for auditors/employer.
        _totalBonusAllocated = FHE.add(_totalBonusAllocated, spend);
        _grantAggregateAcl();

        emit BonusAllocated(msg.sender, recipient);
    }

    // ----------------------------------------------------------------------------------
    // C-06 — Employee self-view (ciphertext handles; decryption happens off-chain via relayer)
    // ----------------------------------------------------------------------------------

    /// @notice Ciphertext handle of the caller's salary. Only the caller (ACL-allowed) can decrypt it.
    function getMySalary() external view returns (euint64) {
        return _salaryOf[msg.sender];
    }

    /// @notice Ciphertext handle of the caller's remaining peer-bonus budget (caller-decryptable only).
    function getMyBonusBudget() external view returns (euint64) {
        return _bonusBudgetOf[msg.sender];
    }

    /**
     * @notice Ciphertext handle of `employee`'s salary. Anyone can READ this handle, but only the
     *         employee (and the contract) hold ACL rights to DECRYPT it via the relayer.
     */
    function getSalaryHandle(address employee) external view returns (euint64) {
        return _salaryOf[employee];
    }

    // ----------------------------------------------------------------------------------
    // C-07 — Auditor aggregate view (prove the total without exposing the parts)
    // ----------------------------------------------------------------------------------

    /// @notice Ciphertext handle of total cUSDT disbursed. Decryptable by the employer and auditors only.
    function getTotalDisbursed() external view returns (euint64) {
        return _totalDisbursed;
    }

    /// @notice Ciphertext handle of total peer bonuses allocated. Decryptable by employer and auditors only.
    function getTotalBonusAllocated() external view returns (euint64) {
        return _totalBonusAllocated;
    }

    // ----------------------------------------------------------------------------------
    // Non-sensitive public reads (counts + membership; never amounts)
    // ----------------------------------------------------------------------------------

    /// @notice Number of registered employees.
    function getEmployeeCount() external view returns (uint256) {
        return _employees.length;
    }

    /// @notice Number of completed payroll distribution rounds.
    function getCycleCount() external view returns (uint256) {
        return _cycleCount;
    }

    /// @notice Full list of registered employee addresses (addresses only — no amounts).
    function getEmployees() external view returns (address[] memory) {
        return _employees;
    }

    /// @notice Full list of registered auditor addresses.
    function getAuditors() external view returns (address[] memory) {
        return _auditors;
    }

    // ----------------------------------------------------------------------------------
    // Internal
    // ----------------------------------------------------------------------------------

    function _registerEmployee(address employee) internal {
        isEmployee[employee] = true;
        _employees.push(employee);
        emit EmployeeAdded(employee);
    }

    /**
     * @dev Re-scope ACL on the aggregate totals after every update. FHE ops produce a NEW
     *      ciphertext handle, so decryption rights must be re-granted on the fresh handle each
     *      time. Aggregates are visible to the employer (total cost) and every auditor (solvency)
     *      — and to no one else.
     */
    function _grantAggregateAcl() internal {
        FHE.allowThis(_totalDisbursed);
        FHE.allowThis(_totalBonusAllocated);
        FHE.allow(_totalDisbursed, employer);
        FHE.allow(_totalBonusAllocated, employer);
        uint256 n = _auditors.length;
        for (uint256 i; i < n; ++i) {
            FHE.allow(_totalDisbursed, _auditors[i]);
            FHE.allow(_totalBonusAllocated, _auditors[i]);
        }
    }
}
