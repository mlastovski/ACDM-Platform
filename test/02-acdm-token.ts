import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { parseEther } from "ethers/lib/utils";

describe("ACDMToken", function () {
  let ACDMToken: ContractFactory;
  let acdmToken: Contract;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  before(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    ACDMToken = await ethers.getContractFactory("ACDMToken");
  });

  beforeEach(async function () {
    acdmToken = await ACDMToken.deploy();
    await acdmToken.deployed();
  });

  describe("decimals", function () {
    it("Should return 6", async function () {
      expect(await acdmToken.decimals())
        .to.equal(6);
    });
  });

  describe("mint", function () {
    it("Should mint to alice properly", async function () {
      expect(await acdmToken.balanceOf(alice.address))
        .to.equal(parseEther("0"));

      await acdmToken.mint(alice.address, parseEther("1"));

      expect(await acdmToken.balanceOf(alice.address))
        .to.equal(parseEther("1"));
    });
  });

  describe("burn", function () {
    it("Should burn from bob properly", async function () {
      expect(await acdmToken.balanceOf(bob.address))
        .to.equal(parseEther("0"));

      await acdmToken.mint(bob.address, parseEther("2"));

      expect(await acdmToken.balanceOf(bob.address))
        .to.equal(parseEther("2"));

      await acdmToken.burn(bob.address, parseEther("1"));
      
      expect(await acdmToken.balanceOf(bob.address))
        .to.equal(parseEther("1"));
    }); 
  });
});
