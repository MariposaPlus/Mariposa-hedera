const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SeiSwapRouter to SEI Mainnet...");
  console.log("=" .repeat(50));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "SEI");

  // Deploy SeiSwapRouter
  console.log("\n📦 Deploying SeiSwapRouter...");
  const SeiSwapRouter = await ethers.getContractFactory("SeiSwapRouter");
  
  // Deploy with constructor parameters
  const seiSwapRouter = await SeiSwapRouter.deploy();
  await seiSwapRouter.waitForDeployment();

  const contractAddress = await seiSwapRouter.getAddress();
  console.log("✅ SeiSwapRouter deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", seiSwapRouter.deploymentTransaction().hash);

  // Wait for a few confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await seiSwapRouter.deploymentTransaction().wait(3);

  // Verify contract addresses and configuration
  console.log("\n🔍 Contract Configuration:");
  console.log("- SeiSwapRouter Address:", contractAddress);
  console.log("- DragonSwap Router:", await seiSwapRouter.DRAGONSWAP_ROUTER());
  console.log("- DragonSwap Factory:", await seiSwapRouter.DRAGONSWAP_FACTORY());
  console.log("- WSEI Address:", await seiSwapRouter.WSEI());
  console.log("- Default Fee:", await seiSwapRouter.DEFAULT_FEE());
  console.log("- Owner:", await seiSwapRouter.owner());

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
    defaultFee: (await seiSwapRouter.DEFAULT_FEE()).toString()
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, 'sei-swap-router-deployment.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to:", deploymentFile);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify the contract on SEI explorer");
  console.log("2. Test the swap functions");
  console.log("3. Update frontend with the new contract address");
  
  console.log("\n🔧 Contract Functions Available:");
  console.log("- swapSeiToToken(tokenOut, amountOutMinimum, fee)");
  console.log("- swapTokenToSei(tokenIn, amountIn, amountOutMinimum, fee)");
  console.log("- swapTokenToToken(tokenIn, tokenOut, amountIn, amountOutMinimum, fee)");
  console.log("- swapMultiHop(path, amountIn, amountOutMinimum)");

  return {
    seiSwapRouter: contractAddress,
    deploymentInfo
  };
}

// Error handling
main()
  .then((result) => {
    console.log("\n✅ Script completed successfully");
    console.log("📄 Contract Address:", result.seiSwapRouter);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 