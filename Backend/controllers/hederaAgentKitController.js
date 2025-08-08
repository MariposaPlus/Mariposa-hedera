const hederaAgentKitService = require('../services/hederaAgentKitService');

/**
 * Create a fungible token directly using the toolkit
 */
exports.createFungibleToken = async (req, res) => {
  try {
    const { name, symbol, decimals = 2, initialSupply = 1000, treasuryAccount, agentId } = req.body;

    const result = await hederaAgentKitService.createFungibleToken({
      name,
      symbol,
      decimals,
      initialSupply,
      treasuryAccount,
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Token creation failed",
      details: error.message,
    });
  }
};

/**
 * Create a consensus topic
 */
exports.createTopic = async (req, res) => {
  try {
    const { memo, adminKey, submitKey, agentId } = req.body;

    const result = await hederaAgentKitService.createTopic({
      memo,
      adminKey,
      submitKey,
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Topic creation failed",
      details: error.message,
    });
  }
};

/**
 * Submit a message to a consensus topic
 */
exports.submitTopicMessage = async (req, res) => {
  try {
    const { topicId, message, agentId } = req.body;

    const result = await hederaAgentKitService.submitTopicMessage({
      topicId,
      message,
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Message submission failed",
      details: error.message,
    });
  }
};

/**
 * Get HBAR balance for an account
 */
exports.getHbarBalance = async (req, res) => {
  try {
    const { accountId, agentId } = req.query;

    const result = await hederaAgentKitService.getHbarBalance({
      accountId,
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Balance query failed",
      details: error.message,
    });
  }
};

/**
 * Get current account balance (for the agent's account)
 */
exports.getMyBalance = async (req, res) => {
  try {
    const { agentId } = req.query;

    const result = await hederaAgentKitService.getMyBalance({
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Balance query failed",
      details: error.message,
    });
  }
};

/**
 * Get available tools information
 */
exports.getAvailableTools = async (req, res) => {
  try {
    const { agentId } = req.query;

    const result = await hederaAgentKitService.getAvailableTools({
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to get tools information",
      details: error.message,
    });
  }
};

/**
 * Create evaluation topic for candidate pipeline
 * POST /hedera-tools/create-evaluation-topic
 */
exports.createEvaluationTopic = async (req, res) => {
  try {
    const { company, postId, candidateName, candidateId, agentId } = req.body;

    const result = await hederaAgentKitService.createEvaluationTopic({
      company,
      postId,
      candidateName,
      candidateId,
      agentId
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to create evaluation topic",
      details: error.message,
    });
  }
};

/**
 * Submit evaluation message to existing topic
 * POST /hedera-tools/submit-evaluation-message
 */
exports.submitEvaluationMessage = async (req, res) => {
  try {
    const { topicId, agentId, evaluation } = req.body;

    const result = await hederaAgentKitService.submitEvaluationMessage({
      topicId,
      agentId,
      evaluation
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to submit evaluation message",
      details: error.message,
    });
  }
};

/**
 * Send agent validation message to evaluation topic
 * POST /hedera-tools/send-validation-message
 */
exports.sendValidationMessage = async (req, res) => {
  try {
    const { topicId, agentId, evaluation } = req.body;

    const result = await hederaAgentKitService.sendValidationMessage({
      topicId,
      agentId,
      evaluation
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to send validation message",
      details: error.message,
    });
  }
};

/**
 * Get evaluation topic details and messages
 * GET /hedera-tools/evaluation-topic/:topicId
 */
exports.getEvaluationTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    const result = await hederaAgentKitService.getEvaluationTopic(topicId);

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to get evaluation topic",
      details: error.message,
    });
  }
};

/**
 * Get all evaluation topics for a company/post
 * GET /hedera-tools/evaluation-topics
 */
exports.getEvaluationTopics = async (req, res) => {
  try {
    const { company, postId, status } = req.query;
    
    const result = await hederaAgentKitService.getEvaluationTopics({
      company,
      postId,
      status
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to get evaluation topics",
      details: error.message,
    });
  }
};

/**
 * Get Hedera client information
 * GET /hedera-tools/client-info
 */
exports.getClientInfo = async (req, res) => {
  try {
    const clientInfo = hederaAgentKitService.getClientInfo();
    
    res.json({
      success: true,
      data: clientInfo,
      message: "Client information retrieved successfully"
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to get client information",
      details: error.message,
    });
  }
};