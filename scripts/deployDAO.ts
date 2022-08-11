import { ethers } from "hardhat";

async function main() {
  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(3, 1000);

  await dao.deployed();

  console.log("DAO deployed to: ", dao.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
