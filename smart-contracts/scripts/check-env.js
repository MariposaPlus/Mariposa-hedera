require("dotenv").config();

console.log("Environment variables check:");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Set" : "❌ Not set");
console.log("INITIAL_AGENT_PRIVATE_KEY:", process.env.INITIAL_AGENT_PRIVATE_KEY ? "✅ Set" : "❌ Not set");
console.log("INITIAL_AGENT:", process.env.INITIAL_AGENT ? process.env.INITIAL_AGENT : "❌ Not set");
console.log("AGENTIC_ROUTER_ADDRESS:", process.env.AGENTIC_ROUTER_ADDRESS ? process.env.AGENTIC_ROUTER_ADDRESS : "❌ Not set");

if (process.env.INITIAL_AGENT_PRIVATE_KEY) {
  const { ethers } = require("hardhat");
  const wallet = new ethers.Wallet(process.env.INITIAL_AGENT_PRIVATE_KEY);
  console.log("Agent address from private key:", wallet.address);
} 