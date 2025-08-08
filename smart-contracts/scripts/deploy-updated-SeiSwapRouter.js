const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Updated SeiSwapRouter to SEI Mainnet...");
  console.log("=" .repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "SEI");

  if (balance < ethers.parseEther("0.1")) {
    console.log("❌ Insufficient balance for deployment (need at least 0.1 SEI)");
    return;
  }

  // Deploy SeiSwapRouter with fully qualified name
  console.log("\n📦 Deploying Updated SeiSwapRouter...");
  const SeiSwapRouter = await ethers.getContractFactory("contracts/SeiSwapRouter.sol:SeiSwapRouter");
  
  // Deploy with constructor parameters
  console.log("⏳ Deploying contract...");
  const seiSwapRouter = await SeiSwapRouter.deploy();
  
  console.log("⏳ Waiting for deployment transaction...");
  await seiSwapRouter.waitForDeployment();

  const contractAddress = await seiSwapRouter.getAddress();
  console.log("✅ SeiSwapRouter deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", seiSwapRouter.deploymentTransaction().hash);

  // Wait for confirmations
  console.log("\n⏳ Waiting for 3 confirmations...");
  await seiSwapRouter.deploymentTransaction().wait(3);

  // Verify contract configuration
  console.log("\n🔍 Contract Configuration:");
  console.log("- SeiSwapRouter Address:", contractAddress);
  console.log("- DragonSwap Router:", await seiSwapRouter.DRAGONSWAP_ROUTER());
  console.log("- DragonSwap Factory:", await seiSwapRouter.DRAGONSWAP_FACTORY());
  console.log("- WSEI Address:", await seiSwapRouter.WSEI());
  console.log("- Default Fee:", await seiSwapRouter.DEFAULT_FEE());
  console.log("- Owner:", await seiSwapRouter.owner());

  // Initialize the contract (set up WSEI approval)
  console.log("\n🔧 Initializing contract...");
  try {
    const initTx = await seiSwapRouter.initialize();
    await initTx.wait();
    console.log("✅ Contract initialized successfully");
    console.log("🔗 Init transaction:", initTx.hash);
  } catch (error) {
    console.log("⚠️  Warning: Could not initialize contract:", error.message);
  }

  // Test factory functions
  console.log("\n🧪 Testing Factory Functions:");
  
  // Test findMinFee for SEI/USDT
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = await seiSwapRouter.WSEI();
  
  try {
    const minFee = await seiSwapRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
    console.log("- Min fee for WSEI/USDT:", minFee.toString(), "basis points");
    
    if (minFee > 0) {
      const poolAddress = await seiSwapRouter.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
      console.log("- Pool address:", poolAddress);
    } else {
      console.log("- No pool found for WSEI/USDT");
    }
  } catch (error) {
    console.log("- Error testing factory functions:", error.message);
  }

  // Test getting all fee tiers
  try {
    const feeTiers = await seiSwapRouter.getFeeTiers();
    console.log("- Available fee tiers:", feeTiers.map(f => f.toString()).join(", "));
  } catch (error) {
    console.log("- Error getting fee tiers:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "sei-mainnet",
    contractName: "SeiSwapRouter",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    transactionHash: seiSwapRouter.deploymentTransaction().hash,
    blockNumber: seiSwapRouter.deploymentTransaction().blockNumber,
    timestamp: new Date().toISOString(),
    dragonSwapRouter: await seiSwapRouter.DRAGONSWAP_ROUTER(),
    dragonSwapFactory: await seiSwapRouter.DRAGONSWAP_FACTORY(),
    wseiAddress: await seiSwapRouter.WSEI(),
    defaultFee: (await seiSwapRouter.DEFAULT_FEE()).toString(),
    version: "v2-with-factory"
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `sei-swap-router-updated-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(60));
  console.log("📋 Summary:");
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Network: SEI Mainnet`);
  console.log(`   Owner: ${deployer.address}`);
  console.log(`   Gas Used: Check transaction for details`);
  
  console.log("\n🔧 Next Steps:");
  console.log("   1. Verify the contract on Etherscan (if available)");
  console.log("   2. Test swaps with small amounts first");
  console.log("   3. Fund the contract if needed for gas optimizations");
  
  return contractAddress;
}

main()
  .then((contractAddress) => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 