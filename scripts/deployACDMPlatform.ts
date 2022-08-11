import { ethers } from "hardhat";

async function main() {
  const ACDMPlatform = await ethers.getContractFactory("ACDMPlatform");
  const acdmPlatform = await ACDMPlatform.deploy(
    "0xE6Bd2Ca25dE0C3bB71eDfD409F86977d15ef63bf", 
    "0x30327078938FB91f4eb26163954b24C476696EB6",
    "0x6b36F57a457b1b9243F7D578966ed9841DE01C2e"
  );

  await acdmPlatform.deployed();

  console.log("ACDMPlatform deployed to: ", acdmPlatform.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
