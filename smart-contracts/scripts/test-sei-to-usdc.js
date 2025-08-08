const { ethers } = require("hardhat");
const { getGasConfig, estimateGasWithFees } = require("./utils/gasUtils");
require("dotenv").config();

// Updated Contract ABI for AgenticRouter V2
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
  "function swapTokenToToken(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
  "function swapTokenToSei(address tokenIn, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
  "function isAgent(address) external view returns (bool)",
  "function registerAgent(address agent, bool allowed) external",
  "function swapRouter() external view returns (address)",
  "function factory() external view returns (address)",
  "function stablecoin() external view returns (address)",
  "function WSEI() external view returns (address)",
  "function feeBps() external view returns (uint16)",
  "function getBestFeeTier(address tokenA, address tokenB) external view returns (uint24 fee)",
  "function getOptimalPath(address tokenIn, address tokenOut) external view returns (bytes memory path, bool isDirect)",
  "function checkPoolExists(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress)",
  "function getPoolInfo(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress, uint128 liquidity, uint160 sqrtPriceX96)",
  "function calculateFee(uint256 amount) external view returns (uint256 fee, uint256 net)"
];

// ERC20 ABI for checking balances
const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

// DragonSwap V2 Router ABI (for direct calls if needed)
const DRAGONSWAP_V2_ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

async function testSeiToUsdcSwap() {
  const network = hre.network.name;
  console.log("=== Testing SEI to USDC Swap with DragonSwap V2 ===");
  console.log("Network:", network);

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const initialBalance = await ethers.provider.getBalance(deployer.address);
  console.log("Initial SEI balance:", ethers.formatEther(initialBalance), "SEI");

  // Contract address (update this with your deployed contract)
  const contractAddress = process.env.AGENTIC_ROUTER_ADDRESS || "0xYourContractAddress";
  console.log("AgenticRouter address:", contractAddress);

  // Connect to contract
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);
  
  try {
    // Get contract info
    const stablecoinAddress = await agenticRouter.stablecoin(); // USDC
    const wseiAddress = await agenticRouter.WSEI();
    const swapRouterAddress = await agenticRouter.swapRouter();
    const factoryAddress = await agenticRouter.factory();
    const feeBps = await agenticRouter.feeBps();
    
    console.log("\n=== Contract Information ===");
    console.log("AgenticRouter:", contractAddress);
    console.log("Stablecoin (USDC):", stablecoinAddress);
    console.log("WSEI:", wseiAddress);
    console.log("Swap Router:", swapRouterAddress);
    console.log("Factory:", factoryAddress);
    console.log("Fee BPS:", feeBps.toString(), `(${Number(feeBps) / 100}%)`);

    // Connect to USDC contract
    const usdc = new ethers.Contract(stablecoinAddress, ERC20_ABI, deployer);
    const usdcDecimals = await usdc.decimals();
    const usdcSymbol = await usdc.symbol();

    console.log("USDC decimals:", usdcDecimals);
    console.log("USDC symbol:", usdcSymbol);

    // Check initial USDC balance
    const initialUsdcBalance = await usdc.balanceOf(deployer.address);
    console.log("Initial USDC balance:", ethers.formatUnits(initialUsdcBalance, usdcDecimals), usdcSymbol);

    // Check if agent is registered
    const isAgentRegistered = await agenticRouter.isAgent(deployer.address);
    console.log("\n=== Agent Status ===");
    console.log("Is agent registered:", isAgentRegistered);

    if (!isAgentRegistered) {
      console.log("Registering agent...");
      try {
        const agentGasConfig = await estimateGasWithFees(
          agenticRouter,
          "registerAgent",
          [deployer.address, true]
        );
        
        const tx = await agenticRouter.registerAgent(deployer.address, true, agentGasConfig);
        await tx.wait();
        console.log("✅ Agent registered successfully!");
      } catch (error) {
        console.error("❌ Failed to register agent:", error.message);
        return;
      }
    }

    // Test DragonSwap V2 features
    console.log("\n=== Testing V2 Features ===");

    // 1. Get best fee tier for WSEI/USDC
    try {
      const bestFeeTier = await agenticRouter.getBestFeeTier(wseiAddress, stablecoinAddress);
      console.log("Best fee tier for WSEI/USDC:", bestFeeTier, `(${Number(bestFeeTier) / 10000}%)`);
    } catch (error) {
      console.log("❌ Error getting best fee tier:", error.message);
    }

    // 2. Check optimal path
    try {
      const [optimalPath, isDirect] = await agenticRouter.getOptimalPath(wseiAddress, stablecoinAddress);
      console.log("Optimal path is direct:", isDirect);
      console.log("Optimal path data length:", optimalPath.length);
    } catch (error) {
      console.log("❌ Error getting optimal path:", error.message);
    }

    // 3. Check pool existence for different fee tiers
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    console.log("\n=== Pool Information ===");
    
    for (const feeTier of feeTiers) {
      try {
        const [exists, poolAddress, liquidity, sqrtPriceX96] = await agenticRouter.getPoolInfo(
          wseiAddress, 
          stablecoinAddress, 
          feeTier
        );
        console.log(`Fee Tier ${feeTier} (${feeTier / 10000}%):`);
        console.log("  - Pool exists:", exists);
        console.log("  - Pool address:", poolAddress);
        console.log("  - Liquidity:", liquidity.toString());
        console.log("  - SqrtPriceX96:", sqrtPriceX96.toString());
      } catch (error) {
        console.log(`❌ Error checking pool for fee tier ${feeTier}:`, error.message);
      }
    }

    // 4. Calculate fee for swap
    const swapAmountEther = "1.0"; // 1 SEI
    const swapAmount = ethers.parseEther(swapAmountEther);
    
    try {
      const [fee, net] = await agenticRouter.calculateFee(swapAmount);
      console.log("\n=== Fee Calculation ===");
      console.log("Swap amount:", swapAmountEther, "SEI");
      console.log("Fee amount:", ethers.formatEther(fee), "SEI");
      console.log("Net amount:", ethers.formatEther(net), "SEI");
    } catch (error) {
      console.log("❌ Error calculating fee:", error.message);
    }

    // 5. Perform SEI to USDC swap
    console.log("\n=== Performing SEI to USDC Swap ===");
    
    if (initialBalance < swapAmount) {
      console.log("❌ Insufficient SEI balance for swap");
      return;
    }

    try {
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
      const amountOutMin = 0; // Accept any amount for testing (use proper slippage in production)

      console.log("Swapping", swapAmountEther, "SEI for USDC...");
      console.log("Deadline:", new Date(deadline * 1000).toLocaleString());
      console.log("Minimum output:", amountOutMin);

      // Get gas config for the swap
      const swapGasConfig = await getGasConfig(ethers.provider, 3000000);

      const tx = await agenticRouter.swapSeiToToken(
        stablecoinAddress,
        amountOutMin,
        deployer.address,
        deadline,
        { 
          value: swapAmount,
          ...swapGasConfig
        }
      );

      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Swap confirmed in block:", receipt.blockNumber);
      console.log("Gas used:", receipt.gasUsed.toString());

      // Check final balances
      const finalSeiBalance = await ethers.provider.getBalance(deployer.address);
      const finalUsdcBalance = await usdc.balanceOf(deployer.address);

      console.log("\n=== Final Balances ===");
      console.log("Final SEI balance:", ethers.formatEther(finalSeiBalance), "SEI");
      console.log("Final USDC balance:", ethers.formatUnits(finalUsdcBalance, usdcDecimals), usdcSymbol);

      // Calculate differences
      const seiUsed = initialBalance - finalSeiBalance;
      const usdcReceived = finalUsdcBalance - initialUsdcBalance;

      console.log("\n=== Swap Results ===");
      console.log("SEI used:", ethers.formatEther(seiUsed), "SEI");
      console.log("USDC received:", ethers.formatUnits(usdcReceived, usdcDecimals), usdcSymbol);

      if (usdcReceived > 0) {
        const effectiveRate = Number(ethers.formatUnits(usdcReceived, usdcDecimals)) / Number(ethers.formatEther(swapAmount));
        console.log("Effective rate:", effectiveRate.toFixed(6), "USDC per SEI");
      }

      console.log("✅ SEI to USDC swap completed successfully!");

    } catch (error) {
      console.error("❌ Swap failed:", error.message);
      
      // Try to get more specific error information
      if (error.data) {
        console.error("Error data:", error.data);
      }
      if (error.reason) {
        console.error("Error reason:", error.reason);
      }
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.code === 'CALL_EXCEPTION') {
      console.error("This might indicate the contract address is incorrect or the contract is not deployed on this network");
    }
  }
}

