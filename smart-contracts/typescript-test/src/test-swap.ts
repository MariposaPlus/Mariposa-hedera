import { parseEther, formatEther, formatUnits } from "ethers";
import { DragonSwap } from "./DragonSwap.js";
import { config } from "./config.js";
import { ExactInputSingleParams } from "./types.js";

async function main() {
  console.log("🧪 DragonSwap TypeScript Test - SEI → USDT");
  console.log("=" .repeat(50));

  // Check if private key is provided
  if (!config.PRIVATE_KEY || config.PRIVATE_KEY === "your_private_key_here") {
    console.log("❌ Please set your PRIVATE_KEY in the environment variables");
    console.log("You can:");
    console.log("1. Set PRIVATE_KEY in your environment");
    console.log("2. Create a .env file with PRIVATE_KEY=your_actual_private_key");
    return;
  }

  try {
    // Initialize DragonSwap instance
    console.log("🔗 Initializing DragonSwap...");
    const dragonSwap = new DragonSwap(config.PRIVATE_KEY);
    console.log("✅ DragonSwap initialized");
    console.log("📍 Signer address:", dragonSwap.signerAddress);

    // Check balances
    console.log("\n💰 Initial Balances:");
    const seiBalance = await dragonSwap.getBalance("0x0000000000000000000000000000000000000000");
    const usdtBalance = await dragonSwap.getBalance(config.USDT_ADDRESS);
    const wseiBalance = await dragonSwap.getBalance(config.WSEI_ADDRESS);
    
    console.log("SEI Balance:", formatEther(seiBalance));
    console.log("WSEI Balance:", formatEther(wseiBalance));
    console.log("USDT Balance:", formatUnits(usdtBalance, 6));

    if (seiBalance < parseEther("0.1")) {
      console.log("⚠️  Low SEI balance. Consider adding more SEI for testing.");
    }

    // Test pool discovery
    console.log("\n🔍 Testing Pool Discovery:");
    const minFee = await dragonSwap.findMinFee(config.WSEI_ADDRESS, config.USDT_ADDRESS);
    console.log("Min fee for WSEI/USDT:", minFee);

    if (!minFee) {
      console.log("❌ No pool found for WSEI/USDT pair");
      return;
    }

    const poolAddress = await dragonSwap.findPool(config.WSEI_ADDRESS, config.USDT_ADDRESS, minFee);
    console.log("Pool address:", poolAddress);

    // Test swap parameters
    const swapAmount = parseEther("0.01"); // 0.01 SEI worth of WSEI
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now

    console.log("\n🚀 Preparing Swap Test:");
    console.log("Amount:", formatEther(swapAmount), "WSEI");
    console.log("Min fee:", minFee, "basis points");
    console.log("Deadline:", new Date(deadline * 1000).toLocaleString());

    // First, we need to wrap some SEI to WSEI for testing
    console.log("\n🔄 Wrapping SEI to WSEI for testing...");
    try {
      const wseiContract = new (await import("ethers")).Contract(
        config.WSEI_ADDRESS,
        [
          "function deposit() external payable",
          "function balanceOf(address) external view returns (uint256)"
        ],
        new (await import("ethers")).Wallet(config.PRIVATE_KEY, new (await import("ethers")).JsonRpcProvider(config.RPC_URL))
      );

      const wrapTx = await wseiContract.deposit({ value: swapAmount });
      await wrapTx.wait();
      console.log("✅ Wrapped", formatEther(swapAmount), "SEI to WSEI");

      // Check new WSEI balance
      const newWseiBalance = await dragonSwap.getBalance(config.WSEI_ADDRESS);
      console.log("New WSEI Balance:", formatEther(newWseiBalance));

    } catch (wrapError) {
      console.log("❌ Failed to wrap SEI:", wrapError);
      return;
    }

    // Prepare swap parameters
    const swapParams: ExactInputSingleParams = {
      tokenIn: config.WSEI_ADDRESS,
      tokenOut: config.USDT_ADDRESS,
      fee: minFee,
      recipient: dragonSwap.signerAddress,
      deadline: deadline,
      amountIn: swapAmount,
      amountOutMinimum: 0n, // Accept any amount (for testing)
      sqrtPriceLimitX96: 0n
    };

    console.log("\n🔄 Executing Swap...");
    console.log("Swap parameters:", {
      tokenIn: swapParams.tokenIn,
      tokenOut: swapParams.tokenOut,
      fee: swapParams.fee,
      recipient: swapParams.recipient,
      amountIn: formatEther(swapParams.amountIn),
      amountOutMinimum: swapParams.amountOutMinimum.toString()
    });

    try {
      // Execute the swap
      await dragonSwap.exactInputSingle(swapParams);
      console.log("✅ Swap executed successfully!");

      // Check final balances
      console.log("\n📊 Final Balances:");
      const finalSeiBalance = await dragonSwap.getBalance("0x0000000000000000000000000000000000000000");
      const finalUsdtBalance = await dragonSwap.getBalance(config.USDT_ADDRESS);
      const finalWseiBalance = await dragonSwap.getBalance(config.WSEI_ADDRESS);
      
      console.log("SEI Balance:", formatEther(finalSeiBalance));
      console.log("WSEI Balance:", formatEther(finalWseiBalance));
      console.log("USDT Balance:", formatUnits(finalUsdtBalance, 6));

      // Calculate amounts received
      const usdtReceived = finalUsdtBalance - usdtBalance;
      console.log("\n🎉 Swap Results:");
      console.log("USDT Received:", formatUnits(usdtReceived, 6), "USDT");

      if (usdtReceived > 0) {
        const rate = Number(formatUnits(usdtReceived, 6)) / Number(formatEther(swapAmount));
        console.log("Exchange Rate:", rate.toFixed(4), "USDT per WSEI");
        console.log("✅ SWAP SUCCESSFUL!");
      } else {
        console.log("⚠️  No USDT received - check swap execution");
      }

    } catch (swapError: any) {
      console.log("❌ Swap failed:", swapError.message);
      
      // Provide specific error analysis
      if (swapError.message.includes("insufficient")) {
        console.log("Issue: Insufficient balance or allowance");
      } else if (swapError.message.includes("slippage")) {
        console.log("Issue: Slippage tolerance exceeded");
      } else if (swapError.message.includes("deadline")) {
        console.log("Issue: Transaction deadline exceeded");
      } else if (swapError.message.includes("pool")) {
        console.log("Issue: Pool-related error (liquidity, etc.)");
      }
    }

  } catch (error: any) {
    console.log("❌ Test failed:", error.message);
  }

  console.log("\n🎉 Test completed!");
}

