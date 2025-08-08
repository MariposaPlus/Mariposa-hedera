const { Web3 } = require("web3");
require("dotenv").config();

async function registerAgent() {
  const contractAddress = "0xf86E72b636d1088f6e6Fae00d5B2Cc89c51EF441";
  const newAgentAddress = "0xC86A17ffbFC3d463A407B45d35D0cF7b525b6Be7";
  
  const deployerPrivateKey = process.env.PRIVATE_KEY;
  if (!deployerPrivateKey) {
    throw new Error("❌ Deployer PRIVATE_KEY not found in .env file.");
  }

  const web3 = new Web3(process.env.RPC_URL);
  const deployerAccount = web3.eth.accounts.privateKeyToAccount(deployerPrivateKey);
  web3.eth.accounts.wallet.add(deployerAccount);

  const contractAbi = require("../artifacts/contracts/AgenticRouter.sol/AgenticRouter.json").abi;
  const agenticRouter = new web3.eth.Contract(contractAbi, contractAddress);

  console.log(`Registering new agent: ${newAgentAddress}`);
  
  const isAlreadyAgent = await agenticRouter.methods.isAgent(newAgentAddress).call();
  if (isAlreadyAgent) {
    console.log("✅ Agent is already registered.");
    return;
  }

  const txData = agenticRouter.methods.registerAgent(newAgentAddress, true).encodeABI();
  const tx = {
    from: deployerAccount.address,
    to: contractAddress,
    data: txData,
    gas: await agenticRouter.methods.registerAgent(newAgentAddress, true).estimateGas({ from: deployerAccount.address }),
    gasPrice: await web3.eth.getGasPrice(),
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, deployerPrivateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  
  console.log("✅ Agent registered successfully! Transaction hash:", receipt.transactionHash);
}

registerAgent().catch(console.error); 