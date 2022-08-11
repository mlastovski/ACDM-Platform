import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { parseEther } from "ethers/lib/utils";

describe("XXXToken", function () {
  let XXXToken: ContractFactory;
  let xxxToken: Contract;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  before(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    XXXToken = await ethers.getContractFactory("XXXToken");
  });

  beforeEach(async function () {
    xxxToken = await XXXToken.deploy();
    await xxxToken.deployed();
  });

  describe("mint", function () {
    it("Should mint to alice properly", async function () {
      expect(await xxxToken.balanceOf(alice.address))
        .to.equal(parseEther("0"));

      await xxxToken.mint(alice.address, parseEther("1"));

      expect(await xxxToken.balanceOf(alice.address))
        .to.equal(parseEther("1"));
    });
  });

  describe("burn", function () {
    it("Should burn from bob properly", async function () {
      expect(await xxxToken.balanceOf(bob.address))
        .to.equal(parseEther("0"));

      await xxxToken.mint(bob.address, parseEther("2"));

      expect(await xxxToken.balanceOf(bob.address))
        .to.equal(parseEther("2"));

      await xxxToken.burn(bob.address, parseEther("1"));
      
      expect(await xxxToken.balanceOf(bob.address))
        .to.equal(parseEther("1"));
    }); 
  });
});
