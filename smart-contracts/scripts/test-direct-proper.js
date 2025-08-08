const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing SeiSwapRouterDirect - Proper Interface");
  console.log("=" .repeat(50));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const DIRECT_ROUTER = "0x9E93551fd5a40368F85acd6262C38e3c9ac982fe"; // Just deployed
  
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);

  // Connect to the direct router
  const directRouter = await ethers.getContractAt("contracts/SeiSwapRouterDirect.sol:SeiSwapRouter", DIRECT_ROUTER);
  
  console.log("\n🔍 Contract Configuration:");
  console.log("- Contract:", DIRECT_ROUTER);
  console.log("- WSEI:", await directRouter.WSEI());
  console.log("- Router:", await directRouter.DRAGONSWAP_ROUTER());
  console.log("- Factory:", await directRouter.DRAGONSWAP_FACTORY());

  // Check initial USDT balance
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
  const initialBalance = await usdt.balanceOf(signer.address);
  console.log("- Initial USDT:", ethers.formatUnits(initialBalance, 6));

  // Test 1: Simple auto swap
  const swapAmount = ethers.parseEther("0.02");
  console.log("\n🚀 Test 1: Auto swap with", ethers.formatEther(swapAmount), "SEI");
  
  try {
    const tx1 = await directRouter.swapSeiToToken(USDT_ADDRESS, { value: swapAmount });
    const receipt1 = await tx1.wait();
    console.log("✅ Auto swap successful!");
    console.log("Gas used:", receipt1.gasUsed.toString());
    
    // Check balance
    const balance1 = await usdt.balanceOf(signer.address);
    const received1 = balance1 - initialBalance;
    console.log("USDT received:", ethers.formatUnits(received1, 6));
    
  } catch (error) {
    console.log("❌ Auto swap failed:", error.message);
  }

  // Test 2: Swap with slippage control
  console.log("\n🚀 Test 2: Swap with slippage control");
  
  try {
    const tx2 = await directRouter.swapSeiToTokenWithSlippage(
      USDT_ADDRESS,
      500, // 5% slippage
      3000, // 0.3% fee
      { value: swapAmount }
    );
    
    const receipt2 = await tx2.wait();
    console.log("✅ Slippage-controlled swap successful!");
    console.log("Gas used:", receipt2.gasUsed.toString());
    
  } catch (error) {
    console.log("❌ Slippage swap failed:", error.message);
  }

  // Test 3: No slippage swap (might fail due to price impact)
  console.log("\n🚀 Test 3: No slippage swap");
  
  try {
    const tx3 = await directRouter.swapSeiToTokenNoSlippage(
      USDT_ADDRESS,
      3000, // 0.3% fee
      { value: ethers.parseEther("0.01") } // Smaller amount
    );
    
    const receipt3 = await tx3.wait();
    console.log("✅ No slippage swap successful!");
    console.log("Gas used:", receipt3.gasUsed.toString());
    
  } catch (error) {
    console.log("❌ No slippage swap failed:", error.message);
  }

  // Check final balance
  const finalBalance = await usdt.balanceOf(signer.address);
  const totalReceived = finalBalance - initialBalance;
  console.log("\n📊 Final Results:");
  console.log("Total USDT received:", ethers.formatUnits(totalReceived, 6));
  
  if (totalReceived > 0) {
    console.log("🎉 SUCCESS! SeiSwapRouterDirect is working!");
    console.log("\n✅ Working contract address:", DIRECT_ROUTER);
    console.log("Use this for SEI → USDT swaps");
  } else {
    console.log("❌ No USDT received in any test");
  }
}

main()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 