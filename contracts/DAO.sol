//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title DAO contract for the ACDM Platform
/// @author mlastovski
contract DAO is AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _proposalId;

    /// @dev Role to call function addProposal
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");

    /// @dev Role that that will be assigned to the Staking contract
    bytes32 public constant STAKE_ROLE = keccak256("STAKE_ROLE");
    
    uint256 public votingPeriod;
    uint256 public minQuorum;

    IStaking private staking;

    struct Vote {
        uint256 weight;
        uint256 decision;
    }

    struct Proposal {
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startingTime;
        address target;
        bool active;
        string description;
        bytes callData;
    }

    mapping(address => uint256) public withdrawLock;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;

    event NewProposal(
        uint256 indexed proposalId, 
        address indexed creator, 
        string description, 
        address indexed target
    );

    event Voted(
        uint256 indexed proposalId, 
        address indexed voter, 
        uint256 decision
    );

    event VotingFinished(uint256 indexed proposalId, bool success);

    /// @notice Deploys the contract with the given parameters
    /// @param _votingPeriod Number of days when users can vote for a specific proposal
    /// @param _minQuorum Minimal required amount of tokens for a successful proposal execution
    constructor(uint256 _votingPeriod, uint256 _minQuorum) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        grantRole(CHAIRMAN_ROLE, msg.sender);
        grantRole(DEFAULT_ADMIN_ROLE, address(this));
        votingPeriod = _votingPeriod * 1 days;
        minQuorum = _minQuorum;
    }

    /// @notice Attaches STAKE_ROLE to Staking contract, attaches Staking Interface to the variable `staking` 
    /// @param target An address of the Staking contract
    function initialize(address target) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(STAKE_ROLE, target);
        staking = IStaking(target);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Creates a new proposal with given parameters 
    /// @param target An address of the contract in which the function will be called
    /// @param callData A signature of the given function with parameters
    /// @param description String for Front-End purposes
    function addProposal(
        address target, 
        bytes memory callData, 
        string memory description
    ) 
        external 
        onlyRole(CHAIRMAN_ROLE) 
    {
        _proposalId.increment();
        Proposal storage prop = proposals[_proposalId.current()];
        prop.target = target;
        prop.callData = callData;
        prop.description = description;
        prop.active = true;
        prop.startingTime = block.timestamp;

        emit NewProposal(_proposalId.current(), msg.sender, description, target);
    }

    /// @notice Votes for a proposal by proposal id
    /// @param proposalId Id of the proposal to vote for
    /// @param decision 1 or 0 (1 - vote for, 0 - vote against)
    function vote(uint256 proposalId, uint256 decision) external {
        require(_proposalId.current() >= proposalId, "No such id");
        require(decision == 0 || decision == 1, "Only 0 or 1 is allowed");

        Proposal storage prop = proposals[proposalId];
        require(block.timestamp < prop.startingTime + votingPeriod, "The voting is over");

        Vote storage v = votes[proposalId][msg.sender];    
        require(v.weight == 0, "You can vote only once");

        uint256 balance = staking.stakeOf(msg.sender);
        require(balance > 0, "Insufficient balance");

        if (decision == 1) {
            v.weight = balance;
            prop.votesFor += balance;
        } else {
            v.weight = balance;
            prop.votesAgainst += balance;
        }

        v.decision = decision;
        withdrawLock[msg.sender] = prop.startingTime + votingPeriod;

        emit Voted(proposalId, msg.sender, decision);
    }

    /// @notice Finishes proposal
    /// @param proposalId Id of the proposal to finish
    function finish(uint256 proposalId) external {
        require(_proposalId.current() >= proposalId, "No such id");
        Proposal storage prop = proposals[proposalId];
        require(prop.active, "The voting is over");
        require(block.timestamp >= prop.startingTime + votingPeriod, "The voting is not over yet");

        prop.active = false;
        uint256 votesFor = prop.votesFor;
        uint256 votesAgainst = prop.votesAgainst;

        if ((votesFor + votesAgainst) >= (minQuorum) 
            && votesFor > votesAgainst) {
            (bool success,) = prop.target.call(prop.callData);
            emit VotingFinished(proposalId, success);
        } else {
            emit VotingFinished(proposalId, false);
        }
    }

    /// @notice Function for the Staking contract. Returns true if user has no active withdrawLock
    /// @param staker Id of the proposal to finish
    function unstakeAllowance(address staker) external view onlyRole(STAKE_ROLE) returns (bool allowed) {
        return withdrawLock[staker] <= block.timestamp;
    }
}
