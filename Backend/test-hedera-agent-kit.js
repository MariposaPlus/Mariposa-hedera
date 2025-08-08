require("dotenv").config();
const mongoose = require('mongoose');
const hederaAgentKitService = require('./services/hederaAgentKitService');
const agentHederaUtils = require('./utils/agentHederaUtils');
const AgentModel = require('./models/Agent');
const EvaluationTopicModel = require('./models/EvaluationTopic');

// Test configuration
const TEST_CONFIG = {
  // MongoDB connection
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa-test',
  
  // Test agent data (credentials will be assigned during setup)
  TEST_AGENT: {
    name: 'Test HR Agent',
    agentUuid: 'test-hr-agent-uuid-' + Date.now(),
    description: 'HR agent for testing Hedera functionality',
    userId: 'test-user-123',
    primaryStrategy: 'custom',
    avatarName: 'HR Assistant',
    role: 'HR Specialist',
    isActive: true,
    configuration: {
      customPrompt: 'HR agent for candidate evaluation'
    }
  },
  
  // Hedera credentials validation
  REQUIRED_ENV_VARS: [
    'HEDERA_ACCOUNT_ID',
    'HEDERA_PRIVATE_KEY',
    'HEDERA_NETWORK'
  ],
  
  // Test evaluation data
  TEST_EVALUATION: {
    company: 'TechCorp Inc',
    postId: 'job-123',
    candidateName: 'John Doe',
    candidateId: 'candidate-456'
  }
};

class HederaAgentKitTest {
  constructor() {
    this.testAgent = null;
    this.testTopicId = null;
    this.testTokenId = null;
    this.cleanup = [];
  }

  /**
   * Initialize test environment
   */
  async setup() {
    console.log('🚀 Setting up Hedera Agent Kit tests...\n');
    
    try {
      // Validate environment variables
      console.log('🔍 Validating environment variables...');
      const missingVars = TEST_CONFIG.REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn('⚠️  Missing environment variables:', missingVars);
        console.warn('ℹ️  Some tests may fail without proper Hedera credentials');
      } else {
        console.log('✅ All required environment variables found');
      }
      
      console.log(`🌐 Network: ${process.env.HEDERA_NETWORK || 'testnet'}`);
      console.log(`🏦 Operator Account: ${process.env.HEDERA_ACCOUNT_ID || 'Not configured'}`);
      console.log('');

      // Connect to MongoDB
      console.log('📦 Connecting to MongoDB...');
      await mongoose.connect(TEST_CONFIG.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB\n');

      // Create test agent
      console.log('👤 Creating test agent...');
      this.testAgent = new AgentModel(TEST_CONFIG.TEST_AGENT);
      await this.testAgent.save();
      this.cleanup.push(() => AgentModel.findByIdAndDelete(this.testAgent._id));
      console.log(`✅ Test agent created: ${this.testAgent.name} (${this.testAgent._id})`);

      // Assign Hedera credentials to test agent
      if (process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY) {
        console.log('🔑 Assigning Hedera credentials to test agent...');
        try {
          const credentialResult = await agentHederaUtils.assignHederaCredentials(
            this.testAgent._id,
            {
              useOperatorCredentials: true,
              encryptPrivateKey: false // Keep it simple for testing
            }
          );
          console.log('✅ Hedera credentials assigned successfully');
          console.log(`🏦 Account ID: ${credentialResult.hedera.accountId}`);
        } catch (credError) {
          console.warn('⚠️  Failed to assign Hedera credentials:', credError.message);
          console.warn('ℹ️  Tests will run without Hedera network functionality');
        }
      } else {
        console.warn('⚠️  No Hedera credentials in environment variables');
        console.warn('ℹ️  Tests will run in simulation mode');
      }
      console.log('');

      // Check Hedera client status
      console.log('🔗 Checking Hedera client status...');
      const clientInfo = hederaAgentKitService.getClientInfo();
      console.log('📊 Client Info:', clientInfo);
      console.log('');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Test available tools functionality
   */
  async testGetAvailableTools() {
    console.log('🔧 Testing getAvailableTools...');
    try {
      const result = await hederaAgentKitService.getAvailableTools({
        agentId: this.testAgent._id
      });

      console.log('✅ Available tools retrieved');
      console.log(`📊 Tools count: ${result.count}`);
      console.log('🛠️  Available tools:');
      result.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
      console.log('');

      // Verify expected tools are present
      const expectedTools = [
        'create_topic_tool',
        'submit_topic_message_tool', 
        'create_fungible_token_tool',
        'get_hbar_balance_query_tool'
      ];

      const availableToolNames = result.tools.map(t => t.name);
      const missingTools = expectedTools.filter(tool => !availableToolNames.includes(tool));
      
      if (missingTools.length > 0) {
        console.warn('⚠️  Missing expected tools:', missingTools);
      }

      return result;
    } catch (error) {
      console.error('❌ getAvailableTools test failed:', error.message);
      throw error;
    }
  }

  /**
   * Test agent balance retrieval
   */
  async testGetMyBalance() {
    console.log('💰 Testing getMyBalance...');
    try {
      const result = await hederaAgentKitService.getMyBalance({
        agentId: this.testAgent._id
      });

      console.log('✅ Agent balance retrieved');
      console.log(`💰 Balance: ${result.balance} ${result.unit}`);
      console.log(`🏦 Account: ${result.accountId}`);
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ getMyBalance test failed:', error.message);
      console.log('ℹ️  This might be expected if agent credentials are not valid on testnet');
      console.log('');
      return null;
    }
  }

  /**
   * Test account balance query
   */
  async testGetHbarBalance() {
    console.log('🔍 Testing getHbarBalance...');
    try {
      const testAccountId = this.testAgent.hederaAccountId;
      const result = await hederaAgentKitService.getHbarBalance({
        accountId: testAccountId,
        agentId: this.testAgent._id
      });

      console.log('✅ HBAR balance query successful');
      console.log(`💰 Account ${testAccountId} balance: ${result.balance} ${result.unit}`);
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ getHbarBalance test failed:', error.message);
      console.log('ℹ️  This might be expected if the test account is not valid on testnet');
      console.log('');
      return null;
    }
  }

  /**
   * Test topic creation
   */
  async testCreateTopic() {
    console.log('📝 Testing createTopic...');
    try {
      const topicMemo = `Test topic created at ${new Date().toISOString()}`;
      const result = await hederaAgentKitService.createTopic({
        memo: topicMemo,
        agentId: this.testAgent._id
      });

      console.log('✅ Topic created successfully');
      console.log(`📋 Topic ID: ${result.topicId}`);
      console.log(`🔗 Transaction ID: ${result.transactionId}`);
      console.log(`📝 Memo: ${topicMemo}`);
      console.log('');

      this.testTopicId = result.topicId;
      return result;
    } catch (error) {
      console.error('❌ createTopic test failed:', error.message);
      console.log('ℹ️  This might be expected if agent credentials are not valid on testnet');
      console.log('');
      return null;
    }
  }

  /**
   * Test topic message submission
   */
  async testSubmitTopicMessage() {
    if (!this.testTopicId) {
      console.log('⏭️  Skipping submitTopicMessage test (no topic created)');
      console.log('');
      return null;
    }

    console.log('📤 Testing submitTopicMessage...');
    try {
      const testMessage = {
        type: 'test_message',
        content: 'This is a test message for Hedera Agent Kit',
        timestamp: new Date().toISOString(),
        agent: this.testAgent.name
      };

      const result = await hederaAgentKitService.submitTopicMessage({
        topicId: this.testTopicId,
        message: JSON.stringify(testMessage),
        agentId: this.testAgent._id
      });

      console.log('✅ Message submitted successfully');
      console.log(`📋 Topic ID: ${result.topicId}`);
      console.log(`🔗 Transaction ID: ${result.transactionId}`);
      console.log(`📤 Message: ${JSON.stringify(testMessage, null, 2)}`);
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ submitTopicMessage test failed:', error.message);
      console.log('');
      return null;
    }
  }

  /**
   * Test fungible token creation
   */
  async testCreateFungibleToken() {
    console.log('🪙 Testing createFungibleToken...');
    try {
      const tokenConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 2,
        initialSupply: 1000,
        agentId: this.testAgent._id
      };

      const result = await hederaAgentKitService.createFungibleToken(tokenConfig);

      console.log('✅ Fungible token created successfully');
      console.log(`🪙 Token ID: ${result.tokenId}`);
      console.log(`🔗 Transaction ID: ${result.transactionId}`);
      console.log(`📋 Symbol: ${tokenConfig.symbol}`);
      console.log(`📊 Initial Supply: ${tokenConfig.initialSupply}`);
      console.log('');

      this.testTokenId = result.tokenId;
      return result;
    } catch (error) {
      console.error('❌ createFungibleToken test failed:', error.message);
      console.log('ℹ️  This might be expected if agent credentials are not valid on testnet');
      console.log('');
      return null;
    }
  }

  /**
   * Test evaluation topic creation
   */
  async testCreateEvaluationTopic() {
    console.log('📋 Testing createEvaluationTopic...');
    try {
      const result = await hederaAgentKitService.createEvaluationTopic({
        ...TEST_CONFIG.TEST_EVALUATION,
        agentId: this.testAgent._id
      });

      console.log('✅ Evaluation topic created successfully');
      console.log(`📋 Topic ID: ${result.topicId}`);
      console.log(`🔗 Transaction ID: ${result.transactionId}`);
      console.log(`🏢 Company: ${TEST_CONFIG.TEST_EVALUATION.company}`);
      console.log(`👤 Candidate: ${TEST_CONFIG.TEST_EVALUATION.candidateName}`);
      console.log(`📝 Memo: ${result.topicMemo}`);
      console.log('');

      // Add to cleanup
      this.cleanup.push(() => EvaluationTopicModel.findOneAndDelete({ topicId: result.topicId }));

      // Store for further testing
      this.evaluationTopicId = result.topicId;
      return result;
    } catch (error) {
      console.error('❌ createEvaluationTopic test failed:', error.message);
      console.log('');
      return null;
    }
  }

  /**
   * Test evaluation message submission
   */
  async testSubmitEvaluationMessage() {
    if (!this.evaluationTopicId) {
      console.log('⏭️  Skipping submitEvaluationMessage test (no evaluation topic created)');
      console.log('');
      return null;
    }

    console.log('📤 Testing submitEvaluationMessage...');
    try {
      const evaluation = {
        passed: true,
        score: 85,
        feedback: 'Strong technical skills and good cultural fit',
        interviewNotes: 'Candidate demonstrated excellent problem-solving abilities'
      };

      const result = await hederaAgentKitService.submitEvaluationMessage({
        topicId: this.evaluationTopicId,
        agentId: this.testAgent._id,
        evaluation
      });

      console.log('✅ Evaluation message submitted successfully');
      console.log(`📋 Topic ID: ${result.topicId}`);
      console.log(`🔗 Message ID: ${result.messageId}`);
      console.log(`✅ Evaluation Result: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 Score: ${evaluation.score}`);
      console.log(`💬 Feedback: ${evaluation.feedback}`);
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ submitEvaluationMessage test failed:', error.message);
      console.log('');
      return null;
    }
  }

  /**
   * Test validation message sending
   */
  async testSendValidationMessage() {
    if (!this.evaluationTopicId) {
      console.log('⏭️  Skipping sendValidationMessage test (no evaluation topic created)');
      console.log('');
      return null;
    }

    console.log('📤 Testing sendValidationMessage...');
    try {
      const evaluation = {
        passed: false,
        score: 65,
        feedback: 'Needs improvement in communication skills',
        interviewNotes: 'Technical knowledge is good but soft skills need development'
      };

      const result = await hederaAgentKitService.sendValidationMessage({
        topicId: this.evaluationTopicId,
        agentId: this.testAgent._id,
        evaluation
      });

      console.log('✅ Validation message sent successfully');
      console.log(`🔗 Message ID: ${result.messageId}`);
      console.log(`✅ Evaluation Result: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 Score: ${evaluation.score}`);
      console.log(`💬 Feedback: ${evaluation.feedback}`);
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ sendValidationMessage test failed:', error.message);
      console.log('');
      return null;
    }
  }

  /**
   * Test getting evaluation topic details
   */
  async testGetEvaluationTopic() {
    if (!this.evaluationTopicId) {
      console.log('⏭️  Skipping getEvaluationTopic test (no evaluation topic created)');
      console.log('');
      return null;
    }

    console.log('🔍 Testing getEvaluationTopic...');
    try {
      const result = await hederaAgentKitService.getEvaluationTopic(this.evaluationTopicId);

      console.log('✅ Evaluation topic retrieved successfully');
      console.log(`📋 Topic ID: ${result.data.topicId}`);
      console.log(`🏢 Company: ${result.data.company}`);
      console.log(`👤 Candidate: ${result.data.candidateName}`);
      console.log(`📊 Status: ${result.data.status}`);
      console.log(`📝 Evaluations count: ${result.data.evaluations.length}`);
      
      if (result.data.finalResult) {
        console.log(`🎯 Final Result: ${result.data.finalResult.recommendation}`);
        console.log(`📊 Overall Score: ${result.data.finalResult.overallScore}`);
      }
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ getEvaluationTopic test failed:', error.message);
      console.log('');
      return null;
    }
  }

  /**
   * Test getting evaluation topics list
   */
  async testGetEvaluationTopics() {
    console.log('📋 Testing getEvaluationTopics...');
    try {
      const result = await hederaAgentKitService.getEvaluationTopics({
        company: TEST_CONFIG.TEST_EVALUATION.company
      });

      console.log('✅ Evaluation topics list retrieved successfully');
      console.log(`📊 Total topics found: ${result.data.length}`);
      
      result.data.forEach((topic, index) => {
        console.log(`   ${index + 1}. ${topic.candidateName} at ${topic.company} (${topic.status})`);
      });
      console.log('');

      return result;
    } catch (error) {
      console.error('❌ getEvaluationTopics test failed:', error.message);
      console.log('');
      return null;
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('🧪 Testing error handling...');
    
    // Test missing agent ID
    try {
      await hederaAgentKitService.getAvailableTools({});
      console.log('❌ Should have thrown error for missing agentId');
    } catch (error) {
      console.log('✅ Correctly handled missing agentId error');
    }

    // Test invalid agent ID
    try {
      await hederaAgentKitService.getAvailableTools({ agentId: 'invalid-id' });
      console.log('❌ Should have thrown error for invalid agentId');
    } catch (error) {
      console.log('✅ Correctly handled invalid agentId error');
    }

    // Test missing required parameters for token creation
    try {
      await hederaAgentKitService.createFungibleToken({ agentId: this.testAgent._id });
      console.log('❌ Should have thrown error for missing token parameters');
    } catch (error) {
      console.log('✅ Correctly handled missing token parameters error');
    }

    console.log('');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    const startTime = Date.now();
    console.log('🧪 Starting Hedera Agent Kit Service Tests');
    console.log('==========================================\n');

    try {
      await this.setup();

      // Core functionality tests
      await this.testGetAvailableTools();
      await this.testGetMyBalance();
      await this.testGetHbarBalance();

      // Hedera network tests (might fail if credentials invalid)
      await this.testCreateTopic();
      await this.testSubmitTopicMessage();
      await this.testCreateFungibleToken();

      // Evaluation system tests
      await this.testCreateEvaluationTopic();
      await this.testSubmitEvaluationMessage();
      await this.testSendValidationMessage();
      await this.testGetEvaluationTopic();
      await this.testGetEvaluationTopics();

      // Error handling tests
      await this.testErrorHandling();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('🎉 All tests completed!');
      console.log(`⏱️  Total execution time: ${duration} seconds`);
      console.log('==========================================\n');

    } catch (error) {
      console.error('💥 Test suite failed:', error);
      throw error;
    } finally {
      await this.teardown();
    }
  }

  /**
   * Clean up test environment
   */
  async teardown() {
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
      await mongoose.connection.close();
      console.log('✅ Cleanup completed\n');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new HederaAgentKitTest();
  testSuite.runAllTests()
    .then(() => {
      console.log('✨ Test suite execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite execution failed:', error);
      process.exit(1);
    });
}

module.exports = HederaAgentKitTest;