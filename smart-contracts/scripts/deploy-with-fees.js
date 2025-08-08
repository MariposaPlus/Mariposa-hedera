require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
    console.log('Deploying AgenticRouter with 0.05% fees...');
    
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} SEI`);
    
    const AgenticRouter = await ethers.getContractFactory('AgenticRouter');
    
    // Deploy with 0.05% fees (5 basis points)
    const router = await AgenticRouter.deploy(
        "0xd1EFe48B71Acd98Db16FcB9E7152B086647Ef544", // Sailor Swap Router
        "0xA51136931fdd3875902618bF6B3abe38Ab2D703b", // Sailor Factory  
        "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1", // USDC
        "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7", // WSEI
        deployer.address, // Fee recipient (deployer)
        5 // 0.05% fees (5 basis points)
    );
    
    await router.waitForDeployment();
    const contractAddress = await router.getAddress();
    console.log('AgenticRouter with fees deployed to:', contractAddress);
    
    // Register the deployer as an agent
    console.log('Registering agent...');
    await router.registerAgent(deployer.address, true);
    console.log('Agent registered:', deployer.address);
    
    // Verify fee settings
    const currentFeeBps = await router.feeBps();
    const currentFeeRecipient = await router.feeRecipient();
    
    console.log('\n✅ Fee-enabled deployment complete!');
    console.log('Contract address:', contractAddress);
    console.log('Fee recipient:', currentFeeRecipient);
    console.log('Fee BPS:', currentFeeBps.toString(), '(0.05%)');
    
    // Display fee calculation example
    const exampleAmount = ethers.parseEther("100");
    const [fee, net] = await router.calculateFee(exampleAmount);
    console.log('\n=== Fee Calculation Example ===');
    console.log(`For 100 SEI input:`);
    console.log(`Fee: ${ethers.formatEther(fee)} SEI (0.05%)`);
    console.log(`Net: ${ethers.formatEther(net)} SEI`);
}

main().catch(console.error); 