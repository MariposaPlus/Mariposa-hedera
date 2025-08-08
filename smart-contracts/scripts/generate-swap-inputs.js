const { ethers } = require("hardhat");
require("dotenv").config();

async function generateSwapInputs() {
  console.log("=== swapSeiToToken Function Inputs ===");
  console.log("Function Signature: swapSeiToToken(address,uint256,address,uint256)");
  console.log("Function Selector: 189da02d");
  console.log("");

  // Get signer for recipient address
  const [signer] = await ethers.getSigners();
  
  // Token addresses on Sei Mainnet
  const tokens = {
    USDC: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    WBTC: "0x0555e30da8f98308edb960aa94c0db47230d2b9c", 
    WETH: "0x160345fc359604fc6e70e3c5facbde5f7a9342d8"
  };

  // Current timestamp + 5 minutes for deadline
  const currentTime = Math.floor(Date.now() / 1000);
  const deadline = currentTime + 300; // 5 minutes from now
  
  // Generate inputs for different scenarios
  const scenarios = [
    {
      name: "SEI to USDC (1 SEI)",
      tokenOut: tokens.USDC,
      amountOutMin: "0", // No slippage protection for testing
      recipient: signer.address,
      deadline: deadline,
      seiAmount: ethers.parseEther("1.0")
    },
    {
      name: "SEI to USDC (0.1 SEI)",
      tokenOut: tokens.USDC,
      amountOutMin: "0",
      recipient: signer.address, 
      deadline: deadline,
      seiAmount: ethers.parseEther("0.1")
    },
    {
      name: "SEI to WBTC (0.5 SEI)",
      tokenOut: tokens.WBTC,
      amountOutMin: "0",
      recipient: signer.address,
      deadline: deadline,
      seiAmount: ethers.parseEther("0.5")
    },
    {
      name: "SEI to WETH (1 SEI)",
      tokenOut: tokens.WETH,
      amountOutMin: "0",
      recipient: signer.address,
      deadline: deadline,
      seiAmount: ethers.parseEther("1.0")
    }
  ];

  // Display inputs for each scenario
  scenarios.forEach((scenario, index) => {
    console.log(`--- Scenario ${index + 1}: ${scenario.name} ---`);
    console.log(`tokenOut (address): ${scenario.tokenOut}`);
    console.log(`amountOutMin (uint256): ${scenario.amountOutMin}`);
    console.log(`recipient (address): ${scenario.recipient}`);
    console.log(`deadline (uint256): ${scenario.deadline}`);
    console.log(`Send native SEI (uint256): ${scenario.seiAmount.toString()}`);
    console.log(`Send native SEI (ether): ${ethers.formatEther(scenario.seiAmount)} SEI`);
    console.log(`Deadline Date: ${new Date(scenario.deadline * 1000).toLocaleString()}`);
    console.log("");
  });

  // Additional useful information
  console.log("=== Additional Information ===");
  console.log(`Contract Address: 0x1008C94276027757EA33AC8C0f2BC3a31191ebD9`);
  console.log(`Network: Sei Mainnet`);
  console.log(`Explorer: https://seitrace.com/address/0x1008C94276027757EA33AC8C0f2BC3a31191ebD9#code`);
  console.log("");
  
  console.log("=== Token Information ===");
  Object.entries(tokens).forEach(([symbol, address]) => {
    console.log(`${symbol}: ${address}`);
  });
  console.log("");

  // For copy-paste convenience
  console.log("=== Ready-to-Use Values (SEI to USDC, 1 SEI) ===");
  console.log(`tokenOut: ${tokens.USDC}`);
  console.log(`amountOutMin: 0`);
  console.log(`recipient: ${signer.address}`);
  console.log(`deadline: ${deadline}`);
  console.log(`Send native SEI: ${ethers.parseEther("1.0").toString()}`);
  console.log("");

  // Generate ABI-encoded function call
  console.log("=== ABI-Encoded Function Call ===");
  const iface = new ethers.Interface([
    "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)"
  ]);
  
  const functionData = iface.encodeFunctionData("swapSeiToToken", [
    tokens.USDC,
    "0", 
    signer.address,
    deadline
  ]);
  
  console.log(`Function Data: ${functionData}`);
  console.log("");

  // Generate transaction object
  console.log("=== Complete Transaction Object ===");
  const txObject = {
    to: "0x1008C94276027757EA33AC8C0f2BC3a31191ebD9",
    value: ethers.parseEther("1.0").toString(),
    data: functionData,
    gasLimit: "3000000" // Suggested gas limit
  };
  
  console.log(JSON.stringify(txObject, null, 2));
}

// Function to generate inputs with custom parameters
function generateCustomInputs(tokenOut, seiAmount, recipient, minutesFromNow = 5) {
  const deadline = Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
  const seiAmountWei = ethers.parseEther(seiAmount.toString());
  
  console.log("=== Custom Swap Inputs ===");
  console.log(`tokenOut (address): ${tokenOut}`);
  console.log(`amountOutMin (uint256): 0`);
  console.log(`recipient (address): ${recipient}`);
  console.log(`deadline (uint256): ${deadline}`);
  console.log(`Send native SEI (uint256): ${seiAmountWei.toString()}`);
  console.log(`Send native SEI (ether): ${seiAmount} SEI`);
  console.log(`Deadline: ${new Date(deadline * 1000).toLocaleString()}`);
}

// Quick test function for immediate values
async function quickTest() {
  const [signer] = await ethers.getSigners();
  
  console.log("=== QUICK TEST INPUTS ===");
  console.log("Copy these values directly into the website:");
  console.log("");
  console.log(`tokenOut: 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1`);
  console.log(`amountOutMin: 0`);
  console.log(`recipient: ${signer.address}`);
  console.log(`deadline: ${Math.floor(Date.now() / 1000) + 300}`);
  console.log(`Send native SEI: ${ethers.parseEther("0.1").toString()}`);
  console.log("");
  console.log("This will swap 0.1 SEI for USDC with no slippage protection.");
}

// Export functions for use
module.exports = {
  generateSwapInputs,
  generateCustomInputs,
  quickTest
};

// Run if called directly
if (require.main === module) {
  generateSwapInputs()
    .then(() => {
      console.log("✅ Input generation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error generating inputs:", error);
      process.exit(1);
    });
} 