const { ethers } = require("hardhat");
require("dotenv").config();

// DragonSwap Router ABI
const DRAGONSWAP_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function factory() external pure returns (address)"
];

// Factory ABI
const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

// Pair ABI
const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

// ERC20 ABI
const ERC20_ABI = [
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

async function checkNativeUSDCLiquidity() {
  console.log("=== Checking Native USDC Liquidity on DragonSwap ===");
  
  const [deployer] = await ethers.getSigners();
  
  // Updated addresses with native USDC
  const swapRouterAddress = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const nativeUsdcAddress = "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392"; // Native USDC
  const oldUsdcAddress = "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1"; // Old USDC via Noble
  const wseiAddress = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  console.log("DragonSwap Router:", swapRouterAddress);
  console.log("Native USDC Address:", nativeUsdcAddress);
  console.log("Old USDC Address:", oldUsdcAddress);
  console.log("WSEI Address:", wseiAddress);
  
  // Connect to contracts
  const router = new ethers.Contract(swapRouterAddress, DRAGONSWAP_ABI, deployer);
  const nativeUsdc = new ethers.Contract(nativeUsdcAddress, ERC20_ABI, deployer);
  const oldUsdc = new ethers.Contract(oldUsdcAddress, ERC20_ABI, deployer);
  const wsei = new ethers.Contract(wseiAddress, ERC20_ABI, deployer);
  
  try {
    // Get token info
    const nativeUsdcSymbol = await nativeUsdc.symbol();
    const oldUsdcSymbol = await oldUsdc.symbol();
    const wseiSymbol = await wsei.symbol();
    
    console.log("\n=== Token Information ===");
    console.log(`Native USDC: ${nativeUsdcSymbol}`);
    console.log(`Old USDC: ${oldUsdcSymbol}`);
    console.log(`WSEI: ${wseiSymbol}`);
    
    // Get factory address
    const factoryAddress = await router.factory();
    console.log("Factory Address:", factoryAddress);
    
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, deployer);
    
    // Check both USDC pairs
    console.log("\n=== Checking Pairs ===");
    
    // Check WSEI/Native USDC pair
    const nativePairAddress = await factory.getPair(wseiAddress, nativeUsdcAddress);
    console.log("WSEI/Native USDC Pair:", nativePairAddress);
    
    // Check WSEI/Old USDC pair
    const oldPairAddress = await factory.getPair(wseiAddress, oldUsdcAddress);
    console.log("WSEI/Old USDC Pair:", oldPairAddress);
    
    if (nativePairAddress === ethers.ZeroAddress) {
      console.log("❌ No WSEI/Native USDC pair found!");
    } else {
      console.log("✅ WSEI/Native USDC pair exists!");
      const pair = new ethers.Contract(nativePairAddress, PAIR_ABI, deployer);
      const reserves = await pair.getReserves();
      console.log("  Reserves:", ethers.formatEther(reserves[0]), "/", ethers.formatUnits(reserves[1], 6));
    }
    
    if (oldPairAddress === ethers.ZeroAddress) {
      console.log("❌ No WSEI/Old USDC pair found!");
    } else {
      console.log("✅ WSEI/Old USDC pair exists!");
      const pair = new ethers.Contract(oldPairAddress, PAIR_ABI, deployer);
      const reserves = await pair.getReserves();
      console.log("  Reserves:", ethers.formatEther(reserves[0]), "/", ethers.formatUnits(reserves[1], 6));
    }
    
    // Test quotes for both
    console.log("\n=== Testing Quotes ===");
    const testAmount = ethers.parseEther("0.1");
    
    try {
      const nativePath = [wseiAddress, nativeUsdcAddress];
      const nativeAmounts = await router.getAmountsOut(testAmount, nativePath);
      console.log("✅ Native USDC quote for 0.1 WSEI:", ethers.formatUnits(nativeAmounts[1], 6), "USDC");
    } catch (e) {
      console.log("❌ Native USDC quote failed:", e.reason || e.message);
    }
    
    try {
      const oldPath = [wseiAddress, oldUsdcAddress];
      const oldAmounts = await router.getAmountsOut(testAmount, oldPath);
      console.log("✅ Old USDC quote for 0.1 WSEI:", ethers.formatUnits(oldAmounts[1], 6), "USDC");
    } catch (e) {
      console.log("❌ Old USDC quote failed:", e.reason || e.message);
    }
    
    // Check other DEXs or suggest alternatives
    console.log("\n=== Recommendations ===");
    if (nativePairAddress === ethers.ZeroAddress && oldPairAddress !== ethers.ZeroAddress) {
      console.log("💡 Suggestion: Use old USDC address for now, native USDC might not have liquidity yet");
    } else if (nativePairAddress !== ethers.ZeroAddress) {
      console.log("💡 Native USDC pair exists, there might be another issue");
    } else {
      console.log("💡 Neither USDC has liquidity on DragonSwap, might need to use a different DEX");
    }
    
  } catch (error) {
    console.error("Error checking liquidity:", error.message);
  }
}

// Run check
checkNativeUSDCLiquidity()
  .then(() => {
    console.log("\nNative USDC liquidity check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  }); 