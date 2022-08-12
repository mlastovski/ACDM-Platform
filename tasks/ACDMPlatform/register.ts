import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("register", "Register a new user")
  .addParam("contract", "ACDMPlatform contract address")
  .addParam("referer", "Referer address")
  .setAction(async (taskArgs, hre) => {
    const ACDMPlatform = await hre.ethers.getContractFactory("ACDMPlatform");
    const acdmPlatform = ACDMPlatform.attach(taskArgs.contract);

    const transaction = await acdmPlatform.register(taskArgs.referer);
    console.log(transaction);
  });
  