import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

async function main() {
  let merkleTree: MerkleTree;

  const buildTree = (addrs: string[]) => {
    const leafNodes = addrs.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

    return merkleTree;
  };

  const getRoot = (merkleTree: MerkleTree) => {
    return "0x".concat(merkleTree.getRoot().toString("hex"));
  };

  let addrs = [
    "0x71c916C1A79cc66bfD39a2cc6f7B4feEd589d21e"
  ];

  merkleTree = buildTree(addrs);
  const merkleRoot = getRoot(merkleTree);

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    "0xE7001A4Ded3CcC911c73e18457fF8fEF9705938f", 
    "0x30327078938FB91f4eb26163954b24C476696EB6", 
    "0x6b36F57a457b1b9243F7D578966ed9841DE01C2e",
    merkleRoot
  );

  await staking.deployed();

  console.log("Staking deployed to: ", staking.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
