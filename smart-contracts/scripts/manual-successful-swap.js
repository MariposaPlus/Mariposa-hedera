const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 Manual Step-by-Step Successful Swap");
  console.log("=" .repeat(50));

  // Contract addresses  
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fA906F660EcC5";
  const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";

  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  
  const initialSeiBalance = await signer.provider.getBalance(signer.address);
  console.log("💰 Initial SEI:", ethers.formatEther(initialSeiBalance), "SEI");

  // Get contracts
  const wsei = await ethers.getContractAt([
    "function deposit() external payable",
    "function withdraw(uint256) external", 
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address,uint256) external returns (bool)"
  ], WSEI_ADDRESS);

  const usdt = await ethers.getContractAt([
    "function balanceOf(address) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
  ], USDT_ADDRESS);

  // Check initial balances
  const initialWseiBalance = await wsei.balanceOf(signer.address);
  const initialUsdtBalance = await usdt.balanceOf(signer.address);
  
  console.log("- Initial WSEI:", ethers.formatEther(initialWseiBalance), "WSEI");
  console.log("- Initial USDT:", ethers.formatUnits(initialUsdtBalance, 6), "USDT");

  const swapAmount = ethers.parseEther("0.05"); // 0.05 SEI
  console.log("\n🎯 Target: Swap", ethers.formatEther(swapAmount), "SEI → USDT");

  try {
    // Step 1: Wrap SEI to WSEI
    console.log("\n1️⃣ Step 1: Wrapping SEI to WSEI...");
    const wrapTx = await wsei.deposit({ value: swapAmount });
    const wrapReceipt = await wrapTx.wait();
    
    console.log("✅ SEI wrapped to WSEI");
    console.log("- Transaction:", wrapReceipt.hash);
    console.log("- Gas used:", wrapReceipt.gasUsed.toString());

    const wseiAfterWrap = await wsei.balanceOf(signer.address);
    console.log("- WSEI balance:", ethers.formatEther(wseiAfterWrap), "WSEI");

    // Step 2: Approve WSEI to DragonSwap router
    console.log("\n2️⃣ Step 2: Approving WSEI to DragonSwap...");
    const approveTx = await wsei.approve(DRAGONSWAP_ROUTER, swapAmount);
    const approveReceipt = await approveTx.wait();
    
    console.log("✅ WSEI approved to router");
    console.log("- Transaction:", approveReceipt.hash);

    // Step 3: Execute swap via DragonSwap
    console.log("\n3️⃣ Step 3: Executing swap on DragonSwap...");
    
    const dragonSwapRouter = await ethers.getContractAt([
      "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
    ], DRAGONSWAP_ROUTER);

    const swapParams = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: USDT_ADDRESS, 
      fee: 3000, // 0.3%
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
      amountIn: swapAmount,
      amountOutMinimum: 0, // Accept any amount
      sqrtPriceLimitX96: 0
    };

    console.log("- Swap parameters:");
    console.log("  • tokenIn:", swapParams.tokenIn);
    console.log("  • tokenOut:", swapParams.tokenOut);
    console.log("  • fee:", swapParams.fee);
    console.log("  • amountIn:", ethers.formatEther(swapParams.amountIn), "WSEI");

    // Gas estimation
    const gasEstimate = await dragonSwapRouter.exactInputSingle.estimateGas(swapParams);
    console.log("- Gas estimate:", gasEstimate.toString());

    // Execute swap
    const swapTx = await dragonSwapRouter.exactInputSingle(swapParams, {
      gasLimit: gasEstimate + 100000n
    });
    
    console.log("📝 Swap transaction submitted:", swapTx.hash);
    console.log("⏳ Waiting for confirmation...");

    const swapReceipt = await swapTx.wait();
    
    if (swapReceipt.status === 1) {
      console.log("🎉 SWAP SUCCESSFUL!");
      console.log("- Block:", swapReceipt.blockNumber);
      console.log("- Gas used:", swapReceipt.gasUsed.toString());

      // Check final balances
      const finalSeiBalance = await signer.provider.getBalance(signer.address);
      const finalWseiBalance = await wsei.balanceOf(signer.address);
      const finalUsdtBalance = await usdt.balanceOf(signer.address);

      const usdtReceived = finalUsdtBalance - initialUsdtBalance;
      const seiSpent = initialSeiBalance - finalSeiBalance;

      console.log("\n📊 Final Results:");
      console.log("- SEI spent:", ethers.formatEther(seiSpent), "SEI");
      console.log("- USDT received:", ethers.formatUnits(usdtReceived, 6), "USDT");
      console.log("- Final SEI balance:", ethers.formatEther(finalSeiBalance), "SEI");
      console.log("- Final WSEI balance:", ethers.formatEther(finalWseiBalance), "WSEI");
      console.log("- Final USDT balance:", ethers.formatUnits(finalUsdtBalance, 6), "USDT");

      if (usdtReceived > 0) {
        const exchangeRate = Number(ethers.formatUnits(usdtReceived, 6)) / Number(ethers.formatEther(swapAmount));
        console.log("- Exchange rate:", exchangeRate.toFixed(6), "USDT per SEI");
        
        console.log("\n🎯 PROOF: The pool works perfectly!");
        console.log("   Issue is in your SeiSwapRouter contract logic");
      }

      // Show transaction hash for verification
      console.log("\n🔗 Transaction Details:");
      console.log("- Wrap TX:", wrapReceipt.hash);
      console.log("- Approve TX:", approveReceipt.hash);
      console.log("- Swap TX:", swapReceipt.hash);
      console.log("- View on explorer: https://seitrace.com/tx/" + swapReceipt.hash);

    } else {
      console.log("❌ Swap transaction failed");
      console.log("- Status:", swapReceipt.status);
    }

  } catch (error) {
    console.log("❌ Manual swap failed:", error.message);
    
    if (error.data) {
      console.log("- Error data:", error.data);
    }
    
    // If this fails, we know it's a deeper issue
    console.log("\n💡 If manual swap fails, possible causes:");
    console.log("1. Pool is locked or paused");
    console.log("2. Specific DragonSwap router issue");
    console.log("3. Token contract issues");
  }

  console.log("\n📋 Analysis:");
  console.log("If this manual swap works, then:");
  console.log("✅ Pool has liquidity and is functional");
  console.log("✅ DragonSwap router is working");
  console.log("❌ Issue is in SeiSwapRouter contract code");
  console.log("🔧 Need to fix the WSEI wrapping logic in contract");
}

main()
  .then(() => {
    console.log("\n✅ Manual swap test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Manual test failed:");
    console.error(error);
    process.exit(1);
  }); 