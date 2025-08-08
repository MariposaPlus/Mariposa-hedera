const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging SEI → USDT Swap");
  console.log("=" .repeat(50));

  // Contract addresses
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const SEISWAP_ROUTER = "0xadECD4127c383761FD75A82E657Fda7d52AC8e38";
  const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";

  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);

  // Connect to contracts
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouter.sol:SeiSwapRouter", SEISWAP_ROUTER);
  const dragonSwapRouter = await ethers.getContractAt("IDragonSwapV2Router", DRAGONSWAP_ROUTER);

  // Test 1: Check pool details
  console.log("\n🔍 Pool Analysis:");
  const minFee = await seiSwapRouter.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
  const poolAddress = await seiSwapRouter.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
  console.log("Pool:", poolAddress);
  console.log("Fee:", minFee.toString(), "basis points");

  // Test 2: Try direct router call with small amount
  console.log("\n🧪 Testing direct router call...");
  
  const wsei = await ethers.getContractAt("IWSEI", WSEI_ADDRESS);
  const smallAmount = ethers.parseEther("0.01"); // Even smaller amount
  
  try {
    // Wrap SEI first
    console.log("Wrapping", ethers.formatEther(smallAmount), "SEI to WSEI...");
    const wrapTx = await wsei.deposit({ value: smallAmount });
    await wrapTx.wait();
    console.log("✅ Wrapped successfully");
    
    // Approve router
    console.log("Approving WSEI for router...");
    const approveTx = await wsei.approve(DRAGONSWAP_ROUTER, smallAmount);
    await approveTx.wait();
    console.log("✅ Approved successfully");
    
    // Try direct swap
    console.log("Attempting direct swap...");
    const params = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: minFee,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
      amountIn: smallAmount,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    };
    
    const gasEstimate = await dragonSwapRouter.exactInputSingle.estimateGas(params);
    console.log("Gas estimate:", gasEstimate.toString());
    
    const swapTx = await dragonSwapRouter.exactInputSingle(params, {
      gasLimit: gasEstimate * 120n / 100n
    });
    
    const receipt = await swapTx.wait();
    console.log("✅ Direct swap successful!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.log("❌ Direct swap failed:", error.message);
    
    // If direct swap fails, the issue is likely with liquidity or pool
    if (error.message.includes("LOK")) {
      console.log("Issue: Pool might be locked or have insufficient liquidity");
    } else if (error.message.includes("STF")) {
      console.log("Issue: SafeTransferFrom failed - token transfer issue");
    } else if (error.message.includes("TF")) {
      console.log("Issue: TransferFrom failed");
    }
  }

  // Test 3: Try the wrapper with even smaller amount
  console.log("\n🧪 Testing wrapper with tiny amount...");
  const tinyAmount = ethers.parseEther("0.001"); // 0.001 SEI
  
  try {
    const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
      USDT_ADDRESS,
      0,
      { value: tinyAmount }
    );
    
    const tx = await seiSwapRouter.swapSeiToToken(
      USDT_ADDRESS,
      0,
      { 
        value: tinyAmount,
        gasLimit: gasEstimate * 150n / 100n // Extra gas
      }
    );
    
    const receipt = await tx.wait();
    console.log("✅ Wrapper swap successful with tiny amount!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.log("❌ Wrapper swap failed even with tiny amount:", error.message);
    
    // Let's try to decode the error
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }

  // Test 4: Check WSEI balance and allowances
  console.log("\n🔍 Balance and Allowance Check:");
  try {
    const wseiBalance = await wsei.balanceOf(signer.address);
    console.log("WSEI balance:", ethers.formatEther(wseiBalance));
    
    const allowance = await wsei.allowance(signer.address, DRAGONSWAP_ROUTER);
    console.log("WSEI allowance:", ethers.formatEther(allowance));
    
    const contractWseiBalance = await wsei.balanceOf(SEISWAP_ROUTER);
    console.log("Contract WSEI balance:", ethers.formatEther(contractWseiBalance));
    
  } catch (error) {
    console.log("Error checking balances:", error.message);
  }

  console.log("\n🎉 Debug completed!");
}

main()
  .then(() => {
    console.log("✅ Debug script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug error:", error);
    process.exit(1);
  }); 