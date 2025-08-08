const mongoose = require('mongoose');

const executorAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Creator and parent agent info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  
  // Linked strategy
  linkedStrategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: true,
    index: true
  },
  
  // Agent capabilities and configuration
  capabilities: {
    canExecuteTrades: {
      type: Boolean,
      default: true
    },
    canManagePortfolio: {
      type: Boolean,
      default: true
    },
    canMonitorMarket: {
      type: Boolean,
      default: true
    },
    canSendNotifications: {
      type: Boolean,
      default: true
    },
    maxTransactionAmount: {
      type: Number,
      default: 1000 // USD
    },
    allowedTokens: [{
      type: String,
      default: ['HBAR', 'SAUCE', 'USDC', 'WHBAR']
    }],
    riskLevel: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    }
  },
  
  // Hedera blockchain configuration
  hederaConfig: {
    accountId: {
      type: String,
      index: true,
      sparse: true
    },
    privateKey: {
      type: String,
      select: false // Don't return this field by default for security
    },
    publicKey: {
      type: String
    },
    network: {
      type: String,
      enum: ['testnet', 'mainnet'],
      default: 'testnet'
    }
  },
  
  // Execution settings
  executionSettings: {
    autoExecute: {
      type: Boolean,
      default: false // Require manual approval by default
    },
    executionSchedule: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        default: 'daily'
      },
      timeWindow: {
        start: String, // "09:00"
        end: String    // "17:00"
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    retryPolicy: {
      maxRetries: {
        type: Number,
        default: 3
      },
      retryDelay: {
        type: Number,
        default: 300000 // 5 minutes in milliseconds
      }
    },
    notificationSettings: {
      beforeExecution: {
        type: Boolean,
        default: true
      },
      afterExecution: {
        type: Boolean,
        default: true
      },
      onError: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'webhook', 'database'],
        default: ['database']
      }]
    }
  },
  
  // Current execution state
  executionState: {
    status: {
      type: String,
      enum: ['idle', 'monitoring', 'executing', 'paused', 'error'],
      default: 'idle'
    },
    currentTask: {
      taskId: String,
      taskType: String,
      startedAt: Date,
      expectedCompletion: Date
    },
    lastExecution: {
      timestamp: Date,
      taskId: String,
      success: Boolean,
      details: String
    },
    errorHistory: [{
      timestamp: Date,
      taskId: String,
      error: String,
      resolved: {
        type: Boolean,
        default: false
      }
    }],
    metrics: {
      totalTasksExecuted: {
        type: Number,
        default: 0
      },
      successfulExecutions: {
        type: Number,
        default: 0
      },
      failedExecutions: {
        type: Number,
        default: 0
      },
      averageExecutionTime: Number,
      lastActiveDate: Date,
      uptime: Number // percentage
    }
  },
  
  // Real-time market monitoring
  marketMonitoring: {
    isActive: {
      type: Boolean,
      default: true
    },
    monitoredTokens: [{
      symbol: String,
      priceAlerts: [{
        type: String, // 'above', 'below'
        value: Number,
        triggered: {
          type: Boolean,
          default: false
        }
      }]
    }],
    lastMarketUpdate: Date,
    marketDataProvider: {
      type: String,
      default: 'hederaTokenService'
    }
  },
  
  // Performance and analytics
  performance: {
    strategiesExecuted: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    totalProfitLoss: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    sharpeRatio: Number,
    maxDrawdown: Number,
    currentDrawdown: Number,
    bestTrade: {
      profit: Number,
      date: Date,
      details: String
    },
    worstTrade: {
      loss: Number,
      date: Date,
      details: String
    }
  },
  
  // Agent lifecycle
  status: {
    type: String,
    enum: ['created', 'configured', 'active', 'paused', 'stopped', 'error'],
    default: 'created'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
executorAgentSchema.index({ userId: 1, status: 1 });
executorAgentSchema.index({ linkedStrategyId: 1 });
executorAgentSchema.index({ 'executionState.status': 1 });
executorAgentSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
executorAgentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
executorAgentSchema.methods.getExecutionInfo = function() {
  return {
    name: this.name,
    status: this.status,
    executionState: this.executionState,
    performance: this.performance,
    capabilities: this.capabilities
  };
};

executorAgentSchema.methods.updateMetrics = function(executionResult) {
  this.executionState.metrics.totalTasksExecuted += 1;
  
  if (executionResult.success) {
    this.executionState.metrics.successfulExecutions += 1;
  } else {
    this.executionState.metrics.failedExecutions += 1;
  }
  
  // Calculate uptime percentage
  const total = this.executionState.metrics.totalTasksExecuted;
  const successful = this.executionState.metrics.successfulExecutions;
  this.executionState.metrics.uptime = total > 0 ? (successful / total) * 100 : 0;
  
  this.lastActiveAt = Date.now();
};

executorAgentSchema.methods.addError = function(taskId, error) {
  this.executionState.errorHistory.push({
    timestamp: new Date(),
    taskId: taskId,
    error: error,
    resolved: false
  });
  
  // Keep only last 50 errors
  if (this.executionState.errorHistory.length > 50) {
    this.executionState.errorHistory = this.executionState.errorHistory.slice(-50);
  }
};

// Static methods
executorAgentSchema.statics.findActiveAgents = function() {
  return this.find({ 
    status: 'active',
    'executionState.status': { $in: ['idle', 'monitoring'] }
  });
};

executorAgentSchema.statics.findByStrategy = function(strategyId) {
  return this.findOne({ linkedStrategyId: strategyId });
};

executorAgentSchema.statics.getAgentMetrics = function(agentId) {
  return this.findById(agentId)
    .select('performance executionState.metrics')
    .lean();
};

module.exports = mongoose.model('ExecutorAgent', executorAgentSchema);
