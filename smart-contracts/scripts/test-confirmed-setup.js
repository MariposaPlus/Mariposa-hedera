const { ethers } = require("hardhat");
require("dotenv").config();

// DragonSwap Router ABI
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

async function testConfirmedSetup() {
  console.log("=== Testing with Confirmed Correct Factory and Router ===");
  
  const [deployer] = await ethers.getSigners();
  
  // CONFIRMED CORRECT ADDRESSES
  const factory = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
  const router = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const nativeUsdc = "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392";
  const oldUsdc = "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1";
  const wsei = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  console.log("✅ CONFIRMED ADDRESSES:");
  console.log("Factory:", factory);
  console.log("Router:", router);
  console.log("Native USDC:", nativeUsdc);
  console.log("Old USDC:", oldUsdc);
  console.log("WSEI:", wsei);
  
  // Connect to contracts
  const routerContract = new ethers.Contract(router, DRAGONSWAP_ABI, deployer);
  const factoryContract = new ethers.Contract(factory, FACTORY_ABI, deployer);
  
  try {
    // Verify router points to correct factory
    const routerFactory = await routerContract.factory();
    console.log("\n=== Verification ===");
    console.log("Router's factory:", routerFactory);
    console.log("Expected factory:", factory);
    console.log("Factory match:", routerFactory.toLowerCase() === factory.toLowerCase() ? "✅ YES" : "❌ NO");
    
    console.log("\n=== Checking Liquidity Pools ===");
    
    // Check WSEI/Native USDC pair
    console.log("Checking WSEI/Native USDC pair...");
    try {
      const nativePairAddress = await factoryContract.getPair(wsei, nativeUsdc);
      console.log("WSEI/Native USDC Pair:", nativePairAddress);
      
      if (nativePairAddress !== ethers.ZeroAddress) {
        console.log("✅ WSEI/Native USDC pair exists!");
        const pair = new ethers.Contract(nativePairAddress, PAIR_ABI, deployer);
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        console.log("  Token0:", token0);
        console.log("  Token1:", token1);
        
        // Determine which reserve is which
        const isToken0WSEI = token0.toLowerCase() === wsei.toLowerCase();
        const wseiReserve = isToken0WSEI ? reserves[0] : reserves[1];
        const usdcReserve = isToken0WSEI ? reserves[1] : reserves[0];
        
        console.log("  WSEI Reserve:", ethers.formatEther(wseiReserve));
        console.log("  USDC Reserve:", ethers.formatUnits(usdcReserve, 6));
        
        // Test quote
        try {
          const testAmount = ethers.parseEther("4");
          const path = [wsei, nativeUsdc];
          const amounts = await routerContract.getAmountsOut(testAmount, path);
          console.log("  ✅ Quote for 4 WSEI:", ethers.formatUnits(amounts[1], 6), "Native USDC");
          
          // If quote works, we can proceed with the swap test
          console.log("\n🎉 Native USDC pair has liquidity and quotes work!");
          return { usesNativeUsdc: true, usdcAddress: nativeUsdc };
          
        } catch (e) {
          console.log("  ❌ Quote failed:", e.message);
        }
      } else {
        console.log("❌ No WSEI/Native USDC pair found");
      }
    } catch (e) {
      console.log("❌ Error checking native USDC pair:", e.message);
    }
    
    // Check WSEI/Old USDC pair
    console.log("\nChecking WSEI/Old USDC pair...");
    try {
      const oldPairAddress = await factoryContract.getPair(wsei, oldUsdc);
      console.log("WSEI/Old USDC Pair:", oldPairAddress);
      
      if (oldPairAddress !== ethers.ZeroAddress) {
        console.log("✅ WSEI/Old USDC pair exists!");
        const pair = new ethers.Contract(oldPairAddress, PAIR_ABI, deployer);
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        console.log("  Token0:", token0);
        console.log("  Token1:", token1);
        
        // Determine which reserve is which
        const isToken0WSEI = token0.toLowerCase() === wsei.toLowerCase();
        const wseiReserve = isToken0WSEI ? reserves[0] : reserves[1];
        const usdcReserve = isToken0WSEI ? reserves[1] : reserves[0];
        
        console.log("  WSEI Reserve:", ethers.formatEther(wseiReserve));
        console.log("  USDC Reserve:", ethers.formatUnits(usdcReserve, 6));
        
        // Test quote
        try {
          const testAmount = ethers.parseEther("4");
          const path = [wsei, oldUsdc];
          const amounts = await routerContract.getAmountsOut(testAmount, path);
          console.log("  ✅ Quote for 4 WSEI:", ethers.formatUnits(amounts[1], 6), "Old USDC");
          
          // If quote works, we can proceed with the swap test
          console.log("\n🎉 Old USDC pair has liquidity and quotes work!");
          return { usesNativeUsdc: false, usdcAddress: oldUsdc };
          
        } catch (e) {
          console.log("  ❌ Quote failed:", e.message);
        }
      } else {
        console.log("❌ No WSEI/Old USDC pair found");
      }
    } catch (e) {
      console.log("❌ Error checking old USDC pair:", e.message);
    }
    
    // If we get here, neither pair worked
    console.log("\n❌ No working WSEI/USDC pairs found");
    console.log("Possible issues:");
    console.log("1. No liquidity pools exist for WSEI/USDC on this DEX");
    console.log("2. Token addresses might be incorrect");
    console.log("3. Liquidity might be on a different DEX");
    
    return null;
    
  } catch (error) {
    console.error("Error testing confirmed setup:", error.message);
    return null;
  }
}

// Run test
testConfirmedSetup()
  .then((result) => {
    if (result) {
      console.log(`\n✅ SUCCESS: Found working setup with ${result.usesNativeUsdc ? 'Native' : 'Old'} USDC`);
      console.log(`USDC Address to use: ${result.usdcAddress}`);
    } else {
      console.log("\n❌ No working setup found");
    }
    console.log("\nConfirmed setup test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 