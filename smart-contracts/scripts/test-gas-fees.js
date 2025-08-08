const { ethers } = require("hardhat");
const hre = require("hardhat");
const { fetchGasFees } = require("./utils/gasUtils");

async function testGasFees() {
  console.log("Testing gas fee fetching from Sei network...");
  console.log("Network:", hre.network.name);
  
  try {
    const fees = await fetchGasFees(ethers.provider);
    console.log("\nFinal fee configuration:");
    console.log("- maxFeePerGas:", fees.maxFeePerGas);
    console.log("- maxPriorityFeePerGas:", fees.maxPriorityFeePerGas);
    console.log("- gasPrice:", fees.gasPrice);
    
    // Test a simple RPC call
    console.log("\nTesting basic RPC calls:");
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("- Latest block:", blockNumber);
    
    const network = await ethers.provider.getNetwork();
    console.log("- Chain ID:", network.chainId.toString());
    
  } catch (error) {
    console.error("Error testing gas fees:", error);
  }
}

testGasFees()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 