const { task } = require("hardhat/config");
require("dotenv").config();

task("test-native", "Test native SEI transfer to contract")
  .setAction(async (taskArgs, hre) => {
    console.log("--- Testing Native SEI Transfer ---");

    const { ethers } = hre;
    
    const agentPrivateKey = process.env.INITIAL_AGENT_PRIVATE_KEY;
    if (!agentPrivateKey) {
      throw new Error("❌ INITIAL_AGENT_PRIVATE_KEY not found in .env");
    }
    const agentWallet = new ethers.Wallet(agentPrivateKey, ethers.provider);
    console.log(`Using agent account: ${agentWallet.address}`);

    const contractAddress = "0xDadd17d7Bd63E92A5f608faAA628320E2bf16772"; // Zero-fee contract
    const agenticRouter = await ethers.getContractAt("AgenticRouter", contractAddress, agentWallet);
    
    console.log("Contract address:", contractAddress);
    
    const balance = await ethers.provider.getBalance(agentWallet.address);
    console.log(`Agent balance: ${ethers.formatEther(balance)} SEI`);
    
    const transferAmount = ethers.parseEther("0.1"); // 0.1 SEI
    
    console.log(`\nAttempting to transfer ${ethers.formatEther(transferAmount)} SEI to contract using nativeTransferWithFee...`);
    
    try {
      const tx = await agenticRouter.nativeTransferWithFee(agentWallet.address, { 
        value: transferAmount,
        gasLimit: 200000
      });
      
      console.log(`📤 Transaction hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log("✅ Native transfer SUCCESS!");
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check events
        console.log("Events emitted:", receipt.logs.length);
        for (let i = 0; i < receipt.logs.length; i++) {
          try {
            const parsedLog = agenticRouter.interface.parseLog(receipt.logs[i]);
            console.log(`Event ${i + 1}:`, parsedLog.name, parsedLog.args);
          } catch (e) {
            console.log(`Event ${i + 1}: (unparseable)`);
          }
        }
      } else {
        console.log("❌ Transaction failed");
      }
      
    } catch (error) {
      console.error("❌ Native transfer failed:");
      console.error("Error:", error.message);
      
      if (error.transaction) {
        console.log("Transaction hash:", error.transaction.hash);
      }
    }
    
    // Also test direct contract receive function
    console.log("\n--- Testing Direct SEI Send to Contract ---");
    try {
      const directTx = await agentWallet.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("0.01"), // 0.01 SEI
        gasLimit: 100000
      });
      
      console.log(`📤 Direct send transaction hash: ${directTx.hash}`);
      const directReceipt = await directTx.wait();
      
      if (directReceipt.status === 1) {
        console.log("✅ Direct send SUCCESS!");
        
        // Check contract balance
        const contractBalance = await ethers.provider.getBalance(contractAddress);
        console.log(`Contract balance: ${ethers.formatEther(contractBalance)} SEI`);
      } else {
        console.log("❌ Direct send failed");
      }
      
    } catch (error) {
      console.error("❌ Direct send failed:", error.message);
    }
});

module.exports = {}; 