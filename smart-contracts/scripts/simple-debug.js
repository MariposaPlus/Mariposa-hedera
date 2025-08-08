const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Simple SEI → USDT Debug");
  console.log("=" .repeat(40));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const SEISWAP_ROUTER = "0xadECD4127c383761FD75A82E657Fda7d52AC8e38";

  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);

  // Connect to our contract
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", SEISWAP_ROUTER);

  // Check pool
  console.log("\n🔍 Pool Check:");
  const minFee = await seiSwapRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
  console.log("Min fee:", minFee.toString());
  
  if (minFee === 0n) {
    console.log("❌ No pool exists");
    return;
  }

  // Try with very small amount and higher slippage tolerance
  const microAmount = ethers.parseEther("0.001"); // 0.001 SEI
  console.log("\n🧪 Testing with", ethers.formatEther(microAmount), "SEI");

  try {
    // Test 1: swapSeiToToken (auto fee detection)
    console.log("Test 1: Auto fee detection swap...");
    const tx1 = await seiSwapRouter.swapSeiToToken(
      USDT_ADDRESS,
      0, // Accept any amount out
      { value: microAmount }
    );
    
    await tx1.wait();
    console.log("✅ Auto fee swap successful!");
    
  } catch (error) {
    console.log("❌ Auto fee swap failed:", error.message);
    
    try {
      // Test 2: swapSeiToTokenWithFee (manual fee)
      console.log("Test 2: Manual fee swap...");
      const tx2 = await seiSwapRouter.swapSeiToTokenWithFee(
        USDT_ADDRESS,
        0,
        minFee,
        { value: microAmount }
      );
      
      await tx2.wait();
      console.log("✅ Manual fee swap successful!");
      
    } catch (error2) {
      console.log("❌ Manual fee swap also failed:", error2.message);
      
      // Let's check if the contract has proper approvals
      console.log("\n🔍 Contract Analysis:");
      try {
        const owner = await seiSwapRouter.owner();
        console.log("Contract owner:", owner);
        
        const wseiAddress = await seiSwapRouter.WSEI();
        console.log("WSEI address:", wseiAddress);
        
        const routerAddress = await seiSwapRouter.DRAGONSWAP_ROUTER();
        console.log("Router address:", routerAddress);
        
        // Check if contract was initialized
        const wsei = await ethers.getContractAt("IERC20", wseiAddress);
        const allowance = await wsei.allowance(SEISWAP_ROUTER, routerAddress);
        console.log("Contract WSEI allowance:", ethers.formatEther(allowance));
        
        if (allowance === 0n) {
          console.log("⚠️  Contract needs initialization - WSEI not approved!");
          
          // Try to initialize
          if (signer.address.toLowerCase() === owner.toLowerCase()) {
            console.log("Attempting to initialize contract...");
            const initTx = await seiSwapRouter.initialize();
            await initTx.wait();
            console.log("✅ Contract initialized");
            
            // Try swap again
            const tx3 = await seiSwapRouter.swapSeiToToken(
              USDT_ADDRESS,
              0,
              { value: microAmount }
            );
            await tx3.wait();
            console.log("✅ Swap successful after initialization!");
          }
        }
        
      } catch (error3) {
        console.log("❌ Contract analysis failed:", error3.message);
      }
    }
  }

  console.log("\n🎉 Debug completed!");
}

main()
  .then(() => {
    console.log("✅ Debug finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 