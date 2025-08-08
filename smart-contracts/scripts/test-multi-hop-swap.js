const { ethers } = require("hardhat");
const { getGasConfig } = require("./utils/gasUtils");
require("dotenv").config();

// Contract ABIs
const AGENTIC_ROUTER_ABI = [
  "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
  "function WSEI() external view returns (address)",
  "function stablecoin() external view returns (address)",
  "function swapRouter() external view returns (address)",
  "function _getOptimalPath(address tokenIn, address tokenOut) external view returns (bytes memory path, bool isDirect)"
];

const DRAGONSWAP_ROUTER_ABI = [
  "function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)"
];

async function testMultiHopSwap() {
  console.log("=== Testing Multi-Hop Swap: SEI → WETH → USDC ===");
  
  const [deployer] = await ethers.getSigners();
  const contractAddress = "0x1008C94276027757EA33AC8C0f2BC3a31191ebD9";
  
  console.log("Deployer:", deployer.address);
  console.log("Contract:", contractAddress);
  
  // Token addresses
  const wseiAddress = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const wethAddress = "0x160345fc359604fc6e70e3c5facbde5f7a9342d8";
  const usdcAddress = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
  const routerAddress = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  
  console.log("\n=== Token Addresses ===");
  console.log("WSEI:", wseiAddress);
  console.log("WETH:", wethAddress);
  console.log("USDC:", usdcAddress);
  
  // Connect to DragonSwap router
  const dragonswapRouter = new ethers.Contract(routerAddress, DRAGONSWAP_ROUTER_ABI, deployer);
  
  // Manual path encoding for WSEI → WETH → USDC
  // Path format: token0 + fee + token1 + fee + token2
  const fee1 = 3000; // WSEI → WETH (0.3%)
  const fee2 = 3000; // WETH → USDC (0.3%)
  
  const path = ethers.solidityPacked(
    ["address", "uint24", "address", "uint24", "address"],
    [wseiAddress, fee1, wethAddress, fee2, usdcAddress]
  );
  
  console.log("\n=== Multi-Hop Path ===");
  console.log("Path:", path);
  console.log("Route: WSEI → WETH → USDC");
  console.log("Fees: 0.3% → 0.3%");
  
  // Swap parameters
  const swapAmount = ethers.parseEther("0.1"); // 0.1 SEI
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
  
  const params = {
    path: path,
    recipient: deployer.address,
    deadline: deadline,
    amountIn: swapAmount,
    amountOutMinimum: 0 // Accept any amount for testing
  };
  
  console.log("\n=== Swap Parameters ===");
  console.log("Amount in:", ethers.formatEther(swapAmount), "SEI");
  console.log("Deadline:", new Date(deadline * 1000).toLocaleString());
  console.log("Min amount out: 0 (no slippage protection for testing)");
  
  try {
    // Check initial balances
    const initialSei = await ethers.provider.getBalance(deployer.address);
    console.log("\n=== Initial Balance ===");
    console.log("SEI:", ethers.formatEther(initialSei));
    
    // Estimate gas
    console.log("\n=== Gas Estimation ===");
    const gasEstimate = await dragonswapRouter.exactInput.estimateGas(params, { value: swapAmount });
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Execute swap
    console.log("\n=== Executing Multi-Hop Swap ===");
    const gasConfig = await getGasConfig(ethers.provider, Number(gasEstimate) * 2);
    
    const tx = await dragonswapRouter.exactInput(params, {
      value: swapAmount,
      ...gasConfig
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Multi-hop swap successful!");
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check final balances
    const finalSei = await ethers.provider.getBalance(deployer.address);
    console.log("\n=== Final Balance ===");
    console.log("SEI:", ethers.formatEther(finalSei));
    console.log("SEI used:", ethers.formatEther(initialSei - finalSei));
    
    // Parse logs to see amount out
    console.log("\n=== Transaction Details ===");
    console.log("Logs count:", receipt.logs.length);
    
    // Check USDC balance
    const ERC20_ABI = ["function balanceOf(address) external view returns (uint256)", "function decimals() external view returns (uint8)"];
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const usdcDecimals = await usdc.decimals();
    
    console.log("USDC received:", ethers.formatUnits(usdcBalance, usdcDecimals));
    
    if (usdcBalance > 0) {
      const rate = Number(ethers.formatUnits(usdcBalance, usdcDecimals)) / Number(ethers.formatEther(swapAmount));
      console.log("Effective rate:", rate.toFixed(6), "USDC per SEI");
    }
    
  } catch (error) {
    console.error("❌ Multi-hop swap failed:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
  }
}

// Test simple WSEI → WETH swap first
async function testSimpleSwap() {
  console.log("\n=== Testing Simple WSEI → WETH Swap ===");
  
  const [deployer] = await ethers.getSigners();
  const wseiAddress = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const wethAddress = "0x160345fc359604fc6e70e3c5facbde5f7a9342d8";
  const routerAddress = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  
  const SIMPLE_ROUTER_ABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ];
  
  const dragonswapRouter = new ethers.Contract(routerAddress, SIMPLE_ROUTER_ABI, deployer);
  
  const swapAmount = ethers.parseEther("0.1");
  const params = {
    tokenIn: wseiAddress,
    tokenOut: wethAddress,
    fee: 3000,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: swapAmount,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0
  };
  
  try {
    const gasEstimate = await dragonswapRouter.exactInputSingle.estimateGas(params, { value: swapAmount });
    console.log("✅ WSEI → WETH gas estimate:", gasEstimate.toString());
    
    // Try the swap
    const tx = await dragonswapRouter.exactInputSingle(params, { 
      value: swapAmount,
      gasLimit: gasEstimate * 2n
    });
    
    console.log("WSEI → WETH transaction:", tx.hash);
    await tx.wait();
    console.log("✅ WSEI → WETH swap successful!");
    
  } catch (error) {
    console.log("❌ WSEI → WETH swap failed:", error.message);
  }
}

// Run tests
async function runTests() {
  await testSimpleSwap();
  await testMultiHopSwap();
}

runTests()
  .then(() => {
    console.log("\n🎉 All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Tests failed:", error);
    process.exit(1);
  }); 