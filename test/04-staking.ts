import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { parseEther } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("Staking", function () {
  let DAO: ContractFactory;
  let dao: Contract;
  let Staking: ContractFactory;
  let staking: Contract;
  const lpHolderAddress = "0x71c916C1A79cc66bfD39a2cc6f7B4feEd589d21e";
  let lpHolder: providers.JsonRpcSigner;
  let lpToken: Contract;
  const XXXAdminAddress = "0x71c916C1A79cc66bfD39a2cc6f7B4feEd589d21e";
  let XXXAdmin: providers.JsonRpcSigner;
  let XXX: Contract;

  const lpTokenAddress = "0xE7001A4Ded3CcC911c73e18457fF8fEF9705938f";
  const xxxTokenAddress = "0x30327078938FB91f4eb26163954b24C476696EB6";

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carl: SignerWithAddress;
  let dwayne: SignerWithAddress;

  let merkleTree: MerkleTree;

  const days = 86400;

  const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
  const DAO_ROLE = "0x3b5d4cc60d3ec3516ee8ae083bd60934f6eb2a6c54b1229985c41bfb092b2603";
  const STAKE_ROLE = "0xeaea87345c0a5b2ecb49cde771d9ac5bfe2528357e00d43a1e06a12c2779f3ca";

  const jsonAbi = [
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_freezeDays",
          type: "uint256"
        }
      ],
      name: "modifyMinUnstakeFreezeTime",
      outputs: [
        {
          internalType: "bool",
          name: "success",
          type: "bool"
        }
      ],
      stateMutability: "nonpayable",
      type: "function"
    },
  ];

  const functionInterface = new ethers.utils.Interface(jsonAbi);
  const callData = functionInterface.encodeFunctionData("modifyMinUnstakeFreezeTime", [3]);
  const wrongCallData = "0x";
  const description = "Change unstake freeze time to 3 days";

  const sendLp = async function (to: string, amount: BigNumber) {
    await network.provider.request(
      {
        method: "hardhat_impersonateAccount", 
        params: [lpHolderAddress]
      }
    );

    await network.provider.send(
      "hardhat_setBalance", 
      [lpHolderAddress, "0xffffffffffffffffff"]
    );

    lpHolder = ethers.provider.getSigner(lpHolderAddress);
    await lpToken.connect(lpHolder).transfer(to, amount);

    await network.provider.request(
      {
        method: "hardhat_stopImpersonatingAccount", 
        params: [lpHolderAddress]
      }
    );
  };

  const setAdminRole = async function (to: string) {
    await network.provider.request(
      {
        method: "hardhat_impersonateAccount", 
        params: [XXXAdminAddress]
      }
    );

    await network.provider.send(
      "hardhat_setBalance", 
      [XXXAdminAddress, "0xffffffffffffffffff"]
    );

    XXXAdmin = ethers.provider.getSigner(XXXAdminAddress);
    XXX = await ethers.getContractAt("XXXToken", xxxTokenAddress);

    await XXX.connect(XXXAdmin).grantRole(MINTER_ROLE, to);
    await network.provider.request(
      {
        method: "hardhat_stopImpersonatingAccount", 
        params: [XXXAdminAddress]
      }
    );
  };

  const buildTree = (addrs: string[]) => {
    const leafNodes = addrs.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

    return merkleTree;
  };

  const getProof = (merkleTree: MerkleTree, address: string) => {
    return merkleTree.getHexProof(keccak256(address));
  };

  const getRoot = (merkleTree: MerkleTree) => {
    return "0x".concat(merkleTree.getRoot().toString("hex"));
  };

  before(async function () {
    [owner, alice, bob, carl, dwayne] = await ethers.getSigners();

    DAO = await ethers.getContractFactory("DAO");
    Staking = await ethers.getContractFactory("Staking");

    let addrs = [
      owner.address,
      alice.address,
      bob.address
    ];

    merkleTree = buildTree(addrs);

    dao = await DAO.deploy(3, 3);
    lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);

    staking = await Staking.deploy(
      lpTokenAddress, 
      xxxTokenAddress, 
      dao.address,
      getRoot(merkleTree)
    );

    await staking.grantRole(DAO_ROLE, dao.address);
    await dao.grantRole(STAKE_ROLE, staking.address);
    await setAdminRole(staking.address);
  });

  describe("DAO_ROLE", function () {
    it("Should get DAO_ROLE", async function () {
      expect(await staking.DAO_ROLE())
        .to.equal(DAO_ROLE);
    });
  });

  describe("stake", function () {
    beforeEach(async function () {
      await sendLp(owner.address, parseEther("0.002"));
      await lpToken.approve(staking.address, parseEther("0.002"));
    });

    it("Should fail to stake (Not whitelisted sender)", async function () {
      const proof = getProof(merkleTree, carl.address);

      await expect(staking.stake(parseEther("0"), proof))
        .to.be.revertedWith("Not whitelisted sender");
    });

    it("Should stake properly", async function () {
      const proof = getProof(merkleTree, owner.address);
      expect(await staking.stake(parseEther("0.001"), proof))
        .to.emit("Staking", "Staked")
        .withArgs(owner.address, parseEther("0.001"));

      expect(await lpToken.balanceOf(staking.address))
        .to.equal(parseEther("0.001"));

      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      const rewards = await staking._calculateRewards(owner.address);
      expect(rewards).to.equal(30000000000000);
    });

    it("Should stake twice", async function () {
      const proof = getProof(merkleTree, owner.address);
      await staking.stake(parseEther("0.001"), proof);

      expect(await lpToken.balanceOf(staking.address))
        .to.equal(parseEther("0.002"));
    });
  });

  describe("_calculateRewards", function () {
    it("Should fail to calculate rewards (Zero timestamp)", async function () {
      await expect(staking._calculateRewards(dwayne.address))
        .to.be.revertedWith("Zero timestamp"); 
    });
  });

  describe("claim", function () {
    beforeEach(async function () {
      await sendLp(bob.address, parseEther("0.001"));
      await lpToken.connect(bob).approve(staking.address, parseEther("0.001"));
    });

    it("Should fail to claim (No XXX to claim)", async function () {
      const proof = getProof(merkleTree, bob.address);
      await staking.connect(bob).stake(parseEther("0"), proof);

      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      await expect(staking.connect(bob).claim())
        .to.be.revertedWith("No XXX to claim");
    });

    it("Should fail to claim (Less than minRewardsTimestamp)", async function () {
      const proof = getProof(merkleTree, bob.address);
      await staking.connect(bob).stake(parseEther("0.001"), proof);

      await expect(staking.connect(bob).claim())
        .to.be.revertedWith("Less than minRewardsTimestamp");
    });

    it("Should claim properly", async function () {
      const initialBalance = BigNumber.from(await lpToken.balanceOf(bob.address));

      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      const rewards = await staking._calculateRewards(bob.address);

      expect(await staking.connect(bob).claim())
        .to.emit("Staking", "Claimed")
        .withArgs(bob.address, rewards);

      const afterBalance = BigNumber.from(await lpToken.balanceOf(bob.address));
      const finalBalance = afterBalance.sub(initialBalance).toString();
  
      expect(finalBalance).to.equal(parseEther("0"));
    });
  });

  describe("unstake", function () {
    beforeEach(async function () {
      await sendLp(owner.address, parseEther("0.001"));
      await lpToken.approve(staking.address, parseEther("0.001"));
      await sendLp(alice.address, parseEther("0.001"));
      await lpToken.connect(alice).approve(staking.address, parseEther("0.001"));
    });

    it("Should unstake properly", async function () {
      const initialBalance = BigNumber.from(await lpToken.balanceOf(owner.address));
  
      expect(await staking.unstake())
        .to.emit("Staking", "Unstaked")
        .withArgs(owner.address, parseEther("0.002"));

      const afterBalance = BigNumber.from(await lpToken.balanceOf(owner.address));
      const finalBalance = afterBalance.sub(initialBalance).toString();

      expect(finalBalance).to.equal(parseEther("0.002"));
    });

    it("Should unstake properly (if nothing to claim)", async function () {
      const proof = getProof(merkleTree, alice.address);
      await staking.connect(alice).stake(parseEther("0.001"), proof);
      const initialBalance = BigNumber.from(await lpToken.balanceOf(alice.address));

      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      await staking.connect(alice).claim();
  
      expect(await staking.connect(alice).unstake())
        .to.emit("Staking", "Unstaked")
        .withArgs(alice.address, 0);

      const afterBalance = BigNumber.from(await lpToken.balanceOf(alice.address));
      const finalBalance = afterBalance.sub(initialBalance).toString();

      expect(finalBalance).to.equal(parseEther("0.001"));
    });

    it("Should fail to unstake (Zero stake)", async function () {
      await expect(staking.connect(alice).unstake())
        .to.be.revertedWith("Zero stake");
    });

    it("Should fail to unstake (Less than minUnstakeFreezeTime)", async function () {
      const proof = getProof(merkleTree, alice.address);
      await staking.connect(alice).stake(parseEther("0.001"), proof);

      await expect(staking.connect(alice).unstake())
        .to.be.revertedWith("Less than minUnstakeFreezeTime");
    });

    it("Should unstake properly", async function () {
      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      expect(await staking.connect(alice).unstake())
        .to.emit("Staking", "Unstaked")
        .withArgs(alice.address, parseEther("0.001"));
    });

    it("Should fail to unstake (Voting is not finished)", async function () {
      const addrs = [
        owner.address,
        carl.address,
        dwayne.address
      ];

      const modifiedMerkleTree = buildTree(addrs);
      const root = getRoot(modifiedMerkleTree);

      const jsonAbi = [
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "_merkleRoot",
              type: "bytes32"
            }
          ],
          name: "modifyMerkleRoot",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function"
        },
      ];

      const functionInterface = new ethers.utils.Interface(jsonAbi);
      const callData = functionInterface.encodeFunctionData("modifyMerkleRoot", [root]);
      const description = "Change merkle root";    

      await dao.initialize(staking.address);
      await sendLp(owner.address, parseEther("1"));
      await lpToken.approve(staking.address, parseEther("1"));
      await staking.stake(parseEther("1"), getProof(merkleTree, owner.address));
      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);
      await dao.addProposal(staking.address, callData, description);
      await dao.vote(1, 1);

      await expect(staking.unstake())
        .to.be.revertedWith("Voting is not finished");
    });
  });

  describe("modifyMerkleRoot", function () {
    it("Should modifyMerkleRoot properly", async function () {
      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      await dao.finish(1);
      const newRoot = "0xc77380677ed4e44cddc493f1e659c136d5fc172410c314f13562b28697d92395";
      
      expect(await staking.merkleRoot())
        .to.equal(newRoot);
    });
  });
});