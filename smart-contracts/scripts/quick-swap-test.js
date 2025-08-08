const { ethers } = require("hardhat");
require("dotenv").config();

async function quickSwapTest() {
  console.log("=== Quick Swap Test ===");
  
  const contractAddress = "0x2AD53aB91cAA4f73F61520858B7955870a3197Fb";
  const usdcAddress = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
  
  // Use the pre-registered agent from deployment
  const agentPrivateKey = process.env.PRIVATE_KEY;
  if (!agentPrivateKey) {
    console.log("❌ No private key found in environment");
    return;
  }
  
  const provider = new ethers.JsonRpcProvider("https://evm-rpc.sei-apis.com");
  const agent = new ethers.Wallet(agentPrivateKey, provider);
  
  console.log("Agent address:", agent.address);
  console.log("Contract:", contractAddress);
  console.log("Target token (USDC):", usdcAddress);
  
  const ABI = [
    "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
    "function isAgent(address) external view returns (bool)"
  ];
  
  const agenticRouter = new ethers.Contract(contractAddress, ABI, agent);
  
  try {
    // Check if this address is an agent
    const isAgent = await agenticRouter.isAgent(agent.address);
    console.log("Is agent registered:", isAgent);
    
    if (!isAgent) {
      console.log("❌ Current address is not registered as agent");
      console.log("Pre-registered agent: 0x9e275f93927a53da3b355ec04afb31fc8d87a70f");
      console.log("You need to use that agent's private key");
      return;
    }
    
    // Check balance
    const balance = await provider.getBalance(agent.address);
    console.log("Agent SEI balance:", ethers.formatEther(balance));
    
    if (balance < ethers.parseEther("0.2")) {
      console.log("❌ Insufficient SEI balance for test");
      return;
    }
    
    // Test parameters
    const swapAmount = ethers.parseEther("0.1");
    const deadline = Math.floor(Date.now() / 1000) + 300;
    
    console.log("\n=== Swap Test ===");
    console.log("Amount:", ethers.formatEther(swapAmount), "SEI");
    console.log("Deadline:", new Date(deadline * 1000).toLocaleString());
    
    // Try gas estimation
    try {
      const gasEstimate = await agenticRouter.swapSeiToToken.estimateGas(
        usdcAddress,
        0,
        agent.address,
        deadline,
        { value: swapAmount }
      );
      
      console.log("✅ Gas estimate successful:", gasEstimate.toString());
      
      // For now just show the estimation success
      console.log("🎉 Contract is ready for swap!");
      console.log("You can now test on external website with these params:");
      console.log("- tokenOut:", usdcAddress);
      console.log("- amountOutMin: 0");
      console.log("- recipient:", agent.address);
      console.log("- deadline:", deadline);
      console.log("- value:", swapAmount.toString());
      
    } catch (gasError) {
      console.error("❌ Gas estimation failed:", gasError.message);
      if (gasError.reason) {
        console.error("Reason:", gasError.reason);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

quickSwapTest()
  .then(() => {
    console.log("\n✅ Quick test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  }); 