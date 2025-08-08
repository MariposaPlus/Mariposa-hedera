# AgenticRouter Deployment and Testing Guide

## Prerequisites

1. **Environment Setup**: Create a `.env` file in the `smart-contracts` directory with the following variables:

```env
# Private key for deployment (deployer account)
PRIVATE_KEY=your_deployer_private_key_here

# Initial agent private key for testing
INITIAL_AGENT_PRIVATE_KEY=your_agent_private_key_here

# Fee configuration
FEE_RECIPIENT=your_fee_recipient_address_here
FEE_BPS=30

# Optional: Initial agent address to register during deployment
INITIAL_AGENT=your_initial_agent_address_here

# Contract address (set this after deployment for testing)
AGENTIC_ROUTER_ADDRESS=
```

2. **Fund Accounts**: Ensure both deployer and agent accounts have sufficient SEI:
   - Deployer: ~2-5 SEI for deployment gas
   - Agent: ~10 SEI (4 for testing swap + gas fees)

## Step 1: Deploy AgenticRouter

```bash
cd smart-contracts
npm install
npx hardhat run scripts/deploy-AgenticRouter.js --network seiMainnet
```

The script will:
- Deploy the contract with updated mainnet addresses
- Register the initial agent if `INITIAL_AGENT` is set
- Verify the contract on SeiTrace explorer
- Output the contract address

**Important**: Copy the deployed contract address and add it to your `.env` file as `AGENTIC_ROUTER_ADDRESS`.

## Step 2: Test Swap (4 SEI to USDC)

```bash
npx hardhat run scripts/test-swap.js --network seiMainnet
```

This will:
- Check agent registration status
- Register agent if not already registered
- Display balances before swap
- Execute 4 SEI → USDC swap
- Show balances after swap
- Calculate effective exchange rate

## Updated Mainnet Addresses (Sei Pacific-1)

Your deployment script already includes these updated addresses:

```javascript
seiMainnet: {
  dragonSwapRouter: "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428", // DragonSwap V2 Router
  usdc: "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1", // USDC on Sei
  wsei: "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7", // Wrapped SEI
  wbtc: "0x0555e30da8f98308edb960aa94c0db47230d2b9c", // Wrapped BTC
  weth: "0x160345fc359604fc6e70e3c5facbde5f7a9342d8", // Wrapped ETH
}
```

## Verification

After deployment, you can verify your contract on SeiTrace:
- **Mainnet**: https://seitrace.com/pacific-1/address/{your_contract_address}

## Troubleshooting

### Common Issues:

1. **"Agent not registered"**: The script will automatically register the agent
2. **"Insufficient balance"**: Ensure your agent has enough SEI
3. **"Swap failed"**: Check if DragonSwap has enough liquidity for SEI/USDC pair
4. **Gas estimation failed**: The router might not have sufficient liquidity or the path might be incorrect

### Manual Agent Registration:

If you need to register additional agents later:

```bash
npx hardhat console --network seiMainnet
```

```javascript
const AgenticRouter = await ethers.getContractFactory("AgenticRouter");
const router = await AgenticRouter.attach("YOUR_CONTRACT_ADDRESS");
await router.registerAgent("AGENT_ADDRESS", true);
```

## Expected Output

Successful deployment should show:
```
✅ AgenticRouter deployed to: 0x...
✅ Initial agent registered successfully!
✅ Contract verified successfully!
```

Successful swap test should show:
```
✅ Swap completed!
USDC received: ~X.XX
Effective rate: ~X.XX USDC per SEI
🎉 Swap test completed successfully!
```

## Next Steps

1. **Integration**: Use the deployed contract address in your frontend
2. **Agent Management**: Register additional agents as needed
3. **Monitoring**: Monitor swaps and fees through SeiTrace explorer
4. **Fee Management**: Adjust fees using `setFeeBps()` if needed 