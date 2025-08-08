const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Updated SeiSwapRouter: SEI → USDT Swap");
  console.log("=" .repeat(60));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  // Use the deployed contract address
  const SEISWAP_ROUTER = "0xadECD4127c383761FD75A82E657Fda7d52AC8e38";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Testing with account:", signer.address);
  
  const balance = await signer.provider.getBalance(signer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "SEI");

  if (balance < ethers.parseEther("0.2")) {
    console.log("⚠️  Warning: Low balance. Consider adding more SEI for testing.");
  }

  // Connect to the deployed contract
  console.log("\n🔗 Connecting to Updated SeiSwapRouter...");
  console.log("   Contract Address:", SEISWAP_ROUTER);
  
  let seiSwapRouter;
  try {
    seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", SEISWAP_ROUTER);
    console.log("✅ Successfully connected to contract");
  } catch (error) {
    console.log("❌ Failed to connect to contract:", error.message);
    return;
  }
  
  // Verify contract configuration
  console.log("\n🔍 Contract Configuration:");
  try {
    console.log("- WSEI Address:", await seiSwapRouter.WSEI());
    console.log("- DragonSwap Router:", await seiSwapRouter.DRAGONSWAP_ROUTER());
    console.log("- DragonSwap Factory:", await seiSwapRouter.DRAGONSWAP_FACTORY());
    console.log("- Default Fee:", await seiSwapRouter.DEFAULT_FEE());
    console.log("- Contract Owner:", await seiSwapRouter.owner());
  } catch (error) {
    console.log("❌ Error reading contract configuration:", error.message);
    return;
  }

  // Test factory functions
  console.log("\n🏭 Testing Factory Functions:");
  
  try {
    // Get available fee tiers
    const feeTiers = await seiSwapRouter.getFeeTiers();
    console.log("- Available fee tiers:", feeTiers.map(f => f.toString()).join(", "));
    
    // Find minimum fee for WSEI/USDT
    console.log("\n🔍 Finding pools for WSEI/USDT...");
    const minFee = await seiSwapRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
    console.log("- Min fee for WSEI/USDT:", minFee.toString(), "basis points");
    
    if (minFee > 0) {
      const poolAddress = await seiSwapRouter.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
      console.log("- Pool address:", poolAddress);
      
      // Get all pools
      const [pools, fees] = await seiSwapRouter.getAllPools(WSEI_ADDRESS, USDT_ADDRESS);
      console.log("\n📊 All WSEI/USDT Pools:");
      for (let i = 0; i < pools.length; i++) {
        if (pools[i] !== ethers.ZeroAddress) {
          console.log(`   Fee ${fees[i]} basis points: ${pools[i]}`);
        } else {
          console.log(`   Fee ${fees[i]} basis points: No pool`);
        }
      }
    } else {
      console.log("❌ No pool found for WSEI/USDT pair");
      
      // Try to find pools individually for each fee tier
      console.log("\n🔍 Checking individual fee tiers...");
      for (const fee of feeTiers) {
        const pool = await seiSwapRouter.findPool(WSEI_ADDRESS, USDT_ADDRESS, fee);
        console.log(`   Fee ${fee}: ${pool === ethers.ZeroAddress ? 'No pool' : pool}`);
      }
      
      console.log("\n⚠️  Cannot proceed with swap - no liquidity pool available");
      return;
    }
    
  } catch (error) {
    console.log("❌ Error testing factory functions:", error.message);
    return;
  }

  // Check USDT contract
  console.log("\n🔍 Verifying USDT contract...");
  try {
    const usdtCode = await signer.provider.getCode(USDT_ADDRESS);
    if (usdtCode === "0x") {
      console.log("❌ USDT contract not found at", USDT_ADDRESS);
      return;
    }
    
    console.log("✅ USDT contract verified at", USDT_ADDRESS);
    
    // Try to get USDT details, but continue if it fails
    try {
      const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
      const name = await usdt.name();
      const symbol = await usdt.symbol();
      const decimals = await usdt.decimals();
      console.log(`   Token details: ${name} (${symbol}) - ${decimals} decimals`);
      
      // Check current USDT balance
      const initialUsdtBalance = await usdt.balanceOf(signer.address);
      console.log("- Initial USDT Balance:", ethers.formatUnits(initialUsdtBalance, decimals), symbol);
    } catch (detailError) {
      console.log("   ⚠️  Could not read token details (this is OK, will proceed)");
      
      // Try to get balance with standard decimals assumption
      try {
        const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
        const initialUsdtBalance = await usdt.balanceOf(signer.address);
        console.log("- Initial USDT Balance:", ethers.formatUnits(initialUsdtBalance, 6), "USDT (assumed 6 decimals)");
      } catch (balanceError) {
        console.log("   ⚠️  Could not read balance either");
      }
    }
    
  } catch (error) {
    console.log("❌ Error verifying USDT contract:", error.message);
    return;
  }

  // Test parameters
  const seiAmount = ethers.parseEther("0.05"); // 0.05 SEI for testing (smaller amount)
  const minUsdtOut = 0; // Accept any amount for testing

  console.log("\n🧪 Swap Test 1: Automatic Fee Detection");
  console.log("- SEI Amount:", ethers.formatEther(seiAmount), "SEI");
  console.log("- Target Token:", USDT_ADDRESS, "(USDT)");
  console.log("- Min USDT Out:", minUsdtOut, "USDT (any amount)");

  console.log("\n🚀 Executing SEI → USDT swap (auto fee detection)...");
  
  try {
    // Test automatic fee detection swap
    const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
      USDT_ADDRESS,
      minUsdtOut,
      { value: seiAmount }
    );
    console.log("⛽ Estimated gas:", gasEstimate.toString());

    const balanceBefore = await signer.provider.getBalance(signer.address);
    
    const tx = await seiSwapRouter.swapSeiToToken(
      USDT_ADDRESS,
      minUsdtOut,
      { 
        value: seiAmount,
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      }
    );

    console.log("📝 Transaction submitted:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());
    console.log("   Status:", receipt.status === 1 ? "Success" : "Failed");

    // Check balances after swap
    const balanceAfter = await signer.provider.getBalance(signer.address);
    const seiUsed = balanceBefore - balanceAfter;
    console.log("   SEI Used (including gas):", ethers.formatEther(seiUsed), "SEI");

    // Check USDT balance
    const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
    const finalUsdtBalance = await usdt.balanceOf(signer.address);
    const usdtReceived = finalUsdtBalance;
    console.log("   USDT Received:", ethers.formatUnits(usdtReceived, 6), "USDT");

    // Parse events to get swap details
    const eventFilter = seiSwapRouter.filters.SeiToTokenSwap();
    const events = await seiSwapRouter.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);
    
    if (events.length > 0) {
      const event = events[0];
      console.log("\n📊 Swap Event Details:");
      console.log("   User:", event.args.user);
      console.log("   Token Out:", event.args.tokenOut);
      console.log("   SEI Amount In:", ethers.formatEther(event.args.seiAmountIn), "SEI");
      console.log("   Token Amount Out:", ethers.formatUnits(event.args.tokenAmountOut, 6), "USDT");
      console.log("   Fee Used:", event.args.fee.toString(), "basis points");
    }

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    
    if (error.message.includes("NoPoolExists")) {
      console.log("   Reason: No liquidity pool exists for this pair");
    } else if (error.message.includes("InsufficientOutput")) {
      console.log("   Reason: Insufficient output amount");
    } else if (error.message.includes("SwapFailed")) {
      console.log("   Reason: Swap execution failed");
    }
    
    return;
  }

  // Test 2: Manual fee specification
  console.log("\n🧪 Swap Test 2: Manual Fee Selection");
  
  try {
    const minFee = await seiSwapRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
    if (minFee > 0) {
      const seiAmount2 = ethers.parseEther("0.03"); // Smaller amount for second test
      
      console.log("- SEI Amount:", ethers.formatEther(seiAmount2), "SEI");
      console.log("- Fee Tier:", minFee.toString(), "basis points");
      
      const gasEstimate2 = await seiSwapRouter.swapSeiToTokenWithFee.estimateGas(
        USDT_ADDRESS,
        minUsdtOut,
        minFee,
        { value: seiAmount2 }
      );
      
      const tx2 = await seiSwapRouter.swapSeiToTokenWithFee(
        USDT_ADDRESS,
        minUsdtOut,
        minFee,
        { 
          value: seiAmount2,
          gasLimit: gasEstimate2 * 120n / 100n
        }
      );
      
      console.log("📝 Transaction submitted:", tx2.hash);
      const receipt2 = await tx2.wait();
      console.log("✅ Manual fee swap successful!");
      console.log("   Gas Used:", receipt2.gasUsed.toString());
      
    } else {
      console.log("⏭️  Skipping manual fee test - no pools available");
    }
    
  } catch (error) {
    console.log("❌ Manual fee swap failed:", error.message);
  }

  console.log("\n🎉 Testing completed!");
  console.log("=" .repeat(60));
}

main()
  .then(() => {
    console.log("\n✅ Test script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 