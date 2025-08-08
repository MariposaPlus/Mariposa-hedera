const Agent = require('../models/Agent');

/**
 * Get all hedera agents
 * @route GET /api/agents/hedera
 * @access Public
 */
exports.getAllAgents = async (req, res) => {
  try {
    const { userId } = req.query;
    let agents;
    
    if (userId) {
      // Get agents for a specific user
      agents = await Agent.find({ userId })
        .sort({ createdAt: -1 })
        .select('-__v -hederaPrivateKey')
        .populate('userId', 'name email');
    } else {
      // Get all agents
      agents = await Agent.getAllAgents();
    }
    
    res.json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Get a single hedera agent
 * @route GET /api/agents/hedera/:id
 * @access Public
 */
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Create a new hedera agent
 * @route POST /api/agents/hedera
 * @access Public
 */
exports.createAgent = async (req, res) => {
  try {
    const { name, description, hederaAccountId, hederaPrivateKey, hederaPublicKey, userId } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a name for the agent'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a userId for the agent'
      });
    }
    
    const agent = new Agent({
      name,
      description,
      userId,
      hederaAccountId,
      hederaPrivateKey,
      hederaPublicKey
    });
    
    await agent.save();
    
    // Don't return the private key in the response
    const sanitizedAgent = {
      _id: agent._id,
      name: agent.name,
      description: agent.description,
      userId: agent.userId,
      hederaAccountId: agent.hederaAccountId,
      hederaPublicKey: agent.hederaPublicKey,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };
    
    res.status(201).json({
      success: true,
      data: sanitizedAgent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Update a hedera agent
 * @route PUT /api/agents/hedera/:id
 * @access Public
 */
exports.updateAgent = async (req, res) => {
  try {
    const { name, description, hederaAccountId, hederaPrivateKey, hederaPublicKey } = req.body;
    
    let agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    // Update fields
    if (name) agent.name = name;
    if (description !== undefined) agent.description = description;
    if (hederaAccountId) agent.hederaAccountId = hederaAccountId;
    if (hederaPrivateKey) agent.hederaPrivateKey = hederaPrivateKey;
    if (hederaPublicKey) agent.hederaPublicKey = hederaPublicKey;
    
    agent.updatedAt = Date.now();
    
    await agent.save();
    
    // Don't return the private key in the response
    const sanitizedAgent = {
      _id: agent._id,
      name: agent.name,
      description: agent.description,
      userId: agent.userId,
      hederaAccountId: agent.hederaAccountId,
      hederaPublicKey: agent.hederaPublicKey,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };
    
    res.json({
      success: true,
      data: sanitizedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Delete a hedera agent
 * @route DELETE /api/agents/hedera/:id
 * @access Public
 */
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    await agent.remove();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Get agents by user ID
 * @route GET /api/agents/hedera/user/:userId
 * @access Public
 */
exports.getAgentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
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
    
    const agents = await Agent.find({ userId: actualUserId })
      .sort({ createdAt: -1 })
      .select('-__v -hederaPrivateKey')
      .populate('userId', 'name email');
    
    res.json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    console.error('Error fetching agents by user ID:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Get the wallet balance for a hedera agent
 * @route GET /api/agents/hedera/:id/balance
 * @access Public
 */
exports.getAgentBalance = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent || !agent.hederaAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found or has no Hedera account'
      });
    }
    
    // In a real implementation, you would call the Hedera network to get the balance
    // For simplicity, we're returning a mock balance
    res.json({
      success: true,
      data: {
        accountId: agent.hederaAccountId,
        balance: {
          hbars: 100.0,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error getting agent balance:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};
