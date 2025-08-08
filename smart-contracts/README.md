# Smart Contracts - Hardhat Project with Sei Network Support

This project demonstrates a Hardhat setup with Sei EVM network integration. It comes with a sample contract, tests for that contract, and deployment scripts configured for Sei's high-performance blockchain.

## 🚀 Sei Network Integration

This project is pre-configured to work with all Sei networks:

- **Sei Mainnet** (Chain ID: 1329) - Production network
- **Sei Testnet** (Chain ID: 1328) - Testing network  
- **Sei Devnet** (Chain ID: 713715) - Development network

### Network Features
- ⚡ **Sub-400ms finality** - Ultra-fast transaction confirmation
- 🔥 **High throughput** - Optimized for high-performance applications
- 💰 **Low gas costs** - Efficient transaction processing
- 🔗 **EVM Compatible** - Full Ethereum tooling support

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A wallet with SEI tokens for gas fees

## 🛠 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your wallet:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your private key (without 0x prefix)
   # PRIVATE_KEY=your_private_key_here
   ```

3. **Get SEI tokens:**
   - **Mainnet**: Bridge from other networks or buy on exchanges
   - **Testnet**: Use the [Sei Faucet](https://faucet.sei.io)
   - **Devnet**: Use the [Sei Faucet](https://faucet.sei.io)

## 🔧 Available Commands

### Basic Commands
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local Hardhat node
npx hardhat node

# Help
npx hardhat help
```

### Sei Network Deployment
```bash
# Deploy to Sei Mainnet
npx hardhat ignition deploy ./ignition/modules/Lock.js --network seiMainnet

# Deploy to Sei Testnet
npx hardhat ignition deploy ./ignition/modules/Lock.js --network seiTestnet

# Deploy to Sei Devnet
npx hardhat ignition deploy ./ignition/modules/Lock.js --network seiDevnet
```

### Network Interaction
```bash
# Check account balance on Sei Mainnet
npx hardhat run scripts/checkBalance.js --network seiMainnet

# Verify contracts on Sei (using SeiTrace)
npx hardhat verify --network seiMainnet DEPLOYED_CONTRACT_ADDRESS
```

## 🌐 Network Configuration

The project includes the following network configurations:

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Sei Mainnet | 1329 | `https://evm-rpc.sei-apis.com` | [SeiTrace](https://seitrace.com) |
| Sei Testnet | 1328 | `https://evm-rpc-testnet.sei-apis.com` | [SeiTrace Testnet](https://seitrace.com/?chain=atlantic-2) |
| Sei Devnet | 713715 | `https://evm-rpc-arctic-1.sei-apis.com` | [SeiTrace Devnet](https://seitrace.com/?chain=arctic-1) |

## 📁 Project Structure
```
smart-contracts/
├── contracts/          # Smart contracts
│   └── Lock.sol        # Sample timelock contract
├── ignition/           # Deployment scripts
│   └── modules/
│       └── Lock.js     # Lock contract deployment
├── test/               # Test files
│   └── Lock.js         # Contract tests
├── hardhat.config.js   # Hardhat configuration with Sei networks
├── .env.example        # Environment variables template
└── README.md           # This file
```

## 💡 Example Usage

### Deploy a Contract
```bash
# Deploy to Sei Testnet first
npx hardhat ignition deploy ./ignition/modules/Lock.js --network seiTestnet

# If successful, deploy to mainnet
npx hardhat ignition deploy ./ignition/modules/Lock.js --network seiMainnet
```

### Interact with Deployed Contracts
```javascript
// Example script to interact with deployed contract
const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x..."; // Your deployed contract address
  const Lock = await ethers.getContractAt("Lock", contractAddress);
  
  // Call contract methods
  const unlockTime = await Lock.unlockTime();
  console.log("Unlock time:", unlockTime.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

## 🔍 Contract Verification

Verify your contracts on SeiTrace (Sei's block explorer):

```bash
npx hardhat verify --network seiMainnet DEPLOYED_CONTRACT_ADDRESS CONSTRUCTOR_PARAM1 CONSTRUCTOR_PARAM2
```

## 🛡 Security Notes

- **Never commit your `.env` file** - it contains your private key
- **Use testnet first** - always test on Sei testnet before mainnet
- **Keep private keys secure** - consider using hardware wallets for mainnet
- **Audit contracts** - have your contracts audited before mainnet deployment

## 📚 Resources

- [Sei Documentation](https://docs.sei.io)
- [Sei EVM Guide](https://docs.sei.io/evm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [SeiTrace Explorer](https://seitrace.com)
- [Sei Faucet](https://faucet.sei.io)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Happy building on Sei! 🚀**
