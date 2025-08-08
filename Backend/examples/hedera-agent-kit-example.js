/**
 * Hedera Agent Kit Service Example
 * 
 * This example demonstrates how to use the Hedera Agent Kit service
 * for various blockchain operations including token creation, topic management,
 * and candidate evaluation workflows.
 */

require("dotenv").config();
const mongoose = require('mongoose');
const hederaAgentKitService = require('../services/hederaAgentKitService');
const AgentModel = require('../models/Agent');

// Example configuration
const EXAMPLE_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa',
  
  // Example agent data (replace with your actual agent)
  AGENT_DATA: {
    name: 'HR Evaluation Agent',
    agentUuid: 'hr-agent-uuid-' + Date.now(),
    description: 'Specialized agent for candidate evaluation and HR processes',
    userId: 'example-user-123',
    primaryStrategy: 'custom',
    avatarName: 'HR Assistant',
    role: 'HR Specialist',
    hederaAccountId: process.env.HEDERA_ACCOUNT_ID,
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY,
    hederaPublicKey: process.env.HEDERA_PUBLIC_KEY,
    isActive: true,
    configuration: {
      customPrompt: 'Specialized HR agent for comprehensive candidate evaluation'
    }
  }
};

class HederaAgentKitExample {
  constructor() {
    this.agent = null;
    this.createdResources = [];
  }

