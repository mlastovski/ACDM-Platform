//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./interfaces/IDAO.sol";
import "./interfaces/IXXXToken.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Staking contract for the ACDM Platform
/// @author mlastovski
contract Staking is AccessControl, ReentrancyGuard {

    /// @dev Role that that will be assigned to the DAO contract
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    /// @dev Merkle root
    bytes32 public merkleRoot;

    IERC20 private lpToken;
    IXXXToken private xxx;
    IDAO private dao;

    /// @dev Declaring public variables so users can see the stake settings
    uint256 public interest;
    uint256 public minRewardsTimestamp;
    uint256 public minUnstakeFreezeTime;

    struct Stake {
        uint256 balance;
        uint256 timestamp;
    }

    mapping(address => Stake) internal _stakes;

    /// @dev A mapping from an address to timestamp
    mapping(address => uint256) private withdrawLock;

    /// @notice Deploys the contract with the given parameters
    /// @param _lpToken Address of the Liquidity Provider Token
    /// @param _xxx Address of the XXXToken contract
    /// @param _dao Address of the DAO contract
    constructor(address _lpToken, address _xxx, address _dao, bytes32 _merkleRoot) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DAO_ROLE, _dao);

        merkleRoot = _merkleRoot;
        interest = 3;
        minRewardsTimestamp = 7 days;
        minUnstakeFreezeTime = 7 days;

        dao = IDAO(_dao);
        lpToken = IERC20(_lpToken);
        xxx = IXXXToken(_xxx);
    }

    event Staked(address _from, uint256 amount);
    event Claimed(address _from, uint256 amount);
    event Unstaked(address _from, uint256 amount);

    /// @notice Modifies the unstake freeze time
    /// @param freezeDays Number of days in uint256
    function modifyMinUnstakeFreezeTime(uint256 freezeDays) 
        external 
        onlyRole(DAO_ROLE) 
        returns (bool success) 
    {
        minUnstakeFreezeTime = freezeDays * 1 days;

        return true;
    }

    function modifyMerkleRoot(bytes32 _merkleRoot) external onlyRole(DAO_ROLE) {
        merkleRoot = _merkleRoot;
    }

    /// @notice Stakes the `amount` of LP Tokens
    /// @param amount An amount of the LP Tokens to stake
    function stake(uint256 amount, bytes32[] calldata _merkleProof) external nonReentrant {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(_merkleProof, merkleRoot, leaf), 
            "Not whitelisted sender"
        );

        lpToken.transferFrom(msg.sender, address(this), amount);
        
        Stake storage s = _stakes[msg.sender];
        s.balance += amount;
        s.timestamp = block.timestamp;
        withdrawLock[msg.sender] = block.timestamp + minUnstakeFreezeTime;

        emit Staked(msg.sender, amount);
    }

    /// @notice Claims the rewards if available
    function claim() external nonReentrant {
        Stake storage s = _stakes[msg.sender];
        require(
            block.timestamp - s.timestamp >= minRewardsTimestamp, 
            "Less than minRewardsTimestamp"
        );

        uint256 rewardInXXX = _calculateRewards(msg.sender);
        require(s.balance > 0 && rewardInXXX > 0, "No XXX to claim");

        xxx.mint(msg.sender, rewardInXXX);
        s.timestamp = block.timestamp;

        emit Claimed(msg.sender, rewardInXXX);
    }

    /// @notice Withdraws LP Tokens to address msg.sender
    function unstake() external nonReentrant {
        Stake storage s = _stakes[msg.sender];
        require(s.balance > 0, "Zero stake");
        require(
            withdrawLock[msg.sender] <= block.timestamp, 
            "Less than minUnstakeFreezeTime"
        );
        require(dao.unstakeAllowance(msg.sender), "Voting is not finished");

        uint256 rewardInXXX = _calculateRewards(msg.sender);

        if (rewardInXXX > 0) {
            xxx.mint(msg.sender, rewardInXXX);
            emit Claimed(msg.sender, rewardInXXX);
        }
        
        lpToken.transfer(msg.sender, s.balance);

        emit Unstaked(msg.sender, s.balance);

        s.balance = 0;
    }

    /// @notice Returns staker's balance
    /// @param from An address of the staker account
    function stakeOf(address from) external view onlyRole(DAO_ROLE) returns (uint256) {
        return _stakes[from].balance;
    }

    /// @notice Calculates the reward for the given address
    /// @param from An address of the staker account
    function _calculateRewards(address from) public view returns (uint256 amount) {
        require(_stakes[from].timestamp != 0, "Zero timestamp");

        uint256 totalBalance = _stakes[from].balance;
        uint256 totalTime = block.timestamp - _stakes[from].timestamp;

        return((totalBalance * (totalTime / minRewardsTimestamp)) * interest / 100);
    } 
}
