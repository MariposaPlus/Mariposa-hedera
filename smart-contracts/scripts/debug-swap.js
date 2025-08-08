const { ethers } = require("hardhat");
require("dotenv").config();

// Contract ABI for AgenticRouter
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address tokenOut, address recipient, uint256 deadline) external payable",
  "function isAgent(address) external view returns (bool)",
  "function swapRouter() external view returns (address)",
  "function stablecoin() external view returns (address)",
  "function WSEI() external view returns (address)",
  "function feeBps() external view returns (uint16)",
  "function admin() external view returns (address)"
];

// DragonSwap Router ABI
const DRAGONSWAP_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactNativeForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
];

async function debugSwap() {
  console.log("=== Debugging Swap Revert ===");
  
  const [deployer] = await ethers.getSigners();
  const contractAddress = process.env.AGENTIC_ROUTER_ADDRESS || "0x4838d31afd4537abDD88FdF19fCbC7A410C8a95b";
  
  console.log("Deployer address:", deployer.address);
  console.log("Contract address:", contractAddress);
  
  // Connect to contract
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);
  
  // Get contract state
  const isAgent = await agenticRouter.isAgent(deployer.address);
  const stablecoinAddress = await agenticRouter.stablecoin();
  const wseiAddress = await agenticRouter.WSEI();
  const swapRouterAddress = await agenticRouter.swapRouter();
  const feeBps = await agenticRouter.feeBps();
  const admin = await agenticRouter.admin();
  
  console.log("\n=== Contract State ===");
  console.log("Is agent registered:", isAgent);
  console.log("Admin:", admin);
  console.log("Fee BPS:", feeBps.toString());
  console.log("Stablecoin (USDC):", stablecoinAddress);
  console.log("WSEI:", wseiAddress);
  console.log("Swap Router:", swapRouterAddress);
  
  // Check amounts and fees
  const seiAmount = ethers.parseEther("4");
  const fee = (seiAmount * feeBps) / 10000n;
  const net = seiAmount - fee;
  
  console.log("\n=== Amount Calculations ===");
  console.log("SEI amount to swap:", ethers.formatEther(seiAmount));
  console.log("Fee amount:", ethers.formatEther(fee));
  console.log("Net amount for swap:", ethers.formatEther(net));
  
  // Connect to DragonSwap router to test quotes
  const dragonSwapRouter = new ethers.Contract(swapRouterAddress, DRAGONSWAP_ABI, deployer);
  
  console.log("\n=== Testing DragonSwap Quotes ===");
  
  try {
    // Test quote for fee swap (WSEI -> USDC)
    if (fee > 0) {
      const feePath = [wseiAddress, stablecoinAddress];
      const feeQuote = await dragonSwapRouter.getAmountsOut(fee, feePath);
      console.log("Fee swap quote (WSEI->USDC):", ethers.formatUnits(feeQuote[1], 6), "USDC");
    }
    
    // Test quote for main swap (WSEI -> USDC)
    const mainPath = [wseiAddress, stablecoinAddress];
    const mainQuote = await dragonSwapRouter.getAmountsOut(net, mainPath);
    console.log("Main swap quote (WSEI->USDC):", ethers.formatUnits(mainQuote[1], 6), "USDC");
    
  } catch (error) {
    console.error("Quote failed:", error.message);
  }
  
  // Test the actual swap with detailed error catching
  console.log("\n=== Testing Swap Transaction ===");
  
  try {
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    // Estimate gas first
    console.log("Estimating gas...");
    const gasEstimate = await agenticRouter.swapSeiToToken.estimateGas(
      stablecoinAddress,
      deployer.address,
      deadline,
      { value: seiAmount }
    );
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Try the actual transaction
    console.log("Executing swap...");
    const tx = await agenticRouter.swapSeiToToken(
      stablecoinAddress,
      deployer.address,
      deadline,
      { 
        value: seiAmount,
        gasLimit: gasEstimate + 50000n // Add buffer
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Swap successful!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    
    // Try to get more specific error info
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    // Test smaller amounts
    console.log("\n=== Testing with smaller amounts ===");
    const smallAmount = ethers.parseEther("0.1");
    try {
      const gasEstimate = await agenticRouter.swapSeiToToken.estimateGas(
        stablecoinAddress,
        deployer.address,
        Math.floor(Date.now() / 1000) + 600,
        { value: smallAmount }
      );
      console.log("Small amount (0.1 SEI) gas estimate:", gasEstimate.toString());
    } catch (smallError) {
      console.error("Small amount also fails:", smallError.message);
    }
  }
}

// Run debug
debugSwap()
  .then(() => {
    console.log("\nDebug completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Debug failed:", error);
    process.exit(1);
  }); 