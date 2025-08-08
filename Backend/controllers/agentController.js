const { validationResult } = require('express-validator');
const Agent = require('../models/Agent');
const Memory = require('../models/Memory');
const Strategy = require('../models/Strategy');
const WalletService = require('../services/walletService');
const SeiMarketDataService = require('../services/seiMarketDataService');
const agentHederaUtils = require('../utils/agentHederaUtils');
const axios = require('axios');
const Together = require('together-ai').default;
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// @desc    Create a new agent
// @route   POST /api/agents
// @access  Public (should be protected in production)
const createAgent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      userId,
      primaryStrategy,
      configuration
    } = req.body;

    // Check if agent name already exists for this user
    const existingAgent = await Agent.findOne({ name, userId: actualUserId, isActive: true });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this name already exists'
      });
    }

    const agent = new Agent({
      name,
      description,
      userId,
      primaryStrategy,
      configuration: {
        ...configuration,
        // Set defaults if not provided
        defaultBudget: configuration?.defaultBudget || 500,
        frequency: configuration?.frequency || 'monthly',
        riskTolerance: configuration?.riskTolerance || 'moderate',
        preferredTokens: configuration?.preferredTokens || ['BTC', 'ETH', 'SEI'],
        maxPositionSize: configuration?.maxPositionSize || 1000,
        stopLossPercentage: configuration?.stopLossPercentage || 10,
        takeProfitPercentage: configuration?.takeProfitPercentage || 20
      }
    });

    const savedAgent = await agent.save();

    res.status(201).json({
      success: true,
      data: {
        agent: savedAgent,
        message: `${primaryStrategy} agent "${name}" created successfully`
      }
    });

  } catch (error) {
    console.error('Agent Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message
    });
  }
};

/**
 * Get agent type-specific configuration
 * @param {string} agentType - Type of agent (strategy, actions, information, general)
 * @param {string} name - Agent name
 * @param {string} primaryStrategy - Primary strategy (for strategy agents)
 * @param {Object} userConfig - User-provided configuration
 * @returns {Object} Type-specific configuration
 */
const getAgentTypeConfiguration = (agentType, name, primaryStrategy, userConfig) => {
  const baseConfig = {
    customPrompt: `I am ${name}, an AI agent specialized in blockchain operations on the Hedera network.`
  };

  switch (agentType) {
    case 'strategy':
      return {
        description: `AI trading agent specialized in ${primaryStrategy} strategy operations on Hedera network`,
        avatarName: `${name.split(' ')[0]} Trader`,
        role: 'Trading Strategy Agent',
        configuration: {
          ...baseConfig,
          defaultBudget: 500,
          riskTolerance: 'moderate',
          timeframe: '1h',
          stopLoss: 5,
          takeProfit: 10,
          maxOpenPositions: 3,
          customPrompt: `I am ${name}, a specialized trading agent focused on ${primaryStrategy} strategy. I help users execute and manage their trading strategies on the Hedera network with proper risk management.`
        }
      };

    case 'actions':
      return {
        description: `AI agent specialized in executing blockchain actions and transactions on Hedera network`,
        avatarName: `${name.split(' ')[0]} Executor`,
        role: 'Action Execution Agent',
        configuration: {
          ...baseConfig,
          supportedActions: ['transfer', 'swap', 'stake', 'lend', 'mint', 'burn'],
          executionMode: 'guided', // 'guided' or 'autonomous'
          confirmationRequired: true,
          maxTransactionValue: 1000, // HBAR
          customPrompt: `I am ${name}, a specialized action execution agent. I help users safely execute blockchain transactions including transfers, swaps, staking, and other DeFi operations on the Hedera network. I always prioritize security and provide clear guidance.`
        }
      };

    case 'information':
      return {
        description: `AI agent specialized in providing market data, analysis, and blockchain information`,
        avatarName: `${name.split(' ')[0]} Analyst`,
        role: 'Information & Analysis Agent',
        configuration: {
          ...baseConfig,
          informationTypes: ['market_data', 'token_analysis', 'defi_protocols', 'network_stats'],
          updateFrequency: 'real_time',
          dataSource: 'multiple',
          customPrompt: `I am ${name}, an information and analysis agent. I provide up-to-date market data, token analysis, DeFi protocol information, and network statistics for the Hedera ecosystem. I help users make informed decisions with accurate, timely data.`
        }
      };

    case 'feedback':
      return {
        description: `AI agent specialized in providing feedback, recommendations, and performance analysis`,
        avatarName: `${name.split(' ')[0]} Advisor`,
        role: 'Feedback & Advisory Agent',
        configuration: {
          ...baseConfig,
          feedbackTypes: ['performance_analysis', 'strategy_recommendations', 'risk_assessment', 'portfolio_review'],
          analysisDepth: 'comprehensive',
          customPrompt: `I am ${name}, a feedback and advisory agent. I analyze user actions, strategies, and portfolio performance to provide constructive feedback and actionable recommendations for improving results on the Hedera network.`
        }
      };

    case 'general':
    default:
      return {
        description: `AI agent for general blockchain operations and assistance on Hedera network`,
        avatarName: `${name.split(' ')[0]} Assistant`,
        role: 'General Purpose Agent',
        configuration: {
          ...baseConfig,
          capabilities: ['basic_actions', 'information_lookup', 'guidance', 'education'],
          interactionMode: 'conversational',
          customPrompt: `I am ${name}, a general-purpose AI agent for the Hedera blockchain. I can help with various blockchain operations, provide information, and assist with understanding the Hedera ecosystem.`
        }
      };
  }
};

// @desc    Create a simple agent with Hedera wallet (minimal configuration)
// @route   POST /api/agents/simple
// @access  Public (should be protected in production)
const createSimpleAgent = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      name,
      userId,
      initialBalance = 10
    } = req.body;

    console.log(`🚀 Creating simple agent: ${name} for user: ${userId}`);

    // Verify user exists or create new user - handle both ObjectId and email
    const User = require('../models/User');
    let existingUser;
    
    // Check if userId is an email (contains @) or ObjectId
    if (userId.includes('@')) {
      // Find user by email
      existingUser = await User.findOne({ email: userId });
    } else {
      // Find user by ObjectId
      try {
        existingUser = await User.findById(userId);
      } catch (error) {
        // If ObjectId is invalid, try finding by email as fallback
        existingUser = await User.findOne({ email: userId });
      }
    }
    
    let actualUserId;
    
    if (!existingUser) {
      // Create user if it doesn't exist
      console.log(`👤 Creating new user: ${userId}`);
      
      const newUserData = {
        name: userId.includes('@') ? userId.split('@')[0] : userId,
        email: userId.includes('@') ? userId : `${userId}@example.com`,
        userType: 'human',
        isActive: true,
        createdAt: new Date()
      };
      
      const newUser = new User(newUserData);
      await newUser.save();
      actualUserId = newUser._id;
      
      console.log(`✅ User created successfully with ID: ${actualUserId}`);
    } else {
      // Use the actual user ObjectId for further operations
      actualUserId = existingUser._id;
      console.log(`✅ Using existing user with ID: ${actualUserId}`);
    }

    // Check if agent name already exists for this user
    const existingAgent = await Agent.findOne({ name, userId: actualUserId, isActive: true });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this name already exists for this user'
      });
    }

    // Step 1: Create the agent with minimal information
    const agentData = {
      name,
      description: `Simple AI agent for blockchain operations`,
      userId: actualUserId,
      agentUuid: uuidv4(),
      agentType: 'general',
      primaryStrategy: null,
      configuration: {
        hederaEnabled: true,
        customPrompt: `I am ${name}, a simple AI agent for blockchain operations.`
      },
      avatarName: `${name} Bot`,
      role: 'Simple Agent',
      isActive: true,
      lastInteraction: new Date(),
      createdAt: new Date()
    };

    console.log('📝 Creating simple agent document...');
    const agent = new Agent(agentData);
    const savedAgent = await agent.save();
    
    console.log(`✅ Simple agent created: ${savedAgent._id}`);

    // Step 2: Create Hedera wallet
    console.log('🔑 Creating Hedera wallet...');
    
    const hederaCredentialOptions = {
      useOperatorCredentials: false,
      createNewAccount: true,
      initialBalance: initialBalance,
      encryptPrivateKey: true,
      strictMode: false
    };

    let hederaResult;
    try {
      hederaResult = await agentHederaUtils.assignHederaCredentials(
        savedAgent._id, 
        hederaCredentialOptions
      );
      console.log('✅ Hedera wallet created successfully');
    } catch (hederaError) {
      console.error('❌ Failed to create Hedera wallet:', hederaError);
      
      // Graceful fallback - keep agent without Hedera credentials
      hederaResult = {
        success: false,
        error: hederaError.message,
        gracefulFallback: true
      };
    }

    // Step 3: Get the final agent
    const finalAgent = await Agent.findById(savedAgent._id).select('-hederaPrivateKey');
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`🎉 Simple agent creation completed in ${duration}ms`);

    // Get user information for response
    const userInfo = existingUser || await User.findById(actualUserId);
    
    res.status(201).json({
      success: true,
      data: {
        agent: {
          _id: finalAgent._id,
          name: finalAgent.name,
          agentUuid: finalAgent.agentUuid,
          userId: finalAgent.userId,
          agentType: finalAgent.agentType,
          role: finalAgent.role,
          hederaAccountId: finalAgent.hederaAccountId,
          hederaPublicKey: finalAgent.hederaPublicKey,
          isActive: finalAgent.isActive,
          createdAt: finalAgent.createdAt
        },
        user: {
          _id: userInfo._id,
          name: userInfo.name,
          email: userInfo.email,
          userType: userInfo.userType,
          isActive: userInfo.isActive,
          createdAt: userInfo.createdAt
        },
        wallet: {
          enabled: hederaResult.success || false,
          accountId: hederaResult.hedera?.accountId || null,
          publicKey: hederaResult.hedera?.publicKey || null,
          network: 'testnet',
          initialBalance: hederaResult.hedera?.initialBalance || null,
          transactionId: hederaResult.hedera?.transactionId || null,
          error: hederaResult.error || null
        },
        metadata: {
          creationTime: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      },
      message: hederaResult.success 
        ? 'Simple agent with Hedera wallet created successfully' 
        : 'Simple agent created, but wallet creation failed'
    });

  } catch (error) {
    console.error('💥 Create Simple Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create simple agent',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// @desc    Create a new agent with dedicated Hedera wallet (full configuration)
// @route   POST /api/agents/hedera
// @access  Public (should be protected in production)
const createAgentWithHedera = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      name,
      description,
      userId,
      agentType = 'general',
      primaryStrategy = 'custom',
      configuration = {},
      hederaOptions = {}
    } = req.body;

    console.log(`🚀 Creating Hedera agent: ${name} (${agentType}) for user: ${userId}`);

    // Validate userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Verify user exists - handle both ObjectId and email
    const User = require('../models/User');
    let existingUser;
    console.log('🔧 User ID:', userId.includes('@'));
    // Check if userId is an email (contains @) or ObjectId
    if (userId.includes('@')) {
      // Find user by email
      existingUser = await User.findOne({ email: userId });
    } else {
      // Find user by ObjectId
      try {
        existingUser = await User.findById(userId);
      } catch (error) {
        // If ObjectId is invalid, try finding by email as fallback
        existingUser = await User.findOne({ email: userId });
      }
    }
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please create user first.'
      });
    }
    
    // Use the actual user ObjectId for further operations
    const actualUserId = existingUser._id;

    // Check if agent name already exists for this user
    const existingAgent = await Agent.findOne({ name, userId:actualUserId, isActive: true });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this name already exists for this user'
      });
    }

    // Generate type-specific defaults
    const agentTypeConfig = getAgentTypeConfiguration(agentType, name, primaryStrategy, configuration);

    // Step 1: Create the agent with basic information
    const agentData = {
      name,
      description: description || agentTypeConfig.description,
      userId: actualUserId,
      agentUuid: uuidv4(),
      agentType,
      primaryStrategy: agentType === 'strategy' ? primaryStrategy : null,
      configuration: {
        ...agentTypeConfig.configuration,
        ...configuration, // Allow overrides
        hederaEnabled: true, // Mark as Hedera-enabled
      },
      avatarName: configuration?.avatarName || agentTypeConfig.avatarName,
      role: configuration?.role || agentTypeConfig.role,
      isActive: true,
      lastInteraction: new Date(),
      createdAt: new Date()
    };

    console.log('📝 Creating agent document...');
    const agent = new Agent(agentData);
    const savedAgent = await agent.save();
    
    console.log(`✅ Agent created: ${savedAgent._id}`);

    // Step 2: Create Hedera wallet and assign credentials
    console.log('🔑 Creating Hedera wallet...');
    
    const hederaCredentialOptions = {
      useOperatorCredentials: hederaOptions.useOperatorCredentials || false,
      createNewAccount: hederaOptions.createNewAccount !== false, // Default to true
      initialBalance: hederaOptions.initialBalance || 10, // Default 10 HBAR
      encryptPrivateKey: hederaOptions.encryptPrivateKey !== false, // Default to true
      ...hederaOptions
    };

    let hederaResult;
    try {
      hederaResult = await agentHederaUtils.assignHederaCredentials(
        savedAgent._id, 
        hederaCredentialOptions
      );
      console.log('✅ Hedera credentials assigned successfully');
    } catch (hederaError) {
      console.error('❌ Failed to create Hedera wallet:', hederaError);
      
      // If Hedera wallet creation fails, we can either:
      // 1. Delete the agent (strict mode)
      // 2. Keep the agent without Hedera credentials (graceful mode)
      
      if (hederaOptions.strictMode) {
        await Agent.findByIdAndDelete(savedAgent._id);
        return res.status(500).json({
          success: false,
          message: 'Failed to create Hedera wallet for agent',
          error: hederaError.message,
          agentDeleted: true
        });
      }
      
      // Graceful mode: keep agent without Hedera credentials
      hederaResult = {
        success: false,
        error: hederaError.message,
        gracefulFallback: true
      };
    }

    // Step 3: Get the updated agent with Hedera credentials
    const finalAgent = await Agent.findById(savedAgent._id).select('-hederaPrivateKey');
    
    // Step 4: Get user information for response
    let userData = null;
    let authToken = null;
    try {
      // Use the existing user we already found and validated
      const foundUser = existingUser;
      if (foundUser) {
        userData = foundUser;
        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'mariposa-secret-key';
        authToken = jwt.sign(
          { 
            userId: foundUser._id, 
            email: foundUser.email,
            userType: foundUser.userType 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
      }
    } catch (userError) {
      console.error('❌ Error fetching user for response:', userError);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`🎉 Hedera agent creation completed in ${duration}ms`);

    res.status(201).json({
      success: true,
      data: {
        agent: finalAgent,
        user: userData,
        token: authToken,
        hedera: {
          enabled: hederaResult.success || false,
          accountId: hederaResult.hedera?.accountId || null,
          publicKey: hederaResult.hedera?.publicKey || null,
          network: hederaResult.hedera?.network || 'testnet',
          initialBalance: hederaResult.hedera?.initialBalance || null,
          transactionId: hederaResult.hedera?.transactionId || null,
          error: hederaResult.error || null
        },
        metadata: {
          creationTime: `${duration}ms`,
          timestamp: new Date().toISOString(),
          hederaOptions: hederaCredentialOptions
        }
      },
      message: hederaResult.success 
        ? 'Agent with Hedera wallet created successfully' 
        : 'Agent created, but Hedera wallet creation failed'
    });

  } catch (error) {
    console.error('💥 Create Hedera Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent with Hedera wallet',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// @desc    Get all agents for a user
// @route   GET /api/agents/user/:userId
// @access  Public (should be protected in production)
const getUserAgents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { strategy, active } = req.query;

    // Handle both ObjectId and email for userId
    const User = require('../models/User');
    let actualUserId;
    
    // Check if userId is an email (contains @) or ObjectId
    if (userId.includes('@')) {
      // Find user by email
      const user = await User.findOne({ email: userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      actualUserId = user._id;
    } else {
      // Find user by ObjectId
      try {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        actualUserId = user._id;
      } catch (error) {
        // If ObjectId is invalid, try finding by email as fallback
        const user = await User.findOne({ email: userId });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        actualUserId = user._id;
      }
    }

    let filter = { userId: actualUserId };
    if (strategy) filter.primaryStrategy = strategy;
    if (active !== undefined) filter.isActive = active === 'true';

    const agents = await Agent.find(filter)
      .sort({ lastInteraction: -1 })
      .select('-__v');

    // Get memory statistics for each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const memoryStats = await Memory.getAgentMemoryStats(agent._id);
        return {
          ...agent.toObject(),
          memoryStats
        };
      })
    );

    res.json({
      success: true,
      data: {
        agents: agentsWithStats,
        count: agentsWithStats.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get User Agents Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agents',
      error: error.message
    });
  }
};

// @desc    Get agent by ID
// @route   GET /api/agents/:id
// @access  Public (should be protected in production)
const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get agent statistics
    const memoryStats = await Memory.getAgentMemoryStats(agent._id);

    res.json({
      success: true,
      data: {
        agent: agent.toObject(),
        memoryStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent',
      error: error.message
    });
  }
};

