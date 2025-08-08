const { ethers } = require("hardhat");
const { getGasConfig } = require("./utils/gasUtils");
require("dotenv").config();

// Contract ABIs
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
  "function factory() external view returns (address)",
  "function swapRouter() external view returns (address)",
  "function getBestFeeTier(address tokenA, address tokenB) external view returns (uint24 fee)",
  "function getPoolInfo(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress, uint128 liquidity, uint160 sqrtPriceX96)",
  "function WSEI() external view returns (address)",
  "function stablecoin() external view returns (address)"
];

const DRAGONSWAP_ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

const ERC20_ABI = [
  "function balanceOf(address) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

async function debugSwapIssue() {
  console.log("=== Debugging Swap Issue ===");
  
  const [deployer] = await ethers.getSigners();
  const contractAddress = "0x1008C94276027757EA33AC8C0f2BC3a31191ebD9";
  
  console.log("Deployer:", deployer.address);
  console.log("Contract:", contractAddress);
  
  // Connect to contracts
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);
  
  try {
    // Get contract addresses
    const wseiAddress = await agenticRouter.WSEI();
    const usdcAddress = await agenticRouter.stablecoin();
    const routerAddress = await agenticRouter.swapRouter();
    const factoryAddress = await agenticRouter.factory();
    
    console.log("\n=== Contract Addresses ===");
    console.log("WSEI:", wseiAddress);
    console.log("USDC:", usdcAddress);
    console.log("Router:", routerAddress);
    console.log("Factory:", factoryAddress);
    
    // Check pool information
    const bestFeeTier = await agenticRouter.getBestFeeTier(wseiAddress, usdcAddress);
    console.log("\nBest fee tier:", bestFeeTier.toString());
    
    const [exists, poolAddress, liquidity, sqrtPriceX96] = await agenticRouter.getPoolInfo(
      wseiAddress, 
      usdcAddress, 
      bestFeeTier
    );
    
    console.log("\n=== Pool Information ===");
    console.log("Pool exists:", exists);
    console.log("Pool address:", poolAddress);
    console.log("Liquidity:", liquidity.toString());
    console.log("SqrtPriceX96:", sqrtPriceX96.toString());
    
    if (liquidity == 0n) {
      console.log("❌ Pool has no liquidity! This explains the swap failure.");
      
      // Check other fee tiers
      console.log("\n=== Checking All Fee Tiers ===");
      const feeTiers = [500, 3000, 10000];
      
      for (const fee of feeTiers) {
        const [exists, poolAddr, liq, price] = await agenticRouter.getPoolInfo(
          wseiAddress, 
          usdcAddress, 
          fee
        );
        console.log(`Fee ${fee}: exists=${exists}, liquidity=${liq.toString()}, pool=${poolAddr}`);
      }
    }
    
    // Test direct DragonSwap V2 call
    console.log("\n=== Testing Direct DragonSwap V2 Call ===");
    
    const dragonswapRouter = new ethers.Contract(routerAddress, DRAGONSWAP_ROUTER_ABI, deployer);
    
    // Try a small direct swap
    const swapAmount = ethers.parseEther("0.1"); // 0.1 SEI
    
    try {
      const params = {
        tokenIn: wseiAddress,
        tokenOut: usdcAddress,
        fee: bestFeeTier,
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 300,
        amountIn: swapAmount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      };
      
      console.log("Direct swap params:", params);
      
      // Estimate gas first
      try {
        const gasEstimate = await dragonswapRouter.exactInputSingle.estimateGas(params, { value: swapAmount });
        console.log("Gas estimate for direct swap:", gasEstimate.toString());
        
        // Try the actual swap
        const tx = await dragonswapRouter.exactInputSingle(params, { 
          value: swapAmount,
          gasLimit: gasEstimate * 2n // Double the gas limit
        });
        
        console.log("Direct swap transaction:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Direct swap successful!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
      } catch (gasError) {
        console.log("❌ Gas estimation failed:", gasError.message);
        
        // Check if it's a revert with reason
        if (gasError.data) {
          console.log("Error data:", gasError.data);
        }
      }
      
    } catch (error) {
      console.log("❌ Direct swap failed:", error.message);
    }
    
    // Check SEI and USDC balances
    console.log("\n=== Balance Check ===");
    const seiBalance = await ethers.provider.getBalance(deployer.address);
    console.log("SEI balance:", ethers.formatEther(seiBalance));
    
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const usdcDecimals = await usdc.decimals();
    console.log("USDC balance:", ethers.formatUnits(usdcBalance, usdcDecimals));
    
    // Check if we need to find pools with liquidity on other routes
    console.log("\n=== Alternative Route Analysis ===");
    
    // Common tokens on Sei
    const commonTokens = {
      "WBTC": "0x0555e30da8f98308edb960aa94c0db47230d2b9c",
      "WETH": "0x160345fc359604fc6e70e3c5facbde5f7a9342d8"
    };
    
    for (const [symbol, address] of Object.entries(commonTokens)) {
      console.log(`\nChecking ${symbol} route:`);
      
      // Check WSEI -> Token
      for (const fee of [500, 3000, 10000]) {
        const [exists1, , liq1] = await agenticRouter.getPoolInfo(wseiAddress, address, fee);
        if (exists1 && liq1 > 0) {
          console.log(`  WSEI/${symbol} (${fee}): liquidity=${liq1.toString()}`);
        }
      }
      
      // Check Token -> USDC
      for (const fee of [500, 3000, 10000]) {
        const [exists2, , liq2] = await agenticRouter.getPoolInfo(address, usdcAddress, fee);
        if (exists2 && liq2 > 0) {
          console.log(`  ${symbol}/USDC (${fee}): liquidity=${liq2.toString()}`);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
  }
}

// Run debug
debugSwapIssue()
  .then(() => {
    console.log("\n🔍 Debug completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Debug failed:", error);
    process.exit(1);
  }); 