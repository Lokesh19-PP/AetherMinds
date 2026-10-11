import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as path from 'path';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.26',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Default in-process Hardhat network (used for `hardhat test`)
    hardhat: {
      chainId: 31337,
    },
    // External Hardhat node started with `npm run chain` on port 8545
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // Optional Sepolia testnet (stretch goal only; requires .env setup)
    ...(process.env['SEPOLIA_RPC_URL']
      ? {
          sepolia: {
            url: process.env['SEPOLIA_RPC_URL'],
            accounts: process.env['SEPOLIA_PRIVATE_KEY']
              ? [process.env['SEPOLIA_PRIVATE_KEY']]
              : [],
            chainId: 11155111,
          },
        }
      : {}),
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  gasReporter: {
    enabled: process.env['REPORT_GAS'] === 'true',
    currency: 'USD',
  },
};

export default config;
