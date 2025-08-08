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

async function testUSDTLiquidity() {
  console.log("=== Testing WSEI/USDT Liquidity on DragonSwap ===");
  
  const [deployer] = await ethers.getSigners();
  
  // Addresses
  const factory = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
  const router = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const usdt = "0x9151434b16b9763660705744891fa906f660ecc5"; // USDT address provided
  const wsei = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  console.log("Factory:", factory);
  console.log("Router:", router);
  console.log("USDT:", usdt);
  console.log("WSEI:", wsei);
  
  // Connect to contracts
  const routerContract = new ethers.Contract(router, DRAGONSWAP_ABI, deployer);
  const factoryContract = new ethers.Contract(factory, FACTORY_ABI, deployer);
  const usdtContract = new ethers.Contract(usdt, ERC20_ABI, deployer);
  const wseiContract = new ethers.Contract(wsei, ERC20_ABI, deployer);
  
  try {
    // Get token info
    console.log("\n=== Token Information ===");
    const usdtSymbol = await usdtContract.symbol();
    const usdtDecimals = await usdtContract.decimals();
    const wseiSymbol = await wseiContract.symbol();
    const wseiDecimals = await wseiContract.decimals();
    
    console.log(`USDT: ${usdtSymbol}, Decimals: ${usdtDecimals}`);
    console.log(`WSEI: ${wseiSymbol}, Decimals: ${wseiDecimals}`);
    
    // Check WSEI/USDT pair
    console.log("\n=== Checking WSEI/USDT Pair ===");
    const pairAddress = await factoryContract.getPair(wsei, usdt);
    console.log("WSEI/USDT Pair Address:", pairAddress);
    
    if (pairAddress !== ethers.ZeroAddress) {
      console.log("✅ WSEI/USDT pair exists!");
      
      // Get pair details
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, deployer);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      console.log("Token0:", token0);
      console.log("Token1:", token1);
      
      // Determine which reserve is which
      const isToken0WSEI = token0.toLowerCase() === wsei.toLowerCase();
      const wseiReserve = isToken0WSEI ? reserves[0] : reserves[1];
      const usdtReserve = isToken0WSEI ? reserves[1] : reserves[0];
      
      console.log("WSEI Reserve:", ethers.formatEther(wseiReserve));
      console.log("USDT Reserve:", ethers.formatUnits(usdtReserve, usdtDecimals));
      
      // Test quote for 4 SEI
      console.log("\n=== Testing Quote ===");
      try {
        const testAmount = ethers.parseEther("4");
        const path = [wsei, usdt];
        const amounts = await routerContract.getAmountsOut(testAmount, path);
        console.log("✅ Quote for 4 WSEI:", ethers.formatUnits(amounts[1], usdtDecimals), "USDT");
        
        // Test direct swap with small amount
        console.log("\n=== Testing Direct Swap ===");
        const smallAmount = ethers.parseEther("0.01"); // 0.01 SEI test
        const deadline = Math.floor(Date.now() / 1000) + 600;
        
        try {
          console.log("Attempting direct swap of 0.01 SEI to USDT...");
          const tx = await routerContract.swapExactNativeForTokens(
            0, // Accept any amount out
            [wsei, usdt],
            deployer.address,
            deadline,
            { value: smallAmount }
          );
          console.log("Transaction hash:", tx.hash);
          await tx.wait();
          console.log("✅ Direct swap successful!");
          
          console.log("\n🎉 USDT pair works perfectly! Ready for AgenticRouter deployment.");
          return true;
          
        } catch (e) {
          console.log("❌ Direct swap failed:", e.message);
        }
        
      } catch (e) {
        console.log("❌ Quote failed:", e.message);
      }
      
    } else {
      console.log("❌ No WSEI/USDT pair found");
      
      // Check other common pairs
      console.log("\n=== Checking Alternative Pairs ===");
      const commonTokens = {
        "WETH": "0x160345fc359604fc6e70e3c5facbde5f7a9342d8",
        "WBTC": "0x0555e30da8f98308edb960aa94c0db47230d2b9c",
        "Native USDC": "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392",
        "Old USDC": "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1"
      };
      
      for (const [name, address] of Object.entries(commonTokens)) {
        try {
          const pairAddr = await factoryContract.getPair(wsei, address);
          if (pairAddr !== ethers.ZeroAddress) {
            console.log(`✅ Found WSEI/${name} pair: ${pairAddr}`);
          } else {
            console.log(`❌ No WSEI/${name} pair`);
          }
        } catch (e) {
          console.log(`❌ Error checking WSEI/${name}:`, e.message);
        }
      }
    }
    
    return false;
    
  } catch (error) {
    console.error("Error testing USDT liquidity:", error.message);
    return false;
  }
}

// Run test
testUSDTLiquidity()
  .then((success) => {
    if (success) {
      console.log("\n✅ USDT liquidity test PASSED! Ready to proceed with deployment.");
    } else {
      console.log("\n❌ USDT liquidity test FAILED. Need to find alternative solution.");
    }
    console.log("\nUSDT liquidity test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 