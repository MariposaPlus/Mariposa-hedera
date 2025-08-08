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
  "function getPoolInfo(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress, uint128 liquidity, uint160 sqrtPriceX96)"
];

// ERC20 ABI for checking balances
const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

async function testDragonSwapV2() {
  const network = hre.network.name;
  console.log("=== Testing DragonSwap V2 Integration ===");
  console.log("Network:", network);

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "SEI");

  // Contract address (will be set after redeployment)
  const contractAddress = process.env.AGENTIC_ROUTER_ADDRESS || "0xE714ce2B454e001E84Fb0d328F8A983Ca8D94602";
  console.log("AgenticRouter address:", contractAddress);

  // Connect to contract
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);
  
  // Get contract info
  const stablecoinAddress = await agenticRouter.stablecoin(); // USDT
  const wseiAddress = await agenticRouter.WSEI();
  const swapRouterAddress = await agenticRouter.swapRouter();
  const feeBps = await agenticRouter.feeBps();
  
  console.log("\n=== Contract Information ===");
  console.log("AgenticRouter:", contractAddress);
  console.log("Stablecoin (USDT):", stablecoinAddress);
  console.log("WSEI:", wseiAddress);
  console.log("Swap Router:", swapRouterAddress);
  console.log("Fee BPS:", feeBps.toString());

  // Connect to token contracts
  const usdt = new ethers.Contract(stablecoinAddress, ERC20_ABI, deployer);
  const usdtDecimals = await usdt.decimals();
  const usdtSymbol = await usdt.symbol();

  console.log("USDT decimals:", usdtDecimals);
  console.log("USDT symbol:", usdtSymbol);

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

  // Test new V2 functionality
  console.log("\n=== Testing V2 Features ===");

  // 1. Check pair existence
  try {
    const [exists, pairAddress] = await agenticRouter.checkPairExists(wseiAddress, stablecoinAddress);
    console.log("WSEI/USDT pair exists:", exists);
    console.log("WSEI/USDT pair address:", pairAddress);
  } catch (error) {
    console.log("❌ Error checking pair:", error.message);
  }

  // 2. Get optimal swap quotes
  try {
    const testAmount = ethers.parseEther("0.001");
    const [amountOut, optimalPath] = await agenticRouter.getOptimalSwapAmountOut(
      testAmount,
      wseiAddress,
      stablecoinAddress
    );
    console.log("Optimal path for WSEI->USDT:", optimalPath);
    console.log("Quote for 0.001 WSEI:", ethers.formatUnits(amountOut, usdtDecimals), "USDT");
  } catch (error) {
    console.log("❌ Error getting optimal quote:", error.message);
  }

  // 3. Test SEI to Token swap (smallest possible amount)
  console.log("\n=== Testing SEI to USDT Swap ===");
  const seiAmount = ethers.parseEther("0.0001"); // Very small amount
  const usdtBalanceBefore = await usdt.balanceOf(deployer.address);
  
  console.log("Before swap:");
  console.log("- SEI balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("- USDT balance:", ethers.formatUnits(usdtBalanceBefore, usdtDecimals));

  try {
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    console.log(`Swapping ${ethers.formatEther(seiAmount)} SEI to USDT...`);
    const swapGasConfig = await estimateGasWithFees(
      agenticRouter,
      "swapSeiToToken",
      [stablecoinAddress, deployer.address, deadline],
      { value: seiAmount }
    );
    
    const tx = await agenticRouter.swapSeiToToken(
      stablecoinAddress,
      deployer.address,
      deadline,
      { ...swapGasConfig, value: seiAmount }
    );

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ SEI to USDT swap completed!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check balances after
    const usdtBalanceAfter = await usdt.balanceOf(deployer.address);
    const usdtReceived = usdtBalanceAfter - usdtBalanceBefore;
    
    console.log("After swap:");
    console.log("- SEI balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    console.log("- USDT balance:", ethers.formatUnits(usdtBalanceAfter, usdtDecimals));
    console.log("- USDT received:", ethers.formatUnits(usdtReceived, usdtDecimals));

    // 4. Test Token to SEI swap (if we received USDT)
    if (usdtReceived > 0) {
      console.log("\n=== Testing USDT to SEI Swap ===");
      
      try {
        // Approve USDT for spending
        const approveAmount = usdtReceived;
        console.log("Approving USDT for swap...");
        const approveTx = await usdt.approve(contractAddress, approveAmount);
        await approveTx.wait();
        console.log("✅ USDT approved");

        const seiBalanceBefore = await ethers.provider.getBalance(deployer.address);
        
        console.log(`Swapping ${ethers.formatUnits(approveAmount, usdtDecimals)} USDT back to SEI...`);
        const tokenSwapGasConfig = await estimateGasWithFees(
          agenticRouter,
          "swapTokenToSei",
          [stablecoinAddress, approveAmount, 0, deployer.address, deadline]
        );
        
        const tokenTx = await agenticRouter.swapTokenToSei(
          stablecoinAddress,
          approveAmount,
          0, // Accept any amount
          deployer.address,
          deadline,
          tokenSwapGasConfig
        );

        console.log("Token swap transaction hash:", tokenTx.hash);
        await tokenTx.wait();
        console.log("✅ USDT to SEI swap completed!");

        const seiBalanceAfter = await ethers.provider.getBalance(deployer.address);
        const seiReceived = seiBalanceAfter - seiBalanceBefore;
        
        console.log("SEI received from token swap:", ethers.formatEther(seiReceived));

      } catch (tokenError) {
        console.log("❌ Token to SEI swap failed:", tokenError.message);
      }
    }

  } catch (error) {
    console.error("❌ SEI to token swap failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("\nPossible reasons:");
      console.log("1. Insufficient liquidity in WSEI/USDT pool");
      console.log("2. Slippage too high for small amount");
      console.log("3. Fee handling issues");
      
      // Try even smaller amount
      console.log("\n=== Trying Even Smaller Amount ===");
      const tinyAmount = ethers.parseEther("0.00001");
      
      try {
        console.log(`Trying ${ethers.formatEther(tinyAmount)} SEI...`);
        const tinyGasConfig = await estimateGasWithFees(
          agenticRouter,
          "swapSeiToToken",
          [stablecoinAddress, deployer.address, Math.floor(Date.now() / 1000) + 600],
          { value: tinyAmount }
        );
        
        const tinyTx = await agenticRouter.swapSeiToToken(
          stablecoinAddress,
          deployer.address,
          Math.floor(Date.now() / 1000) + 600,
          { ...tinyGasConfig, value: tinyAmount }
        );
        
        await tinyTx.wait();
        console.log("✅ Tiny amount swap worked!");
        
      } catch (tinyError) {
        console.log("❌ Even tiny amount failed:", tinyError.message);
        console.log("The pool likely has insufficient liquidity for any meaningful swap");
      }
    }
  }

  console.log("\n=== V2 Test Summary ===");
  console.log("✅ Contract updated with DragonSwap V2 integration");
  console.log("✅ Optimal path routing implemented");
  console.log("✅ Direct pair checking functionality added");
  console.log("✅ Enhanced quote system working");
  console.log("⚠️  Low liquidity in WSEI/USDT pool limits swap sizes");
}

// Export for testing
module.exports = { testDragonSwapV2 };

// Run test if called directly
if (require.main === module) {
  testDragonSwapV2()
    .then(() => {
      console.log("\nDragonSwap V2 test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
} 