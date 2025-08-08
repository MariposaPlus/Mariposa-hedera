require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
    console.log('Deploying AgenticRouter with ZERO fees for testing...');
    
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    
    const AgenticRouter = await ethers.getContractFactory('AgenticRouter');
    
    // Deploy with ZERO fees to test core swap functionality
    const router = await AgenticRouter.deploy(
        "0xd1EFe48B71Acd98Db16FcB9E7152B086647Ef544", // Sailor Swap Router
        "0xA51136931fdd3875902618bF6B3abe38Ab2D703b", // Sailor Factory  
        "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1", // USDC
        "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7", // WSEI
        deployer.address, // Fee recipient (deployer)
        0 // ZERO fees
    );
    
    await router.waitForDeployment();
    console.log('Zero-fee AgenticRouter deployed to:', await router.getAddress());
    
    // Register the deployer as an agent
    await router.registerAgent(deployer.address, true);
    console.log('Agent registered:', deployer.address);
    
    console.log('✅ Zero-fee deployment complete!');
    console.log('Contract address:', await router.getAddress());
}

main().catch(console.error); 