const { ethers } = require("hardhat");
const { getGasConfig } = require("./utils/gasUtils");
require("dotenv").config();

// Contract ABI
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
  "function isAgent(address) external view returns (bool)",
  "function findMinFee(address tokenA, address tokenB) external view returns (uint24 minFee)",
  "function findPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "function getPoolInfo(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress, uint128 liquidity, uint160 sqrtPriceX96)",
  "function WSEI() external view returns (address)",
  "function stablecoin() external view returns (address)"
];

const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

async function testSimpleSwap() {
  console.log("=== Simple SEI to USDC Swap Test ===");
  
  const [signer] = await ethers.getSigners();
  const contractAddress = "0x2AD53aB91cAA4f73F61520858B7955870a3197Fb";
  
  console.log("Signer:", signer.address);
  console.log("Contract:", contractAddress);
  
  // Connect to contract
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, signer);
  
  try {
    // Get addresses
    const wseiAddress = await agenticRouter.WSEI();
    const usdcAddress = await agenticRouter.stablecoin();
    
    console.log("WSEI:", wseiAddress);
    console.log("USDC:", usdcAddress);
    
    // Check agent status (use the pre-registered agent from deployment)
    const agentAddress = "0x9e275f93927a53da3b355ec04afb31fc8d87a70f"; // From deployment logs
    const isAgent = await agenticRouter.isAgent(agentAddress);
    console.log("Pre-registered agent:", agentAddress);
    console.log("Is registered:", isAgent);
    
    // If we need to use the registered agent, we'd need to use that signer
    // For now, let's check pool information
    
    console.log("\n=== Pool Discovery ===");
    const feeTiers = [100, 500, 3000, 10000];
    
    // Check WSEI/USDC pools
    console.log("WSEI/USDC pools:");
    for (const fee of feeTiers) {
      try {
        const poolAddress = await agenticRouter.findPool(wseiAddress, usdcAddress, fee);
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          const [exists, , liquidity] = await agenticRouter.getPoolInfo(wseiAddress, usdcAddress, fee);
          console.log(`  Fee ${fee} (${fee/10000}%): Pool ${poolAddress}`);
          console.log(`    Exists: ${exists}, Liquidity: ${liquidity.toString()}`);
        } else {
          console.log(`  Fee ${fee} (${fee/10000}%): No pool`);
        }
      } catch (error) {
        console.log(`  Fee ${fee}: Error -`, error.message);
      }
    }
    
    // Check WSEI/WETH pools (alternative route)
    const wethAddress = "0x160345fc359604fc6e70e3c5facbde5f7a9342d8";
    console.log("\nWSEI/WETH pools:");
    for (const fee of feeTiers) {
      try {
        const poolAddress = await agenticRouter.findPool(wseiAddress, wethAddress, fee);
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          const [exists, , liquidity] = await agenticRouter.getPoolInfo(wseiAddress, wethAddress, fee);
          if (liquidity > 0) {
            console.log(`  Fee ${fee} (${fee/10000}%): Pool ${poolAddress}, Liquidity: ${liquidity.toString()}`);
          }
        }
      } catch (error) {
        // Pool doesn't exist
      }
    }
    
    // Check WETH/USDC pools
    console.log("\nWETH/USDC pools:");
    for (const fee of feeTiers) {
      try {
        const poolAddress = await agenticRouter.findPool(wethAddress, usdcAddress, fee);
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          const [exists, , liquidity] = await agenticRouter.getPoolInfo(wethAddress, usdcAddress, fee);
          if (liquidity > 0) {
            console.log(`  Fee ${fee} (${fee/10000}%): Pool ${poolAddress}, Liquidity: ${liquidity.toString()}`);
          }
        }
      } catch (error) {
        // Pool doesn't exist
      }
    }
    
    // Try to find minimum fee
    try {
      const minFee = await agenticRouter.findMinFee(wseiAddress, usdcAddress);
      console.log("\nMinimum fee for WSEI/USDC:", minFee.toString(), `(${Number(minFee)/10000}%)`);
    } catch (error) {
      console.log("\n❌ No direct WSEI/USDC pool found");
      
      // Check if we can route through WETH
      try {
        const minFee1 = await agenticRouter.findMinFee(wseiAddress, wethAddress);
        const minFee2 = await agenticRouter.findMinFee(wethAddress, usdcAddress);
        console.log("✅ Route available: WSEI → WETH → USDC");
        console.log(`  WSEI → WETH: ${minFee1} (${Number(minFee1)/10000}%)`);
        console.log(`  WETH → USDC: ${minFee2} (${Number(minFee2)/10000}%)`);
      } catch (routeError) {
        console.log("❌ No routing path available");
      }
    }
    
    // Generate inputs for manual testing
    console.log("\n=== Manual Test Inputs ===");
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    console.log("For external website testing:");
    console.log("Contract Address:", contractAddress);
    console.log("tokenOut:", usdcAddress);
    console.log("amountOutMin: 0");
    console.log("recipient:", signer.address);
    console.log("deadline:", deadline);
    console.log("Send native SEI:", ethers.parseEther("0.1").toString());
    console.log("");
    console.log("Note: You need to use an agent address that's registered in the contract");
    console.log("Registered agent from deployment:", agentAddress);
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testSimpleSwap()
  .then(() => {
    console.log("\n✅ Analysis completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  }); 