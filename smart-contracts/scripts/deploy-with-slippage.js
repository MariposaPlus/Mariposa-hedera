const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SeiSwapRouter with Built-in 5% Slippage");
  console.log("=" .repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "SEI");

  // Deploy the new contract with slippage protection
  console.log("\n📦 Deploying SeiSwapRouter with 5% slippage...");
  const SeiSwapRouter = await ethers.getContractFactory("contracts/SeiSwapRouterWithSlippage.sol:SeiSwapRouter");
  
  // Test gas estimation first
  try {
    const deploymentTx = await SeiSwapRouter.getDeployTransaction();
    const gasEstimate = await deployer.estimateGas(deploymentTx);
    console.log("✅ Gas estimation successful:", gasEstimate.toString());
    console.log("💰 Estimated cost:", ethers.formatEther(gasEstimate * 20000000000n), "SEI");
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
    throw error;
  }

  // Deploy contract
  const seiSwapRouter = await SeiSwapRouter.deploy();
  await seiSwapRouter.waitForDeployment();

  const contractAddress = await seiSwapRouter.getAddress();
  console.log("✅ SeiSwapRouter deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", seiSwapRouter.deploymentTransaction().hash);

  // Wait for confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await seiSwapRouter.deploymentTransaction().wait(3);

  // Get contract configuration
  console.log("\n🔍 Contract Configuration:");
  const config = await seiSwapRouter.getContractInfo();
  console.log("- SeiSwapRouter Address:", contractAddress);
  console.log("- DragonSwap Router:", config.router);
  console.log("- DragonSwap Factory:", config.factory_addr);
  console.log("- WSEI Address:", config.wsei_addr);
  console.log("- Default Slippage:", config.defaultSlippage.toString(), "BPS (5%)");
  console.log("- Max Slippage:", config.maxSlippage.toString(), "BPS (10%)");

  // Initialize the contract
  console.log("\n🔧 Initializing contract...");
  try {
    const initTx = await seiSwapRouter.initialize();
    await initTx.wait();
    console.log("✅ Contract initialized successfully");
  } catch (error) {
    console.log("⚠️  Initialization failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "sei-mainnet",
    contractName: "SeiSwapRouterWithSlippage",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    transactionHash: seiSwapRouter.deploymentTransaction().hash,
    blockNumber: seiSwapRouter.deploymentTransaction().blockNumber,
    timestamp: new Date().toISOString(),
    features: {
      defaultSlippage: "5%",
      maxSlippage: "10%",
      builtInSlippageProtection: true,
      customUserSlippage: true
    },
    configuration: {
      dragonSwapRouter: config.router,
      dragonSwapFactory: config.factory_addr,
      wseiAddress: config.wsei_addr,
      defaultSlippageBPS: config.defaultSlippage.toString(),
      maxSlippageBPS: config.maxSlippage.toString()
    }
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, 'sei-swap-router-with-slippage.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to:", deploymentFile);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 New Features:");
  console.log("✅ Built-in 5% slippage protection");
  console.log("✅ User-customizable slippage (up to 10%)");
  console.log("✅ Multiple swap functions with different slippage options");
  console.log("✅ Zero slippage function for testing");
  
  console.log("\n🔧 Available Functions:");
  console.log("- swapSeiToToken(tokenOut) - Uses 5% default slippage");
  console.log("- swapSeiToTokenWithSlippage(tokenOut, slippageBPS, fee) - Custom slippage");
  console.log("- swapSeiToTokenNoSlippage(tokenOut, fee) - No slippage (testing)");
  console.log("- setUserSlippage(slippageBPS) - Set personal default slippage");

  console.log("\n📊 Slippage Examples:");
  console.log("- 100 BPS = 1%");
  console.log("- 500 BPS = 5% (default)");
  console.log("- 1000 BPS = 10% (maximum)");

  return {
    seiSwapRouter: contractAddress,
    deploymentInfo
  };
}

main()
  .then((result) => {
    console.log("\n✅ Deployment completed successfully");
    console.log("📄 New Contract Address:", result.seiSwapRouter);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 