// @desc    Update agent
// @route   PUT /api/agents/:id
// @access  Public (should be protected in production)
const updateAgent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Check if name already exists for this user (if name is being updated)
    if (updateData.name && updateData.name !== agent.name) {
      const existingAgent = await Agent.findOne({ 
        name: updateData.name, 
        userId: agent.userId, 
        isActive: true,
        _id: { $ne: id }
      });
      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: 'Agent with this name already exists'
        });
      }
    }

    // Update agent
    Object.assign(agent, updateData);
    agent.updatedAt = new Date();

    const updatedAgent = await agent.save();

    res.json({
      success: true,
      data: {
        agent: updatedAgent,
        message: 'Agent updated successfully'
      }
    });

  } catch (error) {
    console.error('Update Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: error.message
    });
  }
};

// @desc    Delete agent (soft delete)
// @route   DELETE /api/agents/:id
// @access  Public (should be protected in production)
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Soft delete - set isActive to false
    agent.isActive = false;
    agent.updatedAt = new Date();
    await agent.save();

    res.json({
      success: true,
      data: {
        message: `Agent "${agent.name}" deleted successfully`
      }
    });

  } catch (error) {
    console.error('Delete Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: error.message
    });
  }
};

// @desc    Get agent memory history
// @route   GET /api/agents/:id/memory
// @access  Public (should be protected in production)
const getAgentMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, limit = 10 } = req.query;

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    let memories;
    if (sessionId) {
      memories = await Memory.getRecentMemories(id, sessionId, parseInt(limit));
    } else {
      // Get all recent memories for this agent across sessions
      memories = await Memory.find({ agentId: id })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('agentId', 'name primaryStrategy');
    }

    res.json({
      success: true,
      data: {
        agentId: id,
        agentName: agent.name,
        memories,
        count: memories.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get Agent Memory Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent memory',
      error: error.message
    });
  }
};

