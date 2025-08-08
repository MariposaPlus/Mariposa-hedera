const { ethers } = require("hardhat");
require("dotenv").config();

// Simplified DragonSwap Router ABI
const DRAGONSWAP_ABI = [
  "function swapExactNativeForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

async function directSwapTest() {
  console.log("=== Testing Direct Swap on DragonSwap ===");
  
  const [deployer] = await ethers.getSigners();
  
  // Addresses
  const dragonSwapRouter = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const nativeUsdc = "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392";
  const oldUsdc = "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1";
  const wsei = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  console.log("Deployer:", deployer.address);
  console.log("DragonSwap Router:", dragonSwapRouter);
  
  const router = new ethers.Contract(dragonSwapRouter, DRAGONSWAP_ABI, deployer);
  
  const testAmount = ethers.parseEther("0.01"); // 0.01 SEI
  
  console.log("\n=== Testing Quotes ===");
  
  // Test with native USDC
  try {
    console.log("Testing WSEI -> Native USDC path...");
    const nativePath = [wsei, nativeUsdc];
    const nativeQuote = await router.getAmountsOut(testAmount, nativePath);
    console.log("✅ Native USDC quote:", ethers.formatUnits(nativeQuote[1], 6), "USDC for 0.01 SEI");
    
    // Try actual swap
    console.log("Attempting actual swap...");
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const tx = await router.swapExactNativeForTokens(
      0, // Accept any amount of tokens out
      nativePath,
      deployer.address,
      deadline,
      { value: testAmount }
    );
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Direct swap successful!");
    
  } catch (error) {
    console.log("❌ Native USDC failed:", error.reason || error.message);
  }
  
  // Test with old USDC
  try {
    console.log("\nTesting WSEI -> Old USDC path...");
    const oldPath = [wsei, oldUsdc];
    const oldQuote = await router.getAmountsOut(testAmount, oldPath);
    console.log("✅ Old USDC quote:", ethers.formatUnits(oldQuote[1], 6), "USDC for 0.01 SEI");
    
    // Try actual swap
    console.log("Attempting actual swap...");
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const tx = await router.swapExactNativeForTokens(
      0, // Accept any amount of tokens out
      [wsei, oldUsdc],
      deployer.address,
      deadline,
      { value: testAmount }
    );
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Direct swap successful!");
    
  } catch (error) {
    console.log("❌ Old USDC failed:", error.reason || error.message);
  }
  
  // Test if router address is working at all
  try {
    console.log("\n=== Testing Router Basic Functions ===");
    const code = await ethers.provider.getCode(dragonSwapRouter);
    if (code === "0x") {
      console.log("❌ Router address has no contract code!");
    } else {
      console.log("✅ Router address has contract code");
    }
  } catch (error) {
    console.log("❌ Error checking router:", error.message);
  }
}

// Run test
directSwapTest()
  .then(() => {
    console.log("\nDirect swap test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 