// Additional utility function to test reverse swap (USDC to SEI)
async function testUsdcToSeiSwap(contractAddress, usdcAmount) {
  console.log("\n=== Testing USDC to SEI Swap ===");
  
  const [deployer] = await ethers.getSigners();
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);
  
  try {
    const stablecoinAddress = await agenticRouter.stablecoin();
    const usdc = new ethers.Contract(stablecoinAddress, ERC20_ABI, deployer);
    
    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const usdcDecimals = await usdc.decimals();
    
    if (usdcBalance < usdcAmount) {
      console.log("❌ Insufficient USDC balance for reverse swap");
      return;
    }

    // Approve USDC spending
    console.log("Approving USDC spending...");
    const approveTx = await usdc.approve(contractAddress, usdcAmount);
    await approveTx.wait();

    // Perform swap
    const deadline = Math.floor(Date.now() / 1000) + 300;
    const swapTx = await agenticRouter.swapTokenToSei(
      stablecoinAddress,
      usdcAmount,
      0, // Accept any amount
      deployer.address,
      deadline
    );

    console.log("USDC to SEI swap transaction:", swapTx.hash);
    await swapTx.wait();
    console.log("✅ USDC to SEI swap completed!");

  } catch (error) {
    console.error("❌ USDC to SEI swap failed:", error.message);
  }
}

// Export functions for external use
module.exports = { 
  testSeiToUsdcSwap,
  testUsdcToSeiSwap,
  AGENTIC_ROUTER_ABI,
  ERC20_ABI 
};

// Run test if called directly
if (require.main === module) {
  testSeiToUsdcSwap()
    .then(() => {
      console.log("\n🎉 Test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test failed:", error);
      process.exit(1);
    });
} 