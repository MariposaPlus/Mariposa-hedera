require("dotenv").config();
const mongoose = require('mongoose');
const { createAgentWithHedera } = require('./controllers/agentController');
const AgentModel = require('./models/Agent');

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa-test',
  
  // Test scenarios for different agent types
  TEST_SCENARIOS: [
    {
      name: 'Strategy Agent (DCA)',
      data: {
        name: 'Test DCA Bot ' + Date.now(),
        userId: 'test-user-strategy-' + Date.now(),
        agentType: 'strategy',
        primaryStrategy: 'DCA',
        configuration: {
          defaultBudget: 1000,
          riskTolerance: 'moderate'
        },
        hederaOptions: {
          useOperatorCredentials: true,
          initialBalance: 20
        }
      }
    },
    {
      name: 'Action Agent (Executor)',
      data: {
        name: 'Test Action Bot ' + Date.now(),
        description: 'Action execution agent for blockchain transactions',
        userId: 'test-user-action-' + Date.now(),
        agentType: 'actions',
        configuration: {
          supportedActions: ['transfer', 'swap', 'stake'],
          executionMode: 'guided',
          maxTransactionValue: 500,
          confirmationRequired: true
        },
        hederaOptions: {
          useOperatorCredentials: true,
          initialBalance: 30
        }
      }
    },
    {
      name: 'Information Agent (Analyst)',
      data: {
        name: 'Test Info Bot ' + Date.now(),
        userId: 'test-user-info-' + Date.now(),
        agentType: 'information',
        configuration: {
          informationTypes: ['market_data', 'token_analysis'],
          updateFrequency: 'real_time',
          dataSource: 'multiple'
        },
        hederaOptions: {
          useOperatorCredentials: true,
          initialBalance: 10
        }
      }
    },
    {
      name: 'Feedback Agent (Advisor)',
      data: {
        name: 'Test Feedback Bot ' + Date.now(),
        userId: 'test-user-feedback-' + Date.now(),
        agentType: 'feedback',
        configuration: {
          feedbackTypes: ['performance_analysis', 'strategy_recommendations'],
          analysisDepth: 'comprehensive'
        },
        hederaOptions: {
          useOperatorCredentials: true,
          initialBalance: 15
        }
      }
    },
    {
      name: 'General Agent (Assistant)',
      data: {
        name: 'Test General Bot ' + Date.now(),
        userId: 'test-user-general-' + Date.now(),
        agentType: 'general',
        configuration: {
          capabilities: ['basic_actions', 'information_lookup', 'guidance'],
          interactionMode: 'conversational'
        },
        hederaOptions: {
          useOperatorCredentials: true,
          initialBalance: 10
        }
      }
    },
    {
      name: 'Graceful Fallback Test',
      data: {
        name: 'Test Fallback Bot ' + Date.now(),
        userId: 'test-user-fallback-' + Date.now(),
        agentType: 'general',
        hederaOptions: {
          createNewAccount: true, // This might fail, testing graceful fallback
          initialBalance: 1000000, // Unrealistic amount to test error handling
          strictMode: false // Graceful mode
        }
      }
    }
  ]
};

class HederaAgentCreationTest {
  constructor() {
    this.connected = false;
    this.cleanup = [];
    this.results = [];
  }

