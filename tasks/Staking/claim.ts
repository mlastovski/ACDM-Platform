import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("claim", "Claims rewards in XXX from stake")
  .setAction(async (taskArgs, { ethers }) => {
    const staking = await ethers.getContractAt("Staking", "0x0880A08c55163E4169E3f6393FCcb7D13FEafC22");
    const transaction = await staking.claim();
    console.log(await transaction.wait());
  });