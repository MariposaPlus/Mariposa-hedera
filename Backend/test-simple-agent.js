require("dotenv").config();
const mongoose = require('mongoose');
const { createSimpleAgent } = require('./controllers/agentController');
const AgentModel = require('./models/Agent');

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa-test',
  
  TEST_AGENTS: [
    {
      name: "Simple Bot " + Date.now(),
      userId: "test-user-simple-" + Date.now(),
      initialBalance: 10
    },
    {
      name: "Rich Bot " + Date.now(),
      userId: "test-user-rich-" + Date.now(),
      initialBalance: 50
    },
    {
      name: "Basic Bot " + Date.now(),
      userId: "test-user-basic-" + Date.now()
      // No initialBalance - should use default of 10
    }
  ]
};

class SimpleAgentTest {
  constructor() {
    this.connected = false;
    this.cleanup = [];
    this.results = [];
  }

  async setup() {
    console.log('🚀 Setting up Simple Agent Test...\n');
    
    try {
      // Connect to MongoDB
      console.log('📦 Connecting to MongoDB...');
      await mongoose.connect(TEST_CONFIG.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
      this.connected = true;
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  createMockExpressObjects(testData) {
    const req = {
      body: testData
    };

    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.responseData = data;
        return res;
      }
    };

    return { req, res };
  }

  async testSimpleAgentCreation() {
    console.log('🧪 Testing Simple Agent Creation');
    console.log('================================\n');

    for (let i = 0; i < TEST_CONFIG.TEST_AGENTS.length; i++) {
      const agentData = TEST_CONFIG.TEST_AGENTS[i];
      console.log(`📋 Test ${i + 1}: ${agentData.name}`);
      console.log(`👤 User: ${agentData.userId}`);
      console.log(`💰 Initial Balance: ${agentData.initialBalance || 'default (10)'} HBAR`);
      
      const startTime = Date.now();
      
      try {
        const { req, res } = this.createMockExpressObjects(agentData);
        
        await createSimpleAgent(req, res);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (res.responseData) {
          const { success, data, message } = res.responseData;
          
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📈 Success: ${success}`);
          console.log(`💬 Message: ${message}`);
          console.log(`⏱️  Duration: ${duration}ms`);
          
          if (success && data.agent) {
            console.log(`🆔 Agent ID: ${data.agent._id}`);
            console.log(`🤖 Agent Type: ${data.agent.agentType}`);
            console.log(`👨‍💼 Role: ${data.agent.role}`);
            console.log(`🏦 Wallet Enabled: ${data.wallet.enabled}`);
            console.log(`🏦 Account ID: ${data.wallet.accountId || 'None'}`);
            console.log(`💰 Balance: ${data.wallet.initialBalance || 'Unknown'} HBAR`);
            
            if (data.wallet.error) {
              console.log(`⚠️  Wallet Error: ${data.wallet.error}`);
            }
            
            // Track for cleanup
            if (data.agent._id) {
              this.cleanup.push(() => AgentModel.findByIdAndDelete(data.agent._id));
            }
          }
          
          this.results.push({
            name: agentData.name,
            success,
            duration,
            walletEnabled: data?.wallet?.enabled || false,
            accountId: data?.wallet?.accountId || null,
            balance: data?.wallet?.initialBalance || null,
            error: data?.wallet?.error || null
          });
          
        } else {
          console.log('❌ No response data received');
          this.results.push({
            name: agentData.name,
            success: false,
            duration,
            error: 'No response data'
          });
        }
        
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`💥 Error: ${error.message}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        
        this.results.push({
          name: agentData.name,
          success: false,
          duration,
          error: error.message
        });
      }
      
      console.log('');
    }
  }

  async testValidation() {
    console.log('🚫 Testing Validation');
    console.log('=====================\n');

    const invalidCases = [
      {
        name: 'Missing name',
        data: {
          userId: 'test-user-validation'
        },
        expectedError: 'name is required'
      },
      {
        name: 'Missing userId',
        data: {
          name: 'Test Bot'
        },
        expectedError: 'userId is required'
      },
      {
        name: 'Invalid balance (too low)',
        data: {
          name: 'Test Bot',
          userId: 'test-user-validation',
          initialBalance: 0
        },
        expectedError: 'balance must be at least 1'
      }
    ];

    for (const testCase of invalidCases) {
      console.log(`🧪 Testing: ${testCase.name}`);
      
      try {
        const { req, res } = this.createMockExpressObjects(testCase.data);
        
        await createSimpleAgent(req, res);
        
        if (res.responseData && !res.responseData.success) {
          console.log(`✅ Correctly rejected: ${res.responseData.message}`);
        } else {
          console.log(`⚠️  Expected validation error but request succeeded`);
        }
        
      } catch (error) {
        console.log(`✅ Correctly caught error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  displaySummary() {
    console.log('📊 Test Summary');
    console.log('===============\n');

    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const withWallet = this.results.filter(r => r.walletEnabled).length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;

    console.log(`📈 Total Tests: ${this.results.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🏦 With Wallet: ${withWallet}`);
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
    console.log('');

    // Detailed results
    console.log('📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const wallet = result.walletEnabled ? '🏦' : '🚫';
      console.log(`  ${index + 1}. ${status} ${wallet} ${result.name} (${result.duration}ms)`);
      if (result.balance) {
        console.log(`     Balance: ${result.balance} HBAR, Account: ${result.accountId}`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });
    console.log('');
  }

  async runAllTests() {
    const startTime = Date.now();
    
    console.log('🧪 Simple Agent Creation Test Suite');
    console.log('===================================\n');

    try {
      await this.setup();
      await this.testSimpleAgentCreation();
      await this.testValidation();

      const endTime = Date.now();
      const totalDuration = ((endTime - startTime) / 1000).toFixed(2);

      this.displaySummary();
      
      console.log('🎉 All Simple Agent Tests Completed!');
      console.log(`⏱️  Total Execution Time: ${totalDuration} seconds`);
      console.log('===================================\n');

    } catch (error) {
      console.error('💥 Test Suite Failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    try {
      // Run all cleanup functions
      for (const cleanup of this.cleanup) {
        try {
          await cleanup();
        } catch (error) {
          console.warn('⚠️  Cleanup warning:', error.message);
        }
      }
      console.log(`✅ Cleaned up ${this.cleanup.length} test agents`);

      // Close MongoDB connection
      if (this.connected) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      }
    } catch (error) {
      console.warn('⚠️  Cleanup error:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new SimpleAgentTest();
  testSuite.runAllTests()
    .then(() => {
      console.log('✨ Simple agent test execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Simple agent test execution failed:', error);
      process.exit(1);
    });
}

module.exports = SimpleAgentTest;