const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getGasConfig, estimateGasWithFees } = require("./utils/gasUtils");
require("dotenv").config();

// Sei Network Addresses - Updated with correct DragonSwap V2 addresses
const ADDRESSES = {
  seiMainnet: {  
    dragonSwapRouter: "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428", // DragonSwap V2 SwapRouter02
    dragonSwapFactory: "0x179D9a5592Bc77050796F7be28058c51cA575df4", // DragonSwap V2 Factory
    usdc: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1", // USDC on Sei
    wsei: "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7", // Wrapped SEI
    wbtc : "0x0555e30da8f98308edb960aa94c0db47230d2b9c", // Wrapped BTC
    weth : "0x160345fc359604fc6e70e3c5facbde5f7a9342d8", // Wrapped ETH
  },
  seiTestnet: {
    dragonSwapRouter: "0x1234567890123456789012345678901234567890", // DragonSwap V2 Router Testnet
    dragonSwapFactory: "0x1234567890123456789012345678901234567891", // DragonSwap V2 Factory Testnet
    usdc: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1", // USDC Testnet
    wsei: "0x57eE725BEeB991c70c53f9642f36755EC6eb2139", // Wrapped SEI Testnet
  },
  seiDevnet: {
    dragonSwapRouter: "0x1234567890123456789012345678901234567890", // DragonSwap V2 Router Devnet
    dragonSwapFactory: "0x1234567890123456789012345678901234567891", // DragonSwap V2 Factory Devnet
    usdc: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1", // USDC Devnet
    wsei: "0x57eE725BEeB991c70c53f9642f36755EC6eb2139", // Wrapped SEI Devnet
  }
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log("Deploying AgenticRouter with the account:", deployer.address);
  console.log("Network:", network);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get network-specific addresses
  let networkAddresses;
  if (network === "seiMainnet") {
    networkAddresses = ADDRESSES.seiMainnet;
  } else if (network === "seiTestnet") {
    networkAddresses = ADDRESSES.seiTestnet;
  } else if (network === "seiDevnet") {
    networkAddresses = ADDRESSES.seiDevnet;
  } else {
    // Default to testnet addresses for local testing
    networkAddresses = ADDRESSES.seiTestnet;
    console.log("Using testnet addresses for unknown network");
  }

  // Constructor parameters for DragonSwap V2
  const swapRouter = networkAddresses.dragonSwapRouter;
  const factory = networkAddresses.dragonSwapFactory;
  const stablecoin = networkAddresses.usdc;
  const wsei = networkAddresses.wsei;
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const feeBps = process.env.FEE_BPS || 30; // 0.3% default fee

  console.log("Constructor parameters:");
  console.log("- Swap Router:", swapRouter);
  console.log("- Factory:", factory);
  console.log("- Stablecoin (USDC):", stablecoin);
  console.log("- WSEI:", wsei);
  console.log("- Fee Recipient:", feeRecipient);
  console.log("- Fee BPS:", feeBps);

  // Get dynamic gas configuration
  console.log("\nFetching gas fees from Sei network...");
  const gasConfig = await getGasConfig(ethers.provider, 5000000);

  // Deploy the contract with updated constructor
  const AgenticRouter = await ethers.getContractFactory("AgenticRouter");
  const agenticRouter = await AgenticRouter.deploy(
    swapRouter,
    factory,
    stablecoin,
    wsei,
    feeRecipient,
    feeBps,
    gasConfig
  );

  await agenticRouter.waitForDeployment();

  const contractAddress = await agenticRouter.getAddress();
  console.log("AgenticRouter deployed to:", contractAddress);
  console.log("Admin (deployer):", deployer.address);

  // Save deployment information
  const deploymentInfo = {
    network,
    contractAddress,
    admin: deployer.address,
    swapRouter,
    factory,
    stablecoin,
    wsei,
    feeRecipient,
    feeBps,
    deploymentBlock: agenticRouter.deploymentTransaction().blockNumber,
    deploymentTx: agenticRouter.deploymentTransaction().hash,
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contract on explorer if not local network
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await agenticRouter.deploymentTransaction().wait(6);

    console.log("Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          swapRouter,
          factory,
          stablecoin,
          wsei,
          feeRecipient,
          feeBps
        ],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Optional: Register initial agent if specified
  if (process.env.INITIAL_AGENT) {
    console.log("\nRegistering initial agent:", process.env.INITIAL_AGENT);
    
    // Get gas config for agent registration
    const agentGasConfig = await estimateGasWithFees(
      agenticRouter,
      "registerAgent",
      [process.env.INITIAL_AGENT, true]
    );
    
    const tx = await agenticRouter.registerAgent(process.env.INITIAL_AGENT, true, agentGasConfig);
    await tx.wait();
    console.log("Initial agent registered successfully!");
  }

  console.log("\n=== Next Steps ===");
  console.log("1. Register agents using: agenticRouter.registerAgent(agentAddress, true)");
  console.log("2. Agents can now use the swap and transfer functions");
  console.log("3. Update fee settings using: agenticRouter.setFeeBps(newFeeBps)");
  console.log("4. Change fee recipient using: agenticRouter.setFeeRecipient(newRecipient)");

  return contractAddress;
}

// Export for testing
module.exports = { main, ADDRESSES };

// Run deployment if called directly
if (require.main === module) {
  main()
    .then((address) => {
      console.log(`\nDeployment completed! Contract address: ${address}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
} 