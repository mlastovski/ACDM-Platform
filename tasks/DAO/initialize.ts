import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("initialize", "Setting the staking contract address")
  .addParam("contract", "DAO contract address")
  .addParam("target", "Staking contract address")
  .setAction(async (taskArgs, hre) => {
    const DAO = await hre.ethers.getContractFactory("DAO");
    const dao = DAO.attach(taskArgs.contract);

    const transaction = await dao.initialize(taskArgs.target);
    console.log(transaction);
  });
  