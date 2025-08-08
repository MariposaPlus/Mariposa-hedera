# DragonSwap V2 AgenticRouter Deployment Guide

This guide covers deployment and testing of the updated AgenticRouter contract that integrates with DragonSwap V2's concentrated liquidity protocol.

## Overview

The AgenticRouter has been updated to work with DragonSwap V2, featuring:
- **Concentrated Liquidity**: Support for V2's concentrated liquidity pools
- **Multiple Fee Tiers**: Automatic selection of optimal fee tiers (0.05%, 0.3%, 1%)
- **Smart Routing**: Intelligent path finding for direct vs multi-hop swaps
- **Gas Optimization**: Uses single-hop swaps when possible for better gas efficiency

## Prerequisites

1. **Node.js** (v16+ recommended)
2. **Hardhat** development environment
3. **SEI** tokens for deployment and testing
4. **Private key** with sufficient SEI balance

## Configuration

### 1. Environment Setup

Copy the environment template:
```bash
cp config/deployment.env.example .env
```

### 2. Update Environment Variables

Edit `.env` with your configuration:

```bash
# Required
PRIVATE_KEY=your_private_key_without_0x_prefix
NETWORK=seiMainnet
FEE_RECIPIENT=0xYourFeeRecipientAddress

# Optional
FEE_BPS=30  # 0.3% default fee
INITIAL_AGENT=0xYourAgentAddress
```

### 3. Network Addresses

The deployment script includes pre-configured addresses for Sei Mainnet:

- **DragonSwap V2 Router (SwapRouter02)**: `0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428`
- **DragonSwap V2 Factory**: `0x179D9a5592Bc77050796F7be28058c51cA575df4`
- **USDC**: `0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1`
- **WSEI**: `0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7`

## Deployment

### 1. Deploy AgenticRouter

```bash
npx hardhat run scripts/deploy-AgenticRouter.js --network seiMainnet
```

### 2. Save Contract Address

After deployment, update your `.env` file:
```bash
AGENTIC_ROUTER_ADDRESS=0xYourDeployedContractAddress
```

## Testing

### 1. SEI to USDC Swap Test

Test the main functionality with a comprehensive SEI to USDC swap:

```bash
npx hardhat run scripts/test-sei-to-usdc.js --network seiMainnet
```

This test will:
- Check DragonSwap V2 pool information
- Test fee tier selection
- Verify optimal path routing
- Execute a SEI → USDC swap
- Display detailed results

### 2. General DragonSwap V2 Tests

Run the updated DragonSwap V2 integration tests:

```bash
npx hardhat run scripts/test-dragonswap-v2.js --network seiMainnet
```

## Contract Functions

### Core Swap Functions

```solidity
// SEI to Token swap
function swapSeiToToken(
    address tokenOut,
    uint256 amountOutMin,
    address recipient,
    uint256 deadline
) external payable returns (uint256 amountOut)

// Token to Token swap
function swapTokenToToken(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 amountOutMin,
    address recipient,
    uint256 deadline
) external returns (uint256 amountOut)

// Token to SEI swap
function swapTokenToSei(
    address tokenIn,
    uint256 amountIn,
    uint256 amountOutMin,
    address recipient,
    uint256 deadline
) external returns (uint256 amountOut)
```

### DragonSwap V2 Specific Functions

```solidity
// Get optimal fee tier for a token pair
function getBestFeeTier(address tokenA, address tokenB) 
    external view returns (uint24 fee)

// Get optimal swap path
function getOptimalPath(address tokenIn, address tokenOut) 
    external view returns (bytes memory path, bool isDirect)

// Check pool information
function getPoolInfo(address tokenA, address tokenB, uint24 fee) 
    external view returns (
        bool exists,
        address poolAddress,
        uint128 liquidity,
        uint160 sqrtPriceX96
    )
```

## Fee Structure

The contract implements a fee-on-transfer mechanism:

- **Default Fee**: 0.3% (30 basis points)
- **Fee Collection**: Automatically converted to USDC
- **Fee Tiers**: Supports DragonSwap V2's 0.05%, 0.3%, and 1% tiers

## Example Usage

### JavaScript/TypeScript Integration

```javascript
const { ethers } = require("ethers");

// Contract ABI (partial)
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address,uint256,address,uint256) external payable returns (uint256)",
  "function getBestFeeTier(address,address) external view returns (uint24)",
  "function isAgent(address) external view returns (bool)"
];

// Connect to contract
const provider = new ethers.JsonRpcProvider("https://evm-rpc.sei-apis.com");
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, signer);

// Check if address is registered agent
const isAgent = await contract.isAgent(signer.address);

// Get best fee tier for WSEI/USDC
const feeTier = await contract.getBestFeeTier(wseiAddress, usdcAddress);

// Perform SEI to USDC swap (1 SEI)
const tx = await contract.swapSeiToToken(
  usdcAddress,
  0, // minimum output (use proper slippage in production)
  signer.address,
  Math.floor(Date.now() / 1000) + 300, // 5 minutes deadline
  { value: ethers.parseEther("1.0") }
);

await tx.wait();
```

## Troubleshooting

### Common Issues

1. **"Agent not registered"**
   - Solution: Call `registerAgent(yourAddress, true)` as admin

2. **"Pool does not exist"**
   - Solution: Check if the token pair has liquidity on DragonSwap V2

3. **"Insufficient liquidity"**
   - Solution: Reduce swap amount or try different fee tier

4. **Gas estimation fails**
   - Solution: Increase gas limit or check network congestion

### Pool Verification

Verify pool existence before swapping:

```javascript
// Check all fee tiers
const feeTiers = [500, 3000, 10000];
for (const fee of feeTiers) {
  const [exists, poolAddress, liquidity] = await contract.getPoolInfo(
    tokenA, tokenB, fee
  );
  console.log(`Fee ${fee}: exists=${exists}, liquidity=${liquidity}`);
}
```

## Security Considerations

1. **Agent Registration**: Only register trusted addresses as agents
2. **Fee Recipient**: Use a secure multi-sig wallet for fee collection
3. **Slippage Protection**: Always set appropriate `amountOutMin` values
4. **Deadline**: Use reasonable deadline values (5-10 minutes)

## Monitoring

Monitor contract activity:
- **Fee Collection**: Track USDC balance of fee recipient
- **Pool Utilization**: Monitor which fee tiers are being used
- **Gas Usage**: Track gas efficiency of direct vs multi-hop swaps

## Support

For issues or questions:
1. Check DragonSwap V2 documentation
2. Verify pool liquidity on DragonSwap interface
3. Test on smaller amounts first
4. Review transaction logs for detailed error information 