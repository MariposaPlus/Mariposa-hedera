const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const walletSchema = new mongoose.Schema({
  // Owner can be either an agent or a user
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  ownerType: {
    type: String,
    enum: ['agent', 'user'],
    required: true
  },
  // Legacy fields for backward compatibility
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  agentName: {
    type: String,
    default: null
  },
  // User specific fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: null
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  encryptedPrivateKey: {
    type: String,
    required: true
  },
  walletClass: {
    type: String,
    enum: ['trading', 'staking', 'defi', 'memecoin', 'arbitrage'],
    default: 'trading'
  },
  network: {
    type: String,
    default: 'sei',
    enum: ['sei', 'ethereum', 'polygon', 'bsc', 'arbitrum']
  },
  balance: {
    native: {
      type: Number,
      default: 0
    },
    tokens: [{
      symbol: String,
      amount: Number,
      usdValue: Number,
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }]
  },
  portfolioValue: {
    current: {
      type: Number,
      default: 0
    },
    initial: {
      type: Number,
      default: 0
    },
    peak: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  tradingHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['BUY', 'SELL', 'SWAP', 'STAKE', 'UNSTAKE', 'FARM', 'HARVEST']
    },
    tokenPair: String,
    amount: Number,
    price: Number,
    txHash: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  riskMetrics: {
    maxDrawdown: {
      type: Number,
      default: 0
    },
    volatility: {
      type: Number,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation and setup before saving
walletSchema.pre('save', function(next) {
  // Set legacy fields based on owner type for backward compatibility
  if (this.ownerType === 'agent') {
    this.agentId = this.ownerId;
    this.agentName = this.agentName || 'Agent Wallet';
    this.userId = null;
    this.userName = null;
  } else if (this.ownerType === 'user') {
    this.userId = this.ownerId;
    this.userName = this.userName || 'User Wallet';
    this.agentId = null;
    this.agentName = null;
  }

  // Encrypt private key before saving
  if (this.isModified('encryptedPrivateKey') && !this.encryptedPrivateKey.startsWith('encrypted:')) {
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
    this.encryptedPrivateKey = 'encrypted:' + CryptoJS.AES.encrypt(this.encryptedPrivateKey, encryptionKey).toString();
  }
  this.updatedAt = Date.now();
  next();
});

// Method to decrypt private key
walletSchema.methods.getPrivateKey = function() {
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
  if (this.encryptedPrivateKey.startsWith('encrypted:')) {
    const encryptedData = this.encryptedPrivateKey.replace('encrypted:', '');
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  return this.encryptedPrivateKey; // Fallback for unencrypted (shouldn't happen)
};

// Method to update portfolio value
walletSchema.methods.updatePortfolioValue = function(newValue) {
  this.portfolioValue.current = newValue;
  if (newValue > this.portfolioValue.peak) {
    this.portfolioValue.peak = newValue;
  }
  this.portfolioValue.lastUpdated = new Date();
  this.markModified('portfolioValue');
};

// Method to add trading history
walletSchema.methods.addTrade = function(tradeData) {
  this.tradingHistory.push(tradeData);
  // Keep only last 100 trades to prevent bloat
  if (this.tradingHistory.length > 100) {
    this.tradingHistory = this.tradingHistory.slice(-100);
  }
  this.markModified('tradingHistory');
};

// Method to calculate portfolio performance
walletSchema.methods.calculatePerformance = function() {
  const { current, initial } = this.portfolioValue;
  if (initial === 0) return { roi: 0, pnl: 0 };
  
  const roi = ((current - initial) / initial) * 100;
  const pnl = current - initial;
  
  return { roi, pnl };
};

// Method to get wallet class based on strategy
walletSchema.statics.getWalletClass = function(strategy) {
  const classMap = {
    'DCA': 'trading',
    'hodl': 'trading',
    'momentum_trading': 'trading',
    'swing_trading': 'trading',
    'scalping': 'trading',
    'spot_trading': 'trading',
    'futures_trading': 'trading',
    'memecoin': 'memecoin',
    'yield_farming': 'defi',
    'arbitrage': 'arbitrage',
    'custom': 'trading'
  };
  return classMap[strategy] || 'trading';
};

// Static method to create wallet for user
walletSchema.statics.createForUser = function(userId, userName, walletData, initialBalance = 0) {
  return new this({
    ownerId: userId,
    ownerType: 'user',
    userId: userId,
    userName: userName,
    walletAddress: walletData.address,
    encryptedPrivateKey: walletData.privateKey,
    walletClass: 'trading',
    network: 'sei',
    portfolioValue: {
      initial: initialBalance,
      current: initialBalance,
      peak: initialBalance
    }
  });
};

// Static method to create wallet for agent (legacy support)
walletSchema.statics.createForAgent = function(agentId, agentName, walletData, initialBalance = 0) {
  return new this({
    ownerId: agentId,
    ownerType: 'agent',
    agentId: agentId,
    agentName: agentName,
    walletAddress: walletData.address,
    encryptedPrivateKey: walletData.privateKey,
    walletClass: this.getWalletClass('trading'),
    network: 'sei',
    portfolioValue: {
      initial: initialBalance,
      current: initialBalance,
      peak: initialBalance
    }
  });
};

module.exports = mongoose.model('Wallet', walletSchema); 