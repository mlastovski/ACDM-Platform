import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { parseEther } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("ACDMPlatform", function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carl: SignerWithAddress;
  let dwayne: SignerWithAddress;

  let XXXToken: ContractFactory;
  let xxxToken: Contract;
  let ACDMToken: ContractFactory;
  let acdmToken: Contract;
  let Staking: ContractFactory;
  let staking: Contract;
  let DAO: ContractFactory;
  let dao: Contract;
  let ACDMPlatform: ContractFactory;
  let acdmPlatform: Contract;

  const xxxTokenAddress = "0x30327078938FB91f4eb26163954b24C476696EB6";
  const lpTokenAddress = "0xE7001A4Ded3CcC911c73e18457fF8fEF9705938f";
  const lpHolderAddress = "0x71c916C1A79cc66bfD39a2cc6f7B4feEd589d21e";
  let lpHolder: providers.JsonRpcSigner;
  let lpToken: Contract;

  let merkleTree: MerkleTree;

  const days = 86400;
  const provider = waffle.provider;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

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

    let addrs = [
      owner.address,
      alice.address,
      bob.address
    ];
  
    merkleTree = buildTree(addrs);

    lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);
    
    XXXToken = await ethers.getContractFactory("XXXToken");
    xxxToken = await XXXToken.deploy();

    ACDMToken = await ethers.getContractFactory("ACDMToken");
    acdmToken = await ACDMToken.deploy();

    DAO = await ethers.getContractFactory("DAO");
    const _votingPeriod = 3;
    const _minQuorum = 3;
    dao = await DAO.deploy(_votingPeriod, _minQuorum);

    Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(
      lpTokenAddress, 
      xxxTokenAddress, 
      dao.address, 
      getRoot(merkleTree)
    );

    ACDMPlatform = await ethers.getContractFactory("ACDMPlatform");
    acdmPlatform = await ACDMPlatform.deploy(
      acdmToken.address, 
      xxxTokenAddress, 
      dao.address
    );

    await xxxToken.grantRole(await xxxToken.MINTER_ROLE(), staking.address);
    await xxxToken.grantRole(await xxxToken.BURNER_ROLE(), acdmPlatform.address);

    await acdmToken.grantRole(await acdmToken.MINTER_ROLE(), acdmPlatform.address);
    await acdmToken.grantRole(await acdmToken.BURNER_ROLE(), acdmPlatform.address);

    await dao.initialize(staking.address);

    await staking.grantRole(await staking.DAO_ROLE(), dao.address);

    await acdmPlatform.grantRole(await acdmPlatform.DAO_ROLE(), dao.address);

    await xxxToken.mint(owner.address, parseEther("100000"));
    await xxxToken.mint(alice.address, parseEther("100000"));
  });

  describe("Registration", function () {
    describe("register", function () {
      it("Should register with address(0) referer", async function () {
        expect(await acdmPlatform.connect(alice).register(zeroAddress))
          .to.emit(acdmPlatform, "Registered")
          .withArgs(alice.address, zeroAddress);
      });

      it("Should fail to register (Already registered)", async function () {
        await expect(acdmPlatform.connect(alice).register(zeroAddress))
          .to.be.revertedWith("Already registered");
      });

      it("Should register with referer", async function () {
        expect(await acdmPlatform.connect(bob).register(alice.address))
          .to.emit(acdmPlatform, "Registered")
          .withArgs(bob.address, alice.address);
      });

      it("Should fail to register (Referer not registered)", async function () {
        await expect(acdmPlatform.connect(carl).register(dwayne.address))
          .to.be.revertedWith("Referer not registered");
      });

      it("Should register with referer", async function () {
        expect(await acdmPlatform.connect(carl).register(bob.address))
          .to.emit(acdmPlatform, "Registered")
          .withArgs(carl.address, bob.address);
      });
    });
  });

  describe("Initial sale round", function () {
    describe("startSaleRound", function () {
      it("Should start the sale round properly", async function () {
        expect(await acdmPlatform.connect(owner).startSaleRound())
          .to.emit(acdmPlatform, "RoundStarted");
        expect(await acdmToken.balanceOf(acdmPlatform.address))
          .to.equal(100000 * 10 ** 6);
      });

      it("Should fail to start the sale round (Sale round is in progress)", async function () {
        await expect(acdmPlatform.connect(carl).startSaleRound())
          .to.be.revertedWith("Sale round is in progress");
      });
    });

    describe("buyACDM", function () {
      it("Should buy 10 ACDM tokens (0 referers)", async function () {
        const price = parseEther("0.0001");
        expect(await acdmPlatform.connect(alice).buyACDM({ value: price }))
          .to.emit(acdmPlatform, "Sold")
          .withArgs(alice.address, 10 * 10**6);
      });

      it("Should buy 10 ACDM tokens (1 referer)", async function () {
        const price = parseEther("0.0001");
        const refererFee = parseEther("0.000005");
        const refererBalanceBefore = await provider.getBalance(alice.address);
  
        expect(await acdmPlatform.connect(bob).buyACDM({ value: price }))
          .to.emit(acdmPlatform, "Sold")
          .withArgs(bob.address, 10 * 10**6);
  
        const refererBalanceAfter = await provider.getBalance(alice.address);
  
        expect(refererBalanceAfter.sub(refererBalanceBefore)).to.equal(refererFee);
      });

      it("Should buy 10 ACDM tokens (2 referers)", async function () {
        const price = parseEther("0.0001");
        const firstRefererFee = parseEther("0.000005");
        const secondRefererFee = parseEther("0.000003");
        const firstRefererBalanceBefore = await provider.getBalance(bob.address);
        const secondRefererBalanceBefore = await provider.getBalance(alice.address);
  
        expect(await acdmPlatform.connect(carl).buyACDM({ value: price }))
          .to.emit(acdmPlatform, "Sold")
          .withArgs(carl.address, 10 * 10**6);
  
        const firstRefererBalanceAfter = await provider.getBalance(bob.address);
        const secondRefererBalanceAfter = await provider.getBalance(alice.address);
  
        expect(firstRefererBalanceAfter.sub(firstRefererBalanceBefore)).to.be.equal(firstRefererFee);
        expect(secondRefererBalanceAfter.sub(secondRefererBalanceBefore)).to.be.equal(secondRefererFee);
      });
    });

    describe("startTradeRound", function () {
      it("Should fail to start trade round (Sale round is in progress)", async function () {
        await expect(acdmPlatform.connect(carl).startTradeRound())
          .to.be.revertedWith("Sale round is in progress");
      });
    });

    describe("addOrder", function () {
      it("Should fail to add a new order (Trade round is over)", async function () {
        await acdmToken.connect(alice).approve(acdmPlatform.address, 5 * 10**6);
        const price = 10000000 * 1.5;
        await expect(acdmPlatform.connect(alice).addOrder(price, 5 * 10**6))
          .to.be.revertedWith("Trade round is over");
      });
    });

    describe("buyACDM", function () {
      it("Should fail to buy (Amount cannot exceed currentSaleVolume)", async function () {
        const price = parseEther("1");
        await expect(acdmPlatform.connect(alice).buyACDM({ value: price }))
          .to.be.revertedWith("Amount cannot exceed currentSaleVolume");
      });

      it("Should buy all the available ACDM tokens", async function () {
        const price = parseEther("0.9997");
        await acdmPlatform.connect(alice).buyACDM({ value: price });
      });
    });
  });

  describe("First trade round", function () {
    describe("startTradeRound", function () {
      it("Should start trade round properly", async function () {
        expect(await acdmPlatform.connect(alice).startTradeRound())
          .to.emit(acdmPlatform, "RoundStarted");
      });

      it("Should fail to start trade round (Trade round is in progress)", async function () {
        await expect(acdmPlatform.connect(alice).startTradeRound())
          .to.be.revertedWith("Trade round is in progress");
      });
    });

    describe("buyACDM", function () {
      it("Should fail to buy 10 ACDM tokens (Sale round is over)", async function () {
        const price = parseEther("0.0001");
        await expect(acdmPlatform.connect(alice).buyACDM({ value: price }))
          .to.be.revertedWith("Sale round is over");
      });
    });

    describe("startSaleRound", function () {
      it("Should fail to start sale round (Trade round is in progress)", async function () {
        await expect(acdmPlatform.connect(alice).startSaleRound())
          .to.be.revertedWith("Trade round is in progress");
      });
    });

    describe("addOrder", function () {
      it("Should add 1 new order from alice address", async function () {
        const price = parseEther("1");
        const amount = 5 * 10**6;
        await acdmToken.connect(alice).approve(acdmPlatform.address, amount);
        expect(await acdmPlatform.connect(alice).addOrder(price, amount))
          .to.emit(acdmPlatform, "OrderAdded")
          .withArgs(0, alice.address, price, amount);
      });

      it("Should add 3 new orders from bob address", async function () {
        const price = parseEther("0.25");
        const amount = 2 * 10**6;
        await acdmToken.connect(bob).approve(acdmPlatform.address, amount);
        expect(await acdmPlatform.connect(bob).addOrder(price, amount))
          .to.emit(acdmPlatform, "OrderAdded")
          .withArgs(1, bob.address, price, amount);
  
        await acdmToken.connect(bob).approve(acdmPlatform.address, amount);
        expect(await acdmPlatform.connect(bob).addOrder(price, amount))
          .to.emit(acdmPlatform, "OrderAdded")
          .withArgs(2, bob.address, price, amount);
  
        const secondPrice = parseEther("0.01");
        const secondAmount = 6 * 10**6;
        await acdmToken.connect(bob).approve(acdmPlatform.address, secondAmount);
        expect(await acdmPlatform.connect(bob).addOrder(secondPrice, secondAmount))
          .to.emit(acdmPlatform, "OrderAdded")
          .withArgs(3, bob.address, secondPrice, secondAmount);
      });
    });

    describe("removeOrder", function () {
      it("Should remove order properly", async function () {
        const id = 2;
        const available = 2 * 10**6;
        expect(await acdmPlatform.connect(bob).removeOrder(id))
          .to.emit(acdmPlatform, "OrderRemoved")
          .withArgs(id, available);
      });

      it("Should fail to remove order (You are not a seller)", async function () {
        const id = 0;
        await expect(acdmPlatform.connect(bob).removeOrder(id))
          .to.be.revertedWith("You are not a seller");
      });
    });

    describe("redeemOrder", function () {
      it("Should fail to redeemOrder (Not enough available)", async function () {
        const value = parseEther("2");
        const id = 1;
        await expect(acdmPlatform.connect(bob).redeemOrder(id, { value: value }))
        .to.be.revertedWith("Not enough available");
      });

      it("Should redeemOrder partly", async function () {
        const value = parseEther("0.25");
        const id = 1;
        expect(await acdmPlatform.connect(bob).redeemOrder(id, { value: value }))
        .to.emit(acdmPlatform, "OrderUpdated")
        .withArgs(id, 1 * 10**6);
      });

      it("Should redeemOrder fully", async function () {
        const value = parseEther("0.25");
        const id = 1;
        expect(await acdmPlatform.connect(bob).redeemOrder(id, { value: value }))
        .to.emit(acdmPlatform, "OrderRedeemed")
        .withArgs(id, bob.address);
      });

      it("Should fail to redeemOrder (Order is redeemed)", async function () {
        const value = parseEther("1");
        const id = 1;
        await expect(acdmPlatform.connect(bob).redeemOrder(id, { value: value }))
        .to.be.revertedWith("Order is redeemed");
      });
    });
  });

  describe("Second sale round", function () {
    describe("startSaleRound", function () {
      it("Should start second sale round properly", async function () {
        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        expect(await acdmPlatform.connect(owner).startSaleRound())
          .to.emit(acdmPlatform, "RoundStarted");

        expect(await acdmPlatform.currentSaleVolume())
          .to.equal(BigNumber.from("34965034965"));
      });
    });

    describe("redeemOrder", function () {
      it("Should fail to redeemOrder (Trade round is over)", async function () {
        const value = parseEther("0.0002");
        await expect(acdmPlatform.connect(bob).redeemOrder(1, { value: value }))
          .to.be.revertedWith("Trade round is over");
      });
    });

    describe("buyACDM", function () {
      it("Should buyACDM", async function () {
        const price = parseEther("0.001");
        await acdmPlatform.connect(alice).buyACDM({ value: price });
      });
    });
  });

  describe("Second trade round", function () {
    describe("startTradeRound", function () {
      it("Should burn currentSaleVolume", async function () {
        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        expect(await acdmPlatform.connect(alice).startTradeRound())
          .to.emit(acdmPlatform, "RoundStarted")
          .to.emit(acdmToken, "Burn");
      });
    });
  });

  describe("Status check", function () {
    describe("Sale round", function () {
      it("Should fail to start sale round (Wrong round status)", async function () {
        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);
  
        expect(await acdmPlatform.connect(alice).startSaleRound())
          .to.emit(acdmPlatform, "RoundStarted");
  
        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);
  
        await expect(acdmPlatform.connect(alice).startSaleRound()).to.be.revertedWith("Wrong round status");
      });
    });

    describe("Trade round", function () {
      it("Should fail to start trade round (Wrong round status)", async function () {
        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);
  
        expect(await acdmPlatform.connect(alice).startTradeRound())
          .to.emit(acdmPlatform, "RoundStarted");
  
        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);
  
        await expect(acdmPlatform.connect(alice).startTradeRound()).to.be.revertedWith("Wrong round status");
      });
    });
  });

  describe("DAO Functionality", function () {
    describe("modifyRefererTradeFees", function () {
      it("Should modifyRefererTradeFees properly", async function () {
        const jsonAbi = [
          {
            inputs: [
              {
                internalType: "uint8",
                name: "fee",
                type: "uint8"
              }
            ],
            name: "modifyRefererTradeFees",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
        ];
      
        const functionInterface = new ethers.utils.Interface(jsonAbi);
        const callData = functionInterface.encodeFunctionData("modifyRefererTradeFees", [10]);
        const description = "modifyRefererTradeFees to 1%";

        await sendLp(owner.address, parseEther("1"));
        await sendLp(alice.address, parseEther("1"));

        lpToken.approve(staking.address, parseEther("1"));
        lpToken.connect(alice).approve(staking.address, parseEther("1"));

        const proofOwner = getProof(merkleTree, owner.address);
        const proofAlice = getProof(merkleTree, alice.address);

        await staking.stake(parseEther("1"), proofOwner);
        await staking.connect(alice).stake(parseEther("1"), proofAlice);

        await dao.addProposal(acdmPlatform.address, callData, description);

        await dao.vote(1, 1);
        await dao.connect(alice).vote(1, 1);

        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        await dao.finish(1);

        expect(await acdmPlatform.refererTradeFee())
          .to.equal(BigNumber.from("10"));
      });
    });

    describe("modifyRefererSaleFees", function () {
      it("Should modifyRefererSaleFees properly", async function () {
        const jsonAbi = [
          {
            inputs: [
              {
                internalType: "uint8",
                name: "_firstFee",
                type: "uint8"
              },
              {
                internalType: "uint8",
                name: "_secondFee",
                type: "uint8"
              }
            ],
            name: "modifyRefererSaleFees",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
        ];
      
        const functionInterface = new ethers.utils.Interface(jsonAbi);
        const callData = functionInterface.encodeFunctionData("modifyRefererSaleFees", [20, 10]);
        const description = "modifyRefererTradeFees modifyRefererSaleFees 2% and 1%";

        await sendLp(owner.address, parseEther("1"));
        await sendLp(alice.address, parseEther("1"));

        lpToken.approve(staking.address, parseEther("1"));
        lpToken.connect(alice).approve(staking.address, parseEther("1"));

        const proofOwner = getProof(merkleTree, owner.address);
        const proofAlice = getProof(merkleTree, alice.address);

        await staking.stake(parseEther("1"), proofOwner);
        await staking.connect(alice).stake(parseEther("1"), proofAlice);

        await dao.addProposal(acdmPlatform.address, callData, description);

        await dao.vote(2, 1);
        await dao.connect(alice).vote(2, 1);

        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        await dao.finish(2);

        expect(await acdmPlatform.firstRefererSaleFee())
          .to.equal(BigNumber.from("20"));

        expect(await acdmPlatform.secondRefererSaleFee())
          .to.equal(BigNumber.from("10"));
      });
    });

    describe("withdraw", function () {
      it("Should withdraw properly", async function () {
        await acdmPlatform.withdraw();

        expect(await ethers.provider.getBalance(acdmPlatform.address))
          .to.equal(await acdmPlatform.totalFeesCollected());
      });
    });

    describe("withdrawFeesCollected", function () {
      it("Should withdrawFeesCollected properly", async function () {
        const jsonAbi = [
          {
            inputs: [],
            name: "withdrawFeesCollected",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
        ];
      
        const functionInterface = new ethers.utils.Interface(jsonAbi);
        const callData = functionInterface.encodeFunctionData("withdrawFeesCollected");
        const description = "withdrawFeesCollected";

        await dao.addProposal(acdmPlatform.address, callData, description);

        await dao.vote(3, 1);
        await dao.connect(alice).vote(3, 1);

        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        await dao.finish(3);

        expect(await ethers.provider.getBalance(acdmPlatform.address))
          .to.equal(BigNumber.from("0"));
      });
    });

    // ADD VALUE
    describe("buyAndBurnXXX", function () {
      it("Should buyAndBurnXXX properly", async function () {
        await acdmPlatform.startSaleRound();
        await acdmPlatform.connect(alice).buyACDM({ value: parseEther("0.2") });

        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        const jsonAbi = [
          {
            inputs: [],
            name: "buyAndBurnXXX",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
        ];

        const functionInterface = new ethers.utils.Interface(jsonAbi);
        const callData = functionInterface.encodeFunctionData("buyAndBurnXXX");
        const description = "Buy XXX tokens for totalFeesCollected and then burn.";
  
        await dao.addProposal(acdmPlatform.address, callData, description);
  
        await dao.vote(4, 1);
        await dao.connect(alice).vote(4, 1);

        await ethers.provider.send('evm_increaseTime', [3 * days]);
        await ethers.provider.send('evm_mine', []);

        await dao.finish(4);
      });
    });
  });
});
