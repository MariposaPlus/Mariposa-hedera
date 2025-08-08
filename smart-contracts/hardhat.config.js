require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true,
        }
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    hederaMainnet: {
      url: process.env.HEDERA_MAINNET_RPC || "https://mainnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 295,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000
    },
    hederaTestnet: {
      url: process.env.HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 296,
      gasPrice: 10000000000, // 10 gwei for testnet
      timeout: 60000
    },
    hederaPreviewnet: {
      url: process.env.HEDERA_PREVIEWNET_RPC || "https://previewnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 297,
      gasPrice: 10000000000,
      timeout: 60000
    }
  },
  etherscan: {
    apiKey: {
      hederaMainnet: process.env.HASHSCAN_API_KEY || "YOUR_API_KEY",
      hederaTestnet: process.env.HASHSCAN_API_KEY || "YOUR_API_KEY",
      hederaPreviewnet: process.env.HASHSCAN_API_KEY || "YOUR_API_KEY"
    },
    customChains: [
      {
        network: "hederaMainnet",
        chainId: 295,
        urls: {
          apiURL: "https://mainnet.hashscan.io/api",
          browserURL: "https://hashscan.io/"
        }
      },
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://testnet.hashscan.io/api",
          browserURL: "https://testnet.hashscan.io/"
        }
      },
      {
        network: "hederaPreviewnet",
        chainId: 297,
        urls: {
          apiURL: "https://previewnet.hashscan.io/api",
          browserURL: "https://previewnet.hashscan.io/"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  mocha: {
    timeout: 40000
  }
};
