const { ethers } = require("ethers");
require("dotenv").config();

// DragonSwap Router ABI (minimal)
const ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "uint24", "name": "fee", "type": "uint24"},
          {"internalType": "address", "name": "recipient", "type": "address"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMinimum", "type": "uint256"},
          {"internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160"}
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Factory ABI (minimal)
const FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "tokenA", "type": "address"},
      {"internalType": "address", "name": "tokenB", "type": "address"},
      {"internalType": "uint24", "name": "fee", "type": "uint24"}
    ],
    "name": "getPool",
    "outputs": [{"internalType": "address", "name": "pool", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

class DragonSwap {
  constructor(privateKey) {
    // Configuration
    this.ROUTER_ADDRESS = "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428";
    this.FACTORY_ADDRESS = "0x179D9a5592Bc77050796F7be28058c51cA575df4";
    this.RPC_URL = "https://evm-rpc.sei-apis.com/";
    
    // Initialize provider and signer
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    
    // Initialize contracts
    this.routerContract = new ethers.Contract(this.ROUTER_ADDRESS, ROUTER_ABI, this.signer);
    this.factoryContract = new ethers.Contract(this.FACTORY_ADDRESS, FACTORY_ABI, this.provider);
    
    console.log("🔗 DragonSwap initialized for account:", this.signer.address);
  }

  async findMinFee(tokenIn, tokenOut) {
    const fees = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    
    for (const fee of fees) {
      try {
        const poolAddress = await this.factoryContract.getPool(tokenIn, tokenOut, fee);
        console.log(`Fee ${fee} basis points - Pool: ${poolAddress}`);
        
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          return fee;
        }
      } catch (error) {
        console.log(`Error checking fee ${fee}:`, error.message);
      }
    }
    return null;
  }

  async findPool(tokenIn, tokenOut, fee) {
    return await this.factoryContract.getPool(tokenIn, tokenOut, fee);
  }

  async exactInputSingle(params) {
    console.log("🔄 Executing swap with params:", {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      amountIn: ethers.formatEther(params.amountIn),
      amountOutMinimum: params.amountOutMinimum.toString()
    });

    // Get token contract
    const tokenContract = new ethers.Contract(params.tokenIn, ERC20_ABI, this.signer);
    
    // Check balance
    const balance = await tokenContract.balanceOf(this.signer.address);
    console.log(`Token balance: ${ethers.formatEther(balance)}`);
    
    if (balance < params.amountIn) {
      throw new Error(`Insufficient balance. Have: ${ethers.formatEther(balance)}, Need: ${ethers.formatEther(params.amountIn)}`);
    }

    // Check allowance
    const allowance = await tokenContract.allowance(this.signer.address, this.ROUTER_ADDRESS);
    console.log(`Current allowance: ${ethers.formatEther(allowance)}`);

    // Approve if needed
    if (allowance < params.amountIn) {
      console.log("📝 Approving token...");
      const approveTx = await tokenContract.approve(this.ROUTER_ADDRESS, params.amountIn);
      await approveTx.wait();
      console.log("✅ Token approved");
    }

    // Execute swap
    console.log("🚀 Executing swap...");
    const swapTx = await this.routerContract.exactInputSingle(params);
    const receipt = await swapTx.wait();
    
    console.log("✅ Swap completed!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    return receipt;
  }

  async getBalance() {
    return await this.provider.getBalance(this.signer.address);
  }

  async getTokenBalance(tokenAddress) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    return await tokenContract.balanceOf(this.signer.address);
  }
}

async function main() {
  console.log("🧪 DragonSwap JavaScript Test - SEI → USDT");
  console.log("=" .repeat(50));

  // Get private key from environment or hardcode for testing
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Please set PRIVATE_KEY environment variable");
    return;
  }

  // Token addresses
  const WSEI_ADDRESS = "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
  const USDT_ADDRESS = "0x9151434b16b9763660705744891fa906f660ecc5";

  try {
    // Initialize DragonSwap
    const dragonSwap = new DragonSwap(privateKey);

    // Check balances
    const seiBalance = await dragonSwap.getBalance();
    const wseiBalance = await dragonSwap.getTokenBalance(WSEI_ADDRESS);
    const usdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);

    console.log("\n💰 Current Balances:");
    console.log("SEI:", ethers.formatEther(seiBalance));
    console.log("WSEI:", ethers.formatEther(wseiBalance));
    console.log("USDT:", ethers.formatUnits(usdtBalance, 6));

    // Find pool
    console.log("\n🔍 Finding WSEI/USDT pool...");
    const minFee = await dragonSwap.findMinFee(WSEI_ADDRESS, USDT_ADDRESS);

    if (!minFee) {
      console.log("❌ No pool found for WSEI/USDT pair");
      return;
    }

    console.log(`✅ Found pool with ${minFee} basis points fee`);
    const poolAddress = await dragonSwap.findPool(WSEI_ADDRESS, USDT_ADDRESS, minFee);
    console.log("Pool address:", poolAddress);

    // Prepare swap (only if we have enough WSEI)
    const swapAmount = ethers.parseEther("0.01"); // 0.01 WSEI
    
    if (wseiBalance < swapAmount) {
      console.log(`⚠️  Insufficient WSEI. Have: ${ethers.formatEther(wseiBalance)}, Need: ${ethers.formatEther(swapAmount)}`);
      console.log("💡 Note: You need to wrap SEI to WSEI first");
      return;
    }

    // Execute swap
    console.log(`\n🚀 Swapping ${ethers.formatEther(swapAmount)} WSEI → USDT`);
    
    const swapParams = {
      tokenIn: WSEI_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: minFee,
      recipient: dragonSwap.signer.address,
      deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
      amountIn: swapAmount,
      amountOutMinimum: 0n, // Accept any amount (not recommended for production)
      sqrtPriceLimitX96: 0n
    };

    const initialUsdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);
    
    const swapReceipt = await dragonSwap.exactInputSingle(swapParams);
    
    // Check results
    const finalWseiBalance = await dragonSwap.getTokenBalance(WSEI_ADDRESS);
    const finalUsdtBalance = await dragonSwap.getTokenBalance(USDT_ADDRESS);
    
    const wseiUsed = wseiBalance - finalWseiBalance;
    const usdtReceived = finalUsdtBalance - initialUsdtBalance;

    console.log("\n📊 Swap Results:");
    console.log("WSEI used:", ethers.formatEther(wseiUsed));
    console.log("USDT received:", ethers.formatUnits(usdtReceived, 6));
    
    if (usdtReceived > 0n) {
      const rate = Number(ethers.formatUnits(usdtReceived, 6)) / Number(ethers.formatEther(wseiUsed));
      console.log("Exchange rate:", rate.toFixed(4), "USDT per WSEI");
      console.log("🎉 SWAP SUCCESSFUL!");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("\n🔍 Possible reasons for failure:");
      console.log("- Pool has insufficient liquidity");
      console.log("- Price impact too high");
      console.log("- Slippage tolerance too strict");
      console.log("- Network congestion");
    }
  }

  console.log("\n✅ Test completed!");
}

// Run the test
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

module.exports = { DragonSwap }; 