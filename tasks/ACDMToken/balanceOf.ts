import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("balanceOfACDM", "Gets user's ACDM Token balance")
  .addParam("account", "User address")
  .setAction(async (taskArgs, { ethers }) => {
    const acdmToken = await ethers.getContractAt("ACDMToken", "0xE6Bd2Ca25dE0C3bB71eDfD409F86977d15ef63bf");
    const balance = await acdmToken.balanceOf(taskArgs.account);
    console.log("Balance of " + taskArgs.account + " is: " + balance);
  });