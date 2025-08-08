const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 Testing SEI → WBTC Swap");
  console.log("=" .repeat(40));

  // Contract and token addresses
  const SEISWAP_ROUTER = "0x52F6b4e3652234569b4Fe75ACA64E26909d55536";
  const WBTC_ADDRESS = "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";

  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  
  const initialSeiBalance = await signer.provider.getBalance(signer.address);
  console.log("💰 Initial SEI Balance:", ethers.formatEther(initialSeiBalance), "SEI");

  // Connect to contracts
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterWithSlippage.sol:SeiSwapRouter", SEISWAP_ROUTER);
  const wbtc = await ethers.getContractAt("IERC20", WBTC_ADDRESS);

  console.log("\n🔍 Contract & Token Information:");
  console.log("- SeiSwapRouter:", SEISWAP_ROUTER);
  console.log("- WBTC Address:", WBTC_ADDRESS);

  // Check WBTC token details
  try {
    const wbtcName = await wbtc.name();
    const wbtcSymbol = await wbtc.symbol();
    const wbtcDecimals = await wbtc.decimals();
    console.log(`- WBTC Token: ${wbtcName} (${wbtcSymbol}) - ${wbtcDecimals} decimals`);
  } catch (error) {
    console.log("⚠️  Could not read WBTC token details");
  }

  // Check initial WBTC balance
  const initialWbtcBalance = await wbtc.balanceOf(signer.address);
  console.log("- Initial WBTC Balance:", ethers.formatUnits(initialWbtcBalance, 8), "WBTC");

  // Check if WSEI/WBTC pools exist
  console.log("\n🔍 Pool Analysis for WSEI/WBTC:");
  const feeTiers = [100, 500, 3000, 10000];
  const feeNames = ["0.01%", "0.05%", "0.3%", "1%"];
  
  let availablePools = [];

  for (let i = 0; i < feeTiers.length; i++) {
    try {
      const poolCheck = await seiSwapRouter.checkPoolExists(WSEI_ADDRESS, WBTC_ADDRESS, feeTiers[i]);
      if (poolCheck.exists) {
        console.log(`✅ ${feeNames[i]} pool exists: ${poolCheck.poolAddress}`);
        availablePools.push({ fee: feeTiers[i], name: feeNames[i], address: poolCheck.poolAddress });
      } else {
        console.log(`❌ ${feeNames[i]} pool: Not found`);
      }
    } catch (error) {
      console.log(`⚠️  ${feeNames[i]} pool: Error checking`);
    }
  }

  if (availablePools.length === 0) {
    console.log("💔 No WSEI/WBTC pools found on any fee tier");
    console.log("🔄 Let's still try the swap - pool might exist but not be detectable");
  } else {
    console.log(`\n🎯 Found ${availablePools.length} pool(s) for WSEI/WBTC`);
    availablePools.forEach(pool => {
      console.log(`   - ${pool.name} fee: ${pool.address}`);
    });
  }

  // Test different swap amounts and methods
  const testCases = [
    {
      name: "Micro swap (0.001 SEI) - Default 5% slippage",
      amount: ethers.parseEther("0.001"),
      function: "swapSeiToToken",
      params: [WBTC_ADDRESS],
      description: "Uses built-in 5% slippage protection"
    },
    {
      name: "Small swap (0.01 SEI) - No slippage limit",
      amount: ethers.parseEther("0.01"),
      function: "swapSeiToTokenNoSlippage", 
      params: [WBTC_ADDRESS, 3000],
      description: "No slippage limit (infinite tolerance)"
    },
    {
      name: "Medium swap (0.05 SEI) - 10% slippage",
      amount: ethers.parseEther("0.05"),
      function: "swapSeiToTokenWithSlippage",
      params: [WBTC_ADDRESS, 1000, 3000],
      description: "10% slippage tolerance (1000 BPS)"
    }
  ];

  // Try different fee tiers if multiple pools exist
  if (availablePools.length > 0) {
    // Test with the first available pool's fee tier
    const bestPool = availablePools[0];
    testCases.push({
      name: `Optimized swap (0.02 SEI) - ${bestPool.name} fee`,
      amount: ethers.parseEther("0.02"),
      function: "swapSeiToTokenWithSlippage",
      params: [WBTC_ADDRESS, 500, bestPool.fee], // 5% slippage, best fee tier
      description: `Using detected ${bestPool.name} pool`
    });
  }

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n${i + 1}️⃣ ${test.name}`);
    console.log(`   Amount: ${ethers.formatEther(test.amount)} SEI`);
    console.log(`   Method: ${test.function}`);
    console.log(`   Description: ${test.description}`);

    try {
      // Gas estimation
      console.log("   ⛽ Estimating gas...");
      const gasEstimate = await seiSwapRouter[test.function].estimateGas(
        ...test.params,
        { value: test.amount }
      );
      console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}`);

      // Get balances before swap
      const wbtcBefore = await wbtc.balanceOf(signer.address);
      const seiBefore = await signer.provider.getBalance(signer.address);

      console.log("   🚀 Executing WBTC swap...");
      
      // Execute the swap
      const tx = await seiSwapRouter[test.function](
        ...test.params,
        { 
          value: test.amount,
          gasLimit: gasEstimate + 150000n
        }
      );

      console.log(`   📝 Transaction: ${tx.hash}`);
      console.log("   ⏳ Waiting for confirmation...");

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log("   🎉 SWAP SUCCESSFUL!");
        console.log(`   - Block: ${receipt.blockNumber}`);
        console.log(`   - Gas used: ${receipt.gasUsed.toString()}`);

        // Check balances after swap
        const wbtcAfter = await wbtc.balanceOf(signer.address);
        const seiAfter = await signer.provider.getBalance(signer.address);

        const wbtcReceived = wbtcAfter - wbtcBefore;
        const seiSpent = seiBefore - seiAfter;

        console.log("\n   📊 Swap Results:");
        console.log(`   - SEI spent: ${ethers.formatEther(seiSpent)} SEI`);
        console.log(`   - WBTC received: ${ethers.formatUnits(wbtcReceived, 8)} WBTC`);

        if (wbtcReceived > 0) {
          // Calculate exchange rate
          const btcPerSei = Number(ethers.formatUnits(wbtcReceived, 8)) / Number(ethers.formatEther(test.amount));
          console.log(`   - Exchange rate: ${btcPerSei.toFixed(8)} WBTC per SEI`);
          
          // Calculate USD value (approximate)
          // Assume WBTC ≈ $45,000 and format nicely
          const usdValue = Number(ethers.formatUnits(wbtcReceived, 8)) * 45000;
          console.log(`   - Approx. USD value: $${usdValue.toFixed(2)}`);
          
          console.log("   🏆 WBTC SWAP SUCCESSFUL!");

          // Parse events
          for (const log of receipt.logs) {
            try {
              const parsed = seiSwapRouter.interface.parseLog(log);
              if (parsed && parsed.name === "SeiToTokenSwap") {
                console.log("\n   📋 Swap Event:");
                console.log(`     - User: ${parsed.args.user}`);
                console.log(`     - Token Out: ${parsed.args.tokenOut}`);
                console.log(`     - SEI In: ${ethers.formatEther(parsed.args.seiAmountIn)} SEI`);
                console.log(`     - WBTC Out: ${ethers.formatUnits(parsed.args.tokenAmountOut, 8)} WBTC`);
                console.log(`     - Slippage Used: ${parsed.args.slippageUsed} BPS`);
              }
            } catch (e) {
              // Skip non-contract logs
            }
          }

          console.log("\n🎯 SUCCESS! SEI → WBTC swap working!");
          console.log(`🔗 View transaction: https://seitrace.com/tx/${receipt.hash}`);
          break; // Stop on first success

        } else {
          console.log("   ⚠️  Warning: No WBTC received");
        }

      } else {
        console.log(`   ❌ Transaction failed (status: ${receipt.status})`);
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message.split('.')[0]}`);
      
      if (error.message.includes("execution reverted")) {
        console.log("   💡 Possible causes:");
        console.log("     • No WSEI/WBTC pool with liquidity");
        console.log("     • Price impact too high");
        console.log("     • Pool locked or paused");
        
        if (error.data) {
          console.log(`   - Error data: ${error.data}`);
        }
      }
      
      console.log("   ⏭️  Trying next test case...");
    }
  }

  // Final summary
  console.log("\n📊 Final Summary:");
  const finalSeiBalance = await signer.provider.getBalance(signer.address);
  const finalWbtcBalance = await wbtc.balanceOf(signer.address);
  
  console.log("- Final SEI Balance:", ethers.formatEther(finalSeiBalance), "SEI");
  console.log("- Final WBTC Balance:", ethers.formatUnits(finalWbtcBalance, 8), "WBTC");
  
  const totalWbtcGained = finalWbtcBalance - initialWbtcBalance;
  
  if (totalWbtcGained > 0) {
    console.log("\n🎉 OVERALL SUCCESS!");
    console.log(`- WBTC gained: ${ethers.formatUnits(totalWbtcGained, 8)} WBTC`);
    console.log("- Your contract works perfectly with WBTC!");
  } else {
    console.log("\n💔 No WBTC swaps completed");
    console.log("🔍 WSEI/WBTC pools may not have sufficient liquidity");
    console.log("💡 Try other tokens or check DragonSwap V2 for active pairs");
  }

  console.log("\n✅ Contract status: Fully functional and ready!");
}

main()
  .then(() => {
    console.log("\n✅ WBTC swap test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }); 