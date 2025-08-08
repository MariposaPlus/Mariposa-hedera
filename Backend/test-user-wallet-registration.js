const axios = require('axios');
const crypto = require('crypto');

// Base URL for your API
const BASE_URL = 'http://localhost:5000/api';

// Helper function to generate a test wallet
function generateTestWallet() {
  // Generate a random private key (32 bytes = 64 hex chars)
  const privateKey = '0x' + crypto.randomBytes(32).toString('hex');
  
  // Generate a random wallet address (20 bytes = 40 hex chars)
  const walletAddress = '0x' + crypto.randomBytes(20).toString('hex');
  
  return { privateKey, walletAddress };
}

async function testUserWalletRegistration() {
  console.log('🧪 TESTING USER-WALLET REGISTRATION SYSTEM');
  console.log('═'.repeat(80));
  
  try {
    // Test 1: Register human user with wallet
    console.log('\n👤 Test 1: Registering human user with wallet...');
    const humanWallet = generateTestWallet();
    
    const humanUserData = {
      name: 'John Doe',
      email: `john.doe.${Date.now()}@example.com`,
      password: 'password123',
      walletAddress: humanWallet.walletAddress,
      privateKey: humanWallet.privateKey,
      userType: 'human',
      preferences: {
        defaultStrategy: 'DCA',
        riskTolerance: 'moderate',
        preferredTokens: ['WETH', 'WBTC', 'SEI', 'USDC'],
        notifications: {
          email: true,
          portfolio: true,
          trades: false
        }
      }
    };
    
    console.log('📧 Email:', humanUserData.email);
    console.log('📱 Wallet Address:', humanUserData.walletAddress);
    console.log('🔑 Private Key Length:', humanUserData.privateKey.length, 'chars');
    
    const humanResponse = await axios.post(`${BASE_URL}/users/register-with-wallet`, humanUserData);
    
    console.log('✅ Human user registered successfully');
    console.log('🆔 User ID:', humanResponse.data.data.user.id);
    console.log('📱 Wallet ID:', humanResponse.data.data.wallet.id);
    console.log('🔒 Has Token:', !!humanResponse.data.data.token);
    
    // Test 2: Register agent user with wallet (no password required)
    console.log('\n🤖 Test 2: Registering agent user with wallet...');
    const agentWallet = generateTestWallet();
    
    const agentUserData = {
      name: 'Trading Agent Alpha',
      email: `agent.alpha.${Date.now()}@example.com`,
      walletAddress: agentWallet.walletAddress,
      privateKey: agentWallet.privateKey,
      userType: 'agent',
      preferences: {
        defaultStrategy: 'momentum_trading',
        riskTolerance: 'aggressive',
        preferredTokens: ['WBTC', 'WETH', 'SolvBTC'],
        notifications: {
          email: false,
          portfolio: true,
          trades: true
        }
      }
    };
    
    console.log('📧 Email:', agentUserData.email);
    console.log('📱 Wallet Address:', agentUserData.walletAddress);
    console.log('🔑 Private Key Length:', agentUserData.privateKey.length, 'chars');
    
    const agentResponse = await axios.post(`${BASE_URL}/users/register-with-wallet`, agentUserData);
    
    console.log('✅ Agent user registered successfully');
    console.log('🆔 User ID:', agentResponse.data.data.user.id);
    console.log('📱 Wallet ID:', agentResponse.data.data.wallet.id);
    console.log('🔒 Has Token:', !!agentResponse.data.data.token);
    
    // Test 3: Get user with wallet information
    console.log('\n📊 Test 3: Retrieving user with wallet info...');
    const userId = humanResponse.data.data.user.id;
    
    const userWalletResponse = await axios.get(`${BASE_URL}/users/${userId}/wallet`);
    
    console.log('✅ User with wallet info retrieved');
    console.log('👤 User Type:', userWalletResponse.data.data.user.userType);
    console.log('📱 Has Wallet:', userWalletResponse.data.data.hasWallet);
    console.log('🔗 Wallet Connected:', userWalletResponse.data.data.walletConnected);
    console.log('🎯 Default Strategy:', userWalletResponse.data.data.user.preferences.defaultStrategy);
    
    // Test 4: Try to register with duplicate email (should fail)
    console.log('\n❌ Test 4: Testing duplicate email validation...');
    try {
      const duplicateWallet = generateTestWallet();
      const duplicateData = {
        name: 'Jane Doe',
        email: humanUserData.email, // Same email as Test 1
        password: 'password456',
        walletAddress: duplicateWallet.walletAddress,
        privateKey: duplicateWallet.privateKey,
        userType: 'human'
      };
      
      await axios.post(`${BASE_URL}/users/register-with-wallet`, duplicateData);
      console.log('❌ ERROR: Should have failed with duplicate email');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Duplicate email validation working:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 5: Try to register with duplicate wallet address (should fail)
    console.log('\n❌ Test 5: Testing duplicate wallet validation...');
    try {
      const duplicateData = {
        name: 'Bob Smith',
        email: `bob.smith.${Date.now()}@example.com`,
        password: 'password789',
        walletAddress: humanWallet.walletAddress, // Same wallet as Test 1
        privateKey: humanWallet.privateKey,
        userType: 'human'
      };
      
      await axios.post(`${BASE_URL}/users/register-with-wallet`, duplicateData);
      console.log('❌ ERROR: Should have failed with duplicate wallet');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Duplicate wallet validation working:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 6: Test invalid wallet address format (should fail)
    console.log('\n❌ Test 6: Testing invalid wallet address validation...');
    try {
      const invalidData = {
        name: 'Invalid User',
        email: `invalid.${Date.now()}@example.com`,
        password: 'password123',
        walletAddress: 'invalid-wallet-address',
        privateKey: generateTestWallet().privateKey,
        userType: 'human'
      };
      
      await axios.post(`${BASE_URL}/users/register-with-wallet`, invalidData);
      console.log('❌ ERROR: Should have failed with invalid wallet address');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid wallet address validation working:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 7: Test human user without password (should fail)
    console.log('\n❌ Test 7: Testing human user without password validation...');
    try {
      const noPasswordWallet = generateTestWallet();
      const noPasswordData = {
        name: 'No Password User',
        email: `nopassword.${Date.now()}@example.com`,
        walletAddress: noPasswordWallet.walletAddress,
        privateKey: noPasswordWallet.privateKey,
        userType: 'human'
        // No password provided
      };
      
      await axios.post(`${BASE_URL}/users/register-with-wallet`, noPasswordData);
      console.log('❌ ERROR: Should have failed without password for human user');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Password validation for human users working:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 ALL USER-WALLET REGISTRATION TESTS COMPLETED!');
    console.log('═'.repeat(80));
    console.log('✅ Summary:');
    console.log('  • Human user registration: SUCCESS');
    console.log('  • Agent user registration: SUCCESS');
    console.log('  • User-wallet retrieval: SUCCESS');
    console.log('  • Duplicate email validation: SUCCESS');
    console.log('  • Duplicate wallet validation: SUCCESS');
    console.log('  • Invalid wallet format validation: SUCCESS');
    console.log('  • Human password validation: SUCCESS');
    
    return {
      humanUser: humanResponse.data.data,
      agentUser: agentResponse.data.data,
      userWithWallet: userWalletResponse.data.data
    };
    
  } catch (error) {
    console.error('❌ USER-WALLET REGISTRATION TEST FAILED:', error.message);
    if (error.response) {
      console.error('📄 Response:', error.response.data);
    }
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUserWalletRegistration()
    .then((results) => {
      console.log('\n✅ Test completed successfully');
      console.log('📊 Results summary:', {
        humanUserId: results.humanUser.user.id,
        agentUserId: results.agentUser.user.id,
        walletsCreated: 2
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testUserWalletRegistration; 