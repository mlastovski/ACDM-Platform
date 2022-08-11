// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface IDAO {
    function unstakeAllowance(address staker) external returns (bool);
}
