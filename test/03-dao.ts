import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { parseEther } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("DAO", function () {
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
  const CHAIRMAN_ROLE = "0xdc1958ce1178d6eb32ccc146dcea8933f1978155832913ec88fa509962e1b413";

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
  }

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

  describe("CHAIRMAN_ROLE", function () {
    it("Should get CHAIRMAN_ROLE", async function () {
      expect(await dao.CHAIRMAN_ROLE())
        .to.equal(CHAIRMAN_ROLE);
    });
  });

  describe("STAKE_ROLE", function () {
    it("Should get STAKE_ROLE", async function () {
      expect(await dao.STAKE_ROLE())
        .to.equal(STAKE_ROLE);
    });
  });

  describe("initialize", function () {
    it("Should attach staking contract address", async function () {
      await dao.initialize(staking.address);

      expect(await dao.hasRole(STAKE_ROLE, staking.address))
        .to.equal(true);
    });
  });

  describe("addProposal", function () {
    it("Should add proposal properly", async function () {
      expect(await dao.addProposal(staking.address, callData, description))
        .to.emit("DAO", "NewProposal")
        .withArgs(1, owner.address, description, staking.address);
    });
  });

  describe("vote", function () {
    beforeEach(async function () {
      await sendLp(owner.address, parseEther("2"));
      await sendLp(alice.address, parseEther("1"));
      await lpToken.approve(staking.address, parseEther("2"));
      await lpToken.connect(alice).approve(staking.address, parseEther("2"));
    });

    it("Should fail to vote (Insufficient balance)", async function () {
      const proof = getProof(merkleTree, owner.address);
      await staking.stake(parseEther("0"), proof);
      await expect(dao.vote(1, 1)).to.be.revertedWith("Insufficient balance");
    });

    it("Should vote properly (decision 1)", async function () {
      const proof = getProof(merkleTree, owner.address);
      await staking.stake(parseEther("2"), proof);

      expect(await dao.vote(1, 1))
        .to.emit("DAO", "Voted")
        .withArgs(1, owner.address, 1);
    });

    it("Should vote properly (decision 0)", async function () {
      const proof = getProof(merkleTree, alice.address);
      await staking.connect(alice).stake(parseEther("1"), proof);

      expect(await dao.connect(alice).vote(1, 0))
        .to.emit("DAO", "Voted")
        .withArgs(1, alice.address, 0);
    });

    it("Should fail to vote (No such id)", async function () {
      await expect(dao.vote(2, 1))
        .to.be.revertedWith("No such id");
    });

    it("Should fail to vote (Only 0 or 1 is allowed)", async function () {
      await expect(dao.vote(1, 2))
        .to.be.revertedWith("Only 0 or 1 is allowed");
    });

    it("Should fail to vote (You can vote only once)", async function () {
      const proof = getProof(merkleTree, owner.address);
      await staking.stake(parseEther("2"), proof);

      await expect(dao.vote(1, 1))
        .to.be.revertedWith("You can vote only once");
    });

    it("Should fail to vote (The voting is over)", async function () {
      await ethers.provider.send('evm_increaseTime', [4 * days]);
      await ethers.provider.send('evm_mine', []);

      await expect(dao.vote(1, 1))
        .to.be.revertedWith("The voting is over");
    });
  }); 

  describe("finish", function () {
    before(async function () {
      await sendLp(owner.address, parseEther("2"));
      await sendLp(alice.address, parseEther("2"));
      await lpToken.approve(staking.address, parseEther("2"));
      await lpToken.connect(alice).approve(staking.address, parseEther("2"));
      await dao.addProposal(staking.address, callData, description);
      await dao.addProposal(staking.address, wrongCallData, description);
      await staking.stake(parseEther("2"), getProof(merkleTree, owner.address));
      await staking.connect(alice).stake(parseEther("2"), getProof(merkleTree, alice.address));
    });

    it("Should finish properly", async function () {
      expect(await dao.connect(alice).finish(1))
        .to.emit(dao, "VotingFinished")
        .withArgs(1, true);

      expect(await staking.minUnstakeFreezeTime())
        .to.equal(BigNumber.from("259200"));
    });

    it("Should fail to finish (The voting is over)", async function () {
      await expect(dao.connect(owner).finish(1))
        .to.be.revertedWith("The voting is over");
    });

    it("Should fail to finish (The voting is not over yet)", async function () {
      await expect(dao.connect(alice).finish(2))
        .to.be.revertedWith("The voting is not over yet");
    });

    it("Should finish properly with wrong calldata", async function () {
      await dao.vote(3, 1);
      await dao.connect(alice).vote(3, 1);

      await ethers.provider.send('evm_increaseTime', [8 * days]);
      await ethers.provider.send('evm_mine', []);

      expect(await dao.connect(alice).finish(3))
        .to.emit(dao, "VotingFinished")
        .withArgs(3, false);
    });

    it("Should finish properly with less than minquorum", async function () {
      expect(await dao.connect(alice).finish(2))
        .to.emit(dao, "VotingFinished")
        .withArgs(2, false);
    });

    it("Should fail to finish (No such id)", async function () {
      await expect(dao.finish(5))
        .to.be.revertedWith("No such id");
    });
  });

  describe("unstakeAllowance", function () {
    it("Should return true", async function () {
      await staking.unstake();
    });
  });
});
