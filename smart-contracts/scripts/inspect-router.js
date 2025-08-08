const { task } = require("hardhat/config");
require("dotenv").config();

task("inspect-router", "Inspect DragonSwap router contract")
  .setAction(async (taskArgs, hre) => {
    console.log("--- Inspecting DragonSwap Router ---");

    const { ethers } = hre;
    
    const DRAGONSWAP_ROUTER = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
    const WSEI_ADDRESS = "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7";
    
    console.log("DragonSwap Router:", DRAGONSWAP_ROUTER);
    console.log("WSEI:", WSEI_ADDRESS);
    
    // Check if the router contract exists and has code
    const code = await ethers.provider.getCode(DRAGONSWAP_ROUTER);
    console.log("Router has code:", code !== "0x");
    console.log("Code length:", code.length);
    
    // Try to call some basic view functions
    const basicAbi = [
      "function factory() external view returns (address)",
      "function WETH9() external view returns (address)",
      "function refundETH() external payable"
    ];
    
    try {
      const router = new ethers.Contract(DRAGONSWAP_ROUTER, basicAbi, ethers.provider);
      
      console.log("\n--- Router Info ---");
      try {
        const factory = await router.factory();
        console.log("Factory:", factory);
      } catch (e) {
        console.log("❌ Could not get factory:", e.message);
      }
      
      try {
        const weth = await router.WETH9();
        console.log("WETH9:", weth);
        console.log("WETH9 matches WSEI:", weth.toLowerCase() === WSEI_ADDRESS.toLowerCase());
      } catch (e) {
        console.log("❌ Could not get WETH9:", e.message);
      }
      
    } catch (e) {
      console.log("❌ Error inspecting router:", e.message);
    }
    
    // Check if we might need multicall or different approach
    console.log("\n--- Checking Alternative Methods ---");
    console.log("Maybe DragonSwap uses different function names or requires multicall?");
    
    // Let's also check what the actual transaction data should look like
    const routerAbi = [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
    ];
    
    const iface = new ethers.Interface(routerAbi);
    const swapParams = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
      fee: 100,
      recipient: "0xC86A17ffbFC3d463A407B45d35D0cF7b525b6Be7",
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: ethers.parseEther("1.0"),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    };
    
    const encodedData = iface.encodeFunctionData("exactInputSingle", [swapParams]);
    console.log("\nEncoded function data:");
    console.log(encodedData);
    console.log("Function selector:", encodedData.slice(0, 10));
    
});

module.exports = {}; 