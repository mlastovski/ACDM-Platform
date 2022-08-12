import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
dotenv.config();

task("addproposal", "Creates a new proposal")
  .addParam("contract", "DAO contract address")
  .addParam("target", "Token contract address")
  .addParam("calldata", "function hash to call after voting")
  .addParam("description", "description")
  .setAction(async (taskArgs, hre) => {
    const DAO = await hre.ethers.getContractFactory("DAO");
    const dao = DAO.attach(taskArgs.contract);

    const transaction = await dao.addProposal(taskArgs.target, taskArgs.calldata, taskArgs.description);
    console.log(transaction);
  });
  