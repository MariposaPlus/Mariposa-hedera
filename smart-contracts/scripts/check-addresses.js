const { ethers } = require("hardhat");

// Addresses to check on SEI mainnet
const ADDRESSES = {
  DRAGONSWAP_ROUTER: "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428",
  DRAGONSWAP_FACTORY: "0x179D9a5592Bc77050796F7be28058c51cA575df4",
  WSEI: "0x57eE725BEeB991c70c53f9642f36755EC6eb2139",
  USDC: "0x3894085Ef7Ff0f0aeDf52E2A2704928d259C2fc1",
  USDT: "0x83fD0D8eF5Cf2E5d4fb5324848e1E32F5e9d6A69"
};

async function main() {
  console.log("🔍 Checking contract addresses on SEI Mainnet...");
  console.log("=" .repeat(50));

  const [signer] = await ethers.getSigners();
  console.log("📍 Using account:", signer.address);
  console.log("💰 Account balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "SEI");

  console.log("\n🔍 Checking contract addresses:");
  
  for (const [name, address] of Object.entries(ADDRESSES)) {
    try {
      const code = await signer.provider.getCode(address);
      const hasCode = code !== "0x";
      
      console.log(`${hasCode ? "✅" : "❌"} ${name}: ${address} ${hasCode ? "(Contract exists)" : "(No contract found)"}`);
      
      if (hasCode && name === "WSEI") {
        // Try to check if it's an ERC20 token
        try {
          const erc20 = new ethers.Contract(address, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
          ], signer);
          
          const symbol = await erc20.symbol();
          const decimals = await erc20.decimals();
          console.log(`   └─ Symbol: ${symbol}, Decimals: ${decimals}`);
        } catch (error) {
          console.log(`   └─ Could not read ERC20 details: ${error.message}`);
        }
      }
      
      if (hasCode && name === "DRAGONSWAP_ROUTER") {
        // Try to check if it has the factory method
        try {
          const router = new ethers.Contract(address, [
            "function factory() view returns (address)"
          ], signer);
          
          const factory = await router.factory();
          console.log(`   └─ Factory address: ${factory}`);
        } catch (error) {
          console.log(`   └─ Could not read factory: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${name}: ${address} (Error: ${error.message})`);
    }
  }

  // Check network details
  console.log("\n🌐 Network Information:");
  const network = await signer.provider.getNetwork();
  console.log("- Chain ID:", network.chainId.toString());
  console.log("- Network Name:", network.name);
  
  const blockNumber = await signer.provider.getBlockNumber();
  console.log("- Latest Block:", blockNumber);

  console.log("\n💡 Recommendations:");
  console.log("1. Verify all addresses have contracts deployed");
  console.log("2. Test with small amounts first");
  console.log("3. Check DragonSwap documentation for correct addresses");
  console.log("4. Consider deploying a minimal version first");
}

main()
  .then(() => {
    console.log("\n✅ Address check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Address check failed:");
    console.error(error);
    process.exit(1);
  }); 