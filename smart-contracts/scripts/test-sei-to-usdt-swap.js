const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing SeiSwapRouter: SEI → USDT Swap");
  console.log("=" .repeat(50));

  // Contract addresses
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5"; // Updated correct address
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Testing with account:", signer.address);
  console.log("💰 Account balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  // Connect to the deployed contract
  console.log("\n🔗 Connecting to SeiSwapRouter...");
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);
  
  // Verify contract configuration
  console.log("\n🔍 Contract Configuration:");
  console.log("- Contract Address:", SEISWAP_ROUTER);
  console.log("- WSEI Address:", await seiSwapRouter.WSEI());
  console.log("- DragonSwap Router:", await seiSwapRouter.DRAGONSWAP_ROUTER());
  console.log("- Default Fee:", await seiSwapRouter.DEFAULT_FEE());
  console.log("- Contract Owner:", await seiSwapRouter.owner());

  // Check USDT contract
  console.log("\n🔍 Verifying USDT contract...");
  const usdtCode = await signer.provider.getCode(USDT_ADDRESS);
  if (usdtCode === "0x") {
    console.log("❌ USDT contract not found at", USDT_ADDRESS);
    return;
  } else {
    console.log("✅ USDT contract verified at", USDT_ADDRESS);
    
    // Try to get USDT details
    try {
      const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
      const name = await usdt.name();
      const symbol = await usdt.symbol();
      const decimals = await usdt.decimals();
      console.log(`   📄 Token: ${name} (${symbol}) - ${decimals} decimals`);
    } catch (error) {
      console.log("   ⚠️  Could not read USDT details:", error.message);
    }
  }

  // Test parameters
  const seiAmount = ethers.parseEther("0.1"); // 0.1 SEI for testing
  const minUsdtOut = 0; // Accept any amount for testing (not recommended in production)
  const fee = 3000; // 0.3% fee

  console.log("\n🧪 Swap Parameters:");
  console.log("- SEI Amount:", ethers.formatEther(seiAmount), "SEI");
  console.log("- Target Token:", USDT_ADDRESS, "(USDT)");
  console.log("- Min USDT Out:", minUsdtOut, "USDT");
  console.log("- Pool Fee:", fee, "(0.3%)");

  // Check current USDT balance
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
  const initialUsdtBalance = await usdt.balanceOf(signer.address);
  console.log("- Initial USDT Balance:", ethers.formatUnits(initialUsdtBalance, 6), "USDT");

  console.log("\n🚀 Executing SEI → USDT swap...");
  
  try {
    // Estimate gas first
    const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
      USDT_ADDRESS,
      minUsdtOut,
      fee,
      { value: seiAmount }
    );
    console.log("⛽ Estimated gas:", gasEstimate.toString());

    // Execute the swap
    const tx = await seiSwapRouter.swapSeiToToken(
      USDT_ADDRESS,
      minUsdtOut,
      fee,
      { 
        value: seiAmount,
        gasLimit: gasEstimate + 50000n // Add buffer
      }
    );

    console.log("📝 Transaction submitted:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());

    // Check new balances
    const finalUsdtBalance = await usdt.balanceOf(signer.address);
    const finalSeiBalance = await signer.provider.getBalance(signer.address);
    
    const usdtReceived = finalUsdtBalance - initialUsdtBalance;
    
    console.log("\n📊 Swap Results:");
    console.log("- SEI Sent:", ethers.formatEther(seiAmount), "SEI");
    console.log("- USDT Received:", ethers.formatUnits(usdtReceived, 6), "USDT");
    console.log("- Final SEI Balance:", ethers.formatEther(finalSeiBalance), "SEI");
    console.log("- Final USDT Balance:", ethers.formatUnits(finalUsdtBalance, 6), "USDT");

    if (usdtReceived > 0) {
      console.log("🎉 Swap successful!");
      
      // Calculate approximate exchange rate
      const rate = (Number(ethers.formatUnits(usdtReceived, 6)) / Number(ethers.formatEther(seiAmount)));
      console.log("📈 Exchange Rate: ~", rate.toFixed(4), "USDT per SEI");
    } else {
      console.log("⚠️  No USDT received - check pool liquidity or fee settings");
    }

    // Parse events
    console.log("\n📋 Transaction Events:");
    for (const log of receipt.logs) {
      try {
        const parsed = seiSwapRouter.interface.parseLog(log);
        if (parsed.name === "SeiToTokenSwap") {
          console.log("   🔄 SeiToTokenSwap Event:");
          console.log("     - User:", parsed.args.user);
          console.log("     - Token Out:", parsed.args.tokenOut);
          console.log("     - SEI In:", ethers.formatEther(parsed.args.seiAmountIn), "SEI");
          console.log("     - Token Out:", ethers.formatUnits(parsed.args.tokenAmountOut, 6), "USDT");
        }
      } catch (error) {
        // Skip non-contract logs
      }
    }

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    
    if (error.message.includes("insufficient liquidity")) {
      console.log("\n💡 Possible solutions:");
      console.log("1. Try a different fee tier (500, 3000, 10000)");
      console.log("2. Check if SEI/USDT pool exists on DragonSwap");
      console.log("3. Try a smaller amount");
    } else if (error.message.includes("SwapFailed")) {
      console.log("\n💡 SwapFailed error - possible causes:");
      console.log("1. No liquidity in the pool");
      console.log("2. Price slippage too high");
      console.log("3. Pool doesn't exist for this fee tier");
    } else if (error.message.includes("InvalidToken")) {
      console.log("\n💡 InvalidToken error - check USDT address");
    }
    
    // Try to diagnose the issue
    console.log("\n🔍 Diagnostic Information:");
    console.log("- Make sure SEI/USDT pool exists on DragonSwap V2");
    console.log("- Verify the USDT address is correct for SEI mainnet");
    console.log("- Check if there's sufficient liquidity in the pool");
    
    // Additional fee tier testing
    console.log("\n🧪 Let's try different fee tiers...");
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    
    for (const testFee of feeTiers) {
      try {
        console.log(`\n   Testing ${testFee/10000}% fee tier...`);
        const testGas = await seiSwapRouter.swapSeiToToken.estimateGas(
          USDT_ADDRESS,
          minUsdtOut,
          testFee,
          { value: ethers.parseEther("0.01") } // Small test amount
        );
        console.log(`   ✅ ${testFee/10000}% fee tier: Pool exists (gas: ${testGas})`);
        break; // If one works, we found a valid pool
      } catch (testError) {
        console.log(`   ❌ ${testFee/10000}% fee tier: ${testError.message.split('.')[0]}`);
      }
    }
  }
}

main()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }); 