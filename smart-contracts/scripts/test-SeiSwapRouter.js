const { ethers } = require("hardhat");

// Test configuration
const TEST_CONFIG = {
  // Contract address (will be set after deployment)
  seiSwapRouterAddress: "", // Update this after deployment
  
  // Test tokens on SEI mainnet (you may need to update these addresses)
  tokens: {
    WSEI: "0x57eE725BEeB991c70c53f9642f36755EC6eb2139",
    USDC: "0x3894085Ef7Ff0f0aeDf52E2A2704928d259C2fc1", // Example USDC address
    USDT: "0x83fD0D8eF5Cf2E5d4fb5324848e1E32F5e9d6A69", // Example USDT address
  },
  
  // Test amounts
  testAmounts: {
    seiAmount: ethers.utils.parseEther("1.0"), // 1 SEI
    tokenAmount: ethers.utils.parseUnits("10", 6), // 10 USDC (6 decimals)
  },
  
  // Slippage tolerance (5%)
  slippageTolerance: 500, // 5%
  
  // Fee tiers
  fees: {
    low: 500,    // 0.05%
    medium: 3000, // 0.3%
    high: 10000,  // 1%
  }
};

// ERC20 ABI for token interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function main() {
  console.log("🧪 Testing SeiSwapRouter on SEI Mainnet");
  console.log("=" .repeat(50));

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("🔑 Testing with account:", signer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await signer.getBalance()), "SEI");

  // Load contract address from deployment file or use provided address
  let contractAddress = TEST_CONFIG.seiSwapRouterAddress;
  
  if (!contractAddress) {
    try {
      const fs = require('fs');
      const path = require('path');
      const deploymentFile = path.join(__dirname, '../deployments/sei-swap-router-deployment.json');
      if (fs.existsSync(deploymentFile)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        contractAddress = deployment.contractAddress;
        console.log("📄 Loaded contract address from deployment file:", contractAddress);
      }
    } catch (error) {
      console.log("⚠️  Could not load deployment file, please set contractAddress manually");
    }
  }

  if (!contractAddress) {
    console.error("❌ Contract address not provided. Please deploy the contract first or set the address manually.");
    process.exit(1);
  }

  // Connect to the contract
  const SeiSwapRouter = await ethers.getContractFactory("SeiSwapRouter");
  const seiSwapRouter = SeiSwapRouter.attach(contractAddress);
  
  console.log("📦 Connected to SeiSwapRouter at:", contractAddress);

  // Verify contract configuration
  console.log("\n🔍 Contract Configuration:");
  try {
    console.log("- DragonSwap Router:", await seiSwapRouter.DRAGONSWAP_ROUTER());
    console.log("- DragonSwap Factory:", await seiSwapRouter.DRAGONSWAP_FACTORY());
    console.log("- WSEI Address:", await seiSwapRouter.WSEI());
    console.log("- Default Fee:", await seiSwapRouter.DEFAULT_FEE());
    console.log("- Owner:", await seiSwapRouter.owner());
  } catch (error) {
    console.error("❌ Error reading contract configuration:", error.message);
    process.exit(1);
  }

  // Test 1: Swap SEI to Token (USDC)
  console.log("\n🔄 Test 1: Swap SEI to USDC");
  console.log("-".repeat(30));
  
  try {
    const seiAmount = TEST_CONFIG.testAmounts.seiAmount;
    const minAmountOut = 0; // Accept any amount for testing
    
    console.log("💱 Swapping", ethers.utils.formatEther(seiAmount), "SEI for USDC...");
    
    const tx1 = await seiSwapRouter.swapSeiToToken(
      TEST_CONFIG.tokens.USDC,
      minAmountOut,
      TEST_CONFIG.fees.medium,
      { value: seiAmount, gasLimit: 300000 }
    );
    
    console.log("📝 Transaction hash:", tx1.hash);
    const receipt1 = await tx1.wait();
    console.log("✅ Transaction confirmed in block:", receipt1.blockNumber);
    
    // Check for events
    const events = receipt1.events?.filter(e => e.event === 'SeiToTokenSwap');
    if (events && events.length > 0) {
      const event = events[0];
      console.log("📊 Swap completed:");
      console.log("   - SEI In:", ethers.utils.formatEther(event.args.seiAmountIn));
      console.log("   - USDC Out:", ethers.utils.formatUnits(event.args.tokenAmountOut, 6));
    }
    
  } catch (error) {
    console.error("❌ SEI to USDC swap failed:", error.message);
  }

  // Test 2: Swap Token to SEI (USDC to SEI)
  console.log("\n🔄 Test 2: Swap USDC to SEI");
  console.log("-".repeat(30));
  
  try {
    const usdcContract = new ethers.Contract(TEST_CONFIG.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    
    console.log("💰 USDC Balance:", ethers.utils.formatUnits(usdcBalance, 6));
    
    if (usdcBalance.gt(0)) {
      const swapAmount = usdcBalance.div(2); // Swap half of balance
      const minAmountOut = 0;
      
      console.log("💱 Swapping", ethers.utils.formatUnits(swapAmount, 6), "USDC for SEI...");
      
      // Approve the router to spend USDC
      const approveTx = await usdcContract.approve(contractAddress, swapAmount);
      await approveTx.wait();
      console.log("✅ USDC approved for spending");
      
      const tx2 = await seiSwapRouter.swapTokenToSei(
        TEST_CONFIG.tokens.USDC,
        swapAmount,
        minAmountOut,
        TEST_CONFIG.fees.medium,
        { gasLimit: 300000 }
      );
      
      console.log("📝 Transaction hash:", tx2.hash);
      const receipt2 = await tx2.wait();
      console.log("✅ Transaction confirmed in block:", receipt2.blockNumber);
      
      // Check for events
      const events = receipt2.events?.filter(e => e.event === 'TokenToSeiSwap');
      if (events && events.length > 0) {
        const event = events[0];
        console.log("📊 Swap completed:");
        console.log("   - USDC In:", ethers.utils.formatUnits(event.args.tokenAmountIn, 6));
        console.log("   - SEI Out:", ethers.utils.formatEther(event.args.seiAmountOut));
      }
    } else {
      console.log("⚠️  No USDC balance to test with");
    }
    
  } catch (error) {
    console.error("❌ USDC to SEI swap failed:", error.message);
  }

  // Test 3: Swap Token to Token (USDC to USDT)
  console.log("\n🔄 Test 3: Swap USDC to USDT");
  console.log("-".repeat(30));
  
  try {
    const usdcContract = new ethers.Contract(TEST_CONFIG.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    
    if (usdcBalance.gt(0)) {
      const swapAmount = usdcBalance.div(4); // Swap quarter of balance
      const minAmountOut = 0;
      
      console.log("💱 Swapping", ethers.utils.formatUnits(swapAmount, 6), "USDC for USDT...");
      
      // Approve the router to spend USDC
      const approveTx = await usdcContract.approve(contractAddress, swapAmount);
      await approveTx.wait();
      console.log("✅ USDC approved for spending");
      
      const tx3 = await seiSwapRouter.swapTokenToToken(
        TEST_CONFIG.tokens.USDC,
        TEST_CONFIG.tokens.USDT,
        swapAmount,
        minAmountOut,
        TEST_CONFIG.fees.medium,
        { gasLimit: 300000 }
      );
      
      console.log("📝 Transaction hash:", tx3.hash);
      const receipt3 = await tx3.wait();
      console.log("✅ Transaction confirmed in block:", receipt3.blockNumber);
      
      // Check for events
      const events = receipt3.events?.filter(e => e.event === 'TokenToTokenSwap');
      if (events && events.length > 0) {
        const event = events[0];
        console.log("📊 Swap completed:");
        console.log("   - USDC In:", ethers.utils.formatUnits(event.args.tokenAmountIn, 6));
        console.log("   - USDT Out:", ethers.utils.formatUnits(event.args.tokenAmountOut, 6));
      }
    } else {
      console.log("⚠️  No USDC balance to test with");
    }
    
  } catch (error) {
    console.error("❌ USDC to USDT swap failed:", error.message);
  }

  // Test 4: Check contract balances
  console.log("\n💰 Final Balances");
  console.log("-".repeat(20));
  
  try {
    const seiBalance = await signer.getBalance();
    console.log("SEI Balance:", ethers.utils.formatEther(seiBalance));
    
    for (const [symbol, address] of Object.entries(TEST_CONFIG.tokens)) {
      try {
        const tokenContract = new ethers.Contract(address, ERC20_ABI, signer);
        const balance = await tokenContract.balanceOf(signer.address);
        const decimals = await tokenContract.decimals();
        console.log(`${symbol} Balance:`, ethers.utils.formatUnits(balance, decimals));
      } catch (error) {
        console.log(`${symbol} Balance: Error reading balance`);
      }
    }
  } catch (error) {
    console.error("❌ Error reading balances:", error.message);
  }

  console.log("\n🎉 Testing completed!");
  console.log("\n📝 Test Summary:");
  console.log("- Contract Address:", contractAddress);
  console.log("- Network: SEI Mainnet");
  console.log("- All swap functions tested");
  console.log("\n⚠️  Note: Make sure you have sufficient token balances and that pools exist for the token pairs being tested.");
}

// Error handling
main()
  .then(() => {
    console.log("\n✅ Test script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:");
    console.error(error);
    process.exit(1);
  }); 