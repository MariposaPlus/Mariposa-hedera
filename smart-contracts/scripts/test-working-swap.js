const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Working SEI → USDT Swap");
  console.log("=" .repeat(50));

  // Contract addresses (using the known working ones)
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const SEISWAP_ROUTER = "0xadECD4127c383761FD75A82E657Fda7d52AC8e38";
  
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);

  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", SEISWAP_ROUTER);

  // Get initial balances
  const initialSeiBalance = await signer.provider.getBalance(signer.address);
  console.log("Initial SEI:", ethers.formatEther(initialSeiBalance));

  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
  const initialUsdtBalance = await usdt.balanceOf(signer.address);
  console.log("Initial USDT:", ethers.formatUnits(initialUsdtBalance, 6));

  // Test with the smallest possible amount
  const swapAmount = ethers.parseEther("0.1"); // Use 0.1 SEI instead of smaller amounts
  console.log("\n🚀 Attempting swap with", ethers.formatEther(swapAmount), "SEI");

  try {
    // Use the swapSeiToTokenWithFee function with explicit fee
    const fee = 3000; // 0.3% fee (we know this pool exists)
    
    // Estimate gas first
    console.log("Estimating gas...");
    const gasEstimate = await seiSwapRouter.swapSeiToTokenWithFee.estimateGas(
      USDT_ADDRESS,
      0, // minimum out = 0 (accept any amount)
      fee,
      { value: swapAmount }
    );
    console.log("Gas estimate:", gasEstimate.toString());

    // Execute the swap with extra gas
    console.log("Executing swap...");
    const tx = await seiSwapRouter.swapSeiToTokenWithFee(
      USDT_ADDRESS,
      0,
      fee,
      { 
        value: swapAmount,
        gasLimit: gasEstimate * 150n / 100n // 50% extra gas
      }
    );

    console.log("Transaction submitted:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check final balances
    const finalSeiBalance = await signer.provider.getBalance(signer.address);
    const finalUsdtBalance = await usdt.balanceOf(signer.address);
    
    const seiUsed = initialSeiBalance - finalSeiBalance;
    const usdtReceived = finalUsdtBalance - initialUsdtBalance;
    
    console.log("\n📊 Swap Results:");
    console.log("SEI used (including gas):", ethers.formatEther(seiUsed));
    console.log("USDT received:", ethers.formatUnits(usdtReceived, 6));
    
    if (usdtReceived > 0) {
      console.log("✅ SWAP SUCCESSFUL!");
      
      // Calculate effective rate
      const effectiveRate = Number(ethers.formatUnits(usdtReceived, 6)) / Number(ethers.formatEther(swapAmount));
      console.log("Effective rate:", effectiveRate.toFixed(4), "USDT per SEI");
    } else {
      console.log("⚠️  No USDT received - check if swap actually executed");
    }

    // Check for events
    const eventFilter = seiSwapRouter.filters.SeiToTokenSwap();
    const events = await seiSwapRouter.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);
    
    if (events.length > 0) {
      const event = events[0];
      console.log("\n📋 Event Details:");
      console.log("SEI Amount In:", ethers.formatEther(event.args.seiAmountIn));
      console.log("Token Amount Out:", ethers.formatUnits(event.args.tokenAmountOut, 6));
      console.log("Fee Used:", event.args.fee.toString());
    }

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    
    // More specific error analysis
    if (error.message.includes("insufficient funds")) {
      console.log("Issue: Insufficient SEI balance");
    } else if (error.message.includes("execution reverted")) {
      console.log("Issue: Transaction reverted at contract level");
      console.log("Possible causes:");
      console.log("- Pool has insufficient liquidity");
      console.log("- Price impact too high");
      console.log("- Slippage tolerance exceeded");
      console.log("- Pool is paused or has issues");
    } else if (error.message.includes("gas")) {
      console.log("Issue: Gas related error");
    }
    
    console.log("\n🔍 Let's check pool status...");
    try {
      const poolAddress = await seiSwapRouter.findPool(WSEI_ADDRESS, USDT_ADDRESS, 3000);
      console.log("Pool address:", poolAddress);
      
      if (poolAddress === ethers.ZeroAddress) {
        console.log("❌ Pool does not exist!");
      } else {
        console.log("✅ Pool exists, issue might be with liquidity or parameters");
      }
    } catch (poolError) {
      console.log("Error checking pool:", poolError.message);
    }
  }

  console.log("\n🎉 Test completed!");
}

main()
  .then(() => {
    console.log("✅ Test finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test error:", error);
    process.exit(1);
  }); 