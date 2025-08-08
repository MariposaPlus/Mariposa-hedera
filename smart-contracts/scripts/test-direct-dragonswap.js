const { task } = require("hardhat/config");
require("dotenv").config();

task("test-dragonswap", "Test DragonSwap router directly")
  .setAction(async (taskArgs, hre) => {
    console.log("--- Testing DragonSwap Router Directly ---");

    const { ethers } = hre;
    
    const agentPrivateKey = process.env.INITIAL_AGENT_PRIVATE_KEY;
    if (!agentPrivateKey) {
      throw new Error("❌ INITIAL_AGENT_PRIVATE_KEY not found in .env");
    }
    const agentWallet = new ethers.Wallet(agentPrivateKey, ethers.provider);
    console.log(`Using agent account: ${agentWallet.address}`);

    const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
    const WSEI_ADDRESS = "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7";
    const USDC_ADDRESS = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
    
    const routerAbi = [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
    ];

    const router = new ethers.Contract(DRAGONSWAP_ROUTER, routerAbi, agentWallet);
    
    console.log("DragonSwap Router:", DRAGONSWAP_ROUTER);
    console.log("WSEI:", WSEI_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);
    
    const balance = await ethers.provider.getBalance(agentWallet.address);
    console.log(`Agent balance: ${ethers.formatEther(balance)} SEI`);
    
    const swapAmount = ethers.parseEther("1.0"); // 1 SEI
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    console.log(`\nAttempting direct swap of ${ethers.formatEther(swapAmount)} SEI to USDC...`);
    
    const swapParams = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: USDC_ADDRESS,
      fee: 100, // 0.01% - we know this pool has liquidity
      recipient: agentWallet.address,
      deadline: deadline,
      amountIn: swapAmount,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    };
    
    console.log("Swap params:", swapParams);
    
    try {
      console.log("📤 Sending direct DragonSwap transaction...");
      const tx = await router.exactInputSingle(swapParams, { 
        value: swapAmount,
        gasLimit: 300000
      });
      
      console.log(`Transaction hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log("✅ Direct DragonSwap swap SUCCESS!");
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check USDC balance
        const usdcAbi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
        const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, ethers.provider);
        const usdcBalance = await usdc.balanceOf(agentWallet.address);
        const decimals = await usdc.decimals();
        
        console.log(`New USDC balance: ${ethers.formatUnits(usdcBalance, decimals)} USDC`);
      } else {
        console.log("❌ Transaction failed");
      }
      
    } catch (error) {
      console.error("❌ Direct DragonSwap swap failed:");
      console.error("Error:", error.message);
      
      if (error.transaction) {
        console.log("Transaction hash:", error.transaction.hash);
      }
    }
});

module.exports = {}; 