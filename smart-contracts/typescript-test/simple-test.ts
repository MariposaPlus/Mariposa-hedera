import { DragonSwap } from "./DragonSwap";
import { ExactInputSingleParams } from "./types";
import { parseEther, formatEther, formatUnits } from "ethers";

// Hardcoded environment for testing (replace with your values)
const TEST_CONFIG = {
  DRAGONSWAP_V2_SWAP_ROUTER_ADDRESS: "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428",
  DRAGONSWAP_V2_FACTORY_ADDRESS: "0x179D9a5592Bc77050796F7be28058c51cA575df4",
  RPC_URL: "https://evm-rpc.sei-apis.com/",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "your_private_key_here"
};

// Set environment variables
Object.entries(TEST_CONFIG).forEach(([key, value]) => {
  process.env[key] = value;
});

async function testDragonSwap() {
  console.log("🧪 Simple DragonSwap Test");
  console.log("=" .repeat(40));

  // Token addresses
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";

  try {
    // Initialize
    const dragonSwap = new DragonSwap(TEST_CONFIG.PRIVATE_KEY);
    console.log("📍 Account:", dragonSwap.getAddress());

    // Check balances
    const seiBalance = await dragonSwap.getBalance();
    console.log("💰 SEI:", formatEther(seiBalance));

    const wseiBalance = await dragonSwap.getTokenBalance(WSEI_ADDRESS);
    console.log("💰 WSEI:", formatEther(wseiBalance));

    const usdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);
    console.log("💰 USDT:", formatUnits(usdtBalance, 6));

    // Find pools
    console.log("\n🔍 Finding pools...");
    const minFee = await dragonSwap.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);
    
    if (!minFee) {
      console.log("❌ No pools found");
      return;
    }

    console.log(`✅ Found pool with ${minFee} basis points fee`);
    const poolAddress = await dragonSwap.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
    console.log("📍 Pool:", poolAddress);

    // Test swap (only if we have WSEI)
    if (wseiBalance > parseEther("0.01")) {
      console.log("\n🚀 Testing swap...");
      
      const swapParams: ExactInputSingleParams = {
        tokenIn: WSEI_ADDRESS,
        tokenOut: USDT_ADDRESS,
        fee: minFee,
        recipient: dragonSwap.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 1200,
        amountIn: parseEther("0.01"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };

      const receipt = await dragonSwap.exactInputSingle(swapParams);
      console.log("✅ Swap successful:", receipt?.hash);
      
    } else {
      console.log("⚠️  Insufficient WSEI for swap test");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

testDragonSwap()
  .then(() => console.log("✅ Done"))
  .catch(console.error); 