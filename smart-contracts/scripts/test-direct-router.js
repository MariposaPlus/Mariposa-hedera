const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing SeiSwapRouterDirect vs Original");
  console.log("=" .repeat(50));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WORKING_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450"; // Known working
  
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);

  // Test with the known working contract (using any available interface)
  console.log("\n🔍 Testing known working contract...");
  try {
    // Try with the direct router interface
    const workingRouter = await ethers.getContractAt("contracts/SeiSwapRouterDirect.sol:SeiSwapRouter", WORKING_ROUTER);
    
    console.log("Working contract config:");
    console.log("- WSEI:", await workingRouter.WSEI());
    console.log("- Router:", await workingRouter.DRAGONSWAP_ROUTER());

    // Try a small swap
    const testAmount = ethers.parseEther("0.05");
    console.log("Testing with", ethers.formatEther(testAmount), "SEI");
    
    // Check initial USDT balance
    const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
    const initialBalance = await usdt.balanceOf(signer.address);
    console.log("Initial USDT:", ethers.formatUnits(initialBalance, 6));
    
    const tx = await workingRouter.swapSeiToToken(
      USDT_ADDRESS,
      0, // min out
      3000, // fee
      { value: testAmount }
    );
    
    const receipt = await tx.wait();
    console.log("✅ Working contract swap SUCCESSFUL!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check final balance
    const finalBalance = await usdt.balanceOf(signer.address);
    const received = finalBalance - initialBalance;
    console.log("USDT received:", ethers.formatUnits(received, 6));
    
    if (received > 0) {
      console.log("🎉 SWAP CONFIRMED WORKING!");
    }
    
  } catch (error) {
    console.log("❌ Working contract test failed:", error.message);
  }

  console.log("\n🔧 The issue might be in our new contract implementation.");
  console.log("Let's deploy the SeiSwapRouterDirect instead...");
  
  // Deploy the direct router version
  try {
    console.log("\n📦 Deploying SeiSwapRouterDirect...");
    const SeiSwapRouterDirect = await ethers.getContractFactory("contracts/SeiSwapRouterDirect.sol:SeiSwapRouter");
    
    const directRouter = await SeiSwapRouterDirect.deploy();
    await directRouter.waitForDeployment();
    
    const directAddress = await directRouter.getAddress();
    console.log("✅ SeiSwapRouterDirect deployed to:", directAddress);
    
    // Initialize it
    const initTx = await directRouter.initialize();
    await initTx.wait();
    console.log("✅ Initialized");
    
    // Test the swap
    console.log("\n🧪 Testing new SeiSwapRouterDirect...");
    const testTx = await directRouter.swapSeiToToken(
      USDT_ADDRESS,
      0,
      3000,
      { value: ethers.parseEther("0.02") }
    );
    
    await testTx.wait();
    console.log("✅ New SeiSwapRouterDirect swap SUCCESSFUL!");
    
    console.log("\n🎉 SUCCESS! Use this contract address for SEI → USDT swaps:");
    console.log("Contract:", directAddress);
    
  } catch (deployError) {
    console.log("❌ Deploy/test failed:", deployError.message);
  }
}

main()
  .then(() => {
    console.log("✅ Test finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 