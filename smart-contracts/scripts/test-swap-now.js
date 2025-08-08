const { ethers } = require("hardhat");
const { getGasConfig } = require("./utils/gasUtils");
require("dotenv").config();

async function testSwapNow() {
  console.log("=== Testing SEI to USDC Swap NOW ===");
  
  const [signer] = await ethers.getSigners();
  const contractAddress = "0x2AD53aB91cAA4f73F61520858B7955870a3197Fb";
  
  console.log("Signer:", signer.address);
  console.log("Contract:", contractAddress);
  
  // Contract ABI
  const ABI = [
    "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
    "function isAgent(address) external view returns (bool)",
    "function registerAgent(address agent, bool allowed) external",
    "function stablecoin() external view returns (address)",
    "function admin() external view returns (address)"
  ];
  
  const ERC20_ABI = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)"
  ];
  
  const agenticRouter = new ethers.Contract(contractAddress, ABI, signer);
  
  try {
    // Get USDC address
    const usdcAddress = await agenticRouter.stablecoin();
    console.log("USDC Address:", usdcAddress);
    
    // Check if current signer is agent
    const isAgent = await agenticRouter.isAgent(signer.address);
    console.log("Is current signer an agent:", isAgent);
    
    // Check admin
    const admin = await agenticRouter.admin();
    console.log("Contract admin:", admin);
    
    // Register current signer as agent if they're the admin
    if (!isAgent && signer.address.toLowerCase() === admin.toLowerCase()) {
      console.log("Registering current signer as agent...");
      const tx = await agenticRouter.registerAgent(signer.address, true);
      await tx.wait();
      console.log("✅ Successfully registered as agent!");
    } else if (!isAgent) {
      console.log("❌ Current signer is not an agent and not admin");
      console.log("You need to use agent address: 0x9e275f93927a53da3b355ec04afb31fc8d87a70f");
      return;
    }
    
    // Setup swap parameters
    const swapAmount = ethers.parseEther("0.1"); // 0.1 SEI
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    console.log("\n=== Swap Parameters ===");
    console.log("Swap amount:", ethers.formatEther(swapAmount), "SEI");
    console.log("Deadline:", new Date(deadline * 1000).toLocaleString());
    
    // Check initial balances
    const initialSei = await ethers.provider.getBalance(signer.address);
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
    const initialUsdc = await usdc.balanceOf(signer.address);
    const usdcDecimals = await usdc.decimals();
    const usdcSymbol = await usdc.symbol();
    
    console.log("\n=== Initial Balances ===");
    console.log("SEI:", ethers.formatEther(initialSei));
    console.log(`${usdcSymbol}:`, ethers.formatUnits(initialUsdc, usdcDecimals));
    
    // Estimate gas
    console.log("\n=== Gas Estimation ===");
    try {
      const gasEstimate = await agenticRouter.swapSeiToToken.estimateGas(
        usdcAddress,
        0, // Accept any amount
        signer.address,
        deadline,
        { value: swapAmount }
      );
      console.log("Gas estimate:", gasEstimate.toString());
      
      // Execute swap
      console.log("\n=== Executing Swap ===");
      const gasConfig = await getGasConfig(ethers.provider, Number(gasEstimate) * 2);
      
      const tx = await agenticRouter.swapSeiToToken(
        usdcAddress,
        0, // Accept any amount for testing
        signer.address,
        deadline,
        {
          value: swapAmount,
          ...gasConfig
        }
      );
      
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("✅ Swap successful!");
      console.log("Block:", receipt.blockNumber);
      console.log("Gas used:", receipt.gasUsed.toString());
      
      // Check final balances
      const finalSei = await ethers.provider.getBalance(signer.address);
      const finalUsdc = await usdc.balanceOf(signer.address);
      
      console.log("\n=== Final Balances ===");
      console.log("SEI:", ethers.formatEther(finalSei));
      console.log(`${usdcSymbol}:`, ethers.formatUnits(finalUsdc, usdcDecimals));
      
      // Calculate results
      const seiUsed = initialSei - finalSei;
      const usdcReceived = finalUsdc - initialUsdc;
      
      console.log("\n=== Swap Results ===");
      console.log("SEI used:", ethers.formatEther(seiUsed));
      console.log(`${usdcSymbol} received:`, ethers.formatUnits(usdcReceived, usdcDecimals));
      
      if (usdcReceived > 0) {
        const rate = Number(ethers.formatUnits(usdcReceived, usdcDecimals)) / Number(ethers.formatEther(swapAmount));
        console.log("Effective rate:", rate.toFixed(6), `${usdcSymbol} per SEI`);
        console.log("🎉 SWAP SUCCESSFUL!");
      } else {
        console.log("⚠️ No USDC received");
      }
      
    } catch (gasError) {
      console.error("❌ Gas estimation failed:", gasError.message);
      
      if (gasError.reason) {
        console.error("Reason:", gasError.reason);
      }
      if (gasError.data) {
        console.error("Data:", gasError.data);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

testSwapNow()
  .then(() => {
    console.log("\n✅ Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  }); 