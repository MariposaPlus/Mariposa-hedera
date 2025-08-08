const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hederaAccountId: {
    type: String,
    index: true,
    sparse: true
  },
  hederaPrivateKey: {
    type: String,
    select: false // Don't return this field by default for security
  },
  hederaPublicKey: {
    type: String
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

// Index for efficient querying
agentSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
agentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get agent information
agentSchema.methods.getInfo = function() {
  return {
    name: this.name,
    description: this.description,
    hederaAccountId: this.hederaAccountId,
    hederaPublicKey: this.hederaPublicKey,
    createdAt: this.createdAt
  };
};

// Static method to find all agents
agentSchema.statics.getAllAgents = async function() {
  return await this.find()
    .sort({ createdAt: -1 })
    .select('-__v -hederaPrivateKey');
};

module.exports = mongoose.model('Agent', agentSchema); 