// Test exact output swap
async function testExactOutput() {
  console.log("\n🧪 Testing Exact Output Swap...");
  
  if (!config.PRIVATE_KEY || config.PRIVATE_KEY === "your_private_key_here") {
    console.log("❌ Please set your PRIVATE_KEY");
    return;
  }

  try {
    const dragonSwap = new DragonSwap(config.PRIVATE_KEY);
    
    const minFee = await dragonSwap.findMinFee(config.WSEI_ADDRESS, config.USDT_ADDRESS);
    if (!minFee) {
      console.log("❌ No pool found");
      return;
    }

    const exactOutputParams = {
      tokenIn: config.WSEI_ADDRESS,
      tokenOut: config.USDT_ADDRESS,
      fee: minFee,
      recipient: dragonSwap.signerAddress,
      deadline: Math.floor(Date.now() / 1000) + 1200,
      amountOut: BigInt("1000000"), // 1 USDT (6 decimals)
      amountInMaximum: parseEther("1"), // Max 1 WSEI
      sqrtPriceLimitX96: 0n
    };

    console.log("Exact output parameters:", {
      amountOut: formatUnits(exactOutputParams.amountOut, 6) + " USDT",
      amountInMaximum: formatEther(exactOutputParams.amountInMaximum) + " WSEI"
    });

    await dragonSwap.exactOutputSingle(exactOutputParams);
    console.log("✅ Exact output swap successful!");

  } catch (error: any) {
    console.log("❌ Exact output swap failed:", error.message);
  }
}

// Run the tests
main().then(() => {
  // Uncomment to test exact output as well
  // return testExactOutput();
}).catch(console.error); 