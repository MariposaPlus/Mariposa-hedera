require("dotenv").config();
const { 
  HederaLangchainToolkit, 
  AgentMode, 
  coreHTSPluginToolNames, 
  coreConsensusPluginToolNames, 
  coreQueriesPluginToolNames,
  coreQueriesPlugin,
  coreHTSPlugin,
  coreConsensusPlugin
} = require('hedera-agent-kit');
const { Client, PrivateKey, PublicKey, TransferTransaction, Hbar, AccountId, TokenTransferTransaction } = require('@hashgraph/sdk');
const AgentModel = require('../models/Agent');
const EvaluationTopicModel = require('../models/EvaluationTopic');

// Lazy client initialization
let client = null;
let clientInitialized = false;

/**
 * Get or initialize Hedera client
 * @returns {Client|null} Hedera client instance
 */
const getClient = () => {
  if (!client && !clientInitialized) {
    try {
      if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
        console.warn('⚠️  Hedera Tools: Environment variables not set. Functionality will be limited.');
        clientInitialized = true;
        return null;
      }
      
      client = Client.forTestnet().setOperator(
        process.env.HEDERA_ACCOUNT_ID,
        PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY),
      );
      
      // Set network timeout for faster response
      client.setNetworkTimeout(10000);
      
      clientInitialized = true;
      console.log('✅ Hedera Tools client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Hedera Tools client:', error.message);
      clientInitialized = true;
      return null;
    }
  }
  return client;
};

// Extract the specific tools from hedera-agent-kit
const {
  CREATE_FUNGIBLE_TOKEN_TOOL,
} = coreHTSPluginToolNames;

const {
  CREATE_TOPIC_TOOL,
  SUBMIT_TOPIC_MESSAGE_TOOL,
} = coreConsensusPluginToolNames;

const {
  GET_HBAR_BALANCE_QUERY_TOOL,
} = coreQueriesPluginToolNames;

class HederaAgentKitService {
  /**
   * Helper method to determine if ID is Hedera account ID or MongoDB ObjectID
   * @param {string} id - The ID to check
   * @returns {boolean} True if Hedera account ID, false if ObjectID
   */
  isHederaAccountId(id) {
    // Hedera account ID pattern: 0.0.xxxxxx
    return /^0\.0\.\d+$/.test(id);
  }

  /**
   * Find agent by ID (supports both Hedera account ID and MongoDB ObjectID)
   * @param {string} agentId - The agent's ID
   * @param {boolean} selectPrivateKey - Whether to select private key field
   * @returns {Object} Agent document
   */
  async findAgentById(agentId, selectPrivateKey = false) {
    let query;
    
    if (this.isHederaAccountId(agentId)) {
      // Use Hedera account ID
      query = AgentModel.findOne({ hederaAccountId: agentId });
    } else {
      // Use MongoDB ObjectID
      query = AgentModel.findById(agentId);
    }
    
    if (selectPrivateKey) {
      query = query.select('+hederaPrivateKey');
    }
    
    return await query;
  }

