const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'anonymous' // For now, we'll use anonymous users
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  agentId: {
    type: String, // Changed from ObjectId to String to support UUIDs
    required: false, // Made optional for agent-chat functionality
    default: 'agent-chat-system',
    index: true
  },
  userMessage: {
    type: String,
    required: true
  },
  // Enhanced parameters with more context
  extractedParameters: {
    intent: {
      type: String,
      enum: ['long_holding', 'short_trading', 'mixed', 'strategy_declined', 'strategy_modification']
    },
    mentionedCoins: [String],
    riskIndicators: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive']
    },
    budgetHints: String,
    timeline: String,
    holdingStrategy: {
      type: String,
      enum: ['accumulation', 'profit_taking', 'rebalancing']
    },
    // New fields for better context
    customAllocations: {
      type: Map,
      of: String // e.g., { "BTC": "40%", "ETH": "30%", "SEI": "20%", "USDC": "10%" }
    },
    userPreferences: {
      preferredTokens: [String],
      avoidTokens: [String],
      maxRiskPerTrade: String,
      tradingFrequency: String,
      customInstructions: String
    },
    marketConditions: String, // User's view of current market
    adjustmentReason: String // Why user is making changes from previous strategy
  },
  strategyType: {
    type: String,
    enum: ['long_holding', 'short_trading', 'mixed', 'chat_conversation'],
    required: false, // Made optional for agent-chat functionality
    default: 'chat_conversation'
  },
  budgetAmount: {
    type: Number, // Total budget in USD
    required: false, // Made optional for agent-chat functionality
    default: 0
  },
  // Enhanced actions with more context
  actions: [{
    step: Number,
    actionType: {
      type: String,
      enum: ['BUY', 'SELL', 'HOLD', 'STAKE', 'SWAP', 'FARM', 'LEND', 'BORROW', 'BRIDGE', 'MINT', 'BURN'],
      required: true
    },
    percentage: String, // Stores percentages like "40%"
    percentageAmount: String, // Legacy field for backward compatibility
    dollarAmount: Number, // Dollar equivalent of percentage
    tokenPair: String,
    ref: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    timeframe: String, // e.g., "immediate", "within 24h", "within 1 week"
    holdingPeriod: {
      type: String,
      enum: ['short-term', 'long-term', 'flexible']
    },
    reasoning: String
  }],
  // Enhanced context for continuity
  conversationContext: {
    previousAllocations: {
      type: Map,
      of: String // Previous allocations to compare changes
    },
    userFeedback: String, // User's feedback on previous strategies
    strategyAdjustments: [String], // List of adjustments made
    learningNotes: String, // Agent's notes about user preferences
    customizationLevel: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced'],
      default: 'basic'
    },
    marketConditions: String, // Market conditions at time of strategy
    marketTimestamp: String // When market data was fetched
  },
  summary: {
    type: String,
    required: false, // Made optional for agent-chat functionality
    default: 'Agent chat conversation'
  },
  outcome: {
    type: String,
    enum: ['pending', 'executed', 'cancelled', 'modified'],
    default: 'pending'
  },
  // Agent Chat specific fields
  aiResponse: {
    type: String, // The final AI response to the user
    default: null
  },
  demandType: {
    type: String,
    enum: ['ACTION', 'STRATEGY', 'INFORMATION', 'FEEDBACK'],
    default: null
  },
  demandReason: {
    type: String, // Reason for the demand classification
    default: null
  },
  actionPlan: [{
    action: String,
    description: String
  }],
  actionResults: [{
    action: String,
    description: String,
    result: {
      status: String,
      data: String
    }
  }],
  metadata: {
    userContext: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: Date,
    responseTime: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
memorySchema.index({ userId: 1, agentId: 1, sessionId: 1, createdAt: -1 });
memorySchema.index({ agentId: 1, createdAt: -1 });

// Method to get formatted memory for AI context - Enhanced
memorySchema.methods.getContextSummary = function() {
  const actionSummary = this.actions.map(action => {
    const amount = action.percentage || action.percentageAmount || `$${action.dollarAmount}` || 'N/A';
    return `${action.actionType} ${amount} ${action.tokenPair}`;
  }).join(', ');
  
  // Build comprehensive context
  const context = {
    timestamp: this.createdAt.toISOString(),
    userIntent: this.userMessage,
    strategyType: this.strategyType,
    budget: this.budgetAmount,
    actions: actionSummary,
    summary: this.summary,
    outcome: this.outcome
  };

  // Add rich context information
  if (this.extractedParameters.customAllocations && this.extractedParameters.customAllocations.size > 0) {
    context.customAllocations = Object.fromEntries(this.extractedParameters.customAllocations);
  }
  
  if (this.extractedParameters.userPreferences) {
    context.userPreferences = this.extractedParameters.userPreferences;
  }
  
  if (this.conversationContext) {
    context.conversationContext = this.conversationContext;
  }
  
  return context;
};

// Static method to get recent memories for a specific agent - Enhanced
memorySchema.statics.getRecentMemories = async function(agentId, sessionId, limit = 5) {
  const memories = await this.find({ agentId, sessionId })
    .sort({ createdAt: -1 })
    .limit(limit);
  
  return memories.map(memory => memory.getContextSummary());
};

// Enhanced memory context for AI - Concise and actionable format
memorySchema.statics.getMemoryContext = async function(agentId, sessionId) {
  const recentMemories = await this.getRecentMemories(agentId, sessionId, 3);
  
  if (recentMemories.length === 0) {
    return "NEW_CONVERSATION";
  }
  
  // Get the most recent memory for current state
  const latestMemory = recentMemories[0];
  const previousMemories = recentMemories.slice(1);
  
  // Build concise, actionable context
  let context = `PREVIOUS_CONVERSATION_SUMMARY:\n`;
  
  // Latest interaction
  context += `LAST_INTERACTION:\n`;
  context += `- User said: "${latestMemory.userIntent}"\n`;
  context += `- Budget: $${latestMemory.budget}\n`;
  context += `- Strategy: ${latestMemory.strategyType}\n`;
  
  if (latestMemory.customAllocations) {
    const allocations = Object.entries(latestMemory.customAllocations)
      .map(([token, pct]) => `${token}:${pct}`).join(', ');
    context += `- Allocations: ${allocations}\n`;
  }
  
  context += `- Actions taken: ${latestMemory.actions}\n`;
  context += `- Status: ${latestMemory.outcome}\n`;
  
  // Previous interactions if any
  if (previousMemories.length > 0) {
    context += `\nEARLIER_INTERACTIONS:\n`;
    previousMemories.forEach((memory, index) => {
      context += `${index + 1}. "${memory.userIntent}" -> Budget: $${memory.budget}`;
      if (memory.customAllocations) {
        const allocations = Object.entries(memory.customAllocations)
          .map(([token, pct]) => `${token}:${pct}`).join(', ');
        context += ` -> Allocations: ${allocations}`;
      }
      context += `\n`;
    });
  }
  
  // Critical instructions for AI
  context += `\nMEMORY_INSTRUCTIONS:\n`;
  context += `- ALWAYS reference the last interaction when creating new strategy\n`;
  context += `- If user wants changes, compare with previous allocations and explain differences\n`;
  context += `- Build upon previous conversation naturally\n`;
  context += `- Use user's previous preferences as starting point\n`;
  
  return context;
};

// Static method to get agent's total memory statistics
memorySchema.statics.getAgentMemoryStats = async function(agentId) {
  const stats = await this.aggregate([
    { $match: { agentId: new mongoose.Types.ObjectId(agentId) } },
    {
      $group: {
        _id: null,
        totalInteractions: { $sum: 1 },
        totalBudget: { $sum: '$budgetAmount' },
        avgBudget: { $avg: '$budgetAmount' },
        strategiesUsed: { $addToSet: '$strategyType' },
        pendingActions: {
          $sum: {
            $cond: [{ $eq: ['$outcome', 'pending'] }, 1, 0]
          }
        },
        executedActions: {
          $sum: {
            $cond: [{ $eq: ['$outcome', 'executed'] }, 1, 0]
          }
        }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : {
    totalInteractions: 0,
    totalBudget: 0,
    avgBudget: 0,
    strategiesUsed: [],
    pendingActions: 0,
    executedActions: 0
  };
};

module.exports = mongoose.model('Memory', memorySchema); 