const { ethers } = require("hardhat");
require("dotenv").config();

const AGENTIC_ROUTER_ABI = [
  "function isAgent(address) external view returns (bool)",
  "function admin() external view returns (address)"
];

async function checkAgentStatus() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking agent status...");
  console.log("Deployer address:", deployer.address);
  
  // Get agent address
  let agentAddress;
  if (process.env.INITIAL_AGENT_PRIVATE_KEY) {
    const agentSigner = new ethers.Wallet(process.env.INITIAL_AGENT_PRIVATE_KEY, ethers.provider);
    agentAddress = agentSigner.address;
    console.log("Agent address from private key:", agentAddress);
  } else {
    agentAddress = deployer.address;
    console.log("Using deployer as agent address:", agentAddress);
  }

  // Contract address
  const contractAddress = process.env.AGENTIC_ROUTER_ADDRESS || "0x82bf66c8D8061f4EEa41975F1cd289f61931Ba76";
  console.log("Contract address:", contractAddress);

  // Connect to contract
  const agenticRouter = new ethers.Contract(contractAddress, AGENTIC_ROUTER_ABI, deployer);

  try {
    // Check admin
    const admin = await agenticRouter.admin();
    console.log("Contract admin:", admin);
    
    // Check if agent is registered
    const isAgentRegistered = await agenticRouter.isAgent(agentAddress);
    console.log("Is agent registered:", isAgentRegistered);
    
    // Also check if deployer is registered (in case they're different)
    if (agentAddress !== deployer.address) {
      const isDeployerRegistered = await agenticRouter.isAgent(deployer.address);
      console.log("Is deployer registered:", isDeployerRegistered);
    }

    // Check the INITIAL_AGENT from deployment
    if (process.env.INITIAL_AGENT) {
      const isInitialAgentRegistered = await agenticRouter.isAgent(process.env.INITIAL_AGENT);
      console.log("Is INITIAL_AGENT registered:", isInitialAgentRegistered);
      console.log("INITIAL_AGENT address:", process.env.INITIAL_AGENT);
    }

  } catch (error) {
    console.error("Error checking agent status:", error.message);
  }
}

checkAgentStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  }); 