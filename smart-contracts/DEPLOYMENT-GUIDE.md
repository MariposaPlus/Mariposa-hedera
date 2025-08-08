# AgenticRouter Deployment Guide

## Overview

The AgenticRouter is a smart contract designed for the Sei network that enables whitelisted agents to perform token swaps and transfers with automated fee collection. This guide covers the complete deployment and usage process.

## Features

- ✅ **Agent Whitelisting**: Only authorized agents can execute swaps
- ✅ **Automatic Fee Collection**: Configurable fee collection in basis points (max 10%)
- ✅ **Multi-Token Support**: Support for ERC20 tokens and native SEI
- ✅ **DragonSwap Integration**: Built-in integration with Sei's DragonSwap DEX
- ✅ **Fee Conversion**: Automatic conversion of fees to stablecoin (USDC)
- ✅ **Admin Controls**: Comprehensive admin functions for managing the system
- ✅ **Reentrancy Protection**: Built-in security measures

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Hardhat** development environment
3. **Wallet** with SEI tokens for gas fees
4. **Private Key** for deployment
5. **Sei Network RPC** access

## Quick Start

### 1. Environment Setup

```bash
# Clone or navigate to your project
cd smart-contracts

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your specific values:

```bash
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Fee recipient address (defaults to deployer if not set)
FEE_RECIPIENT=0x1234567890123456789012345678901234567890

# Fee in basis points (30 = 0.3%, max 1000 = 10%)
FEE_BPS=30

# Optional: Initial agent to register on deployment
INITIAL_AGENT=0x1234567890123456789012345678901234567890
```

### 3. Deploy to Sei Networks

```bash
# Deploy to Sei Testnet (recommended for testing)
npm run deploy:agentic-testnet

# Deploy to Sei Devnet
npm run deploy:agentic-devnet

# Deploy to Sei Mainnet (production)
npm run deploy:agentic-mainnet
```

## Network Addresses

### Sei Mainnet
- **Chain ID**: 1329
- **RPC URL**: `https://evm-rpc.sei-apis.com`
- **Explorer**: [SeiTrace](https://seitrace.com)

### Sei Testnet  
- **Chain ID**: 1328
- **RPC URL**: `https://evm-rpc-testnet.sei-apis.com`
- **Explorer**: [SeiTrace Testnet](https://seitrace.com/?chain=atlantic-2)

### Sei Devnet
- **Chain ID**: 713715
- **RPC URL**: `https://evm-rpc-arctic-1.sei-apis.com`
- **Explorer**: [SeiTrace Devnet](https://seitrace.com/?chain=arctic-1)

## Contract Addresses (Update These)

**⚠️ Important**: Update these addresses in `scripts/deploy-AgenticRouter.js` with actual Sei network addresses:

```javascript
const ADDRESSES = {
  seiMainnet: {
    dragonSwapRouter: "0x...", // Actual DragonSwap V2 Router
    usdc: "0x...",             // Actual USDC on Sei
    wsei: "0x...",             // Actual Wrapped SEI
  },
  // ... other networks
};
```

## Usage Guide

### For Administrators

#### 1. Register Agents
```javascript
// Register a new agent
await agenticRouter.registerAgent(agentAddress, true);

// Unregister an agent
await agenticRouter.registerAgent(agentAddress, false);
```

#### 2. Update Fee Settings
```javascript
// Set fee to 0.5% (50 basis points)
await agenticRouter.setFeeBps(50);

// Update fee recipient
await agenticRouter.setFeeRecipient(newRecipientAddress);
```

### For Agents

#### 1. Token to Token Swap
```javascript
await agenticRouter.swapTokenToToken(
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  amountOutMin,
  recipientAddress,
  deadline
);
```

#### 2. SEI to Token Swap
```javascript
await agenticRouter.swapSeiToToken(
  tokenOutAddress,
  recipientAddress,
  deadline,
  { value: amountIn }
);
```

#### 3. Token to SEI Swap
```javascript
await agenticRouter.swapTokenToSei(
  tokenInAddress,
  amountIn,
  amountOutMin,
  recipientAddress,
  deadline
);
```

#### 4. Transfer with Fee
```javascript
// ERC20 transfer with fee
await agenticRouter.transferWithFee(
  tokenAddress,
  fromAddress,
  toAddress,
  amount
);

// Native SEI transfer with fee
await agenticRouter.nativeTransferWithFee(
  toAddress,
  { value: amount }
);
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test
```bash
npx hardhat test --grep "Should set the correct initial values"
```

### Compile Contracts
```bash
npm run compile
```

## Verification

After deployment, verify your contract on the Sei explorer:

```bash
npx hardhat verify --network seiMainnet DEPLOYED_CONTRACT_ADDRESS \
  "SWAP_ROUTER_ADDRESS" \
  "USDC_ADDRESS" \
  "WSEI_ADDRESS" \
  "FEE_RECIPIENT_ADDRESS" \
  30
```

## Contract Architecture

```
AgenticRouter
├── State Variables
│   ├── admin (address)
│   ├── feeRecipient (address)
│   ├── feeBps (uint16)
│   ├── swapRouter (ISeiAMM)
│   ├── stablecoin (IERC20)
│   └── WSEI (address)
├── Access Control
│   ├── onlyAdmin modifier
│   ├── onlyAgent modifier
│   └── isAgent mapping
├── Swap Functions
│   ├── swapTokenToToken()
│   ├── swapSeiToToken()
│   └── swapTokenToSei()
├── Transfer Functions
│   ├── transferWithFee()
│   └── nativeTransferWithFee()
└── Admin Functions
    ├── registerAgent()
    ├── setFeeBps()
    ├── setFeeRecipient()
    └── emergencyWithdraw()
```

## Security Features

- **Reentrancy Protection**: All external calls protected
- **Access Control**: Strict role-based permissions
- **Input Validation**: Comprehensive parameter validation
- **Emergency Functions**: Admin-only emergency withdrawal
- **Fee Limits**: Maximum fee capped at 10%

## Gas Optimization

The contract uses several optimization techniques:
- **viaIR compilation**: Enabled for better optimization
- **Immutable variables**: Gas-efficient storage
- **Efficient fee calculation**: Minimized arithmetic operations
- **Batch operations**: Reduced transaction costs

## Troubleshooting

### Common Issues

1. **"Stack too deep" error**: Enable `viaIR: true` in hardhat.config.js
2. **"safeApprove not found"**: Use `forceApprove` instead (OpenZeppelin v5+)
3. **"ReentrancyGuard not found"**: Import from `utils/` not `security/`
4. **Deployment fails**: Check network configuration and gas prices

### Getting Help

- [Sei Documentation](https://docs.sei.io)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Documentation](https://docs.openzeppelin.com)

## License

This project is licensed under the MIT License.

---

**⚠️ Security Warning**: Always test on testnet before mainnet deployment. Ensure proper access controls and conduct security audits for production use. 