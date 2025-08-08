const { task } = require("hardhat/config");
require("dotenv").config();

task("test-swap", "Test swap functionality")
  .setAction(async (taskArgs, hre) => {
    console.log("--- Starting Ethers.js Swap Task ---");

    const { ethers } = hre;
    
    const agentPrivateKey = process.env.INITIAL_AGENT_PRIVATE_KEY;
    if (!agentPrivateKey) {
      throw new Error("❌ INITIAL_AGENT_PRIVATE_KEY not found in .env. Cannot proceed.");
    }
    const agentWallet = new ethers.Wallet(agentPrivateKey, ethers.provider);
    console.log(`Using agent account: ${agentWallet.address}`);

    const contractAddress = "0xe48976418675D5A52e4B0dBB305614775115675a"; // AgenticRouter with 0.05% fees enabled
    const agenticRouter = await ethers.getContractAt("AgenticRouter", contractAddress, agentWallet);
    console.log(`Attached to AgenticRouter at: ${await agenticRouter.getAddress()}`);

    // Check if agent is registered
    const isAgentRegistered = await agenticRouter.isAgent(agentWallet.address);
    if (!isAgentRegistered) {
      console.log("❌ Agent not registered");
    return;
  }
    console.log(`✅ Account ${agentWallet.address} is a registered agent.`);

    const USDC_ADDRESS = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
    const WSEI_ADDRESS = "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7";
    console.log("Target stablecoin (USDC):", USDC_ADDRESS);

    // Check balances before swap
    const seiBalance = await ethers.provider.getBalance(agentWallet.address);
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ], ethers.provider);
    
    const usdcBalance = await usdcContract.balanceOf(agentWallet.address);
    const usdcDecimals = await usdcContract.decimals();

    // Check fee recipient balance (should be the deployer)
    const feeRecipient = await agenticRouter.feeRecipient();
    const feeRecipientUsdcBalance = await usdcContract.balanceOf(feeRecipient);
    
    console.log("\n=== Before Swap ===");
    console.log(`Agent SEI balance: ${ethers.formatEther(seiBalance)} SEI`);
    console.log(`Agent USDC balance: ${ethers.formatUnits(usdcBalance, usdcDecimals)} USDC`);
    console.log(`Fee recipient: ${feeRecipient}`);
    console.log(`Fee recipient USDC balance: ${ethers.formatUnits(feeRecipientUsdcBalance, usdcDecimals)} USDC`);

    const swapAmount = ethers.parseEther("4.0"); // 4 SEI
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

    console.log(`\nAttempting to swap ${ethers.formatEther(swapAmount)} SEI...`);
    
    try {
      // Use the original swapSeiToToken function which now has 5% slippage protection
      const tx = await agenticRouter.swapSeiToToken(
        USDC_ADDRESS,        // tokenOut
        0,                   // amountOutMin (let contract calculate 5% slippage)
        agentWallet.address, // recipient
        deadline,            // deadline
        {
          value: swapAmount,
          gasLimit: 500000
        }
      );

      console.log(`📤 Swap transaction sent! Hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log("✅ Swap SUCCESS!");
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);

        // Check balances after swap
        const newSeiBalance = await ethers.provider.getBalance(agentWallet.address);
        const newUsdcBalance = await usdcContract.balanceOf(agentWallet.address);
        const newFeeRecipientUsdcBalance = await usdcContract.balanceOf(feeRecipient);

        console.log("\n=== After Swap ===");
        console.log(`Agent SEI balance: ${ethers.formatEther(newSeiBalance)} SEI`);
        console.log(`Agent USDC balance: ${ethers.formatUnits(newUsdcBalance, usdcDecimals)} USDC`);
        console.log(`Fee recipient USDC balance: ${ethers.formatUnits(newFeeRecipientUsdcBalance, usdcDecimals)} USDC`);
        
        const seiUsed = seiBalance - newSeiBalance;
        const usdcReceived = newUsdcBalance - usdcBalance;
        const feeUsdcReceived = newFeeRecipientUsdcBalance - feeRecipientUsdcBalance;
        
        console.log("\n=== Swap Results ===");
        console.log(`SEI used: ${ethers.formatEther(seiUsed)} SEI`);
        console.log(`USDC received: ${ethers.formatUnits(usdcReceived, usdcDecimals)} USDC`);
        console.log(`Fee (USDC) collected: ${ethers.formatUnits(feeUsdcReceived, usdcDecimals)} USDC`);
        
        if (usdcReceived > 0) {
          const rate = Number(ethers.formatUnits(usdcReceived, usdcDecimals)) / Number(ethers.formatEther(swapAmount));
          console.log(`Effective rate: 1 SEI = ${rate.toFixed(6)} USDC`);
        }

        // Parse events
        console.log("\n=== Events ===");
        for (const log of receipt.logs) {
          try {
            const parsedLog = agenticRouter.interface.parseLog(log);
            console.log(`Event: ${parsedLog.name}`);
            console.log(`Args:`, parsedLog.args);
  } catch (e) {
            // Skip unparseable logs
          }
        }

      } else {
        console.log("❌ Transaction failed");
      }

    } catch (error) {
      console.error("❌ Swap failed!");
      console.error("Error details:", error.message);
      
      if (error.transaction) {
        console.log("Transaction hash:", error.transaction.hash);
      }
    }
  });

module.exports = {};
