require('dotenv').config();
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    const contractAddress = "0xf86E72b636d1088f6e6Fae00d5B2Cc89c51EF441";
    const agentAddress = "0xC86A17ffbFC3d463A407B45d35D0cF7b525b6Be7";
    console.log("Registering agent with AgenticRouter using Web3...");
    console.log("Contract:", contractAddress);
    console.log("Agent Address:", agentAddress);
    
    // Initialize Web3 with Sei RPC
    const web3 = new Web3('https://evm-rpc.sei-apis.com');
    
    // Get private key from environment
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in environment variables");
    }
    
    // Create account from private key
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log("Admin/Signer:", account.address);
    
    // Load contract ABI
    const artifactPath = path.join(__dirname, '../artifacts/contracts/AgenticRouter.sol/AgenticRouter.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contractABI = artifact.abi;
    
    // Create contract instance
    const router = new web3.eth.Contract(contractABI, contractAddress);
    
    try {
        // Check if agent is already registered
        const isCurrentlyAgent = await router.methods.isAgent(agentAddress).call();
        console.log("Is currently registered as agent:", isCurrentlyAgent);
        
        if (isCurrentlyAgent) {
            console.log("✅ Agent is already registered!");
            return;
        }
        
        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();
        console.log("Current gas price:", gasPrice.toString());
        
        // Estimate gas for the transaction
        const gasEstimate = await router.methods.registerAgent(agentAddress, true).estimateGas({
            from: account.address
        });
        console.log("Estimated gas:", gasEstimate.toString());
        
        // Register the agent
        console.log("Registering agent...");
        const txData = router.methods.registerAgent(agentAddress, true);
        
        const tx = {
            from: account.address,
            to: contractAddress,
            data: txData.encodeABI(),
            gas: Math.floor(Number(gasEstimate) * 1.2), // Add 20% buffer
            gasPrice: gasPrice.toString()
        };
        
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        console.log("Transaction hash:", receipt.transactionHash);
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed);
        
        // Verify registration
        const isNowAgent = await router.methods.isAgent(agentAddress).call();
        console.log("Agent registration verified:", isNowAgent);
        
        if (isNowAgent) {
            console.log("✅ Agent registered successfully!");
        } else {
            console.log("❌ Agent registration failed");
        }
        
    } catch (error) {
        console.error("Error registering agent:", error.message);
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 