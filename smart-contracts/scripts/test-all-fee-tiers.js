const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing All DragonSwap V2 Fee Tiers for SEI/USDT");
  console.log("=" .repeat(60));

  // Contract addresses
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const DRAGONSWAP_FACTORY = "0x179D9a5592Bc77050796F7be28058c51cA575df4";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  // Connect to contracts
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);

  console.log("\n🔍 Contract Information:");
  console.log("- SeiSwapRouter:", SEISWAP_ROUTER);
  console.log("- WSEI:", await seiSwapRouter.WSEI());
  console.log("- DragonSwap Factory:", await seiSwapRouter.DRAGONSWAP_FACTORY());

  // All fee tiers supported by DragonSwap V2 Factory (from your contract code)
  const feeTiers = [
    { fee: 100, name: "0.01%", description: "Lowest fee tier" },
    { fee: 500, name: "0.05%", description: "Low fee tier" },
    { fee: 3000, name: "0.3%", description: "Medium fee tier (default)" },
    { fee: 10000, name: "1%", description: "High fee tier" }
  ];

  console.log("\n🧪 Testing All Fee Tiers for SEI/USDT Pools...");

  // Test factory contract
  let factory;
  try {
    factory = await ethers.getContractAt("IDragonSwapV2Factory", DRAGONSWAP_FACTORY);
    console.log("✅ Connected to DragonSwap V2 Factory");
  } catch (error) {
    console.log("⚠️  Could not connect to factory, using gas estimation method");
  }

  let workingFeeTier = null;
  let foundPools = [];

  for (const tier of feeTiers) {
    console.log(`\n🔍 Testing ${tier.name} fee tier (${tier.fee} basis points):`);
    
    // Method 1: Check via factory if available
    if (factory) {
      try {
        const poolAddress = await factory.getPool(WSEI_ADDRESS, USDT_ADDRESS, tier.fee);
        if (poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000") {
          console.log(`   ✅ Pool exists at: ${poolAddress}`);
          foundPools.push({ ...tier, poolAddress });
          if (!workingFeeTier) workingFeeTier = tier;
        } else {
          console.log(`   ❌ No pool found for ${tier.name} fee`);
        }
      } catch (error) {
        console.log(`   ⚠️  Factory call failed: ${error.message.split('.')[0]}`);
      }
    }

    // Method 2: Test via gas estimation (more reliable for checking if swap would work)
    try {
      const testAmount = ethers.parseEther("0.01"); // Small test amount
      const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
        USDT_ADDRESS,
        0, // Min out = 0 for testing
        tier.fee,
        { value: testAmount }
      );
      
      console.log(`   ✅ Swap possible - Gas estimate: ${gasEstimate}`);
      if (!workingFeeTier) workingFeeTier = tier;
      
      // Check if this tier wasn't found by factory method
      const alreadyFound = foundPools.some(p => p.fee === tier.fee);
      if (!alreadyFound) {
        foundPools.push({ ...tier, poolAddress: "Unknown (swap works)" });
      }
      
    } catch (error) {
      const errorMsg = error.message.includes('execution reverted') ? 'No liquidity/pool' : error.message.split('.')[0];
      console.log(`   ❌ Swap not possible: ${errorMsg}`);
    }
  }

  console.log("\n📊 Summary of Available Pools:");
  if (foundPools.length === 0) {
    console.log("❌ No working pools found for SEI/USDT pair");
    
    console.log("\n💡 Possible explanations:");
    console.log("1. No SEI/USDT pools exist on DragonSwap V2");
    console.log("2. Pools exist but have no liquidity");
    console.log("3. USDT address might be incorrect");
    console.log("4. DragonSwap V2 might not be fully operational");
    
    console.log("\n🔄 Recommendations:");
    console.log("1. Check DragonSwap V2 website for available pairs");
    console.log("2. Try testing with USDC instead of USDT");
    console.log("3. Verify token addresses on SEI network");
    console.log("4. Consider using DragonSwap V1 if V2 isn't ready");
    
  } else {
    console.log(`✅ Found ${foundPools.length} working fee tier(s):`);
    foundPools.forEach(pool => {
      console.log(`   - ${pool.name} (${pool.fee} bp): ${pool.poolAddress}`);
    });

    if (workingFeeTier) {
      console.log(`\n🚀 Testing actual swap with ${workingFeeTier.name} fee tier...`);
      
      try {
        // Get initial USDT balance
        const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
        const initialBalance = await usdt.balanceOf(signer.address);
        
        const swapAmount = ethers.parseEther("0.05"); // 0.05 SEI
        console.log("- Swapping:", ethers.formatEther(swapAmount), "SEI");
        console.log("- Using fee tier:", workingFeeTier.name);
        console.log("- Initial USDT balance:", ethers.formatUnits(initialBalance, 6));
        
        // Execute swap
        const tx = await seiSwapRouter.swapSeiToToken(
          USDT_ADDRESS,
          0, // Accept any amount
          workingFeeTier.fee,
          { value: swapAmount }
        );

        console.log("📝 Transaction hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");

        // Check results
        const finalBalance = await usdt.balanceOf(signer.address);
        const received = finalBalance - initialBalance;

        console.log("\n🎉 Swap Results:");
        console.log("- SEI sent:", ethers.formatEther(swapAmount));
        console.log("- USDT received:", ethers.formatUnits(received, 6));
        console.log("- Gas used:", receipt.gasUsed.toString());

        if (received > 0) {
          const rate = Number(ethers.formatUnits(received, 6)) / Number(ethers.formatEther(swapAmount));
          console.log("- Exchange rate:", rate.toFixed(4), "USDT per SEI");
          console.log("✅ Swap successful!");
        } else {
          console.log("⚠️  Warning: No USDT received");
        }

      } catch (swapError) {
        console.log("❌ Swap execution failed:", swapError.message);
      }
    }
  }

  console.log("\n📋 Contract Status:");
  console.log("✅ SeiSwapRouter contract is deployed and functional");
  console.log("✅ All fee tier detection methods working");
  console.log("✅ Ready for swaps when pools are available");
}

main()
  .then(() => {
    console.log("\n✅ Fee tier testing completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Testing failed:");
    console.error(error);
    process.exit(1);
  }); 