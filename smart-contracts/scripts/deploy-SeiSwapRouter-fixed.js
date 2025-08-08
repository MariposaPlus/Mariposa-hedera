const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SeiSwapRouter (Fixed Version) to SEI Mainnet...");
  console.log("=" .repeat(50));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "SEI");

  // First, test the addresses
  const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const DRAGONSWAP_FACTORY = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
  const WSEI = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";

  console.log("\n🔍 Verifying contract addresses...");
  
  // Check WSEI
  const wseiCode = await deployer.provider.getCode(WSEI);
  if (wseiCode === "0x") {
    console.log("❌ WSEI contract not found at", WSEI);
    console.log("⚠️  Deployment may fail. Please verify the WSEI address.");
  } else {
    console.log("✅ WSEI contract verified at", WSEI);
  }

  // Check DragonSwap Router
  const routerCode = await deployer.provider.getCode(DRAGONSWAP_ROUTER);
  if (routerCode === "0x") {
    console.log("❌ DragonSwap Router not found at", DRAGONSWAP_ROUTER);
    console.log("⚠️  Deployment may fail. Please verify the router address.");
  } else {
    console.log("✅ DragonSwap Router verified at", DRAGONSWAP_ROUTER);
  }

  // Deploy SeiSwapRouter (Fixed Version)
  console.log("\n📦 Deploying SeiSwapRouter (Fixed)...");
  const SeiSwapRouter = await ethers.getContractFactory("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter");
  
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

  // Optional: Initialize the contract (approve WSEI to router)
  console.log("\n🔧 Initializing contract (optional)...");
  try {
    const initTx = await seiSwapRouter.initialize();
    await initTx.wait();
    console.log("✅ Contract initialized successfully");
  } catch (error) {
    console.log("⚠️  Initialization failed (this is optional):", error.message);
    console.log("   You can call initialize() manually later if needed");
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
    version: "fixed"
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, 'sei-swap-router-fixed-deployment.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to:", deploymentFile);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify the contract on SEI explorer");
  console.log("2. Test the swap functions");
  console.log("3. Update frontend with the new contract address");
  console.log("4. If initialization failed, call initialize() manually");
  
  console.log("\n🔧 Contract Functions Available:");
  console.log("- swapSeiToToken(tokenOut, amountOutMinimum, fee)");
  console.log("- swapTokenToSei(tokenIn, amountIn, amountOutMinimum, fee)");
  console.log("- swapTokenToToken(tokenIn, tokenOut, amountIn, amountOutMinimum, fee)");
  console.log("- swapMultiHop(path, amountIn, amountOutMinimum)");
  console.log("- initialize() [owner only, if not done during deployment]");

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