// @desc    Get available agent strategies
// @route   GET /api/agents/strategies
// @access  Public
const getAgentStrategies = async (req, res) => {
  try {
    const strategies = [
      {
        name: 'DCA',
        description: 'Dollar Cost Averaging - Systematic investment approach with fixed amounts at regular intervals',
        focus: 'Long-term accumulation, reduced timing risk',
        riskLevel: 'Low to Moderate',
        timeframe: 'Long-term (months/years)',
        bestFor: 'Conservative investors, beginners, steady accumulation'
      },
      {
        name: 'momentum_trading',
        description: 'Momentum Trading - Capitalize on strong price movements and trends',
        focus: 'Technical analysis, trend following',
        riskLevel: 'High',
        timeframe: 'Short to Medium-term (days/weeks)',
        bestFor: 'Experienced traders, high risk tolerance'
      },
      {
        name: 'swing_trading',
        description: 'Swing Trading - Capture price swings over days to weeks',
        focus: 'Support/resistance levels, technical patterns',
        riskLevel: 'Moderate to High',
        timeframe: 'Medium-term (3-30 days)',
        bestFor: 'Active traders, balanced risk/reward'
      },
      {
        name: 'hodl',
        description: 'HODL - Long-term holding regardless of market volatility',
        focus: 'Fundamental value, diamond hands mentality',
        riskLevel: 'Low to Moderate',
        timeframe: 'Very Long-term (years)',
        bestFor: 'True believers, passive investors'
      },
      {
        name: 'arbitrage',
        description: 'Arbitrage Trading - Profit from price differences across DEX platforms',
        focus: 'Speed, precision, price discrepancies',
        riskLevel: 'Low to Moderate',
        timeframe: 'Very Short-term (minutes/hours)',
        bestFor: 'Technical experts, high-frequency traders'
      },
      {
        name: 'custom',
        description: 'Custom Strategy - User-defined trading approach with custom instructions',
        focus: 'User-specific requirements and preferences',
        riskLevel: 'Variable',
        timeframe: 'Variable',
        bestFor: 'Advanced users with specific strategies'
      }
    ];

    res.json({
      success: true,
      data: {
        strategies,
        count: strategies.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get Strategies Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve strategies',
      error: error.message
    });
  }
};

// Helper function to generate unique REF ID
const generateRefId = () => {
  return `AGT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to get session ID
const getSessionId = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `${ip}_${userAgent}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
};

// @desc    Create intelligent DCA agent from user message using AI
// @route   POST /api/agents/strategy
// @access  Public (should be protected in production)
const createIntelligentAgent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message, userId = 'anonymous' } = req.body;
    const sessionId = getSessionId(req);

    // Check if Together AI is configured
    if (!process.env.TOGETHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please set TOGETHER_API_KEY environment variable.'
      });
    }

    // Create intelligent crypto AI prompt for strategy analysis and parameter extraction
    const extractionPrompt = `You are an elite cryptocurrency trading strategist and portfolio manager with deep expertise across all trading methodologies including DCA, scalping, memecoin trading, yield farming, futures, spot trading, arbitrage, and emerging crypto strategies.

ANALYZE THE USER'S TRADING INTENT AND CREATE A COMPLETE TRADING STRATEGY:

USER MESSAGE: "${message}"

REAL-TIME MARKET CONTEXT:
${marketInsights}

${supportedTokensList}

IMPORTANT: Use this real-time market data to inform your strategy recommendations. Consider current price movements, volume, and liquidity when suggesting allocations and strategies. ONLY use tokens from the supported list above.

ANALYSIS FRAMEWORK:
1. UNDERSTAND the user's trading style, experience level, and goals
2. IDENTIFY the most suitable strategy based on their message
3. PROPOSE an optimal portfolio allocation with specific tokens
4. CREATE a detailed action plan with reasoning
5. ASSESS risks and provide market insights

AVAILABLE STRATEGIES:
- DCA: Dollar Cost Averaging for steady accumulation
- momentum_trading: Riding price trends and momentum
- swing_trading: Medium-term position trading
- hodl: Long-term holding strategy
- arbitrage: Price difference exploitation
- scalping: High-frequency short-term trading
- memecoin: Speculative meme token trading
- yield_farming: DeFi yield optimization
- spot_trading: Direct crypto trading
- futures_trading: Leveraged trading
- custom: Unique user-defined strategy

RESPOND WITH A COMPREHENSIVE JSON OBJECT:
{
  "agentName": "human name + strategy expertise (e.g., 'Marcus DCA Expert', 'Sofia Memecoin Specialist', 'Alex Yield Farming Pro')",
  "description": "detailed strategy description",
  "primaryStrategy": "most appropriate strategy from the list above",
  "riskTolerance": "conservative|moderate|aggressive",
  "defaultBudget": "suggested budget as NUMBER (e.g., 1000, not $1000)",
  "frequency": "daily|weekly|monthly - optimal for this strategy",
  "portfolioAllocation": {
    "token1": {
      "symbol": "TOKEN_SYMBOL",
      "percentage": "XX%",
      "reasoning": "why include this token"
    },
    "token2": {
      "symbol": "TOKEN_SYMBOL", 
      "percentage": "XX%",
      "reasoning": "strategic purpose"
    },
    "token3": {
      "symbol": "TOKEN_SYMBOL",
      "percentage": "XX%", 
      "reasoning": "diversification purpose"
    }
  },
  "maxPositionSize": "max position as NUMBER (e.g., 2000, not $2000)",
  "stopLossPercentage": "stop loss as NUMBER (e.g., 10, not 10%)",
  "takeProfitPercentage": "take profit as NUMBER (e.g., 25, not 25%)",
  "customPrompt": "extracted user preferences and custom instructions",
  "extractedIntent": "user's primary goal and motivation",
  "portfolioManagementPlan": {
    "initialSetup": [
      {
        "step": 1,
        "action": "specific action to setup portfolio",
        "actionType": "BUY|SELL|HOLD|STAKE|SWAP|FARM|LEND|BORROW|BRIDGE|MINT|BURN",
        "tokenPair": "BASE/QUOTE",
        "percentage": "% of portfolio",
        "dollarAmount": "XXX based on budget",
        "priority": "high|medium|low",
        "timeframe": "immediate|hours|days|weeks",
        "reasoning": "detailed explanation"
      },
      {
        "step": 2,
        "action": "second setup action",
        "actionType": "BUY|SELL|HOLD|STAKE|SWAP|FARM|LEND|BORROW|BRIDGE|MINT|BURN",
        "tokenPair": "BASE/QUOTE",
        "percentage": "% of portfolio", 
        "dollarAmount": "XXX based on budget",
        "priority": "high|medium|low",
        "timeframe": "immediate|hours|days|weeks",
        "reasoning": "detailed explanation"
      }
    ],
    "monitoringFrequency": "hourly|daily|weekly - how often to check portfolio",
    "rebalancingRules": {
      "priceIncreaseActions": [
        {
          "trigger": "token increases by X%",
          "action": "what to do when price increases",
          "threshold": "percentage threshold",
          "actionType": "SELL|HOLD|TAKE_PROFIT",
          "reasoning": "why this action"
        }
      ],
      "priceDecreaseActions": [
        {
          "trigger": "token decreases by X%",
          "action": "what to do when price decreases",
          "threshold": "percentage threshold", 
          "actionType": "BUY|HOLD|STOP_LOSS",
          "reasoning": "why this action"
        }
      ],
      "portfolioValueChanges": {
        "totalIncrease": {
          "trigger": "portfolio increases by X%",
          "action": "what to do when total portfolio increases",
          "thresholds": ["10%", "25%", "50%", "100%"],
          "actions": ["rebalance", "take_profit", "scale_up", "hold"]
        },
        "totalDecrease": {
          "trigger": "portfolio decreases by X%", 
          "action": "what to do when total portfolio decreases",
          "thresholds": ["10%", "25%", "50%"],
          "actions": ["rebalance", "buy_dip", "stop_loss", "hold"]
        }
      }
    },
    "riskManagement": {
      "stopLossStrategy": "detailed stop loss approach",
      "takeProfitStrategy": "detailed take profit approach", 
      "positionSizing": "how to size positions",
      "diversificationRules": "how to maintain diversification"
    },
    "periodicReview": {
      "frequency": "daily|weekly|monthly",
      "metrics": ["roi", "volatility", "drawdown", "sharpe_ratio"],
      "adjustmentCriteria": "when to adjust strategy",
      "performanceTargets": "specific performance goals"
    }
  },
  "marketInsights": "current market analysis relevant to this strategy",
  "riskAssessment": "comprehensive risk analysis for this approach",
  "strategyAdvantages": "why this strategy fits the user",
  "potentialDrawbacks": "honest assessment of risks and limitations",
  "successMetrics": "how to measure strategy success"
}

AGENT NAMING REQUIREMENTS:
- USE realistic human first names (Marcus, Sofia, Alex, Diana, Carlos, Emma, etc.)
- ADD strategy expertise title based on primary strategy:
  * DCA → "DCA Expert" or "DCA Specialist"
  * memecoin → "Memecoin Specialist" or "Memecoin Hunter"
  * yield_farming → "Yield Farming Pro" or "DeFi Yield Expert"
  * scalping → "Scalping Expert" or "Quick Trade Specialist"
  * swing_trading → "Swing Trading Pro" or "Position Trader"
  * momentum_trading → "Momentum Expert" or "Trend Trader"
  * arbitrage → "Arbitrage Specialist" or "Price Hunter"
  * hodl → "HODL Expert" or "Long-term Holder"
  * spot_trading → "Spot Trading Pro" or "Market Trader"
  * futures_trading → "Futures Expert" or "Leverage Specialist"
- EXAMPLES: "Marcus DCA Expert", "Sofia Memecoin Hunter", "Alex Yield Farming Pro"

INTELLIGENT GUIDELINES FOR CREATEINTELLIGENT AGENT:
- MATCH strategy to user's implied experience level and risk appetite
- ONLY USE SUPPORTED HEDERA TOKENS: Major tokens (HBAR, WHBAR, ETH, BTC), Stablecoins (USDC, USDT, DAI), DeFi tokens (LINK, MATIC), and HTS tokens available on Hedera network
- LEVERAGE the real-time market data to make informed allocation decisions
- PROPOSE realistic budgets and position sizes based on current liquidity
- CREATE actionable, specific trading steps using available Hedera Token Service (HTS)
- BE HONEST about risks and current market conditions
- ADAPT frequency and approach to the chosen strategy and market volatility
- CONSIDER current price trends and volume when suggesting allocations
- FOCUS on Hedera Token Service (HTS) for token operations with fast finality and low fees
- BALANCE risk across available tokens based on current market performance
- PRIORITIZE HTS native tokens over wrapped tokens for conservative strategies
- CONSIDER token categories: use stablecoins for stability, major tokens for growth, HBAR for network utility

PORTFOLIO MANAGEMENT REQUIREMENTS:
- CREATE a comprehensive portfolio management plan with specific steps
- DEFINE monitoring frequency based on strategy (scalping=hourly, DCA=weekly, etc.)
- SET clear rules for when to buy more, sell, or hold based on price movements
- SPECIFY portfolio rebalancing triggers and thresholds
- INCLUDE risk management strategies with specific percentages
- PROVIDE periodic review schedule and performance metrics to track

CRITICAL FORMAT REQUIREMENTS:
- defaultBudget: Pure number (1000, not "$1000")
- maxPositionSize: Pure number (2000, not "$2000" or "25%")
- stopLossPercentage: Pure number (10, not "10%")
- takeProfitPercentage: Pure number (25, not "25%")
- Percentages in portfolioAllocation can include % symbol
- All dollar amounts should be pure numbers without $ signs
- Provide detailed, actionable steps for portfolio management
- Include specific triggers and thresholds for decision making
- IMPORTANT: Generate ONLY ONE portfolioManagementPlan structure, do NOT duplicate or create multiple portfolio plans
- Ensure the JSON is valid and properly formatted with no duplicate keys`;

    try {
      console.log('\n🚀 INTELLIGENT AGENT CREATION PROCESS STARTED');
      console.log('═'.repeat(80));
      console.log('📝 USER MESSAGE:', message);
      console.log('👤 USER ID:', userId);
      console.log('🔑 SESSION ID:', sessionId);
      
      // Fetch real-time Hedera market data
      console.log('\n🌊 FETCHING REAL-TIME HEDERA MARKET DATA...');
      const { fetchMarketData, formatMarketDataForAI } = require('../utils/marketData');
      const marketData = await fetchMarketData();
      const supportedTokensList = formatMarketDataForAI(marketData);
      
      console.log('✅ MARKET DATA RETRIEVED');
      console.log('📊 Market Summary:', marketData.summary);
      
      console.log('\n🧠 AI PROMPT BEING SENT:');
      console.log('-'.repeat(80));
      console.log(extractionPrompt);
      console.log('-'.repeat(80));

      // Initialize Together AI
      console.log('\n🔧 INITIALIZING TOGETHER AI...');
      const together = new Together({
        apiKey: process.env.TOGETHER_API_KEY
      });
      console.log('✅ Together AI initialized successfully');

      const messages = [
        {
          role: 'system',
          content: 'You are an elite cryptocurrency trading strategist. Analyze the user\'s intent and respond with a comprehensive JSON strategy. Be creative, intelligent, and thorough in your analysis.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ];

      console.log('\n📤 SENDING REQUEST TO AI MODEL: Qwen/Qwen3-235B-A22B-fp8-tput');
      console.log('⚙️  Temperature: 0.3, Max Tokens: 3000');
      
      // Call Together AI with Qwen model
      const aiResponse = await together.chat.completions.create({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages: messages,
        temperature: 0.3,
        max_tokens: 3000
      });

      console.log('✅ AI RESPONSE RECEIVED');
      console.log('📊 Response Length:', aiResponse.choices[0].message.content.length, 'characters');

      let extractedData;
      try {
        const aiContent = aiResponse.choices[0].message.content;
        
        console.log('\n📄 RAW AI RESPONSE:');
        console.log('-'.repeat(80));
        console.log(aiContent);
        console.log('-'.repeat(80));
        
        // Clean the response to extract JSON
        console.log('\n🔍 PARSING JSON FROM AI RESPONSE...');
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }
        
        console.log('📦 JSON EXTRACTED, LENGTH:', jsonMatch[0].length, 'characters');
        extractedData = JSON.parse(jsonMatch[0]);
        
        console.log('✅ JSON PARSED SUCCESSFULLY');
        console.log('🎯 EXTRACTED STRATEGY:', extractedData.primaryStrategy);
        console.log('💰 EXTRACTED BUDGET:', extractedData.defaultBudget);
        console.log('🎲 RISK TOLERANCE:', extractedData.riskTolerance);
        
        if (extractedData.portfolioAllocation) {
          console.log('📊 PORTFOLIO ALLOCATION:');
          Object.entries(extractedData.portfolioAllocation).forEach(([key, token]) => {
            console.log(`   ${token.symbol}: ${token.percentage} - ${token.reasoning}`);
          });
        }
        
      } catch (parseError) {
        console.error('❌ FAILED TO PARSE AI RESPONSE:', parseError);
        console.log('🔄 USING FALLBACK STRATEGY...');
        
        // Enhanced fallback with better analysis
        const msgLower = message.toLowerCase();
        let strategy = "DCA";
        let risk = "moderate";
        let budget = 500;
        
        // Detect strategy from message
        if (msgLower.includes('scalp') || msgLower.includes('quick') || msgLower.includes('fast')) {
          strategy = "scalping";
        } else if (msgLower.includes('meme') || msgLower.includes('doge') || msgLower.includes('shib')) {
          strategy = "memecoin";
        } else if (msgLower.includes('yield') || msgLower.includes('farm') || msgLower.includes('stake')) {
          strategy = "yield_farming";
        } else if (msgLower.includes('swing') || msgLower.includes('position')) {
          strategy = "swing_trading";
        } else if (msgLower.includes('momentum') || msgLower.includes('trend')) {
          strategy = "momentum_trading";
        }
        
        // Detect risk tolerance
        if (msgLower.includes('conservative') || msgLower.includes('safe') || msgLower.includes('low risk')) {
          risk = "conservative";
        } else if (msgLower.includes('aggressive') || msgLower.includes('high risk') || msgLower.includes('risky')) {
          risk = "aggressive";
        }
        
        // Extract budget
        const budgetMatch = message.match(/\$?([\d,]+)\s*(?:dollars?|usd|\$)?/i);
        if (budgetMatch) {
          budget = parseInt(budgetMatch[1].replace(/,/g, ''));
        }
        
        // Generate a human name for fallback
        const humanNames = ['Marcus', 'Sofia', 'Alex', 'Diana', 'Carlos', 'Emma', 'David', 'Luna', 'Gabriel', 'Maya'];
        const randomName = humanNames[Math.floor(Math.random() * humanNames.length)];
        const strategyTitles = {
          'DCA': 'DCA Expert',
          'scalping': 'Scalping Expert',
          'memecoin': 'Memecoin Specialist',
          'yield_farming': 'Yield Farming Pro',
          'swing_trading': 'Swing Trading Pro',
          'momentum_trading': 'Momentum Expert'
        };
        const title = strategyTitles[strategy] || 'Trading Specialist';

        extractedData = {
          agentName: `${randomName} ${title}`,
          description: `Intelligent ${strategy} strategy based on user preferences`,
          primaryStrategy: strategy,
          riskTolerance: risk,
          defaultBudget: budget, // Already a number
          frequency: strategy === "scalping" ? "daily" : strategy === "DCA" ? "monthly" : "weekly",
          portfolioAllocation: {
            token1: { symbol: "BTC", percentage: "40%", reasoning: "Primary store of value" },
            token2: { symbol: "ETH", percentage: "30%", reasoning: "Smart contract leader" },
            token3: { symbol: "SEI", percentage: "20%", reasoning: "Native network token" },
            token4: { symbol: "USDC", percentage: "10%", reasoning: "Stability and opportunities" }
          },
          maxPositionSize: budget * 2, // Already a number
          stopLossPercentage: 10, // Already a number
          takeProfitPercentage: 20, // Already a number
          customPrompt: message,
          extractedIntent: "Create intelligent trading strategy",
          agentUuid: uuidv4(),
          portfolioManagementPlan: {
            initialSetup: [
              {
                step: 1,
                action: "Initial portfolio setup",
                actionType: "BUY",
                tokenPair: "USDC/BTC",
                percentage: "40%",
                priority: "high",
                reasoning: "Establish BTC position as portfolio foundation"
              },
              {
                step: 2,
                action: "Diversify with ETH",
                actionType: "BUY", 
                tokenPair: "USDC/ETH",
                percentage: "30%",
                priority: "high",
                reasoning: "Add smart contract exposure"
              }
            ],
            monitoringFrequency: strategy === "scalping" ? "hourly" : strategy === "DCA" ? "weekly" : "daily",
            rebalancingRules: {
              priceIncreaseActions: [{
                trigger: "token increases by 25%",
                action: "Consider taking partial profits",
                threshold: "25%",
                actionType: "SELL",
                reasoning: "Lock in gains while maintaining position"
              }],
              priceDecreaseActions: [{
                trigger: "token decreases by 10%",
                action: "Hold or buy dip based on risk tolerance",
                threshold: "10%",
                actionType: risk === "aggressive" ? "BUY" : "HOLD",
                reasoning: "Manage downside risk appropriately"
              }]
            }
          },
          marketInsights: "Strategy created based on current market conditions",
          riskAssessment: `${risk} risk approach suitable for ${strategy} strategy`
        };
        
        console.log('✅ FALLBACK STRATEGY CREATED:', extractedData.primaryStrategy);
      }

      console.log('\n🔍 CHECKING FOR EXISTING AGENT...');
      // Check if agent name already exists for this user
      const existingAgent = await Agent.findOne({ 
        name: extractedData.agentName, 
        userId, 
        isActive: true 
      });
      
      if (existingAgent) {
        console.log('⚠️  AGENT NAME ALREADY EXISTS, ADDING TIMESTAMP');
        extractedData.agentName = `${extractedData.agentName} (${Date.now()})`;
      }

      // Extract preferred tokens from portfolio allocation
      let preferredTokens = [];
      if (extractedData.portfolioAllocation) {
        preferredTokens = Object.values(extractedData.portfolioAllocation).map(token => token.symbol);
      } else if (extractedData.preferredTokens) {
        preferredTokens = extractedData.preferredTokens;
      } else {
        preferredTokens = ["BTC", "ETH", "SEI", "USDC"];
      }

      console.log('\n🏗️  CREATING NEW AGENT...');
      console.log('📛 Agent Name:', extractedData.agentName);
      console.log('🎯 Strategy:', extractedData.primaryStrategy);
      console.log('🪙 Preferred Tokens:', preferredTokens);

      // Helper function to parse numeric values from strings
      const parseNumeric = (value, defaultValue = 0) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Remove $ signs, % signs, commas, and other non-numeric characters except decimals
          const cleanValue = value.replace(/[$%,]/g, '').trim();
          const parsed = parseFloat(cleanValue);
          return isNaN(parsed) ? defaultValue : parsed;
        }
        return defaultValue;
      };

      // Parse and clean numeric values
      const defaultBudget = parseNumeric(extractedData.defaultBudget, 500);
      const maxPositionSize = parseNumeric(extractedData.maxPositionSize, defaultBudget * 2);
      const stopLossPercentage = parseNumeric(extractedData.stopLossPercentage, 10);
      const takeProfitPercentage = parseNumeric(extractedData.takeProfitPercentage, 20);

      console.log('💰 Parsed Budget:', defaultBudget);
      console.log('📏 Parsed Max Position:', maxPositionSize);
      console.log('⬇️ Parsed Stop Loss:', stopLossPercentage, '%');
      console.log('⬆️ Parsed Take Profit:', takeProfitPercentage, '%');

      // Create the new agent with extracted parameters
      const agent = new Agent({
        name: extractedData.agentName,
        description: extractedData.description,
        userId: userId,
        primaryStrategy: extractedData.primaryStrategy,
        configuration: {
          defaultBudget: defaultBudget,
          frequency: extractedData.frequency,
          riskTolerance: extractedData.riskTolerance,
          preferredTokens: preferredTokens,
          maxPositionSize: maxPositionSize,
          stopLossPercentage: stopLossPercentage,
          takeProfitPercentage: takeProfitPercentage,
          customPrompt: extractedData.customPrompt
        }
      });

          const savedAgent = await agent.save();
    console.log('✅ AGENT SAVED TO DATABASE');
    console.log('🆔 Agent ID:', savedAgent._id);

    // Update the strategy with the agent ID and mark as applied
    if (strategyId) {
      console.log('\n🔗 LINKING STRATEGY TO AGENT...');
      try {
        const strategyRecord = await Strategy.findById(strategyId);
        if (strategyRecord) {
          strategyRecord.agentId = savedAgent._id;
          strategyRecord.markAsApplied();
          await strategyRecord.save();
          console.log('✅ STRATEGY LINKED TO AGENT');
        }
      } catch (linkError) {
        console.error('⚠️  Failed to link strategy to agent:', linkError.message);
      }
    }

      // Generate and create wallet for the agent
      console.log('\n🏦 CREATING WALLET FOR AGENT...');
      try {
        const walletData = await WalletService.generateSEIWallet({
          name: savedAgent.name,
          primaryStrategy: savedAgent.primaryStrategy
        });
        
        const wallet = await WalletService.createWallet(
          savedAgent._id,
          savedAgent.name,
          walletData,
          defaultBudget
        );
        
        // Update agent with wallet information
        savedAgent.walletId = wallet._id;
        savedAgent.walletAddress = wallet.walletAddress;
        await savedAgent.save();
        
        console.log('✅ WALLET CREATED AND LINKED TO AGENT');
        console.log('📱 Wallet Address:', wallet.walletAddress);
        console.log('🏷️  Wallet Class:', wallet.walletClass);
        
      } catch (walletError) {
        console.error('⚠️  WALLET CREATION FAILED:', walletError.message);
        // Agent is still created, just without wallet
      }

      console.log('\n💾 CREATING MEMORY RECORDS...');
      // Save memory to default agent (if exists) or create default agent memory
      const defaultMemory = new Memory({
        userId: userId,
        sessionId: sessionId,
        agentId: savedAgent._id, // For now, we'll use the new agent as reference
        userMessage: message,
        extractedParameters: {
          intent: extractedData.primaryStrategy === 'DCA' ? 'long_holding' : 
                 extractedData.primaryStrategy === 'hodl' ? 'long_holding' : 'short_trading',
          mentionedCoins: extractedData.preferredTokens,
          riskIndicators: extractedData.riskTolerance,
          budgetHints: `$${extractedData.defaultBudget}`,
          timeline: extractedData.frequency,
          customInstructions: extractedData.customPrompt
        },
        strategyType: extractedData.primaryStrategy === 'DCA' ? 'long_holding' : 
                     extractedData.primaryStrategy === 'hodl' ? 'long_holding' : 'short_trading',
        budgetAmount: extractedData.defaultBudget,
        actions: (extractedData.suggestedActions || extractedData.portfolioManagementPlan?.initialSetup || []).map((action, index) => ({
          step: index + 1,
          actionType: action.actionType,
          percentage: action.percentage,
          tokenPair: action.tokenPair,
          ref: generateRefId(),
          priority: action.priority,
          reasoning: action.reasoning
        })),
        summary: `Created intelligent ${extractedData.primaryStrategy} agent: ${extractedData.agentName}`,
        outcome: 'pending'
      });

      await defaultMemory.save();
      console.log('✅ DEFAULT MEMORY SAVED');

      // Save memory to the newly created agent
      const agentMemory = new Memory({
        userId: userId,
        sessionId: sessionId,
        agentId: savedAgent._id,
        userMessage: `Agent created from user message: ${message}`,
        extractedParameters: {
          intent: extractedData.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
          mentionedCoins: extractedData.preferredTokens,
          riskIndicators: extractedData.riskTolerance,
          budgetHints: `$${extractedData.defaultBudget}`,
          timeline: extractedData.frequency,
          customInstructions: extractedData.customPrompt
        },
        strategyType: extractedData.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
        budgetAmount: extractedData.defaultBudget,
        actions: (extractedData.suggestedActions || extractedData.portfolioManagementPlan?.initialSetup || []).map((action, index) => ({
          step: index + 1,
          actionType: action.actionType,
          percentage: action.percentage,
          tokenPair: action.tokenPair,
          ref: generateRefId(),
          priority: action.priority,
          reasoning: action.reasoning
        })),
        summary: `Initial agent configuration and action plan`,
        outcome: 'pending'
      });

      await agentMemory.save();
      console.log('✅ AGENT MEMORY SAVED');

      console.log('\n🎉 INTELLIGENT AGENT CREATION COMPLETED SUCCESSFULLY!');
      console.log('═'.repeat(80));

      res.status(201).json({
        success: true,
        data: {
          agent: savedAgent,
          extractedParameters: extractedData,
          portfolioAllocation: extractedData.portfolioAllocation,
          walletInfo: {
            address: savedAgent.walletAddress,
            walletId: savedAgent.walletId,
            network: 'sei',
            status: savedAgent.walletAddress ? 'created' : 'pending'
          },
          memories: {
            defaultAgentMemory: defaultMemory._id,
            agentMemory: agentMemory._id
          },
          marketInsights: extractedData.marketInsights,
          riskAssessment: extractedData.riskAssessment,
          strategyAdvantages: extractedData.strategyAdvantages,
          potentialDrawbacks: extractedData.potentialDrawbacks,
          successMetrics: extractedData.successMetrics,
          message: `Intelligent ${extractedData.primaryStrategy} agent "${extractedData.agentName}" created successfully with wallet and portfolio management plan`
        }
      });

    } catch (aiError) {
      console.error('Together AI Error:', aiError.response?.data || aiError.message);
      
      // Fallback: Create agent with basic analysis of the user message
      const fallbackData = {
        agentName: "Smart DCA Agent",
        description: "DCA strategy based on user preferences",
        primaryStrategy: "DCA",
        riskTolerance: "moderate",
        defaultBudget: 500,
        frequency: "monthly",
        preferredTokens: ["BTC", "ETH", "SEI"],
        maxPositionSize: 1000,
        stopLossPercentage: 10,
        takeProfitPercentage: 20,
        customPrompt: message
      };

      // Simple keyword extraction
      const msgLower = message.toLowerCase();
      if (msgLower.includes('aggressive') || msgLower.includes('high risk')) {
        fallbackData.riskTolerance = 'aggressive';
        fallbackData.stopLossPercentage = 15;
        fallbackData.takeProfitPercentage = 30;
      } else if (msgLower.includes('conservative') || msgLower.includes('safe')) {
        fallbackData.riskTolerance = 'conservative';
        fallbackData.stopLossPercentage = 5;
        fallbackData.takeProfitPercentage = 15;
      }

      // Extract budget if mentioned
      const budgetMatch = message.match(/\$?([\d,]+)\s*(?:dollars?|usd|\$)?/i);
      if (budgetMatch) {
        fallbackData.defaultBudget = parseInt(budgetMatch[1].replace(/,/g, ''));
      }

      const agent = new Agent({
        name: fallbackData.agentName,
        description: fallbackData.description,
        userId: userId,
        primaryStrategy: fallbackData.primaryStrategy,
        configuration: fallbackData
      });

      const savedAgent = await agent.save();

      res.status(201).json({
        success: true,
        data: {
          agent: savedAgent,
          extractedParameters: fallbackData,
          message: `Agent created successfully (AI service unavailable, used fallback analysis)`,
          note: 'Created using fallback analysis due to AI service issues'
        }
      });
    }

  } catch (error) {
    console.error('Create Intelligent Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create intelligent agent',
      error: error.message
    });
  }
};

// @desc    Generate trading strategy using AI (no agent creation)
// @route   POST /api/agents/generate-strategy
// @access  Public (should be protected in production)
const generateStrategy = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message, userId, sessionId: providedSessionId } = req.body;
    const sessionId = providedSessionId || getSessionId(req);

    // Check if Together AI is configured
    if (!process.env.TOGETHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please set TOGETHER_API_KEY environment variable.'
      });
    }

    console.log('\n🤖 GENERATING STRATEGY ONLY');
    console.log('═'.repeat(60));
    console.log('📝 USER MESSAGE:', message);
    console.log('👤 USER ID:', userId);
    console.log('🔑 SESSION ID:', sessionId);

    // Fetch real-time SEI market data
    console.log('\n🌊 FETCHING REAL-TIME SEI MARKET DATA...');
    const marketData = await SeiMarketDataService.fetchAllSeiMarketData();
    const marketInsights = SeiMarketDataService.generateMarketInsights(marketData);
    const supportedTokensList = SeiMarketDataService.getFormattedTokenList();
    
    console.log('✅ MARKET DATA RETRIEVED');
    console.log('📊 Market Summary:', marketData.summary);

    // Use the same extraction prompt but with market data
    const extractionPrompt = `You are an elite cryptocurrency trading strategist and portfolio manager with deep expertise across all trading methodologies including DCA, scalping, memecoin trading, yield farming, futures, spot trading, arbitrage, and emerging crypto strategies.

ANALYZE THE USER'S TRADING INTENT AND CREATE A COMPLETE TRADING STRATEGY:

USER MESSAGE: "${message}"

REAL-TIME MARKET CONTEXT:
${marketInsights}

${supportedTokensList}

IMPORTANT: Use this real-time market data to inform your strategy recommendations. Consider current price movements, volume, and liquidity when suggesting allocations and strategies. ONLY use tokens from the supported list above.

ANALYSIS FRAMEWORK:
1. UNDERSTAND the user's trading style, experience level, and goals
2. IDENTIFY the most suitable strategy based on their message
3. PROPOSE an optimal portfolio allocation with specific tokens
4. CREATE a detailed action plan with reasoning
5. ASSESS risks and provide market insights

AVAILABLE STRATEGIES:
- DCA: Dollar Cost Averaging for steady accumulation
- momentum_trading: Riding price trends and momentum
- swing_trading: Medium-term position trading
- hodl: Long-term holding strategy
- arbitrage: Price difference exploitation
- scalping: High-frequency short-term trading
- memecoin: Speculative meme token trading
- yield_farming: DeFi yield optimization
- spot_trading: Direct crypto trading
- futures_trading: Leveraged trading
- custom: Unique user-defined strategy

RESPOND WITH A COMPREHENSIVE JSON OBJECT:
{
  "agentName": "human name + strategy expertise (e.g., 'Marcus DCA Expert', 'Sofia Memecoin Specialist', 'Alex Yield Farming Pro')",
  "description": "detailed strategy description",
  "primaryStrategy": "most appropriate strategy from the list above",
  "riskTolerance": "conservative|moderate|aggressive",
  "defaultBudget": "suggested budget as NUMBER (e.g., 1000, not $1000)",
  "frequency": "daily|weekly|monthly - optimal for this strategy",
  "portfolioAllocation": {
    "token1": {
      "symbol": "TOKEN_SYMBOL",
      "percentage": "XX%",
      "reasoning": "why include this token"
    },
    "token2": {
      "symbol": "TOKEN_SYMBOL", 
      "percentage": "XX%",
      "reasoning": "strategic purpose"
    },
    "token3": {
      "symbol": "TOKEN_SYMBOL",
      "percentage": "XX%", 
      "reasoning": "diversification purpose"
    }
  },
  "maxPositionSize": "max position as NUMBER (e.g., 2000, not $2000)",
  "stopLossPercentage": "stop loss as NUMBER (e.g., 10, not 10%)",
  "takeProfitPercentage": "take profit as NUMBER (e.g., 25, not 25%)",
  "customPrompt": "extracted user preferences and custom instructions",
  "extractedIntent": "user's primary goal and motivation",
  "portfolioManagementPlan": {
    "initialSetup": [
      {
        "step": 1,
        "action": "specific action to setup portfolio",
        "actionType": "BUY|SELL|HOLD|STAKE|SWAP|FARM|LEND|BORROW|BRIDGE|MINT|BURN",
        "tokenPair": "BASE/QUOTE",
        "percentage": "% of portfolio",
        "dollarAmount": "XXX based on budget",
        "priority": "high|medium|low",
        "timeframe": "immediate|hours|days|weeks",
        "reasoning": "detailed explanation"
      },
      {
        "step": 2,
        "action": "second setup action",
        "actionType": "BUY|SELL|HOLD|STAKE|SWAP|FARM|LEND|BORROW|BRIDGE|MINT|BURN",
        "tokenPair": "BASE/QUOTE",
        "percentage": "% of portfolio", 
        "dollarAmount": "XXX based on budget",
        "priority": "high|medium|low",
        "timeframe": "immediate|hours|days|weeks",
        "reasoning": "detailed explanation"
      }
    ],
    "monitoringFrequency": "hourly|daily|weekly - how often to check portfolio",
    "rebalancingRules": {
      "priceIncreaseActions": [
        {
          "trigger": "token increases by X%",
          "action": "what to do when price increases",
          "threshold": "percentage threshold",
          "actionType": "SELL|HOLD|TAKE_PROFIT",
          "reasoning": "why this action"
        }
      ],
      "priceDecreaseActions": [
        {
          "trigger": "token decreases by X%",
          "action": "what to do when price decreases",
          "threshold": "percentage threshold", 
          "actionType": "BUY|HOLD|STOP_LOSS",
          "reasoning": "why this action"
        }
      ],
      "portfolioValueChanges": {
        "totalIncrease": {
          "trigger": "portfolio increases by X%",
          "action": "what to do when total portfolio increases",
          "thresholds": ["10%", "25%", "50%", "100%"],
          "actions": ["rebalance", "take_profit", "scale_up", "hold"]
        },
        "totalDecrease": {
          "trigger": "portfolio decreases by X%", 
          "action": "what to do when total portfolio decreases",
          "thresholds": ["10%", "25%", "50%"],
          "actions": ["rebalance", "buy_dip", "stop_loss", "hold"]
        }
      }
    },
    "riskManagement": {
      "stopLossStrategy": "detailed stop loss approach",
      "takeProfitStrategy": "detailed take profit approach", 
      "positionSizing": "how to size positions",
      "diversificationRules": "how to maintain diversification"
    },
    "periodicReview": {
      "frequency": "daily|weekly|monthly",
      "metrics": ["roi", "volatility", "drawdown", "sharpe_ratio"],
      "adjustmentCriteria": "when to adjust strategy",
      "performanceTargets": "specific performance goals"
    }
  },
  "marketInsights": "current market analysis relevant to this strategy",
  "riskAssessment": "comprehensive risk analysis for this approach",
  "strategyAdvantages": "why this strategy fits the user",
  "potentialDrawbacks": "honest assessment of risks and limitations",
  "successMetrics": "how to measure strategy success"
}

AGENT NAMING REQUIREMENTS:
- USE realistic human first names (Marcus, Sofia, Alex, Diana, Carlos, Emma, etc.)
- ADD strategy expertise title based on primary strategy:
  * DCA → "DCA Expert" or "DCA Specialist"
  * memecoin → "Memecoin Specialist" or "Memecoin Hunter"
  * yield_farming → "Yield Farming Pro" or "DeFi Yield Expert"
  * scalping → "Scalping Expert" or "Quick Trade Specialist"
  * swing_trading → "Swing Trading Pro" or "Position Trader"
  * momentum_trading → "Momentum Expert" or "Trend Trader"
  * arbitrage → "Arbitrage Specialist" or "Price Hunter"
  * hodl → "HODL Expert" or "Long-term Holder"
  * spot_trading → "Spot Trading Pro" or "Market Trader"
  * futures_trading → "Futures Expert" or "Leverage Specialist"
- EXAMPLES: "Marcus DCA Expert", "Sofia Memecoin Hunter", "Alex Yield Farming Pro"

INTELLIGENT GUIDELINES FOR GENERATE STRATEGY:
- MATCH strategy to user's implied experience level and risk appetite
- ONLY USE SUPPORTED SEI TOKENS: Major tokens (WETH, WBTC, SEI, WSEI), Stablecoins (USDC, USDT, USDa, syUSD, FASTUSD, kavaUSDT, sUSDa), BTC variants (uBTC, SolvBTC, SolvBTC.BBN), DeFi tokens (iSEI, FXS, MAD), and other verified tokens (FISHW) - these are the only tokens available on SEI network
- LEVERAGE the real-time market data to make informed allocation decisions
- PROPOSE realistic budgets and position sizes based on current liquidity
- CREATE actionable, specific trading steps using available SEI pools
- BE HONEST about risks and current market conditions
- ADAPT frequency and approach to the chosen strategy and market volatility
- CONSIDER current price trends and volume when suggesting allocations
- FOCUS on Sailor DEX pools which have the best liquidity on SEI
- BALANCE risk across available tokens based on current market performance
- PRIORITIZE verified tokens over unverified ones for conservative strategies
- CONSIDER token categories: use stablecoins for stability, major tokens for growth, BTC variants for Bitcoin exposure

PORTFOLIO MANAGEMENT REQUIREMENTS:
- CREATE a comprehensive portfolio management plan with specific steps
- DEFINE monitoring frequency based on strategy (scalping=hourly, DCA=weekly, etc.)
- SET clear rules for when to buy more, sell, or hold based on price movements
- SPECIFY portfolio rebalancing triggers and thresholds
- INCLUDE risk management strategies with specific percentages
- PROVIDE periodic review schedule and performance metrics to track

CRITICAL FORMAT REQUIREMENTS:
- defaultBudget: Pure number (1000, not "$1000")
- maxPositionSize: Pure number (2000, not "$2000" or "25%")
- stopLossPercentage: Pure number (10, not "10%")
- takeProfitPercentage: Pure number (25, not "25%")
- Percentages in portfolioAllocation can include % symbol
- All dollar amounts should be pure numbers without $ signs
- Provide detailed, actionable steps for portfolio management
- Include specific triggers and thresholds for decision making
- IMPORTANT: Generate ONLY ONE portfolioManagementPlan structure, do NOT duplicate or create multiple portfolio plans
- Ensure the JSON is valid and properly formatted with no duplicate keys`;

    try {
      console.log('\n🔧 INITIALIZING TOGETHER AI...');
      const together = new Together({
        apiKey: process.env.TOGETHER_API_KEY
      });

      const messages = [
        {
          role: 'system',
          content: 'You are an elite cryptocurrency trading strategist. Analyze the user\'s intent and respond with a comprehensive JSON strategy. Be creative, intelligent, and thorough in your analysis.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ];

      console.log('\n📤 SENDING REQUEST TO AI MODEL...');
      const aiResponse = await together.chat.completions.create({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages: messages,
        temperature: 0.3,
        max_tokens: 3000
      });

      console.log('✅ AI RESPONSE RECEIVED');

      let extractedData;
      try {
        const aiContent = aiResponse.choices[0].message.content;
        console.log('\n🔍 PARSING JSON FROM AI RESPONSE...');
        
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }
        
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('✅ STRATEGY GENERATED SUCCESSFULLY');
        
      } catch (parseError) {
        console.error('❌ FAILED TO PARSE AI RESPONSE:', parseError);
        
        // Enhanced fallback with better analysis
        const msgLower = message.toLowerCase();
        let strategy = "DCA";
        let risk = "moderate";
        let budget = 500;
        
        // Detect strategy from message
        if (msgLower.includes('scalp') || msgLower.includes('quick') || msgLower.includes('fast')) {
          strategy = "scalping";
        } else if (msgLower.includes('meme') || msgLower.includes('doge') || msgLower.includes('shib')) {
          strategy = "memecoin";
        } else if (msgLower.includes('yield') || msgLower.includes('farm') || msgLower.includes('stake')) {
          strategy = "yield_farming";
        }
        
        // Extract budget
        const budgetMatch = message.match(/\$?([\d,]+)\s*(?:dollars?|usd|\$)?/i);
        if (budgetMatch) {
          budget = parseInt(budgetMatch[1].replace(/,/g, ''));
        }
        
        // Generate a human name for fallback
        const humanNames = ['Marcus', 'Sofia', 'Alex', 'Diana', 'Carlos', 'Emma', 'David', 'Luna', 'Gabriel', 'Maya'];
        const randomName = humanNames[Math.floor(Math.random() * humanNames.length)];
        const strategyTitles = {
          'DCA': 'DCA Expert',
          'scalping': 'Scalping Expert',
          'memecoin': 'Memecoin Specialist',
          'yield_farming': 'Yield Farming Pro',
          'swing_trading': 'Swing Trading Pro',
          'momentum_trading': 'Momentum Expert'
        };
        const title = strategyTitles[strategy] || 'Trading Specialist';

        extractedData = {
          agentName: `${randomName} ${title}`,
          description: `Intelligent ${strategy} strategy based on user preferences`,
          primaryStrategy: strategy,
          riskTolerance: risk,
          defaultBudget: budget,
          frequency: strategy === "scalping" ? "daily" : strategy === "DCA" ? "monthly" : "weekly",
          portfolioAllocation: {
            token1: { symbol: "BTC", percentage: "40%", reasoning: "Primary store of value" },
            token2: { symbol: "ETH", percentage: "30%", reasoning: "Smart contract leader" },
            token3: { symbol: "SEI", percentage: "20%", reasoning: "Native network token" },
            token4: { symbol: "USDC", percentage: "10%", reasoning: "Stability and opportunities" }
          },
          maxPositionSize: budget * 2,
          stopLossPercentage: 10,
          takeProfitPercentage: 20,
          customPrompt: message,
          extractedIntent: "Create intelligent trading strategy",
          agentUuid: uuidv4(),
          portfolioManagementPlan: {
            initialSetup: [
              {
                step: 1,
                action: "Initial portfolio setup",
                actionType: "BUY",
                tokenPair: "USDC/BTC",
                percentage: "40%",
                priority: "high",
                reasoning: "Establish BTC position as portfolio foundation"
              }
            ],
            monitoringFrequency: strategy === "scalping" ? "hourly" : "daily"
          },
          marketInsights: "Strategy created based on current market conditions",
          riskAssessment: `${risk} risk approach suitable for ${strategy} strategy`
        };
      }

      // Parse numeric values for consistency
      const parseNumeric = (value, defaultValue = 0) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const cleanValue = value.replace(/[$%,]/g, '').trim();
          const parsed = parseFloat(cleanValue);
          return isNaN(parsed) ? defaultValue : parsed;
        }
        return defaultValue;
      };

      extractedData.defaultBudget = parseNumeric(extractedData.defaultBudget, 500);
      extractedData.maxPositionSize = parseNumeric(extractedData.maxPositionSize, extractedData.defaultBudget * 2);
      extractedData.stopLossPercentage = parseNumeric(extractedData.stopLossPercentage, 10);
      extractedData.takeProfitPercentage = parseNumeric(extractedData.takeProfitPercentage, 20);

      // Generate UUID for the agent
      extractedData.agentUuid = uuidv4();
      console.log('🆔 Generated Agent UUID:', extractedData.agentUuid);

      console.log('\n🎉 STRATEGY GENERATION COMPLETED');
      console.log('🎯 Strategy:', extractedData.primaryStrategy);
      console.log('💰 Budget:', extractedData.defaultBudget);
      console.log('⚖️ Risk:', extractedData.riskTolerance);

      // Save strategy to database
      console.log('\n💾 SAVING STRATEGY TO DATABASE...');
      const strategy = new Strategy({
        userId: userId,
        agentName: extractedData.agentName,
        agentUuid: extractedData.agentUuid,
        description: extractedData.description,
        primaryStrategy: extractedData.primaryStrategy,
        riskTolerance: extractedData.riskTolerance,
        defaultBudget: extractedData.defaultBudget,
        frequency: extractedData.frequency,
        portfolioAllocation: extractedData.portfolioAllocation,
        maxPositionSize: extractedData.maxPositionSize,
        stopLossPercentage: extractedData.stopLossPercentage,
        takeProfitPercentage: extractedData.takeProfitPercentage,
        customPrompt: extractedData.customPrompt || message,
        extractedIntent: extractedData.extractedIntent,
        portfolioManagementPlan: extractedData.portfolioManagementPlan,
        marketInsights: extractedData.marketInsights,
        riskAssessment: extractedData.riskAssessment,
        strategyAdvantages: extractedData.strategyAdvantages,
        potentialDrawbacks: extractedData.potentialDrawbacks,
        successMetrics: extractedData.successMetrics,
        status: 'generated',
        originalUserMessage: message
      });

      const savedStrategy = await strategy.save();
      console.log('✅ STRATEGY SAVED TO DATABASE');
      console.log('🆔 Strategy ID:', savedStrategy._id);

      // Extract preferred tokens from portfolio allocation
      let preferredTokens = [];
      if (extractedData.portfolioAllocation) {
        preferredTokens = Object.values(extractedData.portfolioAllocation).map(token => token.symbol);
      } else {
        preferredTokens = ["BTC", "ETH", "SEI", "USDC"];
      }

      // Check if agent name already exists for this user
      const existingAgent = await Agent.findOne({ 
        name: extractedData.agentName, 
        userId, 
        isActive: true 
      });
      
      if (existingAgent) {
        const timestamp = Date.now();
        extractedData.agentName = `${extractedData.agentName} (${timestamp})`;
        console.log('⚠️  Agent name already exists, adding timestamp:', extractedData.agentName);
      }

      console.log('\n🏗️  CREATING AGENT FROM GENERATED STRATEGY...');
      console.log('📛 Agent Name:', extractedData.agentName);
      console.log('🎯 Strategy:', extractedData.primaryStrategy);
      console.log('🪙 Preferred Tokens:', preferredTokens);

      // Create the new agent with extracted parameters
      const agent = new Agent({
        name: extractedData.agentName,
        agentUuid: extractedData.agentUuid,
        description: extractedData.description,
        userId: userId,
        primaryStrategy: extractedData.primaryStrategy,
        isApproved: false, // Waiting for approval
        canBeginWork: false, // Cannot work until approved
        currentStrategyId: savedStrategy._id, // Link to the saved strategy
        configuration: {
          defaultBudget: extractedData.defaultBudget,
          frequency: extractedData.frequency,
          riskTolerance: extractedData.riskTolerance,
          preferredTokens: preferredTokens,
          maxPositionSize: extractedData.maxPositionSize,
          stopLossPercentage: extractedData.stopLossPercentage,
          takeProfitPercentage: extractedData.takeProfitPercentage,
          customPrompt: extractedData.customPrompt
        }
      });

      const savedAgent = await agent.save();
      console.log('✅ AGENT SAVED TO DATABASE');
      console.log('🆔 Agent ID:', savedAgent._id);

      // Update the strategy with the agent ID
      savedStrategy.agentId = savedAgent._id;
      await savedStrategy.save();
      console.log('✅ STRATEGY LINKED TO AGENT');

      // Generate and create wallet for the agent
      let walletInfo = null;
      console.log('\n🏦 CREATING WALLET FOR AGENT...');
      try {
        const walletData = await WalletService.generateSEIWallet({
          name: savedAgent.name,
          primaryStrategy: savedAgent.primaryStrategy
        });
        
        const wallet = await WalletService.createWallet(
          savedAgent._id,
          savedAgent.name,
          walletData,
          extractedData.defaultBudget
        );
        
        // Update agent with wallet information
        savedAgent.walletId = wallet._id;
        savedAgent.walletAddress = wallet.walletAddress;
        await savedAgent.save();
        
        walletInfo = {
          address: wallet.walletAddress,
          walletId: wallet._id,
          network: 'sei',
          status: 'created'
        };
        
        console.log('✅ WALLET CREATED AND LINKED TO AGENT');
        console.log('📱 Wallet Address:', wallet.walletAddress);
        
      } catch (walletError) {
        console.error('⚠️  WALLET CREATION FAILED:', walletError.message);
        walletInfo = {
          address: null,
          walletId: null,
          network: 'sei',
          status: 'failed',
          error: walletError.message
        };
      }

      // Save memory for the strategy generation (now with actual agent ID)
      console.log('\n💾 SAVING STRATEGY GENERATION MEMORY...');

      const strategyMemory = new Memory({
        userId: userId,
        sessionId: sessionId,
        agentId: savedAgent._id, // Use actual agent ID
        userMessage: message,
        extractedParameters: {
          intent: extractedData.primaryStrategy === 'DCA' ? 'long_holding' : 
                 extractedData.primaryStrategy === 'hodl' ? 'long_holding' : 'short_trading',
          mentionedCoins: preferredTokens,
          riskIndicators: extractedData.riskTolerance,
          budgetHints: `$${extractedData.defaultBudget}`,
          timeline: extractedData.frequency,
          customInstructions: extractedData.customPrompt || message,
          customAllocations: new Map(
            Object.entries(extractedData.portfolioAllocation || {}).map(([key, token]) => 
              [token.symbol, token.percentage]
            )
          ),
          userPreferences: {
            preferredTokens: preferredTokens,
            tradingFrequency: extractedData.frequency,
            customInstructions: extractedData.customPrompt || message
          }
        },
        strategyType: extractedData.primaryStrategy === 'DCA' ? 'long_holding' : 
                     extractedData.primaryStrategy === 'hodl' ? 'long_holding' : 'short_trading',
        budgetAmount: extractedData.defaultBudget,
        actions: (extractedData.portfolioManagementPlan?.initialSetup || []).map((action, index) => ({
          step: index + 1,
          actionType: action.actionType,
          percentage: action.percentage,
          tokenPair: action.tokenPair,
          ref: generateRefId(),
          priority: action.priority,
          reasoning: action.reasoning
        })),
        conversationContext: {
          marketConditions: extractedData.marketInsights,
          strategyAdjustments: ['Initial strategy generation'],
          learningNotes: `Generated ${extractedData.primaryStrategy} strategy based on user preferences`
        },
        summary: `Agent "${extractedData.agentName}" created with ${extractedData.primaryStrategy} strategy`,
        outcome: 'pending'
      });

      await strategyMemory.save();
      console.log('✅ STRATEGY MEMORY SAVED');
      console.log('🆔 Memory ID:', strategyMemory._id);

      console.log('\n🎉 AGENT AND STRATEGY CREATION COMPLETED');
      console.log('⏳ Agent is waiting for approval to begin work');

      res.status(201).json({
        success: true,
        data: {
          agent: savedAgent,
          strategy: {
            ...extractedData,
            portfolioAllocation: extractedData.portfolioAllocation,
            portfolioManagementPlan: extractedData.portfolioManagementPlan,
            marketInsights: extractedData.marketInsights,
            riskAssessment: extractedData.riskAssessment,
            strategyAdvantages: extractedData.strategyAdvantages,
            potentialDrawbacks: extractedData.potentialDrawbacks,
            successMetrics: extractedData.successMetrics
          },
          strategyId: savedStrategy._id,
          agentId: savedAgent._id,
          agentUuid: extractedData.agentUuid,
          userId: userId,
          sessionId: sessionId,
          memoryId: strategyMemory._id,
          walletInfo: walletInfo,
          approvalStatus: {
            isApproved: false,
            canBeginWork: false,
            requiresApproval: true,
            note: 'Agent has been created and is waiting for approval to begin work'
          },
          timestamp: new Date().toISOString(),
          message: `Agent "${extractedData.agentName}" created successfully with wallet and strategy. Agent requires approval before it can begin work.`
        }
      });

    } catch (aiError) {
      console.error('AI Error:', aiError.response?.data || aiError.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate strategy using AI',
        error: aiError.message
      });
    }

  } catch (error) {
    console.error('Generate Strategy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate strategy',
      error: error.message
    });
  }
};

// @desc    Create agent from generated strategy
// @route   POST /api/agents/create-from-strategy
// @access  Public (should be protected in production)
const createAgentFromStrategy = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { strategy, userId, isApproved = false, strategyId } = req.body;

    console.log('\n🏗️  CREATING AGENT FROM STRATEGY');
    console.log('═'.repeat(60));
    console.log('👤 USER ID:', userId);
    console.log('📛 Agent Name:', strategy.agentName);
    console.log('🎯 Strategy:', strategy.primaryStrategy);
    console.log('✅ Approved:', isApproved);

    // Check if agent name already exists for this user
    const existingAgent = await Agent.findOne({ 
      name: strategy.agentName, 
      userId, 
      isActive: true 
    });
    
    if (existingAgent) {
      const timestamp = Date.now();
      strategy.agentName = `${strategy.agentName} (${timestamp})`;
      console.log('⚠️  Agent name already exists, adding timestamp:', strategy.agentName);
    }

    // Extract preferred tokens from portfolio allocation
    let preferredTokens = [];
    if (strategy.portfolioAllocation) {
      preferredTokens = Object.values(strategy.portfolioAllocation).map(token => token.symbol);
    } else {
      preferredTokens = ["BTC", "ETH", "SEI", "USDC"];
    }

    console.log('🪙 Preferred Tokens:', preferredTokens);

    // Create the new agent with extracted parameters
    const agent = new Agent({
      name: strategy.agentName,
      agentUuid: strategy.agentUuid,
      description: strategy.description,
      userId: userId,
      primaryStrategy: strategy.primaryStrategy,
      isApproved: isApproved,
      canBeginWork: isApproved, // Can begin work only if approved
      currentStrategyId: strategyId, // Link to the saved strategy
      configuration: {
        defaultBudget: strategy.defaultBudget,
        frequency: strategy.frequency,
        riskTolerance: strategy.riskTolerance,
        preferredTokens: preferredTokens,
        maxPositionSize: strategy.maxPositionSize,
        stopLossPercentage: strategy.stopLossPercentage,
        takeProfitPercentage: strategy.takeProfitPercentage,
        customPrompt: strategy.customPrompt
      }
    });

    const savedAgent = await agent.save();
    console.log('✅ AGENT SAVED TO DATABASE');
    console.log('🆔 Agent ID:', savedAgent._id);

    // Generate and create wallet for the agent
    let walletInfo = null;
    console.log('\n🏦 CREATING WALLET FOR AGENT...');
    try {
      const walletData = await WalletService.generateSEIWallet({
        name: savedAgent.name,
        primaryStrategy: savedAgent.primaryStrategy
      });
      
      const wallet = await WalletService.createWallet(
        savedAgent._id,
        savedAgent.name,
        walletData,
        strategy.defaultBudget
      );
      
      // Update agent with wallet information
      savedAgent.walletId = wallet._id;
      savedAgent.walletAddress = wallet.walletAddress;
      await savedAgent.save();
      
      walletInfo = {
        address: wallet.walletAddress,
        walletId: wallet._id,
        network: 'sei',
        status: 'created'
      };
      
      console.log('✅ WALLET CREATED AND LINKED TO AGENT');
      console.log('📱 Wallet Address:', wallet.walletAddress);
      
    } catch (walletError) {
      console.error('⚠️  WALLET CREATION FAILED:', walletError.message);
      walletInfo = {
        address: null,
        walletId: null,
        network: 'sei',
        status: 'failed'
      };
    }

    // Save memory to the specific agent (not default agent)
    console.log('\n💾 CREATING AGENT MEMORY...');
    const sessionId = getSessionId(req);
    
    const agentMemory = new Memory({
      userId: userId,
      sessionId: sessionId,
      agentId: savedAgent._id, // Save to this specific agent
      userMessage: `Agent created from generated strategy: ${strategy.primaryStrategy}`,
      extractedParameters: {
        intent: strategy.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
        mentionedCoins: preferredTokens,
        riskIndicators: strategy.riskTolerance,
        budgetHints: `$${strategy.defaultBudget}`,
        timeline: strategy.frequency,
        customInstructions: strategy.customPrompt
      },
      strategyType: strategy.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
      budgetAmount: strategy.defaultBudget,
      actions: (strategy.portfolioManagementPlan?.initialSetup || []).map((action, index) => ({
        step: index + 1,
        actionType: action.actionType,
        percentage: action.percentage,
        tokenPair: action.tokenPair,
        ref: generateRefId(),
        priority: action.priority,
        reasoning: action.reasoning
      })),
      summary: `Agent "${strategy.agentName}" created with ${strategy.primaryStrategy} strategy`,
      outcome: 'pending'
    });

    await agentMemory.save();
    console.log('✅ AGENT MEMORY SAVED');

    console.log('\n🎉 AGENT CREATION COMPLETED');

    res.status(201).json({
      success: true,
      data: {
        agent: savedAgent,
        strategy: {
          portfolioAllocation: strategy.portfolioAllocation,
          portfolioManagementPlan: strategy.portfolioManagementPlan,
          marketInsights: strategy.marketInsights,
          riskAssessment: strategy.riskAssessment,
          strategyAdvantages: strategy.strategyAdvantages,
          potentialDrawbacks: strategy.potentialDrawbacks,
          successMetrics: strategy.successMetrics
        },
        walletInfo: walletInfo,
        memory: {
          agentMemory: agentMemory._id
        },
        approvalStatus: {
          isApproved: savedAgent.isApproved,
          canBeginWork: savedAgent.canBeginWork,
          requiresApproval: !savedAgent.isApproved
        },
        message: `Agent "${strategy.agentName}" created successfully. ${isApproved ? 'Agent is approved and can begin work.' : 'Agent requires approval before starting work.'}`
      }
    });

  } catch (error) {
    console.error('Create Agent From Strategy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent from strategy',
      error: error.message
    });
  }
};

// @desc    Modify agent strategy with new prompt
// @route   PUT /api/agents/:id/modify-strategy
// @access  Public (should be protected in production)
const modifyAgentStrategy = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { message, userId, sessionId: providedSessionId, useMemory = true } = req.body;
    const sessionId = providedSessionId || getSessionId(req);

    console.log('\n🔄 MODIFYING AGENT STRATEGY');
    console.log('═'.repeat(60));
    console.log('🆔 Agent ID:', id);
    console.log('👤 User ID:', userId);
    console.log('🔑 Session ID:', sessionId);
    console.log('📝 New Message:', message);
    console.log('🧠 Use Memory:', useMemory);

    // Find the existing agent - if it doesn't exist, we'll handle it with memory
    let existingAgent = await findAgentByIdOrUuid(id);
    let isNewAgentFromMemory = false;
    
    if (!existingAgent) {
      // Agent doesn't exist - check if we have memory for this agent UUID
      // This happens when user declined strategy creation but we have memory
      console.log('⚠️  Agent not found in database, checking for memory context...');
      
      if (useMemory) {
        try {
          // Try to get memory context using the ID as agentId
          const memoryContext = await Memory.getMemoryContext(id, sessionId);
          if (memoryContext && memoryContext !== "NEW_CONVERSATION") {
            console.log('✅ Found memory context for declined strategy, proceeding with modification');
            isNewAgentFromMemory = true;
            // We'll create a temporary agent object for the AI prompt
            existingAgent = {
              _id: id,
              userId: userId,
              name: 'Temporary Agent from Memory',
              primaryStrategy: 'DCA', // Default, will be updated
              configuration: {
                defaultBudget: 1000,
                frequency: 'monthly',
                riskTolerance: 'moderate',
                preferredTokens: ['BTC', 'ETH', 'SEI'],
                maxPositionSize: 5000,
                stopLossPercentage: 10,
                takeProfitPercentage: 25
              }
            };
          } else {
            return res.status(404).json({
              success: false,
              message: 'Agent not found and no memory context available'
            });
          }
        } catch (memoryError) {
          console.error('Memory error:', memoryError);
          return res.status(404).json({
            success: false,
            message: 'Agent not found'
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }
    }

         // Verify the agent belongs to the user (skip for memory-based agents)
     if (!isNewAgentFromMemory && existingAgent.userId !== userId) {
       return res.status(403).json({
         success: false,
         message: 'Unauthorized: Agent belongs to different user'
       });
     }

     console.log('✅ AGENT VERIFICATION COMPLETED:', existingAgent.name || 'Memory-based agent');

     // Retrieve memory context if requested (and not already retrieved for memory-based agents)
     let memoryContext = "";
     if (useMemory && !isNewAgentFromMemory) {
       console.log('\n🧠 RETRIEVING MEMORY CONTEXT...');
       try {
         memoryContext = await Memory.getMemoryContext(existingAgent._id, sessionId);
         console.log('✅ MEMORY CONTEXT RETRIEVED');
         console.log('📋 Memory Length:', memoryContext.length, 'characters');
       } catch (memoryError) {
         console.error('⚠️  Failed to retrieve memory:', memoryError.message);
         memoryContext = "NEW_CONVERSATION";
       }
     } else if (isNewAgentFromMemory) {
       // Memory context was already retrieved for memory-based agents
       memoryContext = await Memory.getMemoryContext(id, sessionId);
       console.log('✅ USING EXISTING MEMORY CONTEXT FROM MEMORY-BASED AGENT');
     } else {
       console.log('🧠 MEMORY DISABLED - Using fresh context');
       memoryContext = "NEW_CONVERSATION";
     }

     // Generate new strategy using the same AI model
    if (!process.env.TOGETHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured'
      });
    }

    // Fetch real-time SEI market data for strategy modification
    console.log('\n🌊 FETCHING REAL-TIME SEI MARKET DATA FOR MODIFICATION...');
    const marketData = await SeiMarketDataService.fetchAllSeiMarketData();
    const marketInsights = SeiMarketDataService.generateMarketInsights(marketData);
    const supportedTokensList = SeiMarketDataService.getFormattedTokenList();
    
    console.log('✅ MARKET DATA RETRIEVED FOR MODIFICATION');
    console.log('📊 Market Summary:', marketData.summary);

    // Enhanced prompt with memory context and market data for modify strategy
    const extractionPrompt = `You are an elite cryptocurrency trading strategist and portfolio manager with deep expertise across all trading methodologies including DCA, scalping, memecoin trading, yield farming, futures, spot trading, arbitrage, and emerging crypto strategies.

ANALYZE THE USER'S TRADING INTENT AND CREATE A COMPLETE TRADING STRATEGY:

USER MESSAGE: "${message}"

PREVIOUS STRATEGY CONTEXT: The user had a ${existingAgent.primaryStrategy} strategy with ${existingAgent.configuration.riskTolerance} risk tolerance. They want to modify or improve their strategy.

REAL-TIME MARKET CONTEXT:
${marketInsights}

${supportedTokensList}

CONVERSATION MEMORY CONTEXT:
${memoryContext}

MEMORY AND MARKET INSTRUCTIONS:
- Use the conversation memory to understand the user's previous preferences and allocations
- If there's previous conversation context, reference it in your strategy modifications
- Build upon what the user has established previously
- If the user is making changes, explain how the new strategy differs from previous ones
- Maintain consistency with user's established preferences unless they explicitly want changes
- IMPORTANT: Incorporate the real-time market data to optimize the strategy based on current conditions
- Consider current price movements, volume trends, and liquidity when modifying allocations
- If market conditions have changed significantly, suggest appropriate strategy adjustments

ANALYSIS FRAMEWORK:
1. UNDERSTAND the user's trading style, experience level, and goals
2. IDENTIFY the most suitable strategy based on their message
3. PROPOSE an optimal portfolio allocation with specific tokens
4. CREATE a detailed action plan with reasoning
5. ASSESS risks and provide market insights

AVAILABLE STRATEGIES:
- DCA: Dollar Cost Averaging for steady accumulation
- momentum_trading: Riding price trends and momentum
- swing_trading: Medium-term position trading
- hodl: Long-term holding strategy
- arbitrage: Price difference exploitation
- scalping: High-frequency short-term trading
- memecoin: Speculative meme token trading
- yield_farming: DeFi yield optimization
- spot_trading: Direct crypto trading
- futures_trading: Leveraged trading
- custom: Unique user-defined strategy

RESPOND WITH A COMPREHENSIVE JSON OBJECT:
{
  "agentName": "human name + strategy expertise (e.g., 'Marcus DCA Expert', 'Sofia Memecoin Specialist', 'Alex Yield Farming Pro')",
  "description": "detailed strategy description",
  "primaryStrategy": "most appropriate strategy from the list above",
  "riskTolerance": "conservative|moderate|aggressive",
  "defaultBudget": "suggested budget as NUMBER (e.g., 1000, not $1000)",
  "frequency": "daily|weekly|monthly - optimal for this strategy",
  "portfolioAllocation": {
    "token1": {
      "symbol": "TOKEN_SYMBOL",
      "percentage": "XX%",
      "reasoning": "why include this token"
    },
    "token2": {
      "symbol": "TOKEN_SYMBOL", 
      "percentage": "XX%",
      "reasoning": "strategic purpose"
    },
    "token3": {
      "symbol": "TOKEN_SYMBOL",
      "percentage": "XX%", 
      "reasoning": "diversification purpose"
    }
  },
  "maxPositionSize": "max position as NUMBER (e.g., 2000, not $2000)",
  "stopLossPercentage": "stop loss as NUMBER (e.g., 10, not 10%)",
  "takeProfitPercentage": "take profit as NUMBER (e.g., 25, not 25%)",
  "customPrompt": "extracted user preferences and custom instructions",
  "extractedIntent": "user's primary goal and motivation",
  "portfolioManagementPlan": {
    "initialSetup": [
      {
        "step": 1,
        "action": "specific action to setup portfolio",
        "actionType": "BUY|SELL|HOLD|STAKE|SWAP|FARM|LEND|BORROW|BRIDGE|MINT|BURN",
        "tokenPair": "BASE/QUOTE",
        "percentage": "% of portfolio",
        "dollarAmount": "XXX based on budget",
        "priority": "high|medium|low",
        "timeframe": "immediate|hours|days|weeks",
        "reasoning": "detailed explanation"
      },
      {
        "step": 2,
        "action": "second setup action",
        "actionType": "BUY|SELL|HOLD|STAKE|SWAP|FARM|LEND|BORROW|BRIDGE|MINT|BURN",
        "tokenPair": "BASE/QUOTE",
        "percentage": "% of portfolio", 
        "dollarAmount": "XXX based on budget",
        "priority": "high|medium|low",
        "timeframe": "immediate|hours|days|weeks",
        "reasoning": "detailed explanation"
      }
    ],
    "monitoringFrequency": "hourly|daily|weekly - how often to check portfolio",
    "rebalancingRules": {
      "priceIncreaseActions": [
        {
          "trigger": "token increases by X%",
          "action": "what to do when price increases",
          "threshold": "percentage threshold",
          "actionType": "SELL|HOLD|TAKE_PROFIT",
          "reasoning": "why this action"
        }
      ],
      "priceDecreaseActions": [
        {
          "trigger": "token decreases by X%",
          "action": "what to do when price decreases",
          "threshold": "percentage threshold", 
          "actionType": "BUY|HOLD|STOP_LOSS",
          "reasoning": "why this action"
        }
      ],
      "portfolioValueChanges": {
        "totalIncrease": {
          "trigger": "portfolio increases by X%",
          "action": "what to do when total portfolio increases",
          "thresholds": ["10%", "25%", "50%", "100%"],
          "actions": ["rebalance", "take_profit", "scale_up", "hold"]
        },
        "totalDecrease": {
          "trigger": "portfolio decreases by X%", 
          "action": "what to do when total portfolio decreases",
          "thresholds": ["10%", "25%", "50%"],
          "actions": ["rebalance", "buy_dip", "stop_loss", "hold"]
        }
      }
    },
    "riskManagement": {
      "stopLossStrategy": "detailed stop loss approach",
      "takeProfitStrategy": "detailed take profit approach", 
      "positionSizing": "how to size positions",
      "diversificationRules": "how to maintain diversification"
    },
    "periodicReview": {
      "frequency": "daily|weekly|monthly",
      "metrics": ["roi", "volatility", "drawdown", "sharpe_ratio"],
      "adjustmentCriteria": "when to adjust strategy",
      "performanceTargets": "specific performance goals"
    }
  },
  "marketInsights": "current market analysis relevant to this strategy",
  "riskAssessment": "comprehensive risk analysis for this approach",
  "strategyAdvantages": "why this strategy fits the user",
  "potentialDrawbacks": "honest assessment of risks and limitations",
  "successMetrics": "how to measure strategy success"
}

PORTFOLIO MANAGEMENT REQUIREMENTS:
- CREATE a comprehensive portfolio management plan with specific steps
- DEFINE monitoring frequency based on strategy (scalping=hourly, DCA=weekly, etc.)
- SET clear rules for when to buy more, sell, or hold based on price movements
- SPECIFY portfolio rebalancing triggers and thresholds
- INCLUDE risk management strategies with specific percentages
- PROVIDE periodic review schedule and performance metrics to track

CRITICAL FORMAT REQUIREMENTS:
- defaultBudget: Pure number (1000, not "$1000")
- maxPositionSize: Pure number (2000, not "$2000" or "25%")
- stopLossPercentage: Pure number (10, not "10%")
- takeProfitPercentage: Pure number (25, not "25%")
- Percentages in portfolioAllocation can include % symbol
- All dollar amounts should be pure numbers without $ signs
- Provide detailed, actionable steps for portfolio management
- Include specific triggers and thresholds for decision making
- IMPORTANT: Generate ONLY ONE portfolioManagementPlan structure, do NOT duplicate or create multiple portfolio plans
- Ensure the JSON is valid and properly formatted with no duplicate keys`;

    try {
      console.log('\n🤖 GENERATING NEW STRATEGY...');
      const together = new Together({
        apiKey: process.env.TOGETHER_API_KEY
      });

      const messages = [
        {
          role: 'system',
          content: 'You are an elite cryptocurrency trading strategist. The user wants to modify their existing trading strategy. Analyze their new requirements and respond with an improved strategy.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ];

      const aiResponse = await together.chat.completions.create({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages: messages,
        temperature: 0.3,
        max_tokens: 3000
      });

      let newStrategy;
      try {
        const aiContent = aiResponse.choices[0].message.content;
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }
        newStrategy = JSON.parse(jsonMatch[0]);
        console.log('✅ NEW STRATEGY GENERATED');
      } catch (parseError) {
        console.error('❌ Failed to parse AI response, using fallback');
        // Fallback strategy based on existing agent
        newStrategy = {
          agentName: `${existingAgent.name} (Modified)`,
          description: `Modified ${existingAgent.primaryStrategy} strategy`,
          primaryStrategy: existingAgent.primaryStrategy,
          riskTolerance: existingAgent.configuration.riskTolerance,
          defaultBudget: existingAgent.configuration.defaultBudget,
          frequency: existingAgent.configuration.frequency,
          customPrompt: message
        };
      }

      // Parse numeric values
      const parseNumeric = (value, defaultValue = 0) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const cleanValue = value.replace(/[$%,]/g, '').trim();
          const parsed = parseFloat(cleanValue);
          return isNaN(parsed) ? defaultValue : parsed;
        }
        return defaultValue;
      };

      newStrategy.defaultBudget = parseNumeric(newStrategy.defaultBudget, existingAgent.configuration.defaultBudget);
      newStrategy.maxPositionSize = parseNumeric(newStrategy.maxPositionSize, existingAgent.configuration.maxPositionSize);
      newStrategy.stopLossPercentage = parseNumeric(newStrategy.stopLossPercentage, existingAgent.configuration.stopLossPercentage);
      newStrategy.takeProfitPercentage = parseNumeric(newStrategy.takeProfitPercentage, existingAgent.configuration.takeProfitPercentage);

      // Keep the existing agentUuid for modifications
      newStrategy.agentUuid = existingAgent.agentUuid || uuidv4();
      console.log('🆔 Using agent UUID:', newStrategy.agentUuid);

      // Update existing strategy instead of creating new one
      console.log('\n💾 UPDATING EXISTING STRATEGY...');
      let strategyToUpdate;
      
      if (existingAgent.currentStrategyId) {
        // Update existing strategy
        strategyToUpdate = await Strategy.findById(existingAgent.currentStrategyId);
        if (strategyToUpdate) {
          console.log('✅ Found existing strategy to update:', strategyToUpdate._id);
        }
      }
      
      if (!strategyToUpdate) {
        // Create new strategy if none exists
        console.log('⚠️  No existing strategy found, creating new one');
        strategyToUpdate = new Strategy({
          userId: userId,
          agentId: existingAgent._id,
          status: 'active',
          version: 1
        });
      }

      // Update strategy with new data
      strategyToUpdate.agentName = newStrategy.agentName;
      strategyToUpdate.agentUuid = newStrategy.agentUuid;
      strategyToUpdate.description = newStrategy.description;
      strategyToUpdate.primaryStrategy = newStrategy.primaryStrategy;
      strategyToUpdate.riskTolerance = newStrategy.riskTolerance;
      strategyToUpdate.defaultBudget = newStrategy.defaultBudget;
      strategyToUpdate.frequency = newStrategy.frequency;
      strategyToUpdate.portfolioAllocation = newStrategy.portfolioAllocation;
      strategyToUpdate.maxPositionSize = newStrategy.maxPositionSize;
      strategyToUpdate.stopLossPercentage = newStrategy.stopLossPercentage;
      strategyToUpdate.takeProfitPercentage = newStrategy.takeProfitPercentage;
      strategyToUpdate.customPrompt = newStrategy.customPrompt || message;
      strategyToUpdate.extractedIntent = newStrategy.extractedIntent;
      strategyToUpdate.portfolioManagementPlan = newStrategy.portfolioManagementPlan;
      strategyToUpdate.marketInsights = newStrategy.marketInsights;
      strategyToUpdate.riskAssessment = newStrategy.riskAssessment;
      strategyToUpdate.strategyAdvantages = newStrategy.strategyAdvantages;
      strategyToUpdate.potentialDrawbacks = newStrategy.potentialDrawbacks;
      strategyToUpdate.successMetrics = newStrategy.successMetrics;
      strategyToUpdate.status = 'modified';
      strategyToUpdate.originalUserMessage = message;
      strategyToUpdate.updatedAt = new Date();

      const savedNewStrategy = await strategyToUpdate.save();
      console.log('✅ STRATEGY UPDATED IN DATABASE');
      console.log('🆔 Strategy ID:', savedNewStrategy._id);

      // Handle agent creation or update
      let updatedAgent;
      const preferredTokens = newStrategy.portfolioAllocation ? 
        Object.values(newStrategy.portfolioAllocation).map(token => token.symbol) : 
        existingAgent.configuration.preferredTokens;

      if (isNewAgentFromMemory) {
        console.log('\n🏗️  CREATING NEW AGENT FROM MEMORY...');
        
        // Create a new agent from the memory-based strategy
        const newAgent = new Agent({
          name: newStrategy.agentName,
          agentUuid: newStrategy.agentUuid,
          description: newStrategy.description,
          userId: userId,
          primaryStrategy: newStrategy.primaryStrategy,
          isApproved: false, // Requires approval
          canBeginWork: false, // Cannot work until approved
          currentStrategyId: savedNewStrategy._id, // Link to new strategy
          configuration: {
            defaultBudget: newStrategy.defaultBudget,
            frequency: newStrategy.frequency,
            riskTolerance: newStrategy.riskTolerance,
            preferredTokens: preferredTokens,
            maxPositionSize: newStrategy.maxPositionSize,
            stopLossPercentage: newStrategy.stopLossPercentage,
            takeProfitPercentage: newStrategy.takeProfitPercentage,
            customPrompt: newStrategy.customPrompt
          }
        });

        updatedAgent = await newAgent.save();
        
        // Update the strategy with the real agent ID and link it to the agent
        savedNewStrategy.agentId = updatedAgent._id;
        await savedNewStrategy.save();
        
        // Link the strategy to the agent
        updatedAgent.currentStrategyId = savedNewStrategy._id;
        await updatedAgent.save();
        
        // Create wallet for new agent
        try {
          const walletData = await WalletService.generateSEIWallet({
            name: updatedAgent.name,
            primaryStrategy: updatedAgent.primaryStrategy
          });
          
          const wallet = await WalletService.createWallet(
            updatedAgent._id,
            updatedAgent.name,
            walletData,
            newStrategy.defaultBudget
          );
          
          updatedAgent.walletId = wallet._id;
          updatedAgent.walletAddress = wallet.walletAddress;
          await updatedAgent.save();
          
          console.log('✅ NEW AGENT CREATED WITH WALLET');
        } catch (walletError) {
          console.error('⚠️  Wallet creation failed for new agent:', walletError.message);
        }
        
      } else {
        console.log('\n🔄 UPDATING EXISTING AGENT...');
        
        // Update existing agent
        existingAgent.name = newStrategy.agentName;
        existingAgent.agentUuid = newStrategy.agentUuid;
        existingAgent.description = newStrategy.description;
        existingAgent.primaryStrategy = newStrategy.primaryStrategy;
        existingAgent.isApproved = false; // Requires re-approval
        existingAgent.canBeginWork = false; // Cannot work until approved
        existingAgent.currentStrategyId = savedNewStrategy._id; // Link to new strategy
        existingAgent.configuration = {
          defaultBudget: newStrategy.defaultBudget,
          frequency: newStrategy.frequency,
          riskTolerance: newStrategy.riskTolerance,
          preferredTokens: preferredTokens,
          maxPositionSize: newStrategy.maxPositionSize,
          stopLossPercentage: newStrategy.stopLossPercentage,
          takeProfitPercentage: newStrategy.takeProfitPercentage,
          customPrompt: newStrategy.customPrompt
        };
        existingAgent.updatedAt = new Date();

        updatedAgent = await existingAgent.save();
      }
      
      console.log('✅ AGENT PROCESSING COMPLETED');

      // Save memory to the agent about the modification
      const modificationMemory = new Memory({
        userId: userId,
        sessionId: sessionId,
        agentId: updatedAgent._id, // Save to the correct agent (new or existing)
        userMessage: `Strategy modification: ${message}`,
        extractedParameters: {
          intent: 'strategy_modification',
          mentionedCoins: preferredTokens,
          riskIndicators: newStrategy.riskTolerance,
          budgetHints: `$${newStrategy.defaultBudget}`,
          timeline: newStrategy.frequency,
          customInstructions: newStrategy.customPrompt
        },
        strategyType: newStrategy.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
        budgetAmount: newStrategy.defaultBudget,
        actions: (newStrategy.portfolioManagementPlan?.initialSetup || []).map((action, index) => ({
          step: index + 1,
          actionType: action.actionType,
          percentage: action.percentage,
          tokenPair: action.tokenPair,
          ref: generateRefId(),
          priority: action.priority,
          reasoning: action.reasoning
        })),
        summary: `Strategy modified from ${existingAgent.primaryStrategy} - requires re-approval`,
        outcome: 'pending'
      });

      await modificationMemory.save();
      console.log('✅ MODIFICATION MEMORY SAVED');

      console.log('\n🎉 AGENT STRATEGY MODIFICATION COMPLETED');

      res.status(201).json({
        success: true,
        data: {
          agent: updatedAgent,
          strategy: {
            ...newStrategy,
            portfolioAllocation: newStrategy.portfolioAllocation,
            portfolioManagementPlan: newStrategy.portfolioManagementPlan,
            marketInsights: newStrategy.marketInsights,
            riskAssessment: newStrategy.riskAssessment,
            strategyAdvantages: newStrategy.strategyAdvantages,
            potentialDrawbacks: newStrategy.potentialDrawbacks,
            successMetrics: newStrategy.successMetrics
          },
          strategyId: savedNewStrategy._id,
          agentId: updatedAgent._id,
          agentUuid: newStrategy.agentUuid,
          userId: userId,
          sessionId: sessionId,
          memoryId: modificationMemory._id,
          walletInfo: {
            address: updatedAgent.walletAddress || null,
            walletId: updatedAgent.walletId || null,
            network: 'sei',
            status: updatedAgent.walletAddress ? 'created' : (isNewAgentFromMemory ? 'created' : 'existing')
          },
          approvalStatus: {
            isApproved: false,
            canBeginWork: false,
            requiresApproval: true,
            note: isNewAgentFromMemory ? 
              'Agent has been created and is waiting for approval to begin work' :
              'Agent strategy has been modified and requires re-approval'
          },
          timestamp: new Date().toISOString(),
          message: isNewAgentFromMemory ? 
            `Agent "${newStrategy.agentName}" created successfully with wallet and strategy. Agent requires approval before it can begin work.` :
            `Agent "${newStrategy.agentName}" strategy modified successfully. Agent requires re-approval before it can begin work.`
        }
      });

    } catch (aiError) {
      console.error('AI Error during modification:', aiError);
      res.status(500).json({
        success: false,
        message: 'Failed to generate modified strategy',
        error: aiError.message
      });
    }

  } catch (error) {
    console.error('Modify Agent Strategy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to modify agent strategy',
      error: error.message
    });
  }
};

// @desc    Approve agent to begin work
// @route   PUT /api/agents/:id/approve
// @access  Public (should be protected in production)
const approveAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, isApproved = true } = req.body;

    console.log('\n✅ APPROVING AGENT');
    console.log('🆔 Agent ID:', id);
    console.log('👤 User ID:', userId);
    console.log('✔️ Approved:', isApproved);

    // Find the agent
    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Verify the agent belongs to the user
    if (agent.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Agent belongs to different user'
      });
    }

    // Update approval status
    agent.isApproved = isApproved;
    agent.canBeginWork = isApproved;
    agent.updatedAt = new Date();

    const updatedAgent = await agent.save();

    console.log(`✅ AGENT ${isApproved ? 'APPROVED' : 'DISAPPROVED'}`);

    res.status(200).json({
      success: true,
      data: {
        agent: updatedAgent,
        approvalStatus: {
          isApproved: updatedAgent.isApproved,
          canBeginWork: updatedAgent.canBeginWork,
          requiresApproval: !updatedAgent.isApproved
        },
        message: `Agent ${isApproved ? 'approved' : 'disapproved'} successfully. ${isApproved ? 'Agent can now begin work.' : 'Agent cannot begin work until approved.'}`
      }
    });

  } catch (error) {
    console.error('Approve Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve agent',
      error: error.message
    });
  }
};

// @desc    Get agent strategies history
// @route   GET /api/agents/:id/strategies
// @access  Public (should be protected in production)
const getAgentStrategiesHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    // Find the agent
    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Verify the agent belongs to the user
    if (userId && agent.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Agent belongs to different user'
      });
    }

    console.log('\n📊 FETCHING AGENT STRATEGIES HISTORY');
    console.log('🆔 Agent ID:', id);
    console.log('📛 Agent Name:', agent.name);

    // Get all strategies for this agent
    const strategies = await Strategy.getByAgent(id);
    
    console.log('📈 Found', strategies.length, 'strategies');

    // Get current strategy details
    let currentStrategy = null;
    if (agent.currentStrategyId) {
      currentStrategy = await Strategy.findById(agent.currentStrategyId);
    }

    res.status(200).json({
      success: true,
      data: {
        agent: {
          _id: agent._id,
          name: agent.name,
          primaryStrategy: agent.primaryStrategy,
          isApproved: agent.isApproved,
          canBeginWork: agent.canBeginWork,
          currentStrategyId: agent.currentStrategyId
        },
        currentStrategy: currentStrategy,
        strategiesHistory: strategies.map(strategy => ({
          _id: strategy._id,
          version: strategy.version,
          status: strategy.status,
          primaryStrategy: strategy.primaryStrategy,
          riskTolerance: strategy.riskTolerance,
          defaultBudget: strategy.defaultBudget,
          originalUserMessage: strategy.originalUserMessage,
          createdAt: strategy.createdAt,
          updatedAt: strategy.updatedAt,
          parentStrategyId: strategy.parentStrategyId
        })),
        totalStrategies: strategies.length,
        message: `Retrieved ${strategies.length} strategies for agent "${agent.name}"`
      }
    });

  } catch (error) {
    console.error('Get Agent Strategies History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent strategies',
      error: error.message
    });
  }
};

// Helper function to find agent by ID or UUID
const findAgentByIdOrUuid = async (identifier) => {
  // First try to find by MongoDB ObjectId
  if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
    const agent = await Agent.findById(identifier);
    if (agent) return agent;
  }
  
  // Then try to find by UUID
  const agentByUuid = await Agent.findOne({ agentUuid: identifier });
  if (agentByUuid) return agentByUuid;
  
  // If not found, return null
  return null;
};

module.exports = {
  createAgent,
  createSimpleAgent,
  createAgentWithHedera,
  getUserAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentMemory,
  getAgentStrategies,
  createIntelligentAgent,
  generateStrategy,
  createAgentFromStrategy,
  modifyAgentStrategy,
  approveAgent,
  getAgentStrategiesHistory
};