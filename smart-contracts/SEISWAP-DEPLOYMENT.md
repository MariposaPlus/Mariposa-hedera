# SeiSwapRouter Deployment Guide

This guide explains how to deploy and test the SeiSwapRouter contract on SEI mainnet.

## Overview

The SeiSwapRouter is a simplified wrapper contract for DragonSwap V2 Router that provides easy-to-use functions for swapping SEI and ERC20 tokens on the SEI network.

## Features

- ✅ **swapSeiToToken**: Swap native SEI for any ERC20 token
- ✅ **swapTokenToSei**: Swap any ERC20 token for native SEI  
- ✅ **swapTokenToToken**: Swap between two ERC20 tokens
- ✅ **swapMultiHop**: Multi-hop swaps using encoded paths
- ✅ **Emergency functions**: Owner-only recovery functions
- ✅ **Gas optimized**: Pre-approved tokens and efficient routing

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Hardhat** development environment
3. **SEI wallet** with sufficient SEI for gas fees
4. **Private key** of the deploying wallet

## Setup

1. **Clone and Install Dependencies**
```bash
cd smart-contracts
npm install
```

2. **Configure Environment**
```bash
# Copy the example environment file
cp config/sei-mainnet.env.example .env

# Edit .env with your actual values
# IMPORTANT: Add your private key and RPC URL
```

3. **Environment Variables**
```env
RPC_URL=https://evm-rpc.sei-apis.com/
PRIVATE_KEY=your_private_key_here
DRAGONSWAP_ROUTER_V2=0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428
DRAGONSWAP_FACTORY_V2=0x179D9a5592Bc77050796F7be28058c51cA575df4
```

## Contract Configuration

The contract is pre-configured with the following addresses on SEI mainnet:

- **DragonSwap Router**: `0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428`
- **DragonSwap Factory**: `0x179D9a5592Bc77050796F7be28058c51cA575df4`
- **WSEI Address**: `0x57eE725BEeB991c70c53f9642f36755EC6eb2139`
- **Default Fee Tier**: `3000` (0.3%)

## Deployment

### Step 1: Compile Contracts
```bash
npx hardhat compile
```

### Step 2: Deploy to SEI Mainnet
```bash
npx hardhat run scripts/deploy-SeiSwapRouter.js --network seiMainnet
```

### Step 3: Verify Deployment
The deployment script will:
- Deploy the SeiSwapRouter contract
- Verify all configuration parameters
- Save deployment info to `deployments/sei-swap-router-deployment.json`
- Display contract address and transaction details

## Testing

### Step 1: Update Test Configuration
Edit `scripts/test-SeiSwapRouter.js` and set the contract address:
```javascript
const TEST_CONFIG = {
  seiSwapRouterAddress: "0x..." // Your deployed contract address
};
```

### Step 2: Run Tests
```bash
npx hardhat run scripts/test-SeiSwapRouter.js --network seiMainnet
```

The test script will:
- Test SEI to Token swaps
- Test Token to SEI swaps  
- Test Token to Token swaps
- Display all transaction results and balances

## Usage Examples

### 1. Swap SEI for USDC
```solidity
// Swap 1 SEI for USDC with 5% slippage tolerance
seiSwapRouter.swapSeiToToken{value: 1 ether}(
    usdcAddress,
    minAmountOut, // Calculate based on current price
    3000 // 0.3% fee tier
);
```

### 2. Swap USDC for SEI
```solidity
// First approve the router
usdc.approve(seiSwapRouterAddress, amount);

// Then swap
seiSwapRouter.swapTokenToSei(
    usdcAddress,
    amount,
    minAmountOut,
    3000
);
```

### 3. Swap USDC for USDT
```solidity
// First approve the router
usdc.approve(seiSwapRouterAddress, amount);

// Then swap
seiSwapRouter.swapTokenToToken(
    usdcAddress,
    usdtAddress,
    amount,
    minAmountOut,
    3000
);
```

## Frontend Integration

### Web3 Integration Example
```javascript
const seiSwapRouter = new ethers.Contract(
  contractAddress, 
  abi, 
  signer
);

// Swap SEI for token
const tx = await seiSwapRouter.swapSeiToToken(
  tokenAddress,
  minAmountOut,
  3000,
  { value: ethers.utils.parseEther("1.0") }
);

await tx.wait();
```

### React Hook Example
```javascript
const useSwap = () => {
  const swapSeiToToken = async (tokenAddress, amount, minOut) => {
    const tx = await seiSwapRouter.swapSeiToToken(
      tokenAddress,
      minOut,
      3000,
      { value: amount }
    );
    return tx.wait();
  };
  
  return { swapSeiToToken };
};
```

## Fee Tiers

DragonSwap V2 supports multiple fee tiers:
- **500**: 0.05% (for stable pairs)
- **3000**: 0.3% (standard)  
- **10000**: 1% (exotic pairs)

## Security Considerations

1. **Slippage Protection**: Always set appropriate `amountOutMinimum`
2. **Deadline Protection**: Built-in 20-minute deadline
3. **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
4. **Owner Functions**: Only owner can call emergency functions
5. **Failed Swap Recovery**: Automatic token return on swap failure

## Gas Optimization

- Pre-approved WSEI to router for gas efficiency
- Efficient routing through DragonSwap V2
- Minimal external calls
- Optimized for common swap patterns

## Error Handling

The contract includes custom errors for better gas efficiency:
- `InsufficientOutput()`: When output is below minimum
- `SwapFailed()`: When DragonSwap call fails
- `InvalidAmount()`: When input amount is zero
- `InvalidToken()`: When token address is invalid
- `DeadlineExceeded()`: When transaction deadline passes

## Monitoring and Analytics

### Events Emitted
- `SeiToTokenSwap(user, tokenOut, seiAmountIn, tokenAmountOut)`
- `TokenToSeiSwap(user, tokenIn, tokenAmountIn, seiAmountOut)`
- `TokenToTokenSwap(user, tokenIn, tokenOut, tokenAmountIn, tokenAmountOut)`

### Tracking Swaps
```javascript
// Listen for swap events
seiSwapRouter.on("SeiToTokenSwap", (user, tokenOut, seiIn, tokenOut) => {
  console.log(`${user} swapped ${seiIn} SEI for ${tokenOut} tokens`);
});
```

## Troubleshooting

### Common Issues

1. **"Too little received" Error**
   - Increase slippage tolerance
   - Check if pool has sufficient liquidity

2. **"Transfer amount exceeds allowance"**
   - Ensure token approval before swap
   - Check approval amount is sufficient

3. **"Pool does not exist"**
   - Verify token addresses
   - Check if pool exists on DragonSwap
   - Try different fee tier

4. **High gas fees**
   - Use appropriate gas limit (300,000 recommended)
   - Consider gas price during deployment

### Getting Help

- Check SEI Discord for network issues
- Verify DragonSwap V2 router status
- Ensure wallet has sufficient SEI for gas

## Next Steps

After successful deployment:

1. **Integrate with Frontend**: Update your dApp with the new contract address
2. **Monitor Usage**: Set up event monitoring and analytics
3. **Add More Features**: Consider adding limit orders or advanced routing
4. **Security Audit**: Consider professional audit for production use

## Contract Verification

The contract can be verified on SeiTrace:
```bash
npx hardhat verify --network seiMainnet <CONTRACT_ADDRESS>
```

## License

This contract is licensed under MIT License. 