  /**
   * Initialize the example environment
   */
  async initialize() {
    console.log('🚀 Initializing Hedera Agent Kit Example...\n');

    try {
      // Connect to MongoDB
      await mongoose.connect(EXAMPLE_CONFIG.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');

      // Create or find the example agent
      this.agent = await AgentModel.findOne({ agentUuid: EXAMPLE_CONFIG.AGENT_DATA.agentUuid });
      
      if (!this.agent) {
        this.agent = new AgentModel(EXAMPLE_CONFIG.AGENT_DATA);
        await this.agent.save();
        console.log('✅ Created example agent');
        this.createdResources.push({ type: 'agent', id: this.agent._id });
      } else {
        console.log('✅ Using existing example agent');
      }

      console.log(`👤 Agent: ${this.agent.name} (${this.agent._id})\n`);

    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Example 1: Basic Service Operations
   */
  async example1_BasicOperations() {
    console.log('📚 Example 1: Basic Service Operations');
    console.log('=====================================\n');

    try {
      // Get available tools
      console.log('🔧 Getting available tools...');
      const tools = await hederaAgentKitService.getAvailableTools({
        agentId: this.agent._id
      });
      console.log(`✅ Found ${tools.count} available tools:`);
      tools.tools.forEach(tool => console.log(`   - ${tool.name}`));
      console.log('');

      // Get agent balance
      console.log('💰 Checking agent balance...');
      try {
        const balance = await hederaAgentKitService.getMyBalance({
          agentId: this.agent._id
        });
        console.log(`✅ Agent balance: ${balance.balance} ${balance.unit}`);
      } catch (error) {
        console.log('⚠️  Balance check failed (expected if using test credentials)');
      }
      console.log('');

      // Get client info
      console.log('ℹ️  Getting client information...');
      const clientInfo = hederaAgentKitService.getClientInfo();
      console.log('✅ Client Info:', JSON.stringify(clientInfo, null, 2));
      console.log('');

    } catch (error) {
      console.error('❌ Basic operations example failed:', error.message);
    }
  }

  /**
   * Example 2: Token Creation
   */
  async example2_TokenCreation() {
    console.log('🪙 Example 2: Token Creation');
    console.log('============================\n');

    try {
      const tokenConfig = {
        name: 'Example Company Token',
        symbol: 'ECT',
        decimals: 2,
        initialSupply: 10000,
        agentId: this.agent._id
      };

      console.log('🪙 Creating fungible token...');
      console.log('Token Config:', JSON.stringify(tokenConfig, null, 2));

      const tokenResult = await hederaAgentKitService.createFungibleToken(tokenConfig);
      
      console.log('✅ Token created successfully!');
      console.log(`🪙 Token ID: ${tokenResult.tokenId}`);
      console.log(`🔗 Transaction ID: ${tokenResult.transactionId}`);
      console.log(`📋 Symbol: ${tokenConfig.symbol}`);
      console.log('');

      this.createdResources.push({ type: 'token', id: tokenResult.tokenId });
      return tokenResult;

    } catch (error) {
      console.error('❌ Token creation example failed:', error.message);
      console.log('ℹ️  This is expected if using test credentials\n');
      return null;
    }
  }

  /**
   * Example 3: Topic Management
   */
  async example3_TopicManagement() {
    console.log('📝 Example 3: Topic Management');
    console.log('==============================\n');

    try {
      // Create a topic
      console.log('📝 Creating consensus topic...');
      const topicResult = await hederaAgentKitService.createTopic({
        memo: `Example topic created at ${new Date().toISOString()}`,
        agentId: this.agent._id
      });

      console.log('✅ Topic created successfully!');
      console.log(`📋 Topic ID: ${topicResult.topicId}`);
      console.log(`🔗 Transaction ID: ${topicResult.transactionId}`);
      console.log('');

      this.createdResources.push({ type: 'topic', id: topicResult.topicId });

      // Submit a message to the topic
      console.log('📤 Submitting message to topic...');
      const message = {
        type: 'example_message',
        content: 'Hello from Hedera Agent Kit!',
        timestamp: new Date().toISOString(),
        agent: this.agent.name
      };

      const messageResult = await hederaAgentKitService.submitTopicMessage({
        topicId: topicResult.topicId,
        message: JSON.stringify(message),
        agentId: this.agent._id
      });

      console.log('✅ Message submitted successfully!');
      console.log(`📋 Topic ID: ${messageResult.topicId}`);
      console.log(`🔗 Message Transaction ID: ${messageResult.transactionId}`);
      console.log('📤 Message:', JSON.stringify(message, null, 2));
      console.log('');

      return topicResult;

    } catch (error) {
      console.error('❌ Topic management example failed:', error.message);
      console.log('ℹ️  This is expected if using test credentials\n');
      return null;
    }
  }

  /**
   * Example 4: Evaluation System Workflow
   */
  async example4_EvaluationWorkflow() {
    console.log('🎯 Example 4: Evaluation System Workflow');
    console.log('=========================================\n');

    try {
      // Step 1: Create evaluation topic
      console.log('📋 Step 1: Creating evaluation topic...');
      const evaluationData = {
        company: 'TechCorp Inc',
        postId: 'senior-dev-2024',
        candidateName: 'Alice Johnson',
        candidateId: 'candidate-alice-001',
        agentId: this.agent._id
      };

      const evalTopicResult = await hederaAgentKitService.createEvaluationTopic(evaluationData);
      
      console.log('✅ Evaluation topic created!');
      console.log(`📋 Topic ID: ${evalTopicResult.topicId}`);
      console.log(`🏢 Company: ${evaluationData.company}`);
      console.log(`👤 Candidate: ${evaluationData.candidateName}`);
      console.log(`📝 Memo: ${evalTopicResult.topicMemo}`);
      console.log('');

      this.createdResources.push({ type: 'evaluation', id: evalTopicResult.topicId });

      // Step 2: Submit evaluation message
      console.log('📤 Step 2: Submitting evaluation message...');
      const evaluation = {
        passed: true,
        score: 88,
        feedback: 'Excellent technical skills and strong problem-solving abilities. Good cultural fit for the team.',
        interviewNotes: 'Candidate demonstrated deep knowledge of system design and showed great communication skills during the technical interview.'
      };

      const evalMessageResult = await hederaAgentKitService.submitEvaluationMessage({
        topicId: evalTopicResult.topicId,
        agentId: this.agent._id,
        evaluation
      });

      console.log('✅ Evaluation message submitted!');
      console.log(`📋 Topic ID: ${evalMessageResult.topicId}`);
      console.log(`🔗 Message ID: ${evalMessageResult.messageId}`);
      console.log(`✅ Result: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 Score: ${evaluation.score}`);
      console.log(`💬 Feedback: ${evaluation.feedback}`);
      console.log('');

      // Step 3: Get evaluation topic details
      console.log('🔍 Step 3: Retrieving evaluation topic details...');
      const topicDetails = await hederaAgentKitService.getEvaluationTopic(evalTopicResult.topicId);
      
      console.log('✅ Topic details retrieved!');
      console.log(`📊 Status: ${topicDetails.data.status}`);
      console.log(`📝 Evaluations count: ${topicDetails.data.evaluations.length}`);
      if (topicDetails.data.finalResult) {
        console.log(`🎯 Final Result: ${topicDetails.data.finalResult.recommendation}`);
        console.log(`📊 Overall Score: ${topicDetails.data.finalResult.overallScore}`);
      }
      console.log('');

      // Step 4: List all evaluation topics for the company
      console.log('📋 Step 4: Listing evaluation topics for company...');
      const topicsList = await hederaAgentKitService.getEvaluationTopics({
        company: evaluationData.company
      });

      console.log('✅ Evaluation topics list retrieved!');
      console.log(`📊 Total topics found: ${topicsList.data.length}`);
      topicsList.data.forEach((topic, index) => {
        console.log(`   ${index + 1}. ${topic.candidateName} - ${topic.status} (${topic.evaluations.length} evaluations)`);
      });
      console.log('');

      return evalTopicResult;

    } catch (error) {
      console.error('❌ Evaluation workflow example failed:', error.message);
      console.log('ℹ️  This is expected if using test credentials\n');
      return null;
    }
  }

  /**
   * Example 5: Error Handling
   */
  async example5_ErrorHandling() {
    console.log('🧪 Example 5: Error Handling');
    console.log('============================\n');

    // Test 1: Missing agent ID
    console.log('🧪 Test 1: Missing agent ID...');
    try {
      await hederaAgentKitService.getAvailableTools({});
      console.log('❌ Should have thrown error');
    } catch (error) {
      console.log('✅ Correctly handled missing agentId:', error.message);
    }

    // Test 2: Invalid agent ID
    console.log('🧪 Test 2: Invalid agent ID...');
    try {
      await hederaAgentKitService.getAvailableTools({ agentId: 'invalid-id' });
      console.log('❌ Should have thrown error');
    } catch (error) {
      console.log('✅ Correctly handled invalid agentId:', error.message);
    }

    // Test 3: Missing required parameters
    console.log('🧪 Test 3: Missing required parameters...');
    try {
      await hederaAgentKitService.createFungibleToken({ agentId: this.agent._id });
      console.log('❌ Should have thrown error');
    } catch (error) {
      console.log('✅ Correctly handled missing parameters:', error.message);
    }

    console.log('');
  }

  /**
   * Run all examples
   */
  async runAllExamples() {
    const startTime = Date.now();
    
    console.log('🌟 Hedera Agent Kit Service Examples');
    console.log('====================================\n');

    try {
      await this.initialize();

      // Run all examples
      await this.example1_BasicOperations();
      await this.example2_TokenCreation();
      await this.example3_TopicManagement();
      await this.example4_EvaluationWorkflow();
      await this.example5_ErrorHandling();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('🎉 All examples completed successfully!');
      console.log(`⏱️  Total execution time: ${duration} seconds`);
      console.log('====================================\n');

      // Show created resources
      if (this.createdResources.length > 0) {
        console.log('📋 Created Resources:');
        this.createdResources.forEach(resource => {
          console.log(`   - ${resource.type}: ${resource.id}`);
        });
        console.log('');
      }

    } catch (error) {
      console.error('💥 Examples failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up created resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up example resources...');
    
    try {
      // Clean up agent if created during example
      const agentToClean = this.createdResources.find(r => r.type === 'agent');
      if (agentToClean) {
        await AgentModel.findByIdAndDelete(agentToClean.id);
        console.log('🗑️  Cleaned up example agent');
      }

      // Clean up evaluation topics if created
      const EvaluationTopicModel = require('../models/EvaluationTopic');
      const evaluationsToClean = this.createdResources.filter(r => r.type === 'evaluation');
      for (const evaluation of evaluationsToClean) {
        await EvaluationTopicModel.findOneAndDelete({ topicId: evaluation.id });
        console.log(`🗑️  Cleaned up evaluation topic: ${evaluation.id}`);
      }

      // Close MongoDB connection
      await mongoose.connection.close();
      console.log('✅ Cleanup completed\n');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  const examples = new HederaAgentKitExample();
  examples.runAllExamples()
    .then(() => {
      console.log('✨ Example execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Example execution failed:', error);
      process.exit(1);
    });
}

module.exports = HederaAgentKitExample;