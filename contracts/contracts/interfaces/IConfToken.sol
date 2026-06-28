// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IConfToken
 * @notice Minimal interface for an ERC-7984 confidential fungible token (Zama's cUSDT).
 * @dev We declare only the methods Covert uses so the protocol does not depend on a specific
 *      openzeppelin/confidential-contracts version layout. Signatures match ERC-7984 /
 *      OpenZeppelin ConfidentialFungibleToken: amounts are encrypted handles (`euint64`),
 *      and approvals use the time-bounded operator model (`setOperator`) instead of ERC-20
 *      `approve()`. The official Sepolia cUSDT mock implements this surface.
 */
interface IConfToken {
    /// @notice Move `amount` (encrypted handle) from the caller to `to`. Returns the amount actually sent.
    function confidentialTransfer(address to, euint64 amount) external returns (euint64);

    /// @notice Move `amount` from `from` to `to`. Caller must be an operator of `from`.
    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64);

    /// @notice Encrypted balance handle of `account` (decryptable only by ACL-allowed parties).
    function confidentialBalanceOf(address account) external view returns (euint64);

    /// @notice Authorize `operator` to move the caller's tokens until `until` (unix ts).
    function setOperator(address operator, uint48 until) external;

    /// @notice Whether `spender` is currently an operator for `holder`.
    function isOperator(address holder, address spender) external view returns (bool);
}
