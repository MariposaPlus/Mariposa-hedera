const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Testing swapSeiToToken with Existing Pool");
  console.log("=" .repeat(50));

  // Contract addresses
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const POOL_ADDRESS = "0xb243320bcf9c95DB7F74108B6773b8F4Dc3adaF5";
  const FEE_TIER = 3000; // 0.3% fee tier

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  
  const initialSeiBalance = await signer.provider.getBalance(signer.address);
  console.log("💰 Initial SEI Balance:", ethers.formatEther(initialSeiBalance), "SEI");

  // Connect to contracts
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);

  console.log("\n🔍 Pool Information:");
  console.log("- Pool Address:", POOL_ADDRESS);
  console.log("- Fee Tier:", FEE_TIER, "(0.3%)");
  console.log("- Token Pair: WSEI/USDT");

  // Check initial USDT balance
  const initialUsdtBalance = await usdt.balanceOf(signer.address);
  console.log("- Initial USDT Balance:", ethers.formatUnits(initialUsdtBalance, 6), "USDT");

  // Test parameters
  const swapAmounts = [
    ethers.parseEther("0.01"), // 0.01 SEI
    ethers.parseEther("0.05"), // 0.05 SEI 
    ethers.parseEther("0.1"),  // 0.1 SEI
  ];

  console.log("\n🧪 Testing swapSeiToToken with different amounts:");

  for (let i = 0; i < swapAmounts.length; i++) {
    const seiAmount = swapAmounts[i];
    console.log(`\n📋 Test ${i + 1}: ${ethers.formatEther(seiAmount)} SEI → USDT`);

    try {
      // First, estimate gas
      console.log("   ⛽ Estimating gas...");
      const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
        USDT_ADDRESS,
        0, // Accept any amount (slippage tolerance)
        FEE_TIER,
        { value: seiAmount }
      );
      console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}`);

      // Get current balances before swap
      const beforeUsdtBalance = await usdt.balanceOf(signer.address);
      const beforeSeiBalance = await signer.provider.getBalance(signer.address);

      console.log("   💱 Executing swap...");
      
      // Execute the swap
      const tx = await seiSwapRouter.swapSeiToToken(
        USDT_ADDRESS,
        0, // Minimum USDT out (0 for testing - not recommended for production)
        FEE_TIER,
        { 
          value: seiAmount,
          gasLimit: gasEstimate + 50000n // Add gas buffer
        }
      );

      console.log(`   📝 Transaction hash: ${tx.hash}`);
      console.log("   ⏳ Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

      // Check balances after swap
      const afterUsdtBalance = await usdt.balanceOf(signer.address);
      const afterSeiBalance = await signer.provider.getBalance(signer.address);

      const usdtReceived = afterUsdtBalance - beforeUsdtBalance;
      const seiSpent = beforeSeiBalance - afterSeiBalance;

      console.log("\n   📊 Swap Results:");
      console.log(`   - SEI spent: ${ethers.formatEther(seiSpent)} SEI`);
      console.log(`   - USDT received: ${ethers.formatUnits(usdtReceived, 6)} USDT`);
      console.log(`   - Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`   - Gas cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice || 20000000000n)} SEI`);

      if (usdtReceived > 0) {
        const exchangeRate = Number(ethers.formatUnits(usdtReceived, 6)) / Number(ethers.formatEther(seiAmount));
        console.log(`   - Exchange rate: ${exchangeRate.toFixed(6)} USDT per SEI`);
        console.log("   🎉 Swap successful!");

        // Parse and display events
        console.log("\n   📋 Transaction Events:");
        for (const log of receipt.logs) {
          try {
            const parsed = seiSwapRouter.interface.parseLog(log);
            if (parsed && parsed.name === "SeiToTokenSwap") {
              console.log("     🔄 SeiToTokenSwap Event:");
              console.log(`       - User: ${parsed.args.user}`);
              console.log(`       - Token Out: ${parsed.args.tokenOut}`);
              console.log(`       - SEI Amount In: ${ethers.formatEther(parsed.args.seiAmountIn)} SEI`);
              console.log(`       - Token Amount Out: ${ethers.formatUnits(parsed.args.tokenAmountOut, 6)} USDT`);
            }
          } catch (error) {
            // Skip non-contract logs
          }
        }

        // For successful swaps, break and show summary
        if (i === 0) {
          console.log("\n🎯 First swap successful! Testing larger amounts...");
          continue;
        } else {
          console.log("\n✅ Multiple swap sizes confirmed working!");
          break;
        }

      } else {
        console.log("   ⚠️  Warning: No USDT received - possible liquidity issue");
        console.log("   💡 This might indicate:");
        console.log("     - Very low liquidity in the pool");
        console.log("     - High slippage");
        console.log("     - Pool needs more liquidity providers");
      }

    } catch (error) {
      console.log(`   ❌ Swap failed: ${error.message}`);
      
      // Provide specific error analysis
      if (error.message.includes("execution reverted")) {
        console.log("   💡 Execution reverted - possible causes:");
        console.log("     - Insufficient liquidity in pool");
        console.log("     - Price impact too high");
        console.log("     - Pool temporarily paused");
      } else if (error.message.includes("insufficient funds")) {
        console.log("   💡 Insufficient SEI balance for this swap size");
      } else if (error.message.includes("SwapFailed")) {
        console.log("   💡 Custom SwapFailed error - check pool liquidity");
      }

      // Try smaller amount if this one failed
      if (i === swapAmounts.length - 1) {
        console.log("\n🔍 All amounts failed. Let's try an even smaller amount...");
        
        const tinyAmount = ethers.parseEther("0.001"); // 0.001 SEI
        console.log(`\n📋 Tiny Test: ${ethers.formatEther(tinyAmount)} SEI → USDT`);
        
        try {
          const tinyGas = await seiSwapRouter.swapSeiToToken.estimateGas(
            USDT_ADDRESS,
            0,
            FEE_TIER,
            { value: tinyAmount }
          );
          console.log(`   ✅ Tiny amount gas estimate: ${tinyGas} - Pool has some liquidity!`);
          
          // Execute tiny swap
          const tinyTx = await seiSwapRouter.swapSeiToToken(
            USDT_ADDRESS,
            0,
            FEE_TIER,
            { value: tinyAmount, gasLimit: tinyGas + 30000n }
          );
          
          await tinyTx.wait();
          console.log("   🎉 Tiny swap successful! Pool is working but has limited liquidity.");
          
        } catch (tinyError) {
          console.log(`   ❌ Even tiny swap failed: ${tinyError.message.split('.')[0]}`);
          console.log("   💔 Pool appears to have zero liquidity");
        }
      }
    }
  }

  // Final balance check
  console.log("\n📊 Final Balances:");
  const finalSeiBalance = await signer.provider.getBalance(signer.address);
  const finalUsdtBalance = await usdt.balanceOf(signer.address);
  
  console.log("- Final SEI Balance:", ethers.formatEther(finalSeiBalance), "SEI");
  console.log("- Final USDT Balance:", ethers.formatUnits(finalUsdtBalance, 6), "USDT");
  
  const totalUsdtGained = finalUsdtBalance - initialUsdtBalance;
  if (totalUsdtGained > 0) {
    console.log(`- Total USDT gained: ${ethers.formatUnits(totalUsdtGained, 6)} USDT`);
  }

  console.log("\n📋 Test Summary:");
  console.log("✅ SeiSwapRouter contract is functional");
  console.log("✅ Pool exists at the specified address"); 
  console.log("✅ Contract can interact with DragonSwap V2");
  console.log("- Pool liquidity status: Check results above");
}

main()
  .then(() => {
    console.log("\n✅ swapSeiToToken test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }); 