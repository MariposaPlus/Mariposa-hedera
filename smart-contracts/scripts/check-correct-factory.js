const { ethers } = require("hardhat");
require("dotenv").config();

// DragonSwap V2 Router ABI
const DRAGONSWAP_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function factory() external pure returns (address)",
  "function swapExactNativeForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
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

async function checkCorrectFactory() {
  console.log("=== Checking Liquidity with Correct Factory Address ===");
  
  const [deployer] = await ethers.getSigners();
  
  // Addresses
  const dragonSwapRouter = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const correctFactory = "0x0bcea088e977a03113a880cF7c5b6165D8304B16"; // Correct V2 factory
  const nativeUsdc = "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392";
  const oldUsdc = "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1";
  const wsei = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  console.log("DragonSwap Router:", dragonSwapRouter);
  console.log("Correct Factory V2:", correctFactory);
  console.log("Native USDC:", nativeUsdc);
  console.log("Old USDC:", oldUsdc);
  console.log("WSEI:", wsei);
  
  // Connect to contracts
  const router = new ethers.Contract(dragonSwapRouter, DRAGONSWAP_ABI, deployer);
  const factory = new ethers.Contract(correctFactory, FACTORY_ABI, deployer);
  
  try {
    // Check what factory the router thinks it's using
    try {
      const routerFactory = await router.factory();
      console.log("Router's factory address:", routerFactory);
      console.log("Correct factory address:", correctFactory);
      console.log("Factory addresses match:", routerFactory.toLowerCase() === correctFactory.toLowerCase());
    } catch (e) {
      console.log("Could not get factory from router:", e.message);
    }
    
    console.log("\n=== Checking Pairs with Correct Factory ===");
    
    // Check WSEI/Native USDC pair
    console.log("Checking WSEI/Native USDC pair...");
    const nativePairAddress = await factory.getPair(wsei, nativeUsdc);
    console.log("WSEI/Native USDC Pair:", nativePairAddress);
    
    if (nativePairAddress !== ethers.ZeroAddress) {
      console.log("✅ WSEI/Native USDC pair exists!");
      const pair = new ethers.Contract(nativePairAddress, PAIR_ABI, deployer);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      console.log("  Token0:", token0);
      console.log("  Token1:", token1);
      console.log("  Reserve0:", ethers.formatEther(reserves[0]));
      console.log("  Reserve1:", ethers.formatUnits(reserves[1], token1.toLowerCase() === nativeUsdc.toLowerCase() ? 6 : 18));
      
      // Test quote
      try {
        const testAmount = ethers.parseEther("4");
        const path = [wsei, nativeUsdc];
        const amounts = await router.getAmountsOut(testAmount, path);
        console.log("  ✅ Quote for 4 WSEI:", ethers.formatUnits(amounts[1], 6), "Native USDC");
      } catch (e) {
        console.log("  ❌ Quote failed:", e.message);
      }
    } else {
      console.log("❌ No WSEI/Native USDC pair found");
    }
    
    // Check WSEI/Old USDC pair
    console.log("\nChecking WSEI/Old USDC pair...");
    const oldPairAddress = await factory.getPair(wsei, oldUsdc);
    console.log("WSEI/Old USDC Pair:", oldPairAddress);
    
    if (oldPairAddress !== ethers.ZeroAddress) {
      console.log("✅ WSEI/Old USDC pair exists!");
      const pair = new ethers.Contract(oldPairAddress, PAIR_ABI, deployer);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      console.log("  Token0:", token0);
      console.log("  Token1:", token1);
      console.log("  Reserve0:", ethers.formatEther(reserves[0]));
      console.log("  Reserve1:", ethers.formatUnits(reserves[1], token1.toLowerCase() === oldUsdc.toLowerCase() ? 6 : 18));
      
      // Test quote
      try {
        const testAmount = ethers.parseEther("4");
        const path = [wsei, oldUsdc];
        const amounts = await router.getAmountsOut(testAmount, path);
        console.log("  ✅ Quote for 4 WSEI:", ethers.formatUnits(amounts[1], 6), "Old USDC");
      } catch (e) {
        console.log("  ❌ Quote failed:", e.message);
      }
    } else {
      console.log("❌ No WSEI/Old USDC pair found");
    }
    
    // Test direct swap if we found working pairs
    if (nativePairAddress !== ethers.ZeroAddress || oldPairAddress !== ethers.ZeroAddress) {
      console.log("\n=== Testing Direct Swap ===");
      const testAmount = ethers.parseEther("0.01"); // Small test amount
      const deadline = Math.floor(Date.now() / 1000) + 600;
      
      const workingUsdc = nativePairAddress !== ethers.ZeroAddress ? nativeUsdc : oldUsdc;
      const workingPairName = nativePairAddress !== ethers.ZeroAddress ? "Native USDC" : "Old USDC";
      
      try {
        console.log(`Attempting direct swap to ${workingPairName}...`);
        const tx = await router.swapExactNativeForTokens(
          0, // Accept any amount out
          [wsei, workingUsdc],
          deployer.address,
          deadline,
          { value: testAmount }
        );
        console.log("Transaction hash:", tx.hash);
        await tx.wait();
        console.log("✅ Direct swap successful!");
      } catch (e) {
        console.log("❌ Direct swap failed:", e.message);
      }
    }
    
  } catch (error) {
    console.error("Error checking factory:", error.message);
  }
}

// Run check
checkCorrectFactory()
  .then(() => {
    console.log("\nCorrect factory check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  }); 