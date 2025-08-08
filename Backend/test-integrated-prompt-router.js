require("dotenv").config();
const mongoose = require('mongoose');
const promptRouterController = require('./controllers/promptRouterController');
const agentHederaUtils = require('./utils/agentHederaUtils');
const AgentModel = require('./models/Agent');

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa-test',
  
  // Test agent data (will get Hedera credentials assigned)
  TEST_AGENT: {
    name: 'Test Transfer Agent',
    agentUuid: 'test-transfer-agent-uuid-' + Date.now(),
    description: 'Agent for testing integrated Hedera transfers',
    userId: 'test-user-123',
    primaryStrategy: 'custom',
    avatarName: 'Transfer Bot',
    role: 'Transfer Specialist',
    isActive: true,
    configuration: {
      customPrompt: 'Specialized in handling transfer operations'
    }
  },
  
  // Test messages for transfer execution
  TRANSFER_MESSAGES: [
    "Transfer 5 HBAR to 0.0.1379",
    "Send 10 HBAR to my friend",
    "Transfer 2 HBAR to 0.0.1379 memo: 'Test transfer from integration'"
  ]
};

class IntegratedPromptRouterTest {
  constructor() {
    this.testAgent = null;
    this.connected = false;
    this.cleanup = [];
  }

  /**
   * Initialize test environment
   */
  async setup() {
    console.log('🚀 Setting up Integrated Prompt Router Test Environment...\n');
    
    try {
      // Validate environment variables
      console.log('🔍 Validating environment variables...');
      const requiredVars = ['TOGETHER_API_KEY', 'HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingVars);
        throw new Error('Missing required environment variables');
      }
      console.log('✅ All required environment variables found');
      
      // Connect to MongoDB
      console.log('📦 Connecting to MongoDB...');
      await mongoose.connect(TEST_CONFIG.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
      this.connected = true;

      // Create test agent
      console.log('👤 Creating test agent...');
      this.testAgent = new AgentModel(TEST_CONFIG.TEST_AGENT);
      await this.testAgent.save();
      this.cleanup.push(() => AgentModel.findByIdAndDelete(this.testAgent._id));
      console.log(`✅ Test agent created: ${this.testAgent.name} (${this.testAgent._id})`);

      // Assign Hedera credentials to test agent
      console.log('🔑 Assigning Hedera credentials to test agent...');
      const credentialResult = await agentHederaUtils.assignHederaCredentials(
        this.testAgent._id,
        {
          useOperatorCredentials: true,
          encryptPrivateKey: false // Keep it simple for testing
        }
      );
      console.log('✅ Hedera credentials assigned successfully');
      console.log(`🏦 Account ID: ${credentialResult.hedera.accountId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Test transfer parsing functionality
   */
  async testTransferParsing() {
    console.log('🔍 Testing Transfer Parsing');
    console.log('===========================\n');

    const hederaAgentKitService = require('./services/hederaAgentKitService');

    for (const message of TEST_CONFIG.TRANSFER_MESSAGES) {
      console.log(`📝 Parsing: "${message}"`);
      
      try {
        const parseResult = await hederaAgentKitService.parseTransferRequest(message, this.testAgent._id);
        
        if (parseResult.success) {
          const details = parseResult.details;
          console.log(`  ✅ Amount: ${details.amount} ${details.currency}`);
          console.log(`  🎯 Recipient: ${details.recipient} (${details.recipientType})`);
          console.log(`  📝 Memo: ${details.memo || 'None'}`);
          console.log(`  💰 Type: ${details.isHbarTransfer ? 'HBAR' : 'Token'} transfer`);
          console.log(`  🔍 Needs Resolution: ${details.needsRecipientResolution ? 'Yes' : 'No'}`);
        } else {
          console.log(`  ❌ Parsing failed`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  /**
   * Test guidance mode (no execution)
   */
  async testGuidanceMode() {
    console.log('📋 Testing Guidance Mode');
    console.log('========================\n');

    const testMessage = "Transfer 10 HBAR to my friend's wallet";
    
    console.log(`🧪 Test Message: "${testMessage}"`);
    console.log('🔧 Mode: Guidance Only (execute: false)');
    
    try {
      const mockReq = {
        body: {
          message: testMessage,
          userId: 'test-user-123',
          agentId: this.testAgent._id.toString(),
          execute: false
        }
      };

      const mockRes = {
        json: (data) => {
          console.log(`✅ Response Status: ${data.success ? 'Success' : 'Failed'}`);
          
          if (data.success) {
            const classification = data.data.classification;
            const processing = data.data.processing;
            
            console.log(`📋 Classification: ${classification.type} -> ${classification.actionSubtype}`);
            console.log(`🔧 Processing Status: ${processing.status}`);
            console.log(`📖 Execution Status: ${processing.result.executionStatus}`);
            
            if (processing.result.steps) {
              console.log(`📝 Steps Provided: ${processing.result.steps.length}`);
            }
            
            console.log(`⏱️  Processing Time: ${data.data.metadata.processingTime}`);
          } else {
            console.log(`❌ Error: ${data.message}`);
          }
        },
        status: (code) => ({
          json: (data) => {
            console.log(`❌ HTTP ${code}: ${data.message}`);
          }
        })
      };

      await promptRouterController.routePrompt(mockReq, mockRes);
      
    } catch (error) {
      console.log(`💥 Test Error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test execution mode (actual transfer)
   */
  async testExecutionMode() {
    console.log('⚡ Testing Execution Mode');
    console.log('=========================\n');

    const testMessage = "Transfer 1 HBAR to 0.0.1379"; // Use a small amount for testing
    
    console.log(`🧪 Test Message: "${testMessage}"`);
    console.log('🚀 Mode: Execute Transfer (execute: true)');
    console.log('⚠️  Note: This will attempt a real transfer on Hedera testnet!');
    
    try {
      const mockReq = {
        body: {
          message: testMessage,
          userId: 'test-user-123',
          agentId: this.testAgent._id.toString(),
          execute: true
        }
      };

      const mockRes = {
        json: (data) => {
          console.log(`✅ Response Status: ${data.success ? 'Success' : 'Failed'}`);
          
          if (data.success) {
            const classification = data.data.classification;
            const processing = data.data.processing;
            
            console.log(`📋 Classification: ${classification.type} -> ${classification.actionSubtype}`);
            console.log(`🔧 Processing Status: ${processing.status}`);
            console.log(`⚡ Execution Status: ${processing.result.executionStatus}`);
            
            if (processing.result.execution) {
              const execution = processing.result.execution;
              
              if (execution.success) {
                console.log('🎉 TRANSFER EXECUTED SUCCESSFULLY!');
                console.log(`💸 Transaction ID: ${execution.transactionDetails.transactionId}`);
                console.log(`💰 Amount: ${execution.executionSummary.amount} ${execution.executionSummary.currency}`);
                console.log(`📤 From: ${execution.executionSummary.from}`);
                console.log(`📥 To: ${execution.executionSummary.to}`);
                console.log(`📊 Status: ${execution.transactionDetails.status}`);
              } else {
                console.log('❌ Transfer execution failed:');
                console.log(`   Error: ${execution.error}`);
              }
            }
            
            console.log(`⏱️  Processing Time: ${data.data.metadata.processingTime}`);
          } else {
            console.log(`❌ Error: ${data.message}`);
          }
        },
        status: (code) => ({
          json: (data) => {
            console.log(`❌ HTTP ${code}: ${data.message}`);
          }
        })
      };

      await promptRouterController.routePrompt(mockReq, mockRes);
      
    } catch (error) {
      console.log(`💥 Test Error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test error handling in execution mode
   */
  async testErrorHandling() {
    console.log('🧪 Testing Error Handling');
    console.log('=========================\n');

    // Test with invalid amount
    console.log('🚫 Test 1: Invalid transfer amount');
    try {
      const mockReq = {
        body: {
          message: "Transfer -5 HBAR to 0.0.1379",
          userId: 'test-user-123',
          agentId: this.testAgent._id.toString(),
          execute: true
        }
      };

      const mockRes = {
        json: (data) => {
          if (data.success && data.data.processing.result.execution && !data.data.processing.result.execution.success) {
            console.log('✅ Correctly handled invalid amount');
          } else {
            console.log('⚠️  Unexpected result for invalid amount');
          }
        }
      };

      await promptRouterController.routePrompt(mockReq, mockRes);
      
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message}`);
    }

    // Test with missing recipient
    console.log('🚫 Test 2: Missing recipient');
    try {
      const mockReq = {
        body: {
          message: "Transfer 5 HBAR",
          userId: 'test-user-123',
          agentId: this.testAgent._id.toString(),
          execute: true
        }
      };

      const mockRes = {
        json: (data) => {
          if (data.success && data.data.processing.result.execution && !data.data.processing.result.execution.success) {
            console.log('✅ Correctly handled missing recipient');
          } else {
            console.log('⚠️  Unexpected result for missing recipient');
          }
        }
      };

      await promptRouterController.routePrompt(mockReq, mockRes);
      
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test non-transfer actions (should provide guidance only)
   */
  async testNonTransferActions() {
    console.log('🔄 Testing Non-Transfer Actions');
    console.log('===============================\n');

    const testCases = [
      { message: "Swap my ETH for BTC", expectedType: "swap" },
      { message: "Stake 1000 SEI tokens", expectedType: "stake" },
      { message: "Lend my USDC on DeFi", expectedType: "lend" }
    ];

    for (const testCase of testCases) {
      console.log(`🧪 Testing: "${testCase.message}"`);
      console.log(`   Expected: ${testCase.expectedType} (guidance only)`);
      
      try {
        const mockReq = {
          body: {
            message: testCase.message,
            userId: 'test-user-123',
            agentId: this.testAgent._id.toString(),
            execute: true // Request execution but should get "not implemented"
          }
        };

        const mockRes = {
          json: (data) => {
            if (data.success) {
              const processing = data.data.processing;
              console.log(`   ✅ Classified as: ${processing.subtype}`);
              console.log(`   📋 Execution Status: ${processing.result.executionStatus}`);
              
              if (processing.result.execution && processing.result.execution.status === 'not_implemented') {
                console.log('   ✅ Correctly indicated execution not implemented');
              }
            } else {
              console.log(`   ❌ Error: ${data.message}`);
            }
          }
        };

        await promptRouterController.routePrompt(mockReq, mockRes);
        
      } catch (error) {
        console.log(`   💥 Error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    const startTime = Date.now();
    
    console.log('🧪 Integrated Prompt Router + Hedera Test Suite');
    console.log('===============================================\n');

    try {
      await this.setup();
      
      // Run tests in order
      await this.testTransferParsing();
      await this.testGuidanceMode();
      await this.testExecutionMode();
      await this.testErrorHandling();
      await this.testNonTransferActions();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('🎉 All Integration Tests Completed!');
      console.log(`⏱️  Total Execution Time: ${duration} seconds`);
      console.log('===============================================\n');

    } catch (error) {
      console.error('💥 Integration Test Suite Failed:', error);
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
  const testSuite = new IntegratedPromptRouterTest();
  testSuite.runAllTests()
    .then(() => {
      console.log('✨ Integration test execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Integration test execution failed:', error);
      process.exit(1);
    });
}

module.exports = IntegratedPromptRouterTest;