import { ethers } from "hardhat";

async function main() {
  const ACDMToken = await ethers.getContractFactory("ACDMToken");
  const acdmToken = await ACDMToken.deploy();

  await acdmToken.deployed();

  console.log("ACDMToken deployed to: ", acdmToken.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
