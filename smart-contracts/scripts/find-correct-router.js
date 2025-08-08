const { ethers } = require("hardhat");
require("dotenv").config();

// Router ABI for testing
const ROUTER_ABI = [
  "function factory() external pure returns (address)",
  "function WETH() external pure returns (address)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

// Factory ABI
const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

async function findCorrectRouter() {
  console.log("=== Finding Correct DragonSwap V2 Router ===");
  
  const [deployer] = await ethers.getSigners();
  
  const correctFactory = "0x0bcea088e977a03113a880cF7c5b6165D8304B16";
  const currentRouter = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  
  // Common DragonSwap router addresses to test
  const possibleRouters = [
    "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428", // Current one
    "0x1234567890123456789012345678901234567890", // Placeholder
    "0xE2c7B0eF57a6eC14D8a9a9B0c8f9F6F5b1d3e4A7", // Possible V2 router
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Standard Uniswap V2 router pattern
  ];
  
  console.log("Correct Factory:", correctFactory);
  console.log("Testing router addresses...\n");
  
  // Test the correct factory directly
  console.log("=== Testing Factory Directly ===");
  const factory = new ethers.Contract(correctFactory, FACTORY_ABI, deployer);
  
  const wsei = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const nativeUsdc = "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392";
  const oldUsdc = "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1";
  
  try {
    const nativePair = await factory.getPair(wsei, nativeUsdc);
    console.log("WSEI/Native USDC pair:", nativePair);
    
    const oldPair = await factory.getPair(wsei, oldUsdc);
    console.log("WSEI/Old USDC pair:", oldPair);
    
    if (nativePair !== ethers.ZeroAddress) {
      console.log("✅ Found WSEI/Native USDC pair in correct factory!");
    }
    if (oldPair !== ethers.ZeroAddress) {
      console.log("✅ Found WSEI/Old USDC pair in correct factory!");
    }
    
    if (nativePair === ethers.ZeroAddress && oldPair === ethers.ZeroAddress) {
      console.log("❌ No USDC pairs found in the correct factory either");
      console.log("This means the liquidity might not exist yet, or we need different token addresses");
    }
    
  } catch (error) {
    console.log("❌ Error testing factory directly:", error.message);
  }
  
  // Test possible router addresses
  console.log("\n=== Testing Router Addresses ===");
  
  for (const routerAddress of possibleRouters) {
    try {
      console.log(`\nTesting router: ${routerAddress}`);
      
      // Check if contract exists
      const code = await ethers.provider.getCode(routerAddress);
      if (code === "0x") {
        console.log("  ❌ No contract at this address");
        continue;
      }
      
      const router = new ethers.Contract(routerAddress, ROUTER_ABI, deployer);
      
      try {
        const routerFactory = await router.factory();
        console.log(`  Factory: ${routerFactory}`);
        console.log(`  Matches correct factory: ${routerFactory.toLowerCase() === correctFactory.toLowerCase()}`);
        
        if (routerFactory.toLowerCase() === correctFactory.toLowerCase()) {
          console.log("  ✅ FOUND MATCHING ROUTER!");
          
          // Test if it can get quotes
          try {
            const testAmount = ethers.parseEther("1");
            const amounts = await router.getAmountsOut(testAmount, [wsei, nativeUsdc]);
            console.log(`  ✅ Quote works: 1 WSEI = ${ethers.formatUnits(amounts[1], 6)} USDC`);
          } catch (e) {
            console.log("  ❌ Quote failed:", e.message);
          }
        }
        
      } catch (e) {
        console.log("  ❌ Could not get factory from router:", e.message);
      }
      
    } catch (error) {
      console.log(`  ❌ Error testing router: ${error.message}`);
    }
  }
  
  // If no router found, provide recommendations
  console.log("\n=== Recommendations ===");
  console.log("If no matching router was found:");
  console.log("1. The router address might be different from standard patterns");
  console.log("2. DragonSwap might use a custom deployment");
  console.log("3. Check DragonSwap documentation for the correct V2 router address");
  console.log("4. The factory you provided might be for a different version");
  console.log("\nPlease provide the correct DragonSwap V2 router address that works with factory:");
  console.log(correctFactory);
}

// Run search
findCorrectRouter()
  .then(() => {
    console.log("\nRouter search completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Search failed:", error);
    process.exit(1);
  }); 