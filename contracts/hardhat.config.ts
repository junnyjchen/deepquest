import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545";
const BSC_MAINNET_RPC = process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: 56
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: [PRIVATE_KEY],
      gasPrice: 30000000000
    },
    bscMainnet: {
      url: BSC_MAINNET_RPC,
      chainId: 56,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000
    }
  },
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_API_KEY
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    token: "BNB",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  typechain: {
    outDir: "./typechain",
    target: "ethers-v6"
  }
};

export default config;