  /**
   * Helper function to create agent-specific Hedera toolkit
   * @param {string} agentId - Agent ID (Hedera account ID or MongoDB ObjectID)
   * @returns {Object} Agent and toolkit instance
   */
  async createAgentToolkit(agentId) {
    console.log(agentId,"..........")
    const agent = await this.findAgentById(agentId, true);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Ensure agent has Hedera credentials
    if (!agent.hederaAccountId || !agent.hederaPrivateKey) {
      throw new Error('Agent does not have Hedera credentials configured');
    }

    // Decrypt private key using the helper method
    const privateKey = await this.getDecryptedPrivateKey(agent);

    // Determine network from environment
    const network = process.env.HEDERA_NETWORK || 'testnet';
    let agentClient;

    if (network === 'mainnet') {
      agentClient = Client.forMainnet();
    } else {
      agentClient = Client.forTestnet();
    }// Create client with agent's credentials
    // Create the private key object (now properly decrypted)
    let hederaPrivateKey;
    try {
      // Try DER format first (most common for Hedera)
      hederaPrivateKey = PrivateKey.fromStringDer(privateKey);
    } catch (error1) {
      try {
        // Then try standard format
        hederaPrivateKey = PrivateKey.fromString(privateKey);
      } catch (error2) {
        // Finally try ECDSA format
        hederaPrivateKey = PrivateKey.fromStringECDSA(privateKey);
      }
    }
    console.log(agent.hederaAccountId, hederaPrivateKey,"..........")
    // Set operator with the successfully parsed private key
    agentClient.setOperator(agent.hederaAccountId, hederaPrivateKey);

    // Set default fees for better performance
    try {
      const { Hbar } = require('@hashgraph/sdk');
      agentClient.setDefaultMaxTransactionFee(new Hbar(100));
      agentClient.setDefaultMaxQueryPayment(new Hbar(50));
    } catch (error) {
      // Ignore if these methods don't exist in this version
      console.warn('⚠️  Could not set default fees:', error.message);
    }

    // Create toolkit for this specific agent
    const agentToolkit = new HederaLangchainToolkit({
      client: agentClient,
      configuration: {
        tools: [
          CREATE_TOPIC_TOOL,
          SUBMIT_TOPIC_MESSAGE_TOOL,
          CREATE_FUNGIBLE_TOKEN_TOOL,
          GET_HBAR_BALANCE_QUERY_TOOL,
        ],
        plugins: [coreHTSPlugin, coreConsensusPlugin, coreQueriesPlugin],
        context: {
          mode: AgentMode.AUTONOMOUS,
        },
      },
    });

    return { agent, toolkit: agentToolkit, client: agentClient };
  }

  /**
   * Create a fungible token directly using the toolkit
   * @param {Object} params - Token creation parameters
   * @returns {Object} Token creation result
   */
  async createFungibleToken({ name, symbol, decimals = 2, initialSupply = 1000, treasuryAccount, agentId }) {
    try {
      if (!name || !symbol) {
        throw new Error("Token name and symbol are required");
      }

      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      // Create agent-specific toolkit
      const { toolkit: agentToolkit } = await this.createAgentToolkit(agentId);
      
      // Get the tools from the agent's toolkit
      const tools = agentToolkit.getTools();
      const createTokenTool = tools.find(tool => tool.name === 'create_fungible_token_tool');
      
      if (!createTokenTool) {
        throw new Error("Create token tool not found");
      }

      // Call the tool directly without LLM
      console.log('Creating token with params:', {
        tokenName: name,
        tokenSymbol: symbol,
        decimals,
        initialSupply
      });
      
      const result = await createTokenTool._call({
        tokenName: name,
        tokenSymbol: symbol,
        decimals,
        initialSupply,
        treasuryAccountId: treasuryAccount || process.env.HEDERA_ACCOUNT_ID
      });

      return {
        success: true,
        tokenId: result.tokenId,
        transactionId: result.transactionId,
        message: `Fungible token ${symbol} created successfully`
      };

    } catch (error) {
      throw new Error(`Token creation failed: ${error.message}`);
    }
  }

  /**
   * Create a consensus topic
   * @param {Object} params - Topic creation parameters
   * @returns {Object} Topic creation result
   */
  async createTopic({ memo, adminKey, submitKey, agentId }) {
    try {
      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      // Create agent-specific toolkit
      const { toolkit: agentToolkit } = await this.createAgentToolkit(agentId);

      // Get the tools from the agent's toolkit
      const tools = agentToolkit.getTools();
      const createTopicTool = tools.find(tool => tool.name === 'create_topic_tool');

      if (!createTopicTool) {
        throw new Error("Create topic tool not found");
      }

      // Prepare topic parameters
      const topicParams = {
        topicMemo: memo || `Topic created at ${new Date().toISOString()}`
      };

      // Add keys if provided
      if (adminKey) {
        topicParams.adminKey = PublicKey.fromString(adminKey);
      }
      if (submitKey) {
        topicParams.submitKey = PublicKey.fromString(submitKey);
      }

      // Call the tool directly without LLM
      const result = await createTopicTool._call(topicParams);

      return {
        success: true,
        topicId: result.topicId,
        transactionId: result.transactionId,
        message: "Consensus topic created successfully"
      };

    } catch (error) {
      throw new Error(`Topic creation failed: ${error.message}`);
    }
  }

