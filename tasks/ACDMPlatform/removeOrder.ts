import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("removeOrder", "Removes order")
  .addParam("contract", "ACDMPlatform contract address")
  .addParam("id", "Order id")
  .setAction(async (taskArgs, hre) => {
    const ACDMPlatform = await hre.ethers.getContractFactory("ACDMPlatform");
    const acdmPlatform = ACDMPlatform.attach(taskArgs.contract);

    const transaction = await acdmPlatform.removeOrder(taskArgs.id);
    console.log(transaction);
  });
  