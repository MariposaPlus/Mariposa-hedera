const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Enhanced SeiSwapRouter Test - Pool Discovery & Swap");
  console.log("=" .repeat(60));

  // Contract addresses
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  // Connect to the enhanced contract
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);

  console.log("\n🔍 Contract Information:");
  console.log("- SeiSwapRouter:", SEISWAP_ROUTER);
  console.log("- WSEI:", await seiSwapRouter.WSEI());
  console.log("- DragonSwap Factory:", await seiSwapRouter.DRAGONSWAP_FACTORY());

  // Check fee tier constants
  console.log("\n📊 Supported Fee Tiers:");
  try {
    console.log("- FEE_LOWEST:", await seiSwapRouter.FEE_LOWEST(), "(0.01%)");
    console.log("- FEE_LOW:", await seiSwapRouter.FEE_LOW(), "(0.05%)");
    console.log("- FEE_MEDIUM:", await seiSwapRouter.FEE_MEDIUM(), "(0.3%)");
    console.log("- FEE_HIGH:", await seiSwapRouter.FEE_HIGH(), "(1%)");
  } catch (error) {
    console.log("⚠️  New fee constants not available (contract needs redeployment)");
  }

  console.log("\n🔍 Checking Pool Availability for WSEI/USDT...");

  // Test all fee tiers manually first
  const feeTiers = [100, 500, 3000, 10000];
  const feeNames = ["0.01%", "0.05%", "0.3%", "1%"];

  for (let i = 0; i < feeTiers.length; i++) {
    try {
      const result = await seiSwapRouter.checkPoolExists(WSEI_ADDRESS, USDT_ADDRESS, feeTiers[i]);
      if (result.exists) {
        console.log(`✅ ${feeNames[i]} fee tier: Pool exists at ${result.poolAddress}`);
      } else {
        console.log(`❌ ${feeNames[i]} fee tier: No pool`);
      }
    } catch (error) {
      console.log(`⚠️  ${feeNames[i]} fee tier: Error checking - ${error.message.split('.')[0]}`);
    }
  }

  // Try to find the best fee tier
  console.log("\n🎯 Finding Best Available Fee Tier...");
  try {
    const bestResult = await seiSwapRouter.findBestFee(WSEI_ADDRESS, USDT_ADDRESS);
    if (bestResult.bestFee > 0) {
      console.log(`✅ Best fee tier found: ${bestResult.bestFee} (${bestResult.bestFee/10000}%)`);
      console.log(`   Pool address: ${bestResult.poolAddress}`);
      
      console.log("\n🚀 Testing Automatic Swap...");
      
      // Test the automatic swap function
      const seiAmount = ethers.parseEther("0.05");
      const minOut = 0;

      try {
        // Get initial USDT balance
        const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
        const initialBalance = await usdt.balanceOf(signer.address);
        
        console.log("- SEI Amount:", ethers.formatEther(seiAmount));
        console.log("- Initial USDT:", ethers.formatUnits(initialBalance, 6));
        
        // Execute auto swap
        console.log("- Executing swapSeiToTokenAuto...");
        const tx = await seiSwapRouter.swapSeiToTokenAuto(
          USDT_ADDRESS,
          minOut,
          { value: seiAmount }
        );

        console.log("📝 Transaction:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");

        // Check results
        const finalBalance = await usdt.balanceOf(signer.address);
        const received = finalBalance - initialBalance;

        console.log("\n📊 Swap Results:");
        console.log("- USDT Received:", ethers.formatUnits(received, 6));
        console.log("- Gas Used:", receipt.gasUsed.toString());

        if (received > 0) {
          const rate = Number(ethers.formatUnits(received, 6)) / Number(ethers.formatEther(seiAmount));
          console.log("- Exchange Rate:", rate.toFixed(4), "USDT per SEI");
          console.log("🎉 Auto swap successful!");
        } else {
          console.log("⚠️  No USDT received");
        }

      } catch (swapError) {
        console.log("❌ Auto swap failed:", swapError.message);
      }

    } else {
      console.log("❌ No pools available for WSEI/USDT");
      
      console.log("\n🔍 Getting all available pools...");
      try {
        const allPools = await seiSwapRouter.getAvailablePools(WSEI_ADDRESS, USDT_ADDRESS);
        if (allPools.availableFees.length === 0) {
          console.log("❌ No pools found for this pair");
          
          console.log("\n💡 Troubleshooting:");
          console.log("1. Check if WSEI/USDT pools exist on DragonSwap");
          console.log("2. Verify the USDT address is correct");
          console.log("3. Try with a different token pair");
          
          console.log("\n🧪 Let's test with a manual fee tier...");
          
          // Try manual swap with different fee tiers
          for (const fee of feeTiers) {
            try {
              console.log(`\n   Testing ${fee/10000}% fee manually...`);
              const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
                USDT_ADDRESS,
                0,
                fee,
                { value: ethers.parseEther("0.01") }
              );
              console.log(`   ✅ ${fee/10000}% fee: Gas estimate ${gasEstimate}`);
              
              // If gas estimation works, the pool exists
              break;
              
            } catch (testError) {
              console.log(`   ❌ ${fee/10000}% fee: ${testError.message.includes('execution reverted') ? 'No pool/liquidity' : 'Error'}`);
            }
          }
          
        } else {
          console.log("✅ Available pools found:");
          for (let i = 0; i < allPools.availableFees.length; i++) {
            console.log(`   - ${allPools.availableFees[i]/10000}% fee: ${allPools.poolAddresses[i]}`);
          }
        }
      } catch (error) {
        console.log("❌ Error getting available pools:", error.message);
      }
    }

  } catch (error) {
    console.log("❌ Error finding best fee:", error.message);
    console.log("\n⚠️  This suggests the contract might need to be redeployed with the enhanced functions");
  }

  console.log("\n📋 Summary:");
  console.log("- If no pools are found, WSEI/USDT pair doesn't exist on DragonSwap V2");
  console.log("- Try testing with popular pairs like WSEI/USDC");
  console.log("- Check DragonSwap V2 interface for available trading pairs");
  console.log("- Consider creating liquidity pools if needed");
}

main()
  .then(() => {
    console.log("\n✅ Enhanced test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Enhanced test failed:");
    console.error(error);
    process.exit(1);
  }); 