  /**
   * Submit a message to a consensus topic
   * @param {Object} params - Message submission parameters
   * @returns {Object} Message submission result
   */
  async submitTopicMessage({ topicId, message, agentId }) {
    try {
      if (!topicId || !message) {
        throw new Error("Topic ID and message are required");
      }

      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      // Create agent-specific toolkit
      const { toolkit: agentToolkit } = await this.createAgentToolkit(agentId);

      // Get the tools from the agent's toolkit
      const tools = agentToolkit.getTools();
      const submitMessageTool = tools.find(tool => tool.name === 'submit_topic_message_tool');

      if (!submitMessageTool) {
        throw new Error("Submit message tool not found");
      }

      // Call the tool directly without LLM
      const result = await submitMessageTool._call({
        topicId,
        message
      });

      return {
        success: true,
        transactionId: result.transactionId,
        topicId,
        message: "Message submitted to topic successfully"
      };

    } catch (error) {
      throw new Error(`Message submission failed: ${error.message}`);
    }
  }

  /**
   * Get HBAR balance for an account
   * @param {Object} params - Balance query parameters
   * @returns {Object} Balance query result
   */
  async getHbarBalance({ accountId, agentId }) {
    try {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      // Create agent-specific toolkit
      const { toolkit: agentToolkit } = await this.createAgentToolkit(agentId);

      // Get the tools from the agent's toolkit
      const tools = agentToolkit.getTools();
      const balanceQueryTool = tools.find(tool => tool.name === 'get_hbar_balance_query_tool');

      if (!balanceQueryTool) {
        throw new Error("Balance query tool not found");
      }

      // Call the tool directly without LLM
      const result = await balanceQueryTool._call({
        accountId
      });

      return {
        success: true,
        accountId,
        balance: result.balance,
        unit: "HBAR",
        message: "Balance retrieved successfully"
      };

    } catch (error) {
      throw new Error(`Balance query failed: ${error.message}`);
    }
  }

  /**
   * Get current account balance (for the agent's account)
   * @param {Object} params - Agent balance query parameters
   * @returns {Object} Agent balance result
   */
  async getMyBalance({ agentId }) {
    try {
      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      // Create agent-specific toolkit
      const { agent, toolkit: agentToolkit } = await this.createAgentToolkit(agentId);
      const accountId = agent.hederaAccountId || agent.accountId;

      // Get the tools from the agent's toolkit
      const tools = agentToolkit.getTools();
      const balanceQueryTool = tools.find(tool => tool.name === 'get_hbar_balance_query_tool');

      if (!balanceQueryTool) {
        throw new Error("Balance query tool not found");
      }

      // Call the tool directly without LLM
      const result = await balanceQueryTool._call({
        accountId
      });

      return {
        success: true,
        accountId,
        balance: result.balance,
        unit: "HBAR",
        message: "Your balance retrieved successfully"
      };

    } catch (error) {
      throw new Error(`Balance query failed: ${error.message}`);
    }
  }

  /**
   * Get available tools information
   * @param {Object} params - Tools query parameters
   * @returns {Object} Available tools information
   */
  async getAvailableTools({ agentId }) {
    try {
      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      // Create agent-specific toolkit
      const { toolkit: agentToolkit } = await this.createAgentToolkit(agentId);
      const tools = agentToolkit.getTools();
      
      const toolsInfo = tools.map(tool => ({
        name: tool.name,
        description: tool.description || "No description available",
        parameters: tool.parameters || {}
      }));

      return {
        success: true,
        tools: toolsInfo,
        count: tools.length,
        message: "Available Hedera tools retrieved successfully"
      };

    } catch (error) {
      throw new Error(`Failed to get tools information: ${error.message}`);
    }
  }

