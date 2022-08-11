import { ethers } from "hardhat";

async function main() {
  const ACDMPlatform = await ethers.getContractFactory("ACDMPlatform");
  const acdmPlatform = await ACDMPlatform.deploy(3, 1000);

  await acdmPlatform.deployed();

  console.log("ACDMPlatform deployed to: ", acdmPlatform.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
