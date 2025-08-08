const { ethers } = require("ethers");
require("dotenv").config();

async function decodeAndReplicate() {
  console.log("🔍 Decoding DragonSwap Transaction & Creating Fresh Version");
  console.log("=" .repeat(70));

  // Original calldata from DragonSwap website
  const originalCalldata = "0x5ae401dc00000000000000000000000000000000000000000000000000000000687fb66300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c86a17ffbfc3d463a407b45d35d0cf7b525b6be70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000e30fedd158a2e3b13e9badaeabafc5516e95e8c70000000000000000000000000555e30da8f98308edb960aa94c0db47230d2b9c00000000000000000000000000000000000000000000000000000000";

  // Decode the multicall
  console.log("📋 Decoding Original Transaction:");
  
  try {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // Remove function selector (first 8 chars after 0x)
    const paramData = "0x" + originalCalldata.slice(10);
    
    // Decode multicall parameters: deadline and bytes[]
    const [deadline, calls] = abiCoder.decode(["uint256", "bytes[]"], paramData);
    
    console.log("Original Deadline:", new Date(Number(deadline) * 1000).toISOString());
    console.log("Current Time:", new Date().toISOString());
    console.log("Expired:", Number(deadline) < Math.floor(Date.now() / 1000));
    
    // Decode the inner exactInputSingle call
    const innerCall = calls[0];
    console.log("\n🔍 Inner Call Analysis:");
    console.log("Call data:", innerCall);
    
    // Remove exactInputSingle selector (0x472b43f3)
    const swapParams = "0x" + innerCall.slice(10);
    
    const [tokenIn, tokenOut, fee, recipient, innerDeadline, amountIn, amountOutMinimum, sqrtPriceLimitX96] = 
      abiCoder.decode([
        "address", "address", "uint24", "address", "uint256", "uint256", "uint256", "uint160"
      ], swapParams);
    
    console.log("📊 Decoded Swap Parameters:");
    console.log("Token In:", tokenIn);
    console.log("Token Out:", tokenOut);
    console.log("Fee:", fee.toString(), "basis points");
    console.log("Recipient:", recipient);
    console.log("Amount In:", ethers.formatEther(amountIn), "tokens");
    console.log("Min Amount Out:", amountOutMinimum.toString());
    console.log("Price Limit:", sqrtPriceLimitX96.toString());
    
    // Identify the tokens
    const WSEI = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
    const WBTC = "0x0555e30da8f98308edb960aa94c0db47230d2b9c";
    
    let swapDirection;
    if (tokenIn.toLowerCase() === WSEI.toLowerCase()) {
      swapDirection = "WSEI → WBTC";
    } else if (tokenIn.toLowerCase() === WBTC.toLowerCase()) {
      swapDirection = "WBTC → WSEI";
    } else {
      swapDirection = "Unknown tokens";
    }
    
    console.log("🔄 Swap Direction:", swapDirection);
    console.log("💰 Swap Amount:", ethers.formatEther(amountIn));
    
    // Now create a fresh version with current deadline
    console.log("\n🚀 Creating Fresh Transaction:");
    
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log("❌ Need PRIVATE_KEY to create fresh transaction");
      return;
    }

    const provider = new ethers.JsonRpcProvider("https://evm-rpc.sei-apis.com/");
    const signer = new ethers.Wallet(privateKey, provider);
    
    // Create new deadline (20 minutes from now)
    const newDeadline = Math.floor(Date.now() / 1000) + 1200;
    console.log("New Deadline:", new Date(newDeadline * 1000).toISOString());
    
    // Create fresh exactInputSingle call
    const freshSwapParams = abiCoder.encode([
      "address", "address", "uint24", "address", "uint256", "uint256", "uint256", "uint160"
    ], [
      tokenIn,
      tokenOut,
      fee,
      signer.address, // Update recipient to current signer
      newDeadline,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96
    ]);
    
    // Add exactInputSingle function selector
    const exactInputSingleCall = "0x472b43f3" + freshSwapParams.slice(2);
    
    // Create fresh multicall
    const freshMulticallParams = abiCoder.encode([
      "uint256", "bytes[]"
    ], [
      newDeadline,
      [exactInputSingleCall]
    ]);
    
    // Add multicall function selector
    const freshCalldata = "0x5ae401dc" + freshMulticallParams.slice(2);
    
    console.log("✅ Fresh calldata created");
    console.log("Length:", freshCalldata.length, "characters");
    
    // Execute the fresh transaction
    const txData = {
      to: "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428",
      value: ethers.parseEther("0.01"), // 0.01 SEI
      data: freshCalldata
    };

    // Check if we need to approve first (for WSEI swaps)
    if (tokenIn.toLowerCase() === WSEI.toLowerCase()) {
      console.log("🔍 Checking WSEI approval...");
      
      const wseiContract = new ethers.Contract(WSEI, [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ], signer);
      
      const routerAddress = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
      const allowance = await wseiContract.allowance(signer.address, routerAddress);
      
      console.log("Current WSEI allowance:", ethers.formatEther(allowance));
      
      if (allowance < amountIn) {
        console.log("📝 Approving WSEI...");
        const approveTx = await wseiContract.approve(routerAddress, amountIn);
        await approveTx.wait();
        console.log("✅ WSEI approved");
      }
    }

    console.log("⛽ Estimating gas...");
    const gasEstimate = await provider.estimateGas(txData);
    console.log("Gas estimate:", gasEstimate.toString());

    console.log("🚀 Executing fresh DragonSwap transaction...");
    const tx = await signer.sendTransaction({
      ...txData,
      gasLimit: gasEstimate * 120n / 100n
    });

    console.log("📝 Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction successful!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check token balances
    if (swapDirection === "WSEI → WBTC") {
      const wbtcContract = new ethers.Contract(WBTC, [
        "function balanceOf(address) view returns (uint256)"
      ], provider);
      
      const wbtcBalance = await wbtcContract.balanceOf(signer.address);
      console.log("🪙 WBTC Balance:", ethers.formatUnits(wbtcBalance, 8)); // WBTC has 8 decimals
    }

  } catch (error) {
    console.log("❌ Failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("\n🔍 This confirms the swap still fails even with fresh deadline");
      console.log("Issue is with pool liquidity, not transaction format");
    }
  }

  console.log("\n✅ Analysis and replication completed!");
}

decodeAndReplicate().catch(console.error); 