import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("startTradeRound", "Starts a trade round")
  .addParam("contract", "ACDMPlatform contract address")
  .setAction(async (taskArgs, hre) => {
    const ACDMPlatform = await hre.ethers.getContractFactory("ACDMPlatform");
    const acdmPlatform = ACDMPlatform.attach(taskArgs.contract);

    const transaction = await acdmPlatform.startTradeRound();
    console.log(transaction);
  });
  