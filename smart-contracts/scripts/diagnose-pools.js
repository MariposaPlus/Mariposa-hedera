const { task } = require("hardhat/config");
require("dotenv").config();

task("diagnose-pools", "Diagnose DragonSwap pools for WSEI-USDC")
  .setAction(async (taskArgs, hre) => {
    console.log("--- Diagnosing DragonSwap Pools ---");

    const { ethers } = hre;
    
    const FACTORY_ADDRESS = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
    const WSEI_ADDRESS = "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7";
    const USDC_ADDRESS = "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
    
    const factoryAbi = [
      "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];
    
    const poolAbi = [
      "function liquidity() external view returns (uint128)",
      "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)"
    ];

    const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, ethers.provider);
    
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    
    console.log("Checking WSEI-USDC pools:");
    console.log("WSEI:", WSEI_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);
    console.log();
    
    for (const fee of feeTiers) {
      try {
        const poolAddress = await factory.getPool(WSEI_ADDRESS, USDC_ADDRESS, fee);
        console.log(`Fee ${fee/10000}%: ${poolAddress}`);
        
        if (poolAddress !== ethers.ZeroAddress) {
          const pool = new ethers.Contract(poolAddress, poolAbi, ethers.provider);
          
          try {
            const liquidity = await pool.liquidity();
            const slot0 = await pool.slot0();
            const token0 = await pool.token0();
            const token1 = await pool.token1();
            
            console.log(`  - Liquidity: ${liquidity.toString()}`);
            console.log(`  - Token0: ${token0}`);
            console.log(`  - Token1: ${token1}`);
            console.log(`  - SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
            console.log(`  - Unlocked: ${slot0.unlocked}`);
            
            if (liquidity > 0) {
              console.log(`  ✅ Pool has liquidity!`);
            } else {
              console.log(`  ❌ Pool exists but has no liquidity`);
            }
          } catch (err) {
            console.log(`  ❌ Error reading pool data: ${err.message}`);
          }
        } else {
          console.log(`  ❌ Pool does not exist`);
        }
        console.log();
      } catch (err) {
        console.log(`  ❌ Error checking pool: ${err.message}`);
        console.log();
      }
    }
    
    // Also check reverse order (USDC-WSEI)
    console.log("Checking USDC-WSEI pools (reverse order):");
    for (const fee of feeTiers) {
      try {
        const poolAddress = await factory.getPool(USDC_ADDRESS, WSEI_ADDRESS, fee);
        console.log(`Fee ${fee/10000}%: ${poolAddress}`);
        
        if (poolAddress !== ethers.ZeroAddress) {
          const pool = new ethers.Contract(poolAddress, poolAbi, ethers.provider);
          const liquidity = await pool.liquidity();
          console.log(`  - Liquidity: ${liquidity.toString()}`);
          
          if (liquidity > 0) {
            console.log(`  ✅ Pool has liquidity!`);
          } else {
            console.log(`  ❌ Pool exists but has no liquidity`);
          }
        } else {
          console.log(`  ❌ Pool does not exist`);
        }
        console.log();
      } catch (err) {
        console.log(`  ❌ Error checking pool: ${err.message}`);
        console.log();
      }
    }
});

module.exports = {}; 