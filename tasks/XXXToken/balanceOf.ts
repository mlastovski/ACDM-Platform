import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("balanceOfXXX", "Gets user's XXX Token balance")
  .addParam("account", "User address")
  .setAction(async (taskArgs, { ethers }) => {
    const xxxToken = await ethers.getContractAt("XXXToken", "0x30327078938FB91f4eb26163954b24C476696EB6");
    const balance = await xxxToken.balanceOf(taskArgs.account);
    console.log("Balance of " + taskArgs.account + " is: " + balance);
  });
