// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface IStaking {
    function stakeOf(address from) external returns (uint256);
}
