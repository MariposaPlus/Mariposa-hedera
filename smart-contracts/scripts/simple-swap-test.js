const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Simple SEI → USDT Swap Test");
  console.log("=" .repeat(40));

  // Contract addresses (properly checksummed)
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Account:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  // Connect to contract
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);

  console.log("\n🔍 Contract Info:");
  console.log("- SeiSwapRouter:", SEISWAP_ROUTER);
  console.log("- WSEI:", await seiSwapRouter.WSEI());
  console.log("- DragonSwap Router:", await seiSwapRouter.DRAGONSWAP_ROUTER());

  // Test if USDT contract exists
  const usdtCode = await signer.provider.getCode(USDT_ADDRESS);
  console.log("- USDT Contract:", usdtCode === "0x" ? "❌ Not found" : "✅ Exists");

  // Get initial USDT balance
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
  const initialBalance = await usdt.balanceOf(signer.address);
  console.log("- Initial USDT:", ethers.formatUnits(initialBalance, 6));

  console.log("\n🚀 Testing swap: 0.05 SEI → USDT");
  
  const seiAmount = ethers.parseEther("0.05");
  const minOut = 0;
  const fee = 3000; // 0.3%

  try {
    // Test different fee tiers to find working pool
    const feeTiers = [500, 3000, 10000];
    let workingFee = null;
    
    console.log("🔍 Checking fee tiers...");
    for (const testFee of feeTiers) {
      try {
        await seiSwapRouter.swapSeiToToken.estimateGas(
          USDT_ADDRESS,
          minOut,
          testFee,
          { value: seiAmount }
        );
        workingFee = testFee;
        console.log(`✅ ${testFee/10000}% fee tier works`);
        break;
      } catch (error) {
        console.log(`❌ ${testFee/10000}% fee tier: ${error.message.includes('execution reverted') ? 'No pool' : 'Error'}`);
      }
    }

    if (!workingFee) {
      console.log("\n❌ No working pools found for SEI/USDT");
      console.log("\n💡 This suggests:");
      console.log("1. SEI/USDT pools don't exist on DragonSwap V2");
      console.log("2. The DragonSwap router address might be incorrect");
      console.log("3. There's no liquidity in any of the pools");
      
      console.log("\n🔄 Let's try a direct interaction with DragonSwap router...");
      
      // Try direct interaction with DragonSwap router
      const dragonSwapAddress = await seiSwapRouter.DRAGONSWAP_ROUTER();
      const routerCode = await signer.provider.getCode(dragonSwapAddress);
      
      if (routerCode === "0x") {
        console.log("❌ DragonSwap router contract not found!");
        console.log("   This is likely the main issue.");
      } else {
        console.log("✅ DragonSwap router exists");
        console.log("   The issue is likely no SEI/USDT pools");
      }
      
      return;
    }

    console.log(`\n🚀 Executing swap with ${workingFee/10000}% fee...`);
    
    const tx = await seiSwapRouter.swapSeiToToken(
      USDT_ADDRESS,
      minOut,
      workingFee,
      { value: seiAmount }
    );

    console.log("📝 Transaction:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");

    // Check final balance
    const finalBalance = await usdt.balanceOf(signer.address);
    const received = finalBalance - initialBalance;

    console.log("\n📊 Results:");
    console.log("- SEI sent:", ethers.formatEther(seiAmount));
    console.log("- USDT received:", ethers.formatUnits(received, 6));
    console.log("- Gas used:", receipt.gasUsed.toString());

    if (received > 0) {
      const rate = Number(ethers.formatUnits(received, 6)) / Number(ethers.formatEther(seiAmount));
      console.log("- Exchange rate:", rate.toFixed(4), "USDT per SEI");
      console.log("🎉 Swap successful!");
    } else {
      console.log("⚠️  No USDT received");
    }

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("\n💡 Possible issues:");
      console.log("1. Pool doesn't exist");
      console.log("2. No liquidity");
      console.log("3. Incorrect router address");
    }
  }
}

main()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }); 