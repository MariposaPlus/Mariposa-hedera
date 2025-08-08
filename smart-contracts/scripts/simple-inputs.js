const { ethers } = require("hardhat");
require("dotenv").config();

async function generateSimpleInputs() {
  const [signer] = await ethers.getSigners();
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
  
  console.log("=== swapSeiToToken Inputs ===");
  console.log("");
  
  // SEI to USDC (0.1 SEI)
  console.log("tokenOut (address):");
  console.log("0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1");
  console.log("");
  
  console.log("amountOutMin (uint256):");
  console.log("0");
  console.log("");
  
  console.log("recipient (address):");
  console.log(signer.address);
  console.log("");
  
  console.log("deadline (uint256):");
  console.log(deadline);
  console.log("");
  
  console.log("Send native SEI (uint256):");
  console.log(ethers.parseEther("0.1").toString());
  console.log("");
  
  console.log("--- Alternative amounts ---");
  console.log("For 1 SEI:", ethers.parseEther("1.0").toString());
  console.log("For 0.5 SEI:", ethers.parseEther("0.5").toString());
  console.log("For 0.01 SEI:", ethers.parseEther("0.01").toString());
}

generateSimpleInputs(); 