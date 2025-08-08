const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  agentName: {
    type: String,
    required: true
  },
  agentRole: {
    type: String,
    required: true
  },
  messageId: {
    type: String,
    required: true
  },
  evaluation: {
    passed: {
      type: Boolean,
      required: true
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: {
      type: String,
      default: ''
    },
    interviewNotes: {
      type: String,
      default: ''
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const finalResultSchema = new mongoose.Schema({
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  recommendation: {
    type: String,
    enum: ['RECOMMENDED', 'NOT_RECOMMENDED'],
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

const evaluationTopicSchema = new mongoose.Schema({
  topicId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  postId: {
    type: String,
    required: true,
    index: true
  },
  candidateName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  candidateId: {
    type: String,
    index: true
  },
  topicMemo: {
    type: String,
    required: true,
    maxlength: 200
  },
  createdBy: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  evaluations: [evaluationSchema],
  finalResult: finalResultSchema,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
evaluationTopicSchema.index({ company: 1, postId: 1 });
evaluationTopicSchema.index({ candidateName: 1 });
evaluationTopicSchema.index({ status: 1, createdAt: -1 });

// Update the updatedAt field before saving
evaluationTopicSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if evaluation is complete
evaluationTopicSchema.methods.isEvaluationComplete = async function() {
  const Agent = mongoose.model('Agent');
  const requiredAgents = await Agent.find({ isActive: true });
  return this.evaluations.length >= requiredAgents.length;
};

// Method to calculate final result
evaluationTopicSchema.methods.calculateFinalResult = function() {
  if (this.evaluations.length === 0) {
    return null;
  }

  const passedCount = this.evaluations.filter(e => e.evaluation.passed).length;
  const totalScore = this.evaluations.reduce((sum, e) => sum + (e.evaluation.score || 0), 0);
  const avgScore = totalScore / this.evaluations.length;
  
  // 70% pass rate required for recommendation
  const recommendation = passedCount >= (this.evaluations.length * 0.7) ? "RECOMMENDED" : "NOT_RECOMMENDED";

  return {
    overallScore: Math.round(avgScore * 100) / 100, // Round to 2 decimal places
    recommendation,
    completedAt: new Date()
  };
};

// Static method to get evaluation statistics
evaluationTopicSchema.statics.getEvaluationStats = async function(filter = {}) {
  const stats = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalTopics: { $sum: 1 },
        completedTopics: { 
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
        },
        recommendedCandidates: { 
          $sum: { 
            $cond: [
              { $eq: ["$finalResult.recommendation", "RECOMMENDED"] }, 
              1, 
              0
            ] 
          } 
        },
        averageScore: { $avg: "$finalResult.overallScore" }
      }
    }
  ]);

  return stats[0] || {
    totalTopics: 0,
    completedTopics: 0,
    recommendedCandidates: 0,
    averageScore: 0
  };
};

module.exports = mongoose.model('EvaluationTopic', evaluationTopicSchema);