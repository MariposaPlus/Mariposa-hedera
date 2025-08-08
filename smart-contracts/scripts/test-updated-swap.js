const { ethers } = require("hardhat");
const { getGasConfig } = require("./utils/gasUtils");
require("dotenv").config();

// Updated Contract ABI for the new AgenticRouter
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
  "function isAgent(address) external view returns (bool)",
  "function registerAgent(address agent, bool allowed) external",
  "function findMinFee(address tokenA, address tokenB) external view returns (uint24 minFee)",
  "function findPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "function getBestFeeTier(address tokenA, address tokenB) external view returns (uint24 fee)",
  "function getPoolInfo(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress, uint128 liquidity, uint160 sqrtPriceX96)",
  "function WSEI() external view returns (address)",
  "function stablecoin() external view returns (address)",
  "function swapRouter() external view returns (address)",
  "function factory() external view returns (address)"
];

const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

async function testUpdatedSwap() {
  console.log("=== Testing Updated AgenticRouter with DragonSwap V2 ===");
  
  const [deployer] = await ethers.getSigners();
  const contractAddress = "0x2AD53aB91cAA4f73F61520858B7955870a3197Fb"; // New deployed contract
  
  console.log("Deployer:", deployer.address);
  console.log("Contract:", contractAddress);
  
  // Connect to contract
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);
  
  try {
    // Get contract info
    const wseiAddress = await agenticRouter.WSEI();
    const usdcAddress = await agenticRouter.stablecoin();
    const routerAddress = await agenticRouter.swapRouter();
    const factoryAddress = await agenticRouter.factory();
    
    console.log("\n=== Contract Information ===");
    console.log("WSEI:", wseiAddress);
    console.log("USDC:", usdcAddress);
    console.log("Router:", routerAddress);
    console.log("Factory:", factoryAddress);
    
    // Check if deployer is registered as agent
    const isAgentRegistered = await agenticRouter.isAgent(deployer.address);
    console.log("\n=== Agent Status ===");
    console.log("Is deployer registered as agent:", isAgentRegistered);
    
    if (!isAgentRegistered) {
      console.log("Registering deployer as agent...");
      const tx = await agenticRouter.registerAgent(deployer.address, true);
      await tx.wait();
      console.log("✅ Deployer registered as agent!");
    }
    
    // Test new pool discovery functions
    console.log("\n=== Testing Pool Discovery Functions ===");
    
    // 1. Find minimum fee for WSEI/USDC
    try {
      const minFee = await agenticRouter.findMinFee(wseiAddress, usdcAddress);
      console.log("Minimum fee for WSEI/USDC:", minFee.toString(), `(${Number(minFee) / 10000}%)`);
    } catch (error) {
      console.log("❌ No direct pool exists for WSEI/USDC");
    }
    
    // 2. Check all fee tiers for WSEI/USDC
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    console.log("\n=== WSEI/USDC Pool Analysis ===");
    
    for (const fee of feeTiers) {
      try {
        const poolAddress = await agenticRouter.findPool(wseiAddress, usdcAddress, fee);
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          const [exists, , liquidity, sqrtPriceX96] = await agenticRouter.getPoolInfo(
            wseiAddress, 
            usdcAddress, 
            fee
          );
          console.log(`Fee ${fee} (${fee / 10000}%):`);
          console.log(`  - Pool: ${poolAddress}`);
          console.log(`  - Exists: ${exists}`);
          console.log(`  - Liquidity: ${liquidity.toString()}`);
          console.log(`  - Price: ${sqrtPriceX96.toString()}`);
        } else {
          console.log(`Fee ${fee} (${fee / 10000}%): No pool`);
        }
      } catch (error) {
        console.log(`Fee ${fee}: Error -`, error.message);
      }
    }
    
    // 3. Check alternative routes through WETH
    const wethAddress = "0x160345fc359604fc6e70e3c5facbde5f7a9342d8";
    console.log("\n=== Alternative Routes Analysis ===");
    
    console.log("WSEI → WETH pools:");
    for (const fee of feeTiers) {
      try {
        const poolAddress = await agenticRouter.findPool(wseiAddress, wethAddress, fee);
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          const [, , liquidity] = await agenticRouter.getPoolInfo(wseiAddress, wethAddress, fee);
          if (liquidity > 0) {
            console.log(`  Fee ${fee}: Pool ${poolAddress}, Liquidity: ${liquidity.toString()}`);
          }
        }
      } catch (error) {
        console.log(`  Fee ${fee}: No pool`);
      }
    }
    
    console.log("WETH → USDC pools:");
    for (const fee of feeTiers) {
      try {
        const poolAddress = await agenticRouter.findPool(wethAddress, usdcAddress, fee);
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          const [, , liquidity] = await agenticRouter.getPoolInfo(wethAddress, usdcAddress, fee);
          if (liquidity > 0) {
            console.log(`  Fee ${fee}: Pool ${poolAddress}, Liquidity: ${liquidity.toString()}`);
          }
        }
      } catch (error) {
        console.log(`  Fee ${fee}: No pool`);
      }
    }
    
    // 4. Test actual swap
    console.log("\n=== Testing SEI to USDC Swap ===");
    
    const swapAmount = ethers.parseEther("0.1"); // 0.1 SEI
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    console.log("Swap amount:", ethers.formatEther(swapAmount), "SEI");
    console.log("Deadline:", new Date(deadline * 1000).toLocaleString());
    
    // Check initial balances
    const initialSei = await ethers.provider.getBalance(deployer.address);
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
    const initialUsdc = await usdc.balanceOf(deployer.address);
    const usdcDecimals = await usdc.decimals();
    
    console.log("Initial SEI balance:", ethers.formatEther(initialSei));
    console.log("Initial USDC balance:", ethers.formatUnits(initialUsdc, usdcDecimals));
    
    try {
      // Estimate gas first
      console.log("\nEstimating gas for swap...");
      const gasEstimate = await agenticRouter.swapSeiToToken.estimateGas(
        usdcAddress,
        0, // Accept any amount
        deployer.address,
        deadline,
        { value: swapAmount }
      );
      console.log("Gas estimate:", gasEstimate.toString());
      
      // Execute swap
      console.log("Executing swap...");
      const gasConfig = await getGasConfig(ethers.provider, Number(gasEstimate) * 2);
      
      const tx = await agenticRouter.swapSeiToToken(
        usdcAddress,
        0, // Accept any amount for testing
        deployer.address,
        deadline,
        {
          value: swapAmount,
          ...gasConfig
        }
      );
      
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("✅ Swap successful!");
      console.log("Block:", receipt.blockNumber);
      console.log("Gas used:", receipt.gasUsed.toString());
      
      // Check final balances
      const finalSei = await ethers.provider.getBalance(deployer.address);
      const finalUsdc = await usdc.balanceOf(deployer.address);
      
      console.log("\n=== Swap Results ===");
      console.log("Final SEI balance:", ethers.formatEther(finalSei));
      console.log("Final USDC balance:", ethers.formatUnits(finalUsdc, usdcDecimals));
      
      const seiUsed = initialSei - finalSei;
      const usdcReceived = finalUsdc - initialUsdc;
      
      console.log("SEI used:", ethers.formatEther(seiUsed));
      console.log("USDC received:", ethers.formatUnits(usdcReceived, usdcDecimals));
      
      if (usdcReceived > 0) {
        const rate = Number(ethers.formatUnits(usdcReceived, usdcDecimals)) / Number(ethers.formatEther(swapAmount));
        console.log("Effective rate:", rate.toFixed(6), "USDC per SEI");
        console.log("🎉 Swap completed successfully!");
      } else {
        console.log("⚠️ No USDC received - check swap logic");
      }
      
    } catch (error) {
      console.error("❌ Swap failed:", error.message);
      
      // Additional error details
      if (error.data) {
        console.error("Error data:", error.data);
      }
      if (error.reason) {
        console.error("Error reason:", error.reason);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testUpdatedSwap()
  .then(() => {
    console.log("\n🎉 Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  }); 