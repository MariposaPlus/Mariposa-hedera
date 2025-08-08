const { ethers } = require("hardhat");
require("dotenv").config();

// DragonSwap Router ABI
const DRAGONSWAP_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function factory() external pure returns (address)",
  "function WETH() external pure returns (address)"
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
  "function decimals() external view returns (uint8)",
  "function balanceOf(address) external view returns (uint256)"
];

async function checkLiquidity() {
  console.log("=== Checking DragonSwap Liquidity ===");
  
  const [deployer] = await ethers.getSigners();
  
  // Addresses from deployment
  const swapRouterAddress = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const usdcAddress = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
  const wseiAddress = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  
  console.log("DragonSwap Router:", swapRouterAddress);
  console.log("USDC Address:", usdcAddress);
  console.log("WSEI Address:", wseiAddress);
  
  // Connect to contracts
  const router = new ethers.Contract(swapRouterAddress, DRAGONSWAP_ABI, deployer);
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
  const wsei = new ethers.Contract(wseiAddress, ERC20_ABI, deployer);
  
  try {
    // Get token info
    const usdcSymbol = await usdc.symbol();
    const usdcDecimals = await usdc.decimals();
    const wseiSymbol = await wsei.symbol();
    const wseiDecimals = await wsei.decimals();
    
    console.log("\n=== Token Information ===");
    console.log(`USDC: ${usdcSymbol}, Decimals: ${usdcDecimals}`);
    console.log(`WSEI: ${wseiSymbol}, Decimals: ${wseiDecimals}`);
    
    // Get factory address
    const factoryAddress = await router.factory();
    console.log("Factory Address:", factoryAddress);
    
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, deployer);
    
    // Check if WSEI/USDC pair exists
    const pairAddress = await factory.getPair(wseiAddress, usdcAddress);
    console.log("WSEI/USDC Pair Address:", pairAddress);
    
    if (pairAddress === ethers.ZeroAddress) {
      console.error("❌ No WSEI/USDC pair found on DragonSwap!");
      console.log("This explains why the swap is failing.");
      
      // Let's check what pairs exist with WSEI
      console.log("\n=== Checking alternative tokens ===");
      
      // Common token addresses on Sei
      const commonTokens = {
        "USDT": "0x2A93cFD1c1b5a4DDDd39b95bf57Af72C20eA52c9",
        "USDC_ALT": "0x2F8b82d6d9567eE31A6eE72D13e0120cC48E1F7a", // Alternative USDC
        "WBTC": "0x0555e30da8f98308edb960aa94c0db47230d2b9c",
        "WETH": "0x160345fc359604fc6e70e3c5facbde5f7a9342d8"
      };
      
      for (const [name, address] of Object.entries(commonTokens)) {
        try {
          const pairAddr = await factory.getPair(wseiAddress, address);
          if (pairAddr !== ethers.ZeroAddress) {
            console.log(`✅ Found ${name}/WSEI pair:`, pairAddr);
            
            // Check reserves
            const pair = new ethers.Contract(pairAddr, PAIR_ABI, deployer);
            const reserves = await pair.getReserves();
            console.log(`  Reserves: ${ethers.formatEther(reserves[0])} / ${ethers.formatEther(reserves[1])}`);
          }
        } catch (e) {
          console.log(`❌ Error checking ${name}:`, e.message);
        }
      }
      
    } else {
      console.log("✅ WSEI/USDC pair exists!");
      
      // Check reserves
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, deployer);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      console.log("Token0:", token0);
      console.log("Token1:", token1);
      console.log("Reserves0:", ethers.formatEther(reserves[0]));
      console.log("Reserves1:", ethers.formatUnits(reserves[1], 6)); // Assuming USDC is 6 decimals
      
      // Test a small quote
      try {
        const testAmount = ethers.parseEther("0.1");
        const path = [wseiAddress, usdcAddress];
        const amounts = await router.getAmountsOut(testAmount, path);
        console.log("✅ Quote works for 0.1 WSEI:", ethers.formatUnits(amounts[1], 6), "USDC");
      } catch (e) {
        console.error("❌ Quote still fails:", e.message);
      }
    }
    
  } catch (error) {
    console.error("Error checking liquidity:", error.message);
  }
}

// Run check
checkLiquidity()
  .then(() => {
    console.log("\nLiquidity check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  }); 