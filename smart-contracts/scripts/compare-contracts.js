const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Comparing SeiSwapRouter Contracts");
  console.log("=" .repeat(50));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const OLD_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450"; // Working contract
  const NEW_ROUTER = "0xadECD4127c383761FD75A82E657Fda7d52AC8e38"; // Our new contract

  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);

  console.log("\n🔍 Testing OLD working contract...");
  try {
    // Test with the old working contract first
    const oldRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", OLD_ROUTER);
    
    console.log("Old contract config:");
    console.log("- WSEI:", await oldRouter.WSEI());
    console.log("- Router:", await oldRouter.DRAGONSWAP_ROUTER());
    console.log("- Default Fee:", await oldRouter.DEFAULT_FEE());

    // Try a small swap with the old contract
    const testAmount = ethers.parseEther("0.01");
    console.log("\nTesting swap with old contract...");
    
    const gasEstimate = await oldRouter.swapSeiToToken.estimateGas(
      USDT_ADDRESS,
      0,
      3000,
      { value: testAmount }
    );
    
    const tx = await oldRouter.swapSeiToToken(
      USDT_ADDRESS,
      0,
      3000,
      { 
        value: testAmount,
        gasLimit: gasEstimate * 120n / 100n
      }
    );
    
    await tx.wait();
    console.log("✅ Old contract swap SUCCESSFUL!");
    
  } catch (error) {
    console.log("❌ Old contract swap failed:", error.message);
  }

  console.log("\n🔍 Testing NEW contract...");
  try {
    // Test with our new contract
    const newRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", NEW_ROUTER);
    
    console.log("New contract config:");
    console.log("- WSEI:", await newRouter.WSEI());
    console.log("- Router:", await newRouter.DRAGONSWAP_ROUTER());
    console.log("- Factory:", await newRouter.DRAGONSWAP_FACTORY());
    console.log("- Default Fee:", await newRouter.DEFAULT_FEE());

    // Try the same swap with new contract
    const testAmount = ethers.parseEther("0.01");
    console.log("\nTesting swap with new contract...");
    
    const gasEstimate = await newRouter.swapSeiToTokenWithFee.estimateGas(
      USDT_ADDRESS,
      0,
      3000,
      { value: testAmount }
    );
    
    const tx = await newRouter.swapSeiToTokenWithFee(
      USDT_ADDRESS,
      0,
      3000,
      { 
        value: testAmount,
        gasLimit: gasEstimate * 120n / 100n
      }
    );
    
    await tx.wait();
    console.log("✅ New contract swap SUCCESSFUL!");
    
  } catch (error) {
    console.log("❌ New contract swap failed:", error.message);
    
    // Let's check the difference in the contract bytecode/implementation
    console.log("\n🔍 Analyzing the difference...");
    
    // Check if the issue is with our implementation
    try {
      const newRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", NEW_ROUTER);
      
      // Test factory functions
      const minFee = await newRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
      console.log("Min fee found:", minFee.toString());
      
      // Test basic auto-detection swap
      console.log("Trying auto-detection swap...");
      const autoTx = await newRouter.swapSeiToToken(
        USDT_ADDRESS,
        0,
        { value: testAmount }
      );
      await autoTx.wait();
      console.log("✅ Auto-detection swap worked!");
      
    } catch (autoError) {
      console.log("❌ Auto-detection also failed:", autoError.message);
    }
  }

  console.log("\n🎉 Comparison completed!");
}

main()
  .then(() => {
    console.log("✅ Comparison finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Comparison error:", error);
    process.exit(1);
  }); 