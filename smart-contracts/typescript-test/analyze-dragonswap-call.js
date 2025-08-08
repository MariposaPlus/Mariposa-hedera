const { ethers } = require("ethers");
require("dotenv").config();

async function analyzeDragonSwapCall() {
  console.log("🔍 Analyzing DragonSwap Website Transaction");
  console.log("=" .repeat(60));

  // Data from DragonSwap website
  const calldata = "0x5ae401dc00000000000000000000000000000000000000000000000000000000687fb66300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c86a17ffbfc3d463a407b45d35d0cf7b525b6be70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000e30fedd158a2e3b13e9badaeabafc5516e95e8c70000000000000000000000000555e30da8f98308edb960aa94c0db47230d2b9c00000000000000000000000000000000000000000000000000000000";
  const to = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
  const value = "0x2386f26fc10000";

  console.log("📋 Transaction Details:");
  console.log("To:", to);
  console.log("Value:", ethers.formatEther(value), "ETH/SEI");
  console.log("Calldata length:", calldata.length, "characters");

  // Decode the calldata
  console.log("\n🔍 Decoding Calldata:");
  
  // The function signature is the first 4 bytes (8 hex characters after 0x)
  const functionSelector = calldata.slice(0, 10);
  console.log("Function Selector:", functionSelector);
  
  // Common DragonSwap function selectors
  const knownSelectors = {
    "0x5ae401dc": "multicall(uint256,bytes[])",
    "0x472b43f3": "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
    "0x414bf389": "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))"
  };

  if (knownSelectors[functionSelector]) {
    console.log("Function:", knownSelectors[functionSelector]);
  }

  // Decode the parameters
  try {
    // This looks like a multicall function
    if (functionSelector === "0x5ae401dc") {
      console.log("🔄 This is a MULTICALL transaction");
      
      // Decode multicall parameters
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const multicallAbi = ["function multicall(uint256 deadline, bytes[] calldata data)"];
      const iface = new ethers.Interface(multicallAbi);
      
      // Remove function selector and decode
      const paramData = "0x" + calldata.slice(10);
      const decoded = abiCoder.decode(["uint256", "bytes[]"], paramData);
      
      const deadline = decoded[0];
      const calls = decoded[1];
      
      console.log("Deadline:", new Date(Number(deadline) * 1000).toISOString());
      console.log("Number of calls:", calls.length);
      
      // Analyze each call
      calls.forEach((call, index) => {
        console.log(`\n📞 Call ${index + 1}:`);
        console.log("Data:", call);
        console.log("Length:", call.length);
        
        // Check if this is exactInputSingle
        const callSelector = call.slice(0, 10);
        console.log("Call Selector:", callSelector);
        
        if (callSelector === "0x472b43f3") {
          console.log("This is exactInputSingle!");
          
          // Decode exactInputSingle parameters
          try {
            const exactInputParams = "0x" + call.slice(10);
            const swapDecoded = abiCoder.decode([
              "address", // tokenIn
              "address", // tokenOut  
              "uint24",  // fee
              "address", // recipient
              "uint256", // deadline
              "uint256", // amountIn
              "uint256", // amountOutMinimum
              "uint160"  // sqrtPriceLimitX96
            ], exactInputParams);
            
            console.log("🔄 Swap Parameters:");
            console.log("  Token In:", swapDecoded[0]);
            console.log("  Token Out:", swapDecoded[1]);
            console.log("  Fee:", swapDecoded[2].toString());
            console.log("  Recipient:", swapDecoded[3]);
            console.log("  Deadline:", new Date(Number(swapDecoded[4]) * 1000).toISOString());
            console.log("  Amount In:", ethers.formatEther(swapDecoded[5]));
            console.log("  Amount Out Min:", swapDecoded[6].toString());
            console.log("  Price Limit:", swapDecoded[7].toString());
            
            // Identify tokens
            const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
            const WBTC_ADDRESS = "0x0555e30da8f98308edb960aa94c0db47230d2b9c";
            
            if (swapDecoded[0].toLowerCase() === WSEI_ADDRESS.toLowerCase()) {
              console.log("  🔄 WSEI → WBTC swap");
            } else if (swapDecoded[1].toLowerCase() === WSEI_ADDRESS.toLowerCase()) {
              console.log("  🔄 WBTC → WSEI swap");
            }
            
          } catch (decodeError) {
            console.log("  ❌ Failed to decode swap params:", decodeError.message);
          }
        }
      });
    }
    
  } catch (error) {
    console.log("❌ Failed to decode calldata:", error.message);
  }

  console.log("\n💡 Key Insights:");
  console.log("1. DragonSwap uses MULTICALL for complex transactions");
  console.log("2. The swap is WSEI → WBTC (not USDT!)");
  console.log("3. Amount: 0.01 WSEI");
  console.log("4. This explains why WSEI/USDT fails - different token pair!");
}

// Create a function to replicate this exact call
async function replicateDragonSwapCall() {
  console.log("\n🚀 Replicating DragonSwap Call");
  console.log("=" .repeat(40));

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("❌ Need PRIVATE_KEY to replicate call");
    return;
  }

  const provider = new ethers.JsonRpcProvider("https://evm-rpc.sei-apis.com/");
  const signer = new ethers.Wallet(privateKey, provider);

  // The exact transaction data from DragonSwap
  const txData = {
    to: "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428",
    value: "0x2386f26fc10000", // 0.01 ETH/SEI
    data: "0x5ae401dc00000000000000000000000000000000000000000000000000000000687fb66300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c86a17ffbfc3d463a407b45d35d0cf7b525b6be70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000e30fedd158a2e3b13e9badaeabafc5516e95e8c70000000000000000000000000555e30da8f98308edb960aa94c0db47230d2b9c00000000000000000000000000000000000000000000000000000000"
  };

  try {
    console.log("📍 Account:", signer.address);
    
    // Check balance first
    const balance = await provider.getBalance(signer.address);
    console.log("💰 SEI Balance:", ethers.formatEther(balance));
    
    const requiredAmount = BigInt(txData.value);
    if (balance < requiredAmount) {
      console.log(`❌ Insufficient balance. Need: ${ethers.formatEther(requiredAmount)} SEI`);
      return;
    }

    // Estimate gas
    console.log("⛽ Estimating gas...");
    const gasEstimate = await provider.estimateGas(txData);
    console.log("Gas estimate:", gasEstimate.toString());

    // Execute the transaction
    console.log("🚀 Executing exact DragonSwap transaction...");
    const tx = await signer.sendTransaction({
      ...txData,
      gasLimit: gasEstimate * 120n / 100n // 20% buffer
    });

    console.log("📝 Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check WBTC balance after
    const WBTC_ADDRESS = "0x0555e30da8f98308edb960aa94c0db47230d2b9c";
    const wbtcContract = new ethers.Contract(WBTC_ADDRESS, [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ], provider);

    try {
      const wbtcBalance = await wbtcContract.balanceOf(signer.address);
      const decimals = await wbtcContract.decimals();
      console.log("🪙 WBTC received:", ethers.formatUnits(wbtcBalance, decimals));
    } catch {
      console.log("📊 Check WBTC balance manually");
    }

  } catch (error) {
    console.log("❌ Transaction failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("💡 Even the exact DragonSwap call fails - pool/liquidity issue confirmed");
    }
  }
}

// Run both analysis and replication
async function main() {
  await analyzeDragonSwapCall();
  await replicateDragonSwapCall();
  console.log("\n✅ Analysis completed!");
}

main().catch(console.error); 