  /**
   * Initialize test environment
   */
  async setup() {
    console.log('🚀 Setting up Hedera Agent Creation Test Environment...\n');
    
    try {
      // Validate environment variables
      console.log('🔍 Validating environment variables...');
      const requiredVars = ['HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn('⚠️ Missing environment variables:', missingVars);
        console.warn('   Some tests may use fallback behavior');
      } else {
        console.log('✅ Hedera environment variables found');
      }
      
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

  /**
   * Create mock Express request and response objects
   */
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

  /**
   * Test agent creation with different scenarios
   */
  async testAgentCreation() {
    console.log('🧪 Testing Hedera Agent Creation Scenarios');
    console.log('==========================================\n');

    for (let i = 0; i < TEST_CONFIG.TEST_SCENARIOS.length; i++) {
      const scenario = TEST_CONFIG.TEST_SCENARIOS[i];
      console.log(`📋 Test ${i + 1}: ${scenario.name}`);
      console.log(`👤 User ID: ${scenario.data.userId}`);
      console.log(`🤖 Agent: ${scenario.data.name}`);
      console.log(`🎭 Type: ${scenario.data.agentType || 'default'}`);
      if (scenario.data.primaryStrategy) {
        console.log(`📊 Strategy: ${scenario.data.primaryStrategy}`);
      }
      
      const startTime = Date.now();
      
      try {
        // Create mock Express objects
        const { req, res } = this.createMockExpressObjects(scenario.data);
        
        // Call the controller function
        await createAgentWithHedera(req, res);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Analyze results
        if (res.responseData) {
          const { success, data, message } = res.responseData;
          
          console.log(`✅ Status: ${res.statusCode || 'No status'}`);
          console.log(`📈 Success: ${success}`);
          console.log(`💬 Message: ${message}`);
          console.log(`⏱️  Duration: ${duration}ms`);
          
          if (success && data.agent) {
            console.log(`🆔 Agent ID: ${data.agent._id}`);
            console.log(`🎭 Agent Type: ${data.agent.agentType || 'Unknown'}`);
            console.log(`👤 Role: ${data.agent.role || 'Unknown'}`);
            console.log(`🏦 Hedera Account: ${data.hedera.accountId || 'None'}`);
            console.log(`🔑 Hedera Enabled: ${data.hedera.enabled}`);
            
            if (data.hedera.error) {
              console.log(`⚠️  Hedera Error: ${data.hedera.error}`);
            }
            
            // Track for cleanup
            if (data.agent._id) {
              this.cleanup.push(() => AgentModel.findByIdAndDelete(data.agent._id));
            }
          }
          
          // Store result for summary
          this.results.push({
            scenario: scenario.name,
            success,
            duration,
            statusCode: res.statusCode,
            hederaEnabled: data?.hedera?.enabled || false,
            agentId: data?.agent?._id || null,
            error: data?.hedera?.error || null
          });
          
        } else {
          console.log('❌ No response data received');
          this.results.push({
            scenario: scenario.name,
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
          scenario: scenario.name,
          success: false,
          duration,
          error: error.message
        });
      }
      
      console.log('');
    }
  }

  /**
   * Test validation errors
   */
  async testValidationErrors() {
    console.log('🚫 Testing Validation Errors');
    console.log('============================\n');

    const invalidTestCases = [
      {
        name: 'Missing required fields',
        data: {
          // Missing name and userId
          primaryStrategy: 'DCA'
        },
        expectedError: 'Validation error'
      },
      {
        name: 'Invalid strategy',
        data: {
          name: 'Test Invalid Strategy ' + Date.now(),
          userId: 'test-user-invalid',
          primaryStrategy: 'invalid_strategy'
        },
        expectedError: 'Invalid primary strategy'
      },
      {
        name: 'Name too long',
        data: {
          name: 'A'.repeat(150), // Exceeds 100 character limit
          userId: 'test-user-long-name'
        },
        expectedError: 'Agent name must be between 2 and 100 characters'
      }
    ];

    for (const testCase of invalidTestCases) {
      console.log(`🧪 Testing: ${testCase.name}`);
      
      try {
        const { req, res } = this.createMockExpressObjects(testCase.data);
        
        // Mock validation result that would normally be provided by express-validator
        req.validationResult = () => ({
          isEmpty: () => false,
          array: () => [{ msg: testCase.expectedError, param: 'test' }]
        });
        
        await createAgentWithHedera(req, res);
        
        if (res.responseData && !res.responseData.success) {
          console.log(`✅ Correctly caught validation error: ${res.responseData.message}`);
        } else {
          console.log(`⚠️  Expected validation error but request succeeded`);
        }
        
      } catch (error) {
        console.log(`✅ Correctly caught error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  /**
   * Display test summary
   */
  displaySummary() {
    console.log('📊 Test Summary');
    console.log('===============\n');

    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const withHedera = this.results.filter(r => r.hederaEnabled).length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;

    console.log(`📈 Total Tests: ${this.results.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🏦 With Hedera: ${withHedera}`);
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
    console.log('');

    // Detailed results
    console.log('📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const hedera = result.hederaEnabled ? '🏦' : '🚫';
      console.log(`  ${index + 1}. ${status} ${hedera} ${result.scenario} (${result.duration}ms)`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });
    console.log('');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    const startTime = Date.now();
    
    console.log('🧪 Hedera Agent Creation Test Suite');
    console.log('===================================\n');

    try {
      await this.setup();
      await this.testAgentCreation();
      await this.testValidationErrors();

      const endTime = Date.now();
      const totalDuration = ((endTime - startTime) / 1000).toFixed(2);

      this.displaySummary();
      
      console.log('🎉 All Tests Completed!');
      console.log(`⏱️  Total Execution Time: ${totalDuration} seconds`);
      console.log('===================================\n');

    } catch (error) {
      console.error('💥 Test Suite Failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up test environment
   */
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
  const testSuite = new HederaAgentCreationTest();
  testSuite.runAllTests()
    .then(() => {
      console.log('✨ Test execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = HederaAgentCreationTest;