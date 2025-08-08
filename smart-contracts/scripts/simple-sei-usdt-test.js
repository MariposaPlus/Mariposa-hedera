const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Simple SEI → USDT Swap Test");
  console.log("=" .repeat(50));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const SEISWAP_ROUTER = "0xadECD4127c383761FD75A82E657Fda7d52AC8e38";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  
  const balance = await signer.provider.getBalance(signer.address);
  console.log("💰 SEI Balance:", ethers.formatEther(balance), "SEI");

  // Connect to contract
  console.log("\n🔗 Connecting to SeiSwapRouter...");
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", SEISWAP_ROUTER);
  
  // Check if pool exists
  console.log("\n🔍 Checking WSEI/USDT pool...");
  const minFee = await seiSwapRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
  console.log("Min fee:", minFee.toString(), "basis points");
  
  if (minFee === 0n) {
    console.log("❌ No pool found for WSEI/USDT");
    return;
  }

  const poolAddress = await seiSwapRouter.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
  console.log("Pool address:", poolAddress);

  // Get initial USDT balance
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
  let initialUsdtBalance;
  try {
    initialUsdtBalance = await usdt.balanceOf(signer.address);
    console.log("Initial USDT:", ethers.formatUnits(initialUsdtBalance, 6), "USDT");
  } catch (error) {
    console.log("Could not read initial USDT balance");
    initialUsdtBalance = 0n;
  }

  // Test swap
  const seiAmount = ethers.parseEther("0.05"); // 0.05 SEI
  console.log("\n🚀 Swapping", ethers.formatEther(seiAmount), "SEI → USDT...");

  try {
    // Estimate gas
    const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
      USDT_ADDRESS,
      0, // minimum out
      { value: seiAmount }
    );
    console.log("Gas estimate:", gasEstimate.toString());

    // Execute swap
    const tx = await seiSwapRouter.swapSeiToToken(
      USDT_ADDRESS,
      0,
      { 
        value: seiAmount,
        gasLimit: gasEstimate * 120n / 100n
      }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Swap successful!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check final USDT balance
    try {
      const finalUsdtBalance = await usdt.balanceOf(signer.address);
      const usdtReceived = finalUsdtBalance - initialUsdtBalance;
      console.log("USDT received:", ethers.formatUnits(usdtReceived, 6), "USDT");
    } catch (error) {
      console.log("Could not read final USDT balance");
    }

    // Check events
    const events = await seiSwapRouter.queryFilter(
      seiSwapRouter.filters.SeiToTokenSwap(),
      receipt.blockNumber,
      receipt.blockNumber
    );
    
    if (events.length > 0) {
      const event = events[0];
      console.log("\n📊 Swap Details:");
      console.log("SEI In:", ethers.formatEther(event.args.seiAmountIn), "SEI");
      console.log("USDT Out:", ethers.formatUnits(event.args.tokenAmountOut, 6), "USDT");
      console.log("Fee:", event.args.fee.toString(), "basis points");
    }

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    
    // Try to identify the issue
    if (error.message.includes("execution reverted")) {
      console.log("Possible reasons:");
      console.log("- Insufficient liquidity");
      console.log("- Slippage too high");
      console.log("- Pool imbalance");
    }
  }

  console.log("\n🎉 Test completed!");
}

main()
  .then(() => {
    console.log("✅ Script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 