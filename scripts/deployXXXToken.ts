import { ethers } from "hardhat";

async function main() {
  const XXXToken = await ethers.getContractFactory("XXXToken");
  const xxxToken = await XXXToken.deploy();

  await xxxToken.deployed();

  console.log("XXXToken deployed to: ", xxxToken.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
