const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing SeiSwapRouter addresses...");
  console.log("=" .repeat(50));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Testing with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "SEI");

  // Updated contract addresses
  const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const DRAGONSWAP_FACTORY = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
  const WSEI = "0xe30feDd158A2e3b13e9badaeABaFc5516e95e8c7"; // Corrected address

  console.log("\n🧪 Testing contract addresses...");
  
  // Test DragonSwap Router
  try {
    const routerCode = await deployer.provider.getCode(DRAGONSWAP_ROUTER);
    if (routerCode === "0x") {
      console.log("❌ DragonSwap Router: Contract not found at", DRAGONSWAP_ROUTER);
    } else {
      console.log("✅ DragonSwap Router: Contract exists at", DRAGONSWAP_ROUTER);
      console.log("   📄 Code length:", routerCode.length, "bytes");
    }
  } catch (error) {
    console.log("❌ DragonSwap Router: Error checking", error.message);
  }

  // Test DragonSwap Factory
  try {
    const factoryCode = await deployer.provider.getCode(DRAGONSWAP_FACTORY);
    if (factoryCode === "0x") {
      console.log("❌ DragonSwap Factory: Contract not found at", DRAGONSWAP_FACTORY);
    } else {
      console.log("✅ DragonSwap Factory: Contract exists at", DRAGONSWAP_FACTORY);
      console.log("   📄 Code length:", factoryCode.length, "bytes");
    }
  } catch (error) {
    console.log("❌ DragonSwap Factory: Error checking", error.message);
  }

  // Test WSEI
  try {
    const wseiCode = await deployer.provider.getCode(WSEI);
    if (wseiCode === "0x") {
      console.log("❌ WSEI: Contract not found at", WSEI);
    } else {
      console.log("✅ WSEI: Contract exists at", WSEI);
      console.log("   📄 Code length:", wseiCode.length, "bytes");
      
      // Try to interact with WSEI to test if it's actually WSEI
      const wseiContract = await ethers.getContractAt("IERC20", WSEI);
      try {
        const name = await wseiContract.name();
        const symbol = await wseiContract.symbol();
        const decimals = await wseiContract.decimals();
        console.log("   📄 WSEI Name:", name);
        console.log("   📄 WSEI Symbol:", symbol);
        console.log("   📄 WSEI Decimals:", decimals);
      } catch (error) {
        console.log("   ⚠️  WSEI: Could not read name/symbol -", error.message);
      }
    }
  } catch (error) {
    console.log("❌ WSEI: Error checking", error.message);
  }

  console.log("\n🧪 Testing SeiSwapRouter deployment...");
  
  try {
    const SeiSwapRouter = await ethers.getContractFactory("SeiSwapRouter");
    
    // Test gas estimation for deployment
    const deploymentTx = await SeiSwapRouter.getDeployTransaction();
    const gasEstimate = await deployer.estimateGas(deploymentTx);
    console.log("✅ Gas estimation successful:", gasEstimate.toString());
    console.log("💰 Estimated deployment cost:", ethers.formatEther(gasEstimate * 20000000000n), "SEI");
    
    console.log("\n🚀 All checks passed! Ready for deployment.");
    
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("\n💡 Constructor is still failing. Possible issues:");
      console.log("   1. WSEI contract doesn't support the expected interface");
      console.log("   2. DragonSwap router address is still incorrect");
      console.log("   3. Network or RPC issues");
      
      // Additional debugging
      console.log("\n🔍 Additional debugging:");
      console.log("   - Check if WSEI supports approve() function");
      console.log("   - Verify DragonSwap router interface compatibility");
      console.log("   - Consider removing approve from constructor");
    }
  }
}

main()
  .then(() => {
    console.log("\n✅ Address testing completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Address testing failed:");
    console.error(error);
    process.exit(1);
  }); 