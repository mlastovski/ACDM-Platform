import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("finish", "Finishes specific proposal")
  .addParam("contract", "DAO contract address")
  .addParam("id", "Proposal id")
  .setAction(async (taskArgs, hre) => {
    const DAO = await hre.ethers.getContractFactory("DAO");
    const dao = DAO.attach(taskArgs.contract);

    const transaction = await dao.finish(taskArgs.id);
    console.log(transaction);
  });