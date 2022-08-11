import { MerkleTree } from "merkletreejs";
import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

import keccak256 from "keccak256";

task("stake", "Stakes `amount` of LP tokens")
  .addParam("amount", "Amount of tokens to stake")
  .setAction(async (taskArgs, { ethers }) => {
    const [stakeCaller] = await ethers.getSigners();
    const staking = await ethers.getContractAt("Staking", "0x0880A08c55163E4169E3f6393FCcb7D13FEafC22");

    let addrs = [
      "0x71c916C1A79cc66bfD39a2cc6f7B4feEd589d21e"
    ];

    const leafNodes = addrs.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    const merkleProof = merkleTree.getHexProof(keccak256(stakeCaller.address));

    const transaction = await (await staking.stake(taskArgs.amount, merkleProof)).wait();
    console.log(transaction);
  });