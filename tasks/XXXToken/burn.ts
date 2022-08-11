import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("burnXXX", "Burns `amount` of XXX from address `from`")
  .addParam("from", "Address to burn from")
  .addParam("amount", "Amount of tokens to burn")
  .setAction(async (taskArgs, { ethers }) => {
    const xxxToken = await ethers.getContractAt("XXXToken", "0x30327078938FB91f4eb26163954b24C476696EB6");
    const transaction = await xxxToken.burn(taskArgs.from, taskArgs.amount);
    
    console.log(await transaction.wait());
  });
