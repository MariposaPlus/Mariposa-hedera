const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Diagnosing Available Pools and Testing Swaps");
  console.log("=" .repeat(60));

  // Contract addresses
  const SEISWAP_ROUTER = "0xD5B35b8b6eA701aA23BBF71eeBBD94Cb70844450";
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";
  const USDC_ADDRESS = "0x3894085Ef7Ff0f0aeDf52E2A2704928d259C2fc1"; // From config
  const DRAGONSWAP_FACTORY = "0x179D9a5592Bc77050796F7be28058c51cA575df4";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📍 Testing with account:", signer.address);
  console.log("💰 Account balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  // Connect to contracts
  const seiSwapRouter = await ethers.getContractAt("contracts/SeiSwapRouterFixed.sol:SeiSwapRouter", SEISWAP_ROUTER);

  console.log("\n🔍 Testing Token Contracts...");
  
  // Test WSEI
  console.log("\n📋 WSEI Analysis:");
  try {
    const wsei = await ethers.getContractAt("IERC20", WSEI_ADDRESS);
    const name = await wsei.name();
    const symbol = await wsei.symbol();
    const decimals = await wsei.decimals();
    console.log(`✅ WSEI: ${name} (${symbol}) - ${decimals} decimals`);
  } catch (error) {
    console.log("❌ WSEI error:", error.message);
  }

  // Test USDC
  console.log("\n📋 USDC Analysis:");
  const usdcCode = await signer.provider.getCode(USDC_ADDRESS);
  if (usdcCode === "0x") {
    console.log("❌ USDC contract not found at", USDC_ADDRESS);
  } else {
    try {
      const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
      const name = await usdc.name();
      const symbol = await usdc.symbol();
      const decimals = await usdc.decimals();
      console.log(`✅ USDC: ${name} (${symbol}) - ${decimals} decimals`);
    } catch (error) {
      console.log("⚠️ USDC details unavailable:", error.message);
    }
  }

  // Test USDT
  console.log("\n📋 USDT Analysis:");
  const usdtCode = await signer.provider.getCode(USDT_ADDRESS);
  if (usdtCode === "0x") {
    console.log("❌ USDT contract not found at", USDT_ADDRESS);
  } else {
    try {
      const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
      const name = await usdt.name();
      const symbol = await usdt.symbol();
      const decimals = await usdt.decimals();
      console.log(`✅ USDT: ${name} (${symbol}) - ${decimals} decimals`);
    } catch (error) {
      console.log("⚠️ USDT details unavailable:", error.message);
      console.log("   This could be a non-standard ERC20 implementation");
    }
  }

  console.log("\n🧪 Testing Pool Availability...");

  const testTokens = [
    { name: "USDC", address: USDC_ADDRESS, decimals: 6 },
    { name: "USDT", address: USDT_ADDRESS, decimals: 6 }
  ];

  const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  const testAmount = ethers.parseEther("0.01"); // 0.01 SEI

  for (const token of testTokens) {
    console.log(`\n🔄 Testing ${token.name} (${token.address}):`);
    
    for (const fee of feeTiers) {
      try {
        const gasEstimate = await seiSwapRouter.swapSeiToToken.estimateGas(
          token.address,
          0, // Min out = 0 for testing
          fee,
          { value: testAmount }
        );
        
        console.log(`   ✅ ${fee/10000}% fee pool: Available (gas: ${gasEstimate})`);
        
        // If gas estimation succeeds, try a small actual swap
        console.log(`      🚀 Attempting small swap...`);
        try {
          const tx = await seiSwapRouter.swapSeiToToken(
            token.address,
            0,
            fee,
            { 
              value: testAmount,
              gasLimit: gasEstimate + 100000n
            }
          );
          
          console.log(`      📝 Transaction: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`      ✅ Swap successful! Gas used: ${receipt.gasUsed}`);
          
          // Check received tokens
          const tokenContract = await ethers.getContractAt("IERC20", token.address);
          const balance = await tokenContract.balanceOf(signer.address);
          console.log(`      💰 Received: ${ethers.formatUnits(balance, token.decimals)} ${token.name}`);
          
          // Parse events for more details
          for (const log of receipt.logs) {
            try {
              const parsed = seiSwapRouter.interface.parseLog(log);
              if (parsed.name === "SeiToTokenSwap") {
                const tokenOut = ethers.formatUnits(parsed.args.tokenAmountOut, token.decimals);
                const rate = Number(tokenOut) / Number(ethers.formatEther(testAmount));
                console.log(`      📈 Exchange rate: ${rate.toFixed(4)} ${token.name} per SEI`);
              }
            } catch (error) {
              // Skip non-contract logs
            }
          }
          
          break; // Success, no need to test other fees for this token
          
        } catch (swapError) {
          console.log(`      ❌ Swap failed: ${swapError.message.split('.')[0]}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${fee/10000}% fee pool: ${error.message.split('.')[0]}`);
      }
    }
  }

  console.log("\n🔍 Additional Diagnostics:");
  
  // Check if DragonSwap factory exists
  const factoryCode = await signer.provider.getCode(DRAGONSWAP_FACTORY);
  if (factoryCode === "0x") {
    console.log("❌ DragonSwap Factory not found - this could be the issue!");
  } else {
    console.log("✅ DragonSwap Factory exists");
  }

  console.log("\n💡 Recommendations:");
  console.log("1. If no pools work, the DragonSwap addresses might be incorrect");
  console.log("2. Try checking DragonSwap V2 documentation for current addresses");
  console.log("3. Verify that there's actual liquidity in the pools");
  console.log("4. Consider using DragonSwap V1 if V2 isn't fully deployed");
  console.log("5. Test on SEI testnet first before mainnet");
}

main()
  .then(() => {
    console.log("\n✅ Diagnostic completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Diagnostic failed:");
    console.error(error);
    process.exit(1);
  }); 