  /**
   * Create evaluation topic for candidate pipeline
   * @param {Object} params - Evaluation topic creation parameters
   * @returns {Object} Evaluation topic creation result
   */
  async createEvaluationTopic({ company, postId, candidateName, candidateId, agentId }) {
    try {
      if (!company || !postId || !candidateName || !agentId) {
        throw new Error("Company, postId, candidateName, and agentId are required");
      }

      // Get agent and create toolkit
      const { agent, toolkit } = await this.createAgentToolkit(agentId);
      
      // Create HCS-11 compliant memo (keep it short for Hedera limits)
      const topicMemo = `eval:${company}:${postId}:${candidateName}`;

      // Get create topic tool
      const tools = toolkit.getTools();
      const createTopicTool = tools.find(tool => tool.name === 'create_topic_tool');

      if (!createTopicTool) {
        throw new Error("Create topic tool not found");
      }

      // Create the topic with agent's public key
      const publicKeyString = agent.hederaPublicKey;
      if (!publicKeyString) {
        throw new Error("Agent public key not found in database");
      }

      let agentPublicKey;
      try {
        agentPublicKey = PublicKey.fromString(publicKeyString);
      } catch (error) {
        throw new Error(`Invalid public key format in database: ${error.message}`);
      }

      const result = await createTopicTool._call({
        topicMemo: topicMemo,
        isSubmitKey: false,
        submitKey: agentPublicKey,
        adminKey: agentPublicKey
      });
      
      // Parse result as JSON
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      let topicIdString = parsedResult.topicId.shard.low + "." + parsedResult.topicId.realm.low + "." + parsedResult.topicId.num.low;
      
      // Save to database
      const evaluationTopic = new EvaluationTopicModel({
        topicId: topicIdString,
        company,
        postId,
        candidateName,
        candidateId,
        topicMemo,
        createdBy: agent.name,
        evaluations: []
      });

      await evaluationTopic.save();

      return {
        success: true,
        topicId: topicIdString,
        transactionId: parsedResult.transactionId,
        topicMemo,
        message: `Evaluation topic created for ${candidateName} at ${company}`,
        createdBy: agent.name
      };

    } catch (error) {
      throw new Error(`Failed to create evaluation topic: ${error.message}`);
    }
  }

  /**
   * Submit evaluation message to existing topic
   * @param {Object} params - Evaluation submission parameters
   * @returns {Object} Evaluation submission result
   */
  async submitEvaluationMessage({ topicId, agentId, evaluation }) {
    try {
      const { passed, score, feedback, interviewNotes } = evaluation;

      if (!topicId || !agentId || passed === undefined) {
        throw new Error("TopicId, agentId, and evaluation.passed are required");
      }

      // Get evaluation topic from database
      const evaluationTopic = await EvaluationTopicModel.findOne({ topicId });
      if (!evaluationTopic) {
        throw new Error("Evaluation topic not found");
      }

      // Get agent and create toolkit
      const { agent, toolkit } = await this.createAgentToolkit(agentId);

      // Create HCS-11 compliant evaluation message
      const hcs11Message = {
        standard: "HCS-11",
        type: "agent_validation",
        agentProfile: {
          name: agent.name,
          avatarName: agent.avatarName,
          role: agent.role,
          accountId: agent.hederaAccountId || agent.accountId
        },
        evaluation: {
          topicId,
          candidate: evaluationTopic.candidateName,
          company: evaluationTopic.company,
          postId: evaluationTopic.postId,
          result: {
            passed,
            score: score || null,
            feedback: feedback || "",
            interviewNotes: interviewNotes || ""
          },
          timestamp: new Date().toISOString()
        },
        coordinatorMessage: {
          to: "coordinator_agent",
          action: passed ? "candidate_approved" : "candidate_rejected",
          summary: `${agent.role} evaluation: ${passed ? 'PASSED' : 'FAILED'}${score ? ` (Score: ${score})` : ''}`
        }
      };

      // Get submit message tool
      const tools = toolkit.getTools();
      const submitMessageTool = tools.find(tool => tool.name === 'submit_topic_message_tool');

      if (!submitMessageTool) {
        throw new Error("Submit message tool not found");
      }

      // Submit the HCS-11 message to the topic
      const result = await submitMessageTool._call({
        topicId: topicId,
        message: JSON.stringify(hcs11Message)
      });

      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      let messageId = parsedResult.transactionId.accountId.shard.low + "." + 
                     parsedResult.transactionId.accountId.realm.low + "." + 
                     parsedResult.transactionId.accountId.num.low;

      // Update evaluation topic in database
      evaluationTopic.evaluations.push({
        agentId: agent._id,
        agentName: agent.name,
        agentRole: agent.role,
        messageId: messageId,
        evaluation: {
          passed,
          score,
          feedback,
          interviewNotes
        }
      });

      // Check if all required agents have evaluated
      const requiredAgents = await AgentModel.find({ isActive: true });
      const completedEvaluations = evaluationTopic.evaluations.length;

      if (completedEvaluations >= requiredAgents.length) {
        evaluationTopic.status = "completed";
        evaluationTopic.finalResult = evaluationTopic.calculateFinalResult();
      }

      await evaluationTopic.save();

      return {
        success: true,
        topicId: topicId,
        messageId: result.transactionId,
        agentProfile: hcs11Message.agentProfile,
        evaluation: hcs11Message.evaluation,
        coordinatorMessage: hcs11Message.coordinatorMessage,
        topicStatus: evaluationTopic.status,
        message: `HCS-11 evaluation message submitted by ${agent.name} to topic ${topicId}`
      };

    } catch (error) {
      throw new Error(`Failed to submit evaluation message: ${error.message}`);
    }
  }

  /**
   * Send agent validation message to evaluation topic
   * @param {Object} params - Validation message parameters
   * @returns {Object} Validation message result
   */
  async sendValidationMessage({ topicId, agentId, evaluation }) {
    try {
      const { passed, score, feedback, interviewNotes } = evaluation;

      if (!topicId || !agentId || passed === undefined) {
        throw new Error("TopicId, agentId, and evaluation.passed are required");
      }

      // Get evaluation topic
      const evaluationTopic = await EvaluationTopicModel.findOne({ topicId });
      if (!evaluationTopic) {
        throw new Error("Evaluation topic not found");
      }

      // Get agent and create toolkit
      const { agent, toolkit } = await this.createAgentToolkit(agentId);

      // Create HCS-11 compliant validation message
      const validationMessage = {
        standard: "HCS-11",
        type: "agent_validation",
        agentProfile: {
          name: agent.name,
          avatarName: agent.avatarName,
          role: agent.role,
          accountId: agent.hederaAccountId || agent.accountId
        },
        evaluation: {
          topicId,
          candidate: evaluationTopic.candidateName,
          company: evaluationTopic.company,
          postId: evaluationTopic.postId,
          result: {
            passed,
            score: score || null,
            feedback: feedback || "",
            interviewNotes: interviewNotes || ""
          },
          timestamp: new Date().toISOString()
        },
        coordinatorMessage: {
          to: "coordinator_agent",
          action: passed ? "candidate_approved" : "candidate_rejected",
          summary: `${agent.role} evaluation: ${passed ? 'PASSED' : 'FAILED'}${score ? ` (Score: ${score})` : ''}`
        }
      };

      // Get submit message tool
      const tools = toolkit.getTools();
      const submitMessageTool = tools.find(tool => tool.name === 'submit_topic_message_tool');

      if (!submitMessageTool) {
        throw new Error("Submit message tool not found");
      }

      // Submit the message
      const result = await submitMessageTool._call({
        topicId: topicId,
        message: JSON.stringify(validationMessage)
      });

      // Update evaluation topic in database
      evaluationTopic.evaluations.push({
        agentId: agent._id,
        agentName: agent.name,
        agentRole: agent.role,
        messageId: result.transactionId,
        evaluation: {
          passed,
          score,
          feedback,
          interviewNotes
        }
      });

      // Check if all required agents have evaluated
      const requiredAgents = await AgentModel.find({ isActive: true });
      const completedEvaluations = evaluationTopic.evaluations.length;

      if (completedEvaluations >= requiredAgents.length) {
        evaluationTopic.status = "completed";
        evaluationTopic.finalResult = evaluationTopic.calculateFinalResult();
      }

      await evaluationTopic.save();

      return {
        success: true,
        messageId: result.transactionId,
        agentProfile: validationMessage.agentProfile,
        evaluation: validationMessage.evaluation,
        coordinatorMessage: validationMessage.coordinatorMessage,
        topicStatus: evaluationTopic.status,
        message: `Validation message sent by ${agent.name} (${agent.role})`
      };

    } catch (error) {
      throw new Error(`Failed to send validation message: ${error.message}`);
    }
  }

  /**
   * Get evaluation topic details and messages
   * @param {string} topicId - Topic ID to retrieve
   * @returns {Object} Evaluation topic details
   */
  async getEvaluationTopic(topicId) {
    try {
      const evaluationTopic = await EvaluationTopicModel.findOne({ topicId })
        .populate('evaluations.agentId', 'name avatarName role');

      if (!evaluationTopic) {
        throw new Error("Evaluation topic not found");
      }

      return {
        success: true,
        data: evaluationTopic
      };

    } catch (error) {
      throw new Error(`Failed to get evaluation topic: ${error.message}`);
    }
  }

  /**
   * Get all evaluation topics for a company/post
   * @param {Object} filters - Query filters
   * @returns {Object} Evaluation topics list
   */
  async getEvaluationTopics(filters = {}) {
    try {
      const { company, postId, status } = filters;
      
      const filter = {};
      if (company) filter.company = company;
      if (postId) filter.postId = postId;
      if (status) filter.status = status;

      const evaluationTopics = await EvaluationTopicModel.find(filter)
        .populate('evaluations.agentId', 'name avatarName role')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: evaluationTopics
      };

    } catch (error) {
      throw new Error(`Failed to get evaluation topics: ${error.message}`);
    }
  }

  /**
   * Create evaluation topic for candidate assessment
   * @param {Object} params - Evaluation topic parameters
   * @returns {Object} Topic creation result
   */
  async createEvaluationTopic({ company, postId, candidateName, candidateId, agentId }) {
    try {
      if (!company || !postId || !candidateName || !agentId) {
        throw new Error("Company, postId, candidateName, and agentId are required");
      }

      // Get agent and create toolkit
      const { agent, toolkit } = await this.createAgentToolkit(agentId);
      console.log(agent);
      
      // Create HCS-11 compliant memo (keep it short for Hedera limits)
      const topicMemo = `eval:${company}:${postId}:${candidateName}`;

      // Get create topic tool
      const tools = toolkit.getTools();
      const createTopicTool = tools.find(tool => tool.name === 'create_topic_tool');

      if (!createTopicTool) {
        throw new Error("Create topic tool not found");
      }

      // Create the topic with agent's public key
      const publicKeyString = agent.hederaPublicKey;
      console.log(publicKeyString);
      if (!publicKeyString) {
        throw new Error("Agent public key not found in database");
      }

      let agentPublicKey;
      try {
        agentPublicKey = PublicKey.fromString(publicKeyString);
      } catch (error) {
        throw new Error(`Invalid public key format in database: ${error.message}`);
      }

      const result = await createTopicTool._call({
        topicMemo: topicMemo,
        isSubmitKey: false,
        submitKey: agentPublicKey,
        adminKey: agentPublicKey
      });
      
      // Parse result as JSON
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      let topicIdString = parsedResult.topicId.shard.low + "." + parsedResult.topicId.realm.low + "." + parsedResult.topicId.num.low;
      
      // Save to database
      const evaluationTopic = new EvaluationTopicModel({
        topicId: topicIdString,
        company,
        postId,
        candidateName,
        candidateId,
        topicMemo,
        createdBy: agent.name,
        evaluations: []
      });

      await evaluationTopic.save();

      console.log(`✅ Evaluation topic created: ${topicIdString} for ${candidateName} at ${company}`);

      return {
        success: true,
        topicId: topicIdString,
        transactionId: parsedResult.transactionId,
        topicMemo,
        message: `Evaluation topic created for ${candidateName} at ${company}`,
        createdBy: agent.name,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Evaluation topic creation failed:', error);
      throw new Error(`Failed to create evaluation topic: ${error.message}`);
    }
  }

  /**
   * Transfer tokens or HBAR between accounts
   * @param {Object} params - Transfer parameters
   * @param {string} params.fromAgentId - Source agent ID
   * @param {string} params.toAccountId - Destination account ID
   * @param {string|null} params.tokenId - Token ID (null for HBAR transfers)
   * @param {number} params.amount - Amount to transfer
   * @param {string} [params.memo] - Optional memo
   * @returns {Object} Transfer result
   */
  async transferToken({ fromAgentId, toAccountId, tokenId, amount, memo }) {
    try {
      console.log(fromAgentId ,toAccountId ,tokenId , amount)
      if (!fromAgentId || !toAccountId || !amount) {
        throw new Error("Agent ID, recipient account ID, and amount are required");
      }

      // Get agent and create toolkit
      const { agent, toolkit: agentToolkit, client: agentClient } = await this.createAgentToolkit(fromAgentId);
      
      console.log('Agent client status:', agentClient ? 'Defined' : 'Undefined');
      
      // Create transfer transaction (HBAR or token)
      let transferTx;
      if (tokenId === null || tokenId === undefined) {
        // HBAR transfer
        transferTx = new TransferTransaction()
          .addHbarTransfer(agent.hederaAccountId, new Hbar(-amount))
          .addHbarTransfer(toAccountId, new Hbar(amount));
      } else {
        // Token transfer
        transferTx = new TokenTransferTransaction()
          .addTokenTransfer(tokenId, agent.hederaAccountId, -amount)
          .addTokenTransfer(tokenId, toAccountId, amount);
      }
      console.log(agentClient)
      // Add memo if provided
      if (memo) {
        transferTx.setTransactionMemo(memo);
      }// Freeze and sign the transaction
      const frozenTx = await transferTx.freezeWith(agentClient);
      
      // Get the private key (properly decrypted)
      const privateKeyStr = await this.getDecryptedPrivateKey(agent);
      let privateKey;
      
      try {
        // Try DER format first (most common for Hedera)
        privateKey = PrivateKey.fromStringDer(privateKeyStr);
      } catch (error1) {
        try {
          // Then try standard format
          privateKey = PrivateKey.fromString(privateKeyStr);
        } catch (error2) {
          // Finally try ECDSA format
          privateKey = PrivateKey.fromStringECDSA(privateKeyStr);
        }
      }
      
      const signedTx = await frozenTx.sign(privateKey);
      
      // Execute the transaction
      const txResponse = await signedTx.execute(agentClient);
      const receipt = await txResponse.getReceipt(agentClient);
      
      if (tokenId === null || tokenId === undefined) {
        console.log(`✅ HBAR transfer completed: ${amount} HBAR to ${toAccountId}`);
      } else {
        console.log(`✅ Token transfer completed: ${amount} ${tokenId} to ${toAccountId}`);
      }
      
      return {
        success: true,
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString(),
        fromAccount: agent.hederaAccountId,
        toAccount: toAccountId,
        amount: amount,
        tokenId: tokenId,
        memo: memo || null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Token transfer failed:', error);
      throw new Error(`Token transfer failed: ${error.message}`);
    }
  }

  /**
   * Parse transfer details from user message using LLM
   * @param {string} message - User's transfer message
   * @param {string} agentId - Agent ID for context
   * @returns {Object} Parsed transfer details
   */
  async parseTransferRequest(message, agentId) {
    try {
      // TODO: Replace with LLM-based parsing for better accuracy
      console.warn('⚠️ Hedera Agent Kit Service still uses regex parsing. Consider upgrading to LLM-based parsing.');
      const parseResult = this.extractTransferDetails(message);
      
      // Validate the agent exists
      const agent = await this.findAgentById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }
      
      return {
        success: true,
        details: parseResult,
        fromAgent: {
          id: agent._id,
          name: agent.name,
          accountId: agent.hederaAccountId
        },
        parsedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Transfer parsing failed:', error);
      throw new Error(`Transfer parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract transfer details from message using regex patterns
   * @param {string} message - User message
   * @returns {Object} Extracted details
   */
  extractTransferDetails(message) {
    const lowerMessage = message.toLowerCase();
    
    // Extract amount and currency
    const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(hbar|usdc|usdt|btc|eth|sei)/i);
    
    // Extract recipient (account ID or description)
    const accountIdMatch = message.match(/(0\.0\.\d+)/);
    const recipientMatch = message.match(/to\s+(?:my\s+)?(friend|wallet|account|address)(?:'s)?(?:\s+wallet)?/i);
    
    // Extract memo
    const memoMatch = message.match(/(?:memo|note|message):\s*["']([^"']+)["']/i);
    
    let amount = null;
    let currency = 'HBAR'; // Default
    let recipient = null;
    let recipientType = 'account_id';
    let memo = null;
    
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
      currency = amountMatch[2].toUpperCase();
    }
    
    if (accountIdMatch) {
      recipient = accountIdMatch[1];
      recipientType = 'account_id';
    } else if (recipientMatch) {
      recipient = recipientMatch[1];
      recipientType = 'description';
    }
    
    if (memoMatch) {
      memo = memoMatch[1];
    }
    
    // Determine if it's HBAR or token transfer
    const isHbarTransfer = currency === 'HBAR';
    const tokenId = isHbarTransfer ? null : this.getTokenId(currency);
    
    return {
      amount,
      currency,
      recipient,
      recipientType,
      memo,
      isHbarTransfer,
      tokenId,
      needsRecipientResolution: recipientType === 'description',
      extracted: {
        amountMatch: !!amountMatch,
        recipientMatch: !!recipientMatch || !!accountIdMatch,
        memoMatch: !!memoMatch
      }
    };
  }

  /**
   * Get token ID for currency symbol (placeholder - would need actual token registry)
   * @param {string} currency - Currency symbol
   * @returns {string|null} Token ID
   */
  getTokenId(currency) {
    // Placeholder token IDs for SEI testnet
    const tokenRegistry = {
      'USDC': '0.0.12345', // Placeholder
      'USDT': '0.0.12346', // Placeholder
      'BTC': '0.0.12347',  // Placeholder
      'ETH': '0.0.12348',  // Placeholder
      'SEI': null // Native token
    };
    
    return tokenRegistry[currency] || null;
  }

  /**
   * Helper to get decrypted private key
   * @param {Object} agent - Agent object
   * @returns {string} Decrypted private key
   */
  async getDecryptedPrivateKey(agent) {
    let privateKey = agent.hederaPrivateKey;
    
    // If the private key contains ':', it's in the iv:encrypted format
    if (privateKey && privateKey.includes(':')) {
      try {
        const crypto = require('crypto');
        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key';
        
        // Create a 32-byte key from the password using SHA-256
        const keyBuffer = crypto.createHash('sha256').update(encryptionKey).digest();
        
        // Split the encrypted data
        const parts = privateKey.split(':');
        if (parts.length !== 2) {
          throw new Error('Invalid encrypted private key format. Expected format: iv:encrypted');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        // Create decipher using the correct modern API
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        console.log('✅ Decrypted private key successfully');
        return decrypted;
      } catch (decryptError) {
        console.error('❌ Failed to decrypt private key:', decryptError);
        throw new Error(`Private key decryption failed: ${decryptError.message}`);
      }
    }
    
    // If no ':', assume it's already in plain text
    return privateKey;
  }

  /**
   * Get client information
   * @returns {Object} Client status and info
   */
  getClientInfo() {
    return {
      isInitialized: clientInitialized,
      hasClient: !!client,
      network: 'testnet'
    };
  }
}

const hederaAgentKitService = new HederaAgentKitService();
module.exports = hederaAgentKitService;