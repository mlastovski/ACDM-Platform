import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("mintACDM", "Mints `amount` of ACDM to address `to`")
  .addParam("to", "Address to mint to")
  .addParam("amount", "Amount of tokens to mint")
  .setAction(async (taskArgs, { ethers }) => {
    const acdmToken = await ethers.getContractAt("ACDMToken", "0xE6Bd2Ca25dE0C3bB71eDfD409F86977d15ef63bf");
    const transaction = await acdmToken.mint(taskArgs.to, taskArgs.amount);

    console.log(await transaction.wait());
  });
