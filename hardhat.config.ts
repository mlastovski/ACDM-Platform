import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-contract-sizer";
import "hardhat-docgen";

import "./tasks/XXXToken/mint.ts";
import "./tasks/XXXToken/burn.ts";
import "./tasks/XXXToken/balanceOf.ts";

import "./tasks/ACDMToken/mint.ts";
import "./tasks/ACDMToken/burn.ts";
import "./tasks/ACDMToken/balanceOf.ts";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  // contractSizer: {
  //   alphaSort: true,
  //   runOnCompile: true,
  //   disambiguatePaths: false,
  // },

  networks: {
    rinkeby: {
      url: process.env.ALCHEMY_URL || "",
      accounts:
        process.env.MNEMONIC !== undefined ? [process.env.MNEMONIC] : [],
    },

    hardhat: {
      forking: {
        // url: process.env.ALCHEMY_URL as string,
        url: "https://eth-rinkeby.alchemyapi.io/v2/or8rc_scY44QrvZWM1i_p32do5Ng5I7K",
        enabled: true,
      }
    },

    bsc: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts:
        process.env.MNEMONIC !== undefined ? [process.env.MNEMONIC] : [],
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  
  // docgen: {
  //   path: './docs',
  //   clear: true,
  //   runOnCompile: false,
  // } 
};

export default config;