import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("burnACDM", "Burns `amount` of ACDM from address `from`")
  .addParam("from", "Address to burn from")
  .addParam("amount", "Amount of tokens to burn")
  .setAction(async (taskArgs, { ethers }) => {
    const xxxToken = await ethers.getContractAt("ACDMToken", "0xE6Bd2Ca25dE0C3bB71eDfD409F86977d15ef63bf");
    const transaction = await xxxToken.burn(taskArgs.from, taskArgs.amount);
    
    console.log(await transaction.wait());
  });