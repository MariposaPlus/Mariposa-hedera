const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SeiSwapRouter with Direct ExactInputSingle");
  console.log("=" .repeat(55));

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "SEI");

  // Deploy the contract
  console.log("\n📦 Deploying SeiSwapRouter (Direct approach)...");
  
  const SeiSwapRouter = await ethers.getContractFactory("contracts/SeiSwapRouterDirect.sol:SeiSwapRouter");
  
  // Estimate gas for deployment
  console.log("⛽ Estimating deployment gas...");
  const deploymentData = SeiSwapRouter.getDeployTransaction();
  const gasEstimate = await deployer.estimateGas(deploymentData);
  console.log("✅ Gas estimation successful:", gasEstimate.toString());
  
  const gasPrice = await deployer.provider.getFeeData();
  const estimatedCost = gasEstimate * gasPrice.gasPrice;
  console.log("💰 Estimated cost:", ethers.formatEther(estimatedCost), "SEI");

  const seiSwapRouter = await SeiSwapRouter.deploy();
  await seiSwapRouter.waitForDeployment();

  const contractAddress = await seiSwapRouter.getAddress();
  console.log("✅ SeiSwapRouter deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", seiSwapRouter.deploymentTransaction().hash);

  console.log("\n⏳ Waiting for confirmations...");
  await seiSwapRouter.deploymentTransaction().wait(2);

  // Get contract info
  console.log("\n🔍 Contract Configuration:");
  const config = await seiSwapRouter.getContractInfo();
  console.log("- SeiSwapRouter Address:", contractAddress);
  console.log("- DragonSwap Router:", config.router);
  console.log("- DragonSwap Factory:", config.factory_addr);
  console.log("- WSEI Address:", config.wsei_addr);
  console.log("- Default Slippage:", config.defaultSlippage.toString(), "BPS (5%)");
  console.log("- Default Fee:", config.defaultFee.toString(), "BPS (0.3%)");
  console.log("- Version:", config.version);

  // Initialize the contract
  console.log("\n🔧 Initializing contract...");
  const initTx = await seiSwapRouter.initialize();
  await initTx.wait();
  console.log("✅ Contract initialized successfully");

  // Test pool checking functions
  console.log("\n🧪 Testing Pool Discovery:");
  
  const testTokens = [
    { name: "USDT", address: "0x9151434b16b9763660705744891fA906F660EcC5" },
    { name: "WBTC", address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c" },
    { name: "USDC", address: "0x3894085Ef7Ff0f0aeDf52E2A2704928d259C2fc1" }
  ];

  for (const token of testTokens) {
    console.log(`\n📊 ${token.name} pools:`);
    try {
      const [bestFee, poolAddress] = await seiSwapRouter.findBestFee(config.wsei_addr, token.address);
      if (bestFee > 0) {
        console.log(`  ✅ Best fee: ${bestFee} BPS (${bestFee/100}%)`);
        console.log(`  📍 Pool: ${poolAddress}`);
      } else {
        console.log(`  ❌ No pools found`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking: ${error.message}`);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    contractName: "SeiSwapRouter",
    version: "Direct ExactInputSingle v1.0",
    network: "seiMainnet",
    address: contractAddress,
    deploymentHash: seiSwapRouter.deploymentTransaction().hash,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    gasUsed: gasEstimate.toString(),
    configuration: {
      dragonSwapRouter: config.router,
      dragonSwapFactory: config.factory_addr,
      wsei: config.wsei_addr,
      defaultSlippage: config.defaultSlippage.toString(),
      defaultFee: config.defaultFee.toString(),
    },
    approach: "Direct exactInputSingle calls (no multicall)",
    basedOn: "TypeScript DragonSwap implementation pattern"
  };

  // Ensure deployments directory exists
  const fs = require('fs');
  const path = require('path');
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, 'sei-swap-router-direct.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Key Features:");
  console.log("✅ Direct exactInputSingle calls (matches TypeScript example)");
  console.log("✅ No multicall complexity");
  console.log("✅ Automatic fee tier discovery");
  console.log("✅ Built-in 5% slippage protection");
  console.log("✅ Pool existence checking");

  console.log("\n🔧 Available Functions:");
  console.log("- swapSeiToToken(tokenOut) - Simple swap with defaults");
  console.log("- swapSeiToTokenWithSlippage(tokenOut, slippageBPS, fee) - Custom settings");
  console.log("- swapSeiToTokenNoSlippage(tokenOut, fee) - No slippage (testing)");
  console.log("- swapSeiToTokenAuto(tokenOut) - Auto-find best fee tier");

  console.log("\n🔍 This approach matches the working TypeScript implementation!");

  console.log("\n✅ Direct router deployment completed successfully");
  console.log("📄 New Contract Address:", contractAddress);
}

main()
  .then(() => {
    console.log("\n✅ Deployment script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 