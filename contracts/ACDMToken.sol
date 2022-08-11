//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ERC20 token for the ACDM Platform
/// @author mlastovski
contract ACDMToken is ERC20, AccessControl {

    /// @dev Roles that are able to call functions mint and burn
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE  = keccak256("BURNER_ROLE");

    event Mint(address to, uint256 amount);
    event Burn(address from, uint256 amount);

    /// @dev Contract deployer is set as the admin/minter/burner
    constructor() ERC20("ACADEM Coin", "ACDM") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
    }

    /// @dev Returns the number of decimals the token uses
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /// @dev Mint the `amount` of tokens to address `account`
    /// @param to address to mint tokens to
    /// @param amount amount of tokens to mint
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @dev Burn the `amount` of tokens from address `account`
    /// @param from address to burn tokens from
    /// @param amount amount of tokens to burn
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
}
