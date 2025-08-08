import { DragonSwap } from "./DragonSwap";
import { ExactInputSingleParams } from "./types";
import { parseEther, formatEther, formatUnits, parseUnits } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🧪 DragonSwap TypeScript SEI → USDT Test");
  console.log("=" .repeat(50));

  // Check environment variables
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not found in environment variables");
    process.exit(1);
  }

  // Token addresses on SEI mainnet
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";

  try {
    // Initialize DragonSwap
    console.log("🔗 Initializing DragonSwap...");
    const dragonSwap = new DragonSwap(privateKey);
    
    console.log("📍 Account:", dragonSwap.getAddress());
    
    // Check balances
    const seiBalance = await dragonSwap.getBalance();
    console.log("💰 SEI Balance:", formatEther(seiBalance), "SEI");
    
    const wseiBalance = await dragonSwap.getTokenBalance(WSEI_ADDRESS);
    console.log("💰 WSEI Balance:", formatEther(wseiBalance), "WSEI");
    
    const usdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);
    console.log("💰 USDT Balance:", formatUnits(usdtBalance, 6), "USDT");

    // Test 1: Find minimum fee for WSEI/USDT
    console.log("\n🔍 Finding minimum fee for WSEI/USDT...");
    const minFee = await dragonSwap.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
    
    if (!minFee) {
      console.log("❌ No pool found for WSEI/USDT pair");
      
      // Check individual pools
      console.log("\n🔍 Checking individual fee tiers...");
      const fees = [100, 500, 3000, 10000];
      for (const fee of fees) {
        const pool = await dragonSwap.findPool(WSEI_ADDRESS, USDT_ADDRESS, fee);
        console.log(`Fee ${fee} basis points: ${pool}`);
      }
      return;
    }
    
    console.log(`✅ Minimum fee found: ${minFee} basis points`);
    
    // Get pool address
    const poolAddress = await dragonSwap.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
    console.log(`📍 Pool address: ${poolAddress}`);

    // Test 2: Prepare swap parameters
    const swapAmount = parseEther("0.05"); // 0.05 WSEI
    console.log(`\n🚀 Preparing to swap ${formatEther(swapAmount)} WSEI → USDT`);

    // Check if we have enough WSEI
    if (wseiBalance < swapAmount) {
      console.log(`⚠️  Insufficient WSEI balance. Have: ${formatEther(wseiBalance)}, Need: ${formatEther(swapAmount)}`);
      console.log("Note: You need to wrap SEI to WSEI first for this test");
      return;
    }

    // Prepare swap parameters
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now
    const swapParams: ExactInputSingleParams = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: minFee,
      recipient: dragonSwap.getAddress(),
      deadline: deadline,
      amountIn: swapAmount,
      amountOutMinimum: 0n, // Accept any amount out (not recommended for production)
      sqrtPriceLimitX96: 0n, // No price limit
    };

    console.log("\n📋 Swap Parameters:");
    console.log("- Token In:", swapParams.tokenIn);
    console.log("- Token Out:", swapParams.tokenOut);
    console.log("- Fee:", swapParams.fee);
    console.log("- Amount In:", formatEther(swapParams.amountIn), "WSEI");
    console.log("- Min Amount Out:", swapParams.amountOutMinimum.toString());
    console.log("- Deadline:", new Date(deadline * 1000).toISOString());

    // Test 3: Execute the swap
    console.log("\n🚀 Executing swap...");
    
    const initialUsdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);
    
    try {
      const swapReceipt = await dragonSwap.exactInputSingle(swapParams);
      
      console.log("✅ Swap successful!");
      console.log("Transaction hash:", swapReceipt?.hash);
      console.log("Block number:", swapReceipt?.blockNumber);
      console.log("Gas used:", swapReceipt?.gasUsed?.toString());

      // Check final balances
      const finalWseiBalance = await dragonSwap.getTokenBalance(WSEI_ADDRESS);
      const finalUsdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);
      
      const wseiUsed = wseiBalance - finalWseiBalance;
      const usdtReceived = finalUsdtBalance - initialUsdtBalance;
      
      console.log("\n📊 Swap Results:");
      console.log("WSEI used:", formatEther(wseiUsed), "WSEI");
      console.log("USDT received:", formatUnits(usdtReceived, 6), "USDT");
      
      if (usdtReceived > 0) {
        const exchangeRate = Number(formatUnits(usdtReceived, 6)) / Number(formatEther(wseiUsed));
        console.log("Exchange rate:", exchangeRate.toFixed(4), "USDT per WSEI");
      }

    } catch (swapError: any) {
      console.log("❌ Swap failed:", swapError.message);
      
      if (swapError.message.includes("execution reverted")) {
        console.log("\nPossible reasons:");
        console.log("- Insufficient liquidity in the pool");
        console.log("- Price impact too high");
        console.log("- Slippage tolerance exceeded");
        console.log("- Token approval issues");
      }
    }

    // Test 4: Alternative approach - try with different fee tiers
    console.log("\n🔄 Testing alternative fee tiers...");
    const alternativeFees = [500, 10000]; // Try 0.05% and 1% fees
    
    for (const altFee of alternativeFees) {
      if (altFee === minFee) continue; // Skip the one we already tried
      
      const altPool = await dragonSwap.findPool(WSEI_ADDRESS, USDT_ADDRESS, altFee);
      if (altPool !== "0x0000000000000000000000000000000000000000") {
        console.log(`Found alternative pool with ${altFee} basis points fee: ${altPool}`);
        
        // Try smaller amount with alternative fee
        const smallSwapParams: ExactInputSingleParams = {
          ...swapParams,
          fee: altFee,
          amountIn: parseEther("0.01"), // Smaller amount
        };
        
        try {
          console.log(`Trying swap with ${altFee} basis points fee...`);
          const altSwapReceipt = await dragonSwap.exactInputSingle(smallSwapParams);
          console.log(`✅ Alternative swap successful! Hash: ${altSwapReceipt?.hash}`);
          break;
        } catch (altError: any) {
          console.log(`❌ Alternative swap with ${altFee} basis points failed:`, altError.message);
        }
      }
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }

  console.log("\n🎉 Test completed!");
}

// Handle process termination
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the test
main()
  .then(() => {
    console.log("✅ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 