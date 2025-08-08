const { task } = require("hardhat/config");
require("dotenv").config();

task("test-pool-check", "Test if our contract can find the WSEI-USDC pool correctly")
  .setAction(async (taskArgs, hre) => {
    console.log("--- Testing Contract Pool Detection ---");

    const { ethers } = hre;
    
    const agentPrivateKey = process.env.INITIAL_AGENT_PRIVATE_KEY;
    if (!agentPrivateKey) {
      throw new Error("❌ INITIAL_AGENT_PRIVATE_KEY not found in .env. Cannot proceed.");
    }
    const agentWallet = new ethers.Wallet(agentPrivateKey, ethers.provider);

    const contractAddress = "0x5005Bf6822981445296F4927961e8bcEadfeeB38";
    const agenticRouter = await ethers.getContractAt("AgenticRouter", contractAddress, agentWallet);
    
    const WSEI_ADDRESS = "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7";
    const USDC_ADDRESS = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
    
    console.log("Testing contract's getBestFeeTier function:");
    
    try {
      const bestFee = await agenticRouter.getBestFeeTier(WSEI_ADDRESS, USDC_ADDRESS);
      console.log(`✅ getBestFeeTier(WSEI, USDC) returned: ${bestFee}`);
      
      // Test pool existence check
      const [exists, poolAddress] = await agenticRouter.checkPoolExists(WSEI_ADDRESS, USDC_ADDRESS, bestFee);
      console.log(`✅ checkPoolExists(WSEI, USDC, ${bestFee}):`, exists, poolAddress);
      
      // Test pool info
      const poolInfo = await agenticRouter.getPoolInfo(WSEI_ADDRESS, USDC_ADDRESS, bestFee);
      console.log(`✅ Pool info:`, {
        exists: poolInfo.exists,
        address: poolInfo.poolAddress,
        liquidity: poolInfo.liquidity.toString(),
        sqrtPrice: poolInfo.sqrtPriceX96.toString()
      });
      
    } catch (error) {
      console.error("❌ Error testing contract functions:", error.message);
    }
    
    // Test if we can find a direct pool
    try {
      const minFee = await agenticRouter.findMinFee(WSEI_ADDRESS, USDC_ADDRESS);
      console.log(`✅ findMinFee(WSEI, USDC) returned: ${minFee}`);
    } catch (error) {
      console.error("❌ findMinFee failed:", error.message);
    }
});

module.exports = {}; 