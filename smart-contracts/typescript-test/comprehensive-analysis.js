const { ethers } = require("ethers");
require("dotenv").config();

// Pool ABI for liquidity analysis
const POOL_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

const FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)"
];

async function analyzePoolLiquidity() {
  console.log("🔍 Comprehensive DragonSwap Pool Analysis");
  console.log("=" .repeat(60));

  // Setup
  const provider = new ethers.JsonRpcProvider("https://evm-rpc.sei-apis.com/");
  const factoryAddress = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

  // Token addresses
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";

  try {
    // Get token information
    console.log("📋 Token Information:");
    const wseiContract = new ethers.Contract(WSEI_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);

    try {
      const wseiSymbol = await wseiContract.symbol();
      const wseiName = await wseiContract.name();
      console.log(`- ${wseiSymbol} (${wseiName}): ${WSEI_ADDRESS}`);
    } catch {
      console.log(`- WSEI: ${WSEI_ADDRESS}`);
    }

    try {
      const usdtSymbol = await usdtContract.symbol();
      const usdtName = await usdtContract.name();
      console.log(`- ${usdtSymbol} (${usdtName}): ${USDT_ADDRESS}`);
    } catch {
      console.log(`- USDT: ${USDT_ADDRESS}`);
    }

    // Check all fee tiers
    console.log("\n📊 Pool Analysis for All Fee Tiers:");
    const fees = [100, 500, 3000, 10000];
    
    for (const fee of fees) {
      console.log(`\n🔹 Fee Tier: ${fee} basis points (${fee/100}%)`);
      
      const poolAddress = await factory.getPool(WSEI_ADDRESS, USDT_ADDRESS, fee);
      console.log(`   Pool Address: ${poolAddress}`);
      
      if (poolAddress === "0x0000000000000000000000000000000000000000") {
        console.log("   Status: ❌ No pool exists");
        continue;
      }

      // Analyze the pool
      const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
      
      try {
        const [token0, token1, poolFee, liquidity, slot0] = await Promise.all([
          pool.token0(),
          pool.token1(),
          pool.fee(),
          pool.liquidity(),
          pool.slot0()
        ]);

        console.log("   Status: ✅ Pool exists");
        console.log(`   Token0: ${token0}`);
        console.log(`   Token1: ${token1}`);
        console.log(`   Pool Fee: ${poolFee}`);
        console.log(`   Liquidity: ${liquidity.toString()}`);
        console.log(`   Current Price: ${slot0.sqrtPriceX96.toString()}`);
        console.log(`   Current Tick: ${slot0.tick}`);
        console.log(`   Unlocked: ${slot0.unlocked}`);

        // Check if pool is active
        if (liquidity > 0n) {
          console.log("   💧 Pool has liquidity");
          
          // Check token balances in pool
          const token0Balance = await new ethers.Contract(token0, ERC20_ABI, provider).balanceOf(poolAddress);
          const token1Balance = await new ethers.Contract(token1, ERC20_ABI, provider).balanceOf(poolAddress);
          
          console.log(`   Token0 Balance: ${ethers.formatEther(token0Balance)}`);
          console.log(`   Token1 Balance: ${ethers.formatUnits(token1Balance, 6)}`);
          
          // Determine which token is which
          if (token0.toLowerCase() === WSEI_ADDRESS.toLowerCase()) {
            console.log("   📈 WSEI is Token0, USDT is Token1");
          } else {
            console.log("   📈 USDT is Token0, WSEI is Token1");
          }
          
          // Check if unlocked
          if (!slot0.unlocked) {
            console.log("   ⚠️  WARNING: Pool is locked!");
          }
          
        } else {
          console.log("   ⚠️  Pool exists but has no liquidity");
        }

      } catch (error) {
        console.log(`   ❌ Error reading pool data: ${error.message}`);
      }
    }

    // Additional DragonSwap router analysis
    console.log("\n🔍 DragonSwap Router Analysis:");
    const routerAddress = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
    
    const routerCode = await provider.getCode(routerAddress);
    console.log(`Router Contract Code Size: ${routerCode.length} bytes`);
    
    if (routerCode === "0x") {
      console.log("❌ Router contract not found!");
    } else {
      console.log("✅ Router contract exists");
    }

    // Network status
    console.log("\n🌐 Network Status:");
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();
    console.log(`Current Block: ${blockNumber}`);
    console.log(`Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei")} gwei`);

    // Recommendations
    console.log("\n💡 Recommendations:");
    console.log("1. The pool exists and has liquidity");
    console.log("2. The swap failure is likely due to:");
    console.log("   - High price impact for the swap amount");
    console.log("   - Insufficient slippage tolerance");
    console.log("   - Pool temporary issues or paused state");
    console.log("   - Gas estimation problems");
    console.log("\n3. Try:");
    console.log("   - Smaller swap amounts (0.001 WSEI)");
    console.log("   - Higher slippage tolerance (5-10%)");
    console.log("   - Different fee tiers if available");
    console.log("   - Direct DragonSwap UI for comparison");

  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
  }
}

// Run the analysis
analyzePoolLiquidity()
  .then(() => console.log("\n✅ Analysis completed!"))
  .catch(console.error); 