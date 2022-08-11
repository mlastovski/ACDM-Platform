import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("mintXXX", "Mints `amount` of XXX to address `to`")
  .addParam("to", "Address to mint to")
  .addParam("amount", "Amount of tokens to mint")
  .setAction(async (taskArgs, { ethers }) => {
    const xxxToken = await ethers.getContractAt("XXXToken", "0x30327078938FB91f4eb26163954b24C476696EB6");
    const transaction = await xxxToken.mint(taskArgs.to, taskArgs.amount);

    console.log(await transaction.wait());
  });
