import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("addOrder", "Adds a new order")
  .addParam("contract", "ACDMPlatform contract address")
  .addParam("price", "price in ETH")
  .addParam("amount", "amount of ACDM")
  .setAction(async (taskArgs, hre) => {
    const ACDMPlatform = await hre.ethers.getContractFactory("ACDMPlatform");
    const acdmPlatform = ACDMPlatform.attach(taskArgs.contract);

    const transaction = await acdmPlatform.addOrder(taskArgs.price, taskArgs.amount);
    console.log(transaction);
  });