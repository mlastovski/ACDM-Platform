//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ERC20 token for the ACDM Platform
/// @author mlastovski
contract XXXToken is ERC20, AccessControl {

    /// @dev Roles that are able to call functions mint and burn
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE  = keccak256("BURNER_ROLE");

    /// @dev Contract deployer is set as the admin/minter/burner
    constructor() ERC20("XXX Coin", "XXX") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
    }

    /// @dev Mint the `amount` of tokens to address `account`
    /// @param account address to mint tokens to
    /// @param amount amount of tokens to mint
    function mint(address account, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(account, amount);
    }

    /// @dev Burn the `amount` of tokens from address `account`
    /// @param account address to burn tokens from
    /// @param amount amount of tokens to burn
    function burn(address account, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(account, amount);
    }
}
