import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("vote", "Vote for or against specific proposal")
  .addParam("contract", "DAO contract address")
  .addParam("id", "Proposal id")
  .addParam("decision", "Decision: 1 - yes || 0 - no")
  .setAction(async (taskArgs, hre) => {
    const DAO = await hre.ethers.getContractFactory("DAO");
    const dao = DAO.attach(taskArgs.contract);

    const transaction = await dao.vote(taskArgs.id, taskArgs.decision);
    console.log(transaction);
  });