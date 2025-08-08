require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const promptRouterController = require('./controllers/promptRouterController');

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa-test',
  
  // Test messages for different types
  TEST_MESSAGES: {
    actions: [
      "Transfer 100 USDC to my friend's wallet",
      "Swap my ETH for BTC on SEI network",
      "Stake 1000 SEI tokens for rewards",
      "Lend my USDT on a DeFi platform",
      "Buy some Bitcoin with $500"
    ],
    strategy: [
      "How can I make money with memecoins?",
      "What's the best DCA strategy for beginners?",
      "I want to invest in altcoins for profit",
      "Create a portfolio strategy for $10k"
    ],
    information: [
      "What's the current price of Bitcoin?",
      "Is ETH good for trading right now?",
      "How does staking work on SEI?",
      "Explain yield farming to me"
    ],
    feedbacks: [
      "I just bought BTC, what should I do next?",
      "I completed this trade, was it good?",
      "I lost money on my last investment, help",
      "Made some profit, what's my next move?"
    ]
  }
};

class PromptRouterTest {
  constructor() {
    this.app = null;
    this.connected = false;
  }

  /**
   * Initialize test environment
   */
  async setup() {
    console.log('🚀 Setting up Prompt Router Test Environment...\n');
    
    try {
      // Connect to MongoDB (optional for this test)
      console.log('📦 Connecting to MongoDB...');
      try {
        await mongoose.connect(TEST_CONFIG.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
        this.connected = true;
      } catch (dbError) {
        console.warn('⚠️  MongoDB connection failed, continuing without DB');
        this.connected = false;
      }

      // Check environment variables
      console.log('🔍 Checking environment variables...');
      const requiredVars = ['TOGETHER_API_KEY'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn('⚠️  Missing environment variables:', missingVars);
        console.warn('ℹ️  LLM functionality may not work properly');
      } else {
        console.log('✅ All required environment variables found');
      }

      console.log('');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Test message classification (Layer 1)
   */
  async testMessageClassification() {
    console.log('📋 Testing Layer 1: Message Classification');
    console.log('=========================================\n');

    const messageClassificationService = require('./services/messageClassificationService');

    for (const [type, messages] of Object.entries(TEST_CONFIG.TEST_MESSAGES)) {
      console.log(`🔍 Testing ${type.toUpperCase()} messages:`);
      
      for (let i = 0; i < Math.min(2, messages.length); i++) {
        const message = messages[i];
        console.log(`  Message: "${message}"`);
        
        try {
          const classification = await messageClassificationService.classifyMessage(message);
          
          console.log(`  ✅ Type: ${classification.type} (confidence: ${classification.confidence})`);
          if (classification.actionSubtype) {
            console.log(`  🔧 Action: ${classification.actionSubtype}`);
          }
          console.log(`  📝 Reasoning: ${classification.reasoning}`);
          console.log(`  🔑 Keywords: ${classification.keywords.join(', ')}`);
          
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
        
        console.log('');
      }
    }
  }

  /**
   * Test actions processing (Layer 2)
   */
  async testActionsProcessing() {
    console.log('⚡ Testing Layer 2: Actions Processing');
    console.log('====================================\n');

    const messageClassificationService = require('./services/messageClassificationService');
    const actionsProcessingService = require('./services/actionsProcessingService');

    const actionMessages = TEST_CONFIG.TEST_MESSAGES.actions.slice(0, 3);

    for (const message of actionMessages) {
      console.log(`🔧 Processing action: "${message}"`);
      
      try {
        // First classify the message
        const classification = await messageClassificationService.classifyMessage(message);
        console.log(`  📋 Classification: ${classification.type} -> ${classification.actionSubtype}`);
        
        if (classification.type === 'actions') {
          // Then process with actions service
          const actionResult = await actionsProcessingService.processAction(message, classification);
          
          console.log(`  ✅ Action Type: ${actionResult.actionType}`);
          console.log(`  📝 Steps: ${actionResult.steps?.length || 0} steps provided`);
          console.log(`  ⚠️  Warnings: ${actionResult.warnings?.length || 0} warnings`);
          console.log(`  💡 Recommendations: ${actionResult.recommendations?.length || 0} recommendations`);
          console.log(`  🎯 Risk Level: ${actionResult.riskLevel}`);
          console.log(`  ⏱️  Estimated Time: ${actionResult.estimatedTime}`);
          
        } else {
          console.log(`  ⏭️  Skipped: Not an action type`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  /**
   * Test full prompt router (End-to-End)
   */
  async testPromptRouter() {
    console.log('🌟 Testing Full Prompt Router (End-to-End)');
    console.log('==========================================\n');

    // Test with one message from each type
    const testCases = [
      { message: "Transfer 50 USDC to wallet 0x123...", expectedType: "actions" },
      { message: "How can I make profit from DeFi?", expectedType: "strategy" },
      { message: "What's Bitcoin's current price?", expectedType: "information" },
      { message: "I just bought ETH, what now?", expectedType: "feedbacks" }
    ];

    for (const testCase of testCases) {
      console.log(`🧪 Test Case: "${testCase.message}"`);
      console.log(`   Expected Type: ${testCase.expectedType}`);
      
      try {
        // Create mock request and response objects
        const mockReq = {
          body: {
            message: testCase.message,
            userId: 'test-user-123',
            agentId: 'test-agent-456'
          }
        };

        const mockRes = {
          json: (data) => {
            console.log(`   ✅ Response Status: ${data.success ? 'Success' : 'Failed'}`);
            
            if (data.success) {
              const classification = data.data.classification;
              const processing = data.data.processing;
              
              console.log(`   📋 Classified as: ${classification.type} (confidence: ${classification.confidence})`);
              console.log(`   🔧 Processing: ${processing.type} -> ${processing.status}`);
              
              if (processing.result && processing.result.actionType) {
                console.log(`   ⚡ Action: ${processing.result.actionType}`);
              }
              
              console.log(`   ⏱️  Processing Time: ${data.data.metadata.processingTime}`);
              
              // Check if classification matches expectation
              if (classification.type === testCase.expectedType) {
                console.log(`   ✅ Classification CORRECT!`);
              } else {
                console.log(`   ⚠️  Classification differs from expected`);
              }
              
            } else {
              console.log(`   ❌ Error: ${data.message}`);
            }
          },
          status: (code) => ({
            json: (data) => {
              console.log(`   ❌ HTTP ${code}: ${data.message}`);
            }
          })
        };

        // Call the prompt router
        await promptRouterController.routePrompt(mockReq, mockRes);
        
      } catch (error) {
        console.log(`   💥 Test Error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  /**
   * Test router info endpoint
   */
  async testRouterInfo() {
    console.log('ℹ️  Testing Router Info Endpoint');
    console.log('===============================\n');

    try {
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          console.log('✅ Router Info Retrieved:');
          console.log(`   Version: ${data.data.routerVersion}`);
          console.log(`   Layer 1: ${data.data.layer1.name}`);
          console.log(`   Layer 2 Services: ${Object.keys(data.data.layer2.services).length}`);
          console.log(`   Actions Status: ${data.data.layer2.services.actions.status}`);
          console.log(`   Supported Types: ${data.data.layer1.supportedTypes.join(', ')}`);
        }
      };

      await promptRouterController.getRouterInfo(mockReq, mockRes);
      
    } catch (error) {
      console.log(`❌ Router Info Error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test supported actions endpoint
   */
  async testSupportedActions() {
    console.log('🔧 Testing Supported Actions Endpoint');
    console.log('====================================\n');

    try {
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          console.log('✅ Supported Actions Retrieved:');
          console.log(`   Total Actions: ${data.data.count}`);
          console.log(`   Actions: ${data.data.supportedActions.join(', ')}`);
          console.log('   Descriptions:');
          Object.entries(data.data.descriptions).forEach(([action, desc]) => {
            console.log(`     ${action}: ${desc}`);
          });
        }
      };

      await promptRouterController.getSupportedActions(mockReq, mockRes);
      
    } catch (error) {
      console.log(`❌ Supported Actions Error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    const startTime = Date.now();
    
    console.log('🧪 Prompt Router Test Suite');
    console.log('===========================\n');

    try {
      await this.setup();
      
      // Run individual tests
      await this.testMessageClassification();
      await this.testActionsProcessing();
      await this.testPromptRouter();
      await this.testRouterInfo();
      await this.testSupportedActions();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('🎉 All Tests Completed!');
      console.log(`⏱️  Total Execution Time: ${duration} seconds`);
      console.log('========================\n');

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
      if (this.connected) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      }
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new PromptRouterTest();
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

module.exports = PromptRouterTest;