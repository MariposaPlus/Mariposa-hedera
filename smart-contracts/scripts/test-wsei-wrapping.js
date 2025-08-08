const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Testing WSEI Wrapping & Direct Swap");
  console.log("=" .repeat(50));

  // Contract addresses
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fA906F660EcC5";
  const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";

  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  console.log("💰 SEI Balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  // Step 1: Test WSEI wrapping manually
  console.log("\n🌯 Step 1: Testing WSEI Wrapping");
  
  try {
    const wsei = await ethers.getContractAt("IWSEI", WSEI_ADDRESS);
    const wseiBalance = await wsei.balanceOf(signer.address);
    console.log("- Initial WSEI balance:", ethers.formatEther(wseiBalance), "WSEI");

    // Test wrapping 0.01 SEI
    const wrapAmount = ethers.parseEther("0.01");
    console.log("- Wrapping", ethers.formatEther(wrapAmount), "SEI to WSEI...");
    
    const wrapTx = await wsei.deposit({ value: wrapAmount });
    await wrapTx.wait();
    
    const newWseiBalance = await wsei.balanceOf(signer.address);
    console.log("✅ WSEI wrapping successful!");
    console.log("- New WSEI balance:", ethers.formatEther(newWseiBalance), "WSEI");
    
    // Step 2: Test direct DragonSwap interaction with WSEI
    console.log("\n🔄 Step 2: Testing Direct DragonSwap with WSEI");
    
    // Approve WSEI to DragonSwap router
    const approveTx = await wsei.approve(DRAGONSWAP_ROUTER, wrapAmount);
    await approveTx.wait();
    console.log("✅ WSEI approved to DragonSwap router");
    
    // DragonSwap V2 Router interface
    const dragonSwapABI = [
      "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
    ];
    
    const dragonSwapRouter = await ethers.getContractAt(dragonSwapABI, DRAGONSWAP_ROUTER);
    
    const swapParams = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 1200,
      amountIn: wrapAmount,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    };
    
    try {
      console.log("- Testing direct DragonSwap gas estimation...");
      const directGas = await dragonSwapRouter.exactInputSingle.estimateGas(swapParams);
      console.log("✅ Direct DragonSwap gas estimate:", directGas.toString());
      
      // Execute direct swap
      console.log("- Executing direct DragonSwap swap...");
      const directTx = await dragonSwapRouter.exactInputSingle(swapParams, {
        gasLimit: directGas + 50000n
      });
      
      console.log("📝 Direct swap transaction:", directTx.hash);
      const directReceipt = await directTx.wait();
      
      if (directReceipt.status === 1) {
        console.log("🎉 DIRECT DRAGONSWAP SWAP SUCCESSFUL!");
        console.log("- Block:", directReceipt.blockNumber);
        console.log("- Gas used:", directReceipt.gasUsed.toString());
        
        // Check USDT received
        const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
        const usdtBalance = await usdt.balanceOf(signer.address);
        console.log("- USDT received:", ethers.formatUnits(usdtBalance, 6), "USDT");
        
        console.log("\n💡 The pool works! Issue is in SeiSwapRouter contract.");
      }
      
    } catch (directError) {
      console.log("❌ Direct DragonSwap failed:", directError.message);
      if (directError.data) {
        console.log("- Error data:", directError.data);
      }
    }
    
  } catch (wrapError) {
    console.log("❌ WSEI wrapping failed:", wrapError.message);
  }

  // Step 3: Analyze SeiSwapRouter issues
  console.log("\n🔍 Step 3: Analyzing SeiSwapRouter Issues");
  
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);
  
  // Check if contract has WSEI allowance
  try {
    const wsei = await ethers.getContractAt("IERC20", WSEI_ADDRESS);
    const contractWseiBalance = await wsei.balanceOf(SEISWAP_ROUTER);
    const allowance = await wsei.allowance(SEISWAP_ROUTER, DRAGONSWAP_ROUTER);
    
    console.log("- SeiSwapRouter WSEI balance:", ethers.formatEther(contractWseiBalance), "WSEI");
    console.log("- SeiSwapRouter → DragonSwap allowance:", ethers.formatEther(allowance), "WSEI");
    
    // Test if initialize function exists and call it
    try {
      console.log("- Calling initialize function...");
      const initTx = await seiSwapRouter.initialize();
      await initTx.wait();
      console.log("✅ Contract initialized");
      
      const newAllowance = await wsei.allowance(SEISWAP_ROUTER, DRAGONSWAP_ROUTER);
      console.log("- New allowance:", ethers.formatEther(newAllowance), "WSEI");
      
    } catch (initError) {
      console.log("⚠️ Initialize failed or not needed:", initError.message.split('.')[0]);
    }
    
  } catch (error) {
    console.log("⚠️ Contract analysis failed:", error.message);
  }

  console.log("\n📋 Findings:");
  console.log("1. Pool has substantial liquidity (1M+ WSEI, 298K+ USDT)");
  console.log("2. Error 0x81ceff30 indicates a specific contract issue");
  console.log("3. Need to test if direct DragonSwap works vs SeiSwapRouter");
  console.log("4. Possible WSEI wrapping or approval issue in contract");
}

main()
  .then(() => {
    console.log("\n✅ WSEI wrapping test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }); 