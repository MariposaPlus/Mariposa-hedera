const ExecutorAgent = require('../models/ExecutorAgent');
const Strategy = require('../models/Strategy');
const Agent = require('../models/Agent');
const User = require('../models/User');
const hederaTokenService = require('./hederaTokenService');
const hederaService = require('./hederaService');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class ActionExecutionService {
  constructor() {
    this.activeExecutions = new Map(); // Track active executions
    this.executionQueue = []; // Queue for pending executions
    this.isProcessing = false;
  }

  /**
   * Create an executor agent for a strategy with proper agent integration
   * @param {Object} strategyData - Strategy data with action plan
   * @param {String} userId - User ID
   * @param {String} parentAgentId - Parent agent ID (optional)
   * @returns {Object} Created executor agent with linked standard agent
   */
  async createExecutorAgent(strategyData, userId, parentAgentId = null) {
    try {
      console.log('🤖 Creating integrated executor agent for strategy:', strategyData._id);

      // Get real-time market data for configuration
      const marketData = await this.getLatestMarketData();
      const monitoredTokens = this.extractTokensFromStrategy(strategyData);

      // Step 1: Create a standard Agent first using the existing system
      console.log('📝 Creating standard agent through existing route...');
      const newAgent = await this.createStandardAgent(strategyData, userId);

      // Step 2: Create ExecutorAgent linked to the standard agent
      console.log('⚡ Creating executor agent linked to standard agent...');
      const executorAgent = new ExecutorAgent({
        name: `Executor - ${newAgent.name}`,
        description: `Automated execution agent for ${strategyData.primaryStrategy} strategy`,
        userId: userId,
        parentAgentId: newAgent._id, // Link to the newly created standard agent
        linkedStrategyId: strategyData._id,
        
        capabilities: {
          canExecuteTrades: true,
          canManagePortfolio: true,
          canMonitorMarket: true,
          canSendNotifications: true,
          maxTransactionAmount: strategyData.defaultBudget * 0.1, // 10% per transaction max
          allowedTokens: monitoredTokens.map(t => t.symbol),
          riskLevel: strategyData.riskTolerance
        },
        
        executionSettings: {
          autoExecute: false, // Require manual approval initially
          executionSchedule: {
            enabled: true,
            frequency: strategyData.frequency || 'daily',
            timeWindow: {
              start: '09:00',
              end: '17:00'
            },
            timezone: 'UTC'
          },
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000 // 5 minutes
          },
          notificationSettings: {
            beforeExecution: true,
            afterExecution: true,
            onError: true,
            channels: ['database', 'email']
          }
        },
        
        marketMonitoring: {
          isActive: true,
          monitoredTokens: monitoredTokens.map(token => ({
            symbol: token.symbol,
            priceAlerts: token.alerts || []
          })),
          lastMarketUpdate: new Date(),
          marketDataProvider: 'hederaTokenService'
        },
        
        status: 'created'
      });

      await executorAgent.save();

      // Step 3: Update strategy with executor agent reference
      await Strategy.findByIdAndUpdate(strategyData._id, {
        executorAgentId: executorAgent._id,
        agentId: newAgent._id, // Also link to the standard agent
        executionStatus: 'not_started',
        'executionMetrics.tasksTotal': this.countTotalTasks(strategyData.actionPlan)
      });

      // Step 4: Update user model to link to the new agent
      await this.linkAgentToUser(userId, newAgent._id);

      console.log('✅ Integrated executor agent created successfully:', {
        standardAgent: newAgent._id,
        executorAgent: executorAgent._id,
        strategy: strategyData._id
      });

      return {
        executorAgent,
        standardAgent: newAgent,
        linkedStrategy: strategyData._id
      };

    } catch (error) {
      console.error('❌ Error creating integrated executor agent:', error);
      throw error;
    }
  }

  /**
   * Create a standard agent using the database directly (instead of HTTP call)
   * @param {Object} strategyData - Strategy data
   * @param {String} userId - User ID
   * @returns {Object} Created standard agent
   */
  async createStandardAgent(strategyData, userId) {
    try {
      // Create agent with Hedera account information
      const agentName = `${strategyData.primaryStrategy} Strategy Agent`;
      const agentDescription = `AI agent for executing ${strategyData.primaryStrategy} strategy with ${strategyData.riskTolerance} risk tolerance`;

      const newAgent = new Agent({
        name: agentName,
        description: agentDescription,
        userId: userId,
        // For now, we'll create without Hedera credentials
        // These can be added later when needed for actual execution
        hederaAccountId: `0.0.${Date.now()}`, // Mock account ID for now
        hederaPublicKey: `mock_pubkey_${Date.now()}`
      });

      await newAgent.save();
      console.log('✅ Standard agent created:', newAgent._id);
      
      return newAgent;

    } catch (error) {
      console.error('❌ Error creating standard agent:', error);
      throw error;
    }
  }

  /**
   * Alternative method: Create standard agent using HTTP call to existing route
   * @param {Object} strategyData - Strategy data
   * @param {String} userId - User ID
   * @returns {Object} Created standard agent
   */
  async createStandardAgentViaAPI(strategyData, userId) {
    try {
      const agentCreationData = {
        message: `Create a ${strategyData.primaryStrategy} strategy agent for automated execution`,
        userId: userId,
        agentId: 'new-agent-creation'
      };

      // Make HTTP call to the existing agent route
      const response = await axios.post('http://localhost:5001/api/agent/route', agentCreationData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.success) {
        console.log('✅ Standard agent created via API');
        return response.data.data;
      } else {
        throw new Error('Agent creation via API failed: ' + response.data.message);
      }

    } catch (error) {
      console.error('❌ Error creating agent via API:', error);
      
      // Fallback to direct database creation
      console.log('🔄 Falling back to direct agent creation...');
      return await this.createStandardAgent(strategyData, userId);
    }
  }

  /**
   * Link the created agent to the user model
   * @param {String} userId - User ID
   * @param {String} agentId - Agent ID to link
   */
  async linkAgentToUser(userId, agentId) {
    try {
      await User.findByIdAndUpdate(userId, {
        agentId: agentId,
        // Update user type if they now have an agent
        userType: 'human' // Keep as human but with linked agent
      });

      console.log('✅ Agent linked to user:', { userId, agentId });

    } catch (error) {
      console.error('❌ Error linking agent to user:', error);
      // Don't throw here as it's not critical for the main flow
    }
  }

  /**
   * Alternative flow: Create executor agent using the existing HTTP route
   * This method demonstrates how to integrate with http://localhost:5001/api/agent/route
   * @param {Object} strategyData - Strategy data with action plan
   * @param {String} userId - User ID
   * @param {String} parentAgentId - Parent agent ID (optional)
   * @returns {Object} Created executor agent with HTTP integration
   */
  async createExecutorAgentWithHTTPRoute(strategyData, userId, parentAgentId = null) {
    try {
      console.log('🌐 Creating executor agent using HTTP route integration...');

      // Step 1: Create agent using the existing HTTP route
      const agentCreationResult = await this.createStandardAgentViaAPI(strategyData, userId);
      
      if (!agentCreationResult) {
        throw new Error('Failed to create agent via HTTP route');
      }

      // Step 2: Extract agent information from the HTTP response
      let standardAgent;
      if (agentCreationResult.metadata && agentCreationResult.metadata.savedStrategy) {
        // If the route created a strategy, get the agent from there
        const strategy = await Strategy.findById(agentCreationResult.metadata.savedStrategy.id);
        if (strategy && strategy.agentId) {
          standardAgent = await Agent.findById(strategy.agentId);
        }
      }

      if (!standardAgent) {
        // Fallback: create agent directly
        console.log('🔄 Fallback: creating agent directly...');
        standardAgent = await this.createStandardAgent(strategyData, userId);
      }

      // Step 3: Create ExecutorAgent (same as before)
      const marketData = await this.getLatestMarketData();
      const monitoredTokens = this.extractTokensFromStrategy(strategyData);

      const executorAgent = new ExecutorAgent({
        name: `Executor - ${standardAgent.name}`,
        description: `HTTP-integrated execution agent for ${strategyData.primaryStrategy} strategy`,
        userId: userId,
        parentAgentId: standardAgent._id,
        linkedStrategyId: strategyData._id,
        
        capabilities: {
          canExecuteTrades: true,
          canManagePortfolio: true,
          canMonitorMarket: true,
          canSendNotifications: true,
          maxTransactionAmount: strategyData.defaultBudget * 0.1,
          allowedTokens: monitoredTokens.map(t => t.symbol),
          riskLevel: strategyData.riskTolerance
        },
        
        executionSettings: {
          autoExecute: false,
          executionSchedule: {
            enabled: true,
            frequency: strategyData.frequency || 'daily',
            timeWindow: { start: '09:00', end: '17:00' },
            timezone: 'UTC'
          },
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000
          },
          notificationSettings: {
            beforeExecution: true,
            afterExecution: true,
            onError: true,
            channels: ['database', 'email']
          }
        },
        
        marketMonitoring: {
          isActive: true,
          monitoredTokens: monitoredTokens.map(token => ({
            symbol: token.symbol,
            priceAlerts: token.alerts || []
          })),
          lastMarketUpdate: new Date(),
          marketDataProvider: 'hederaTokenService'
        },
        
        status: 'created'
      });

      await executorAgent.save();

      // Step 4: Update strategy and user linkages
      await Strategy.findByIdAndUpdate(strategyData._id, {
        executorAgentId: executorAgent._id,
        agentId: standardAgent._id,
        executionStatus: 'not_started',
        'executionMetrics.tasksTotal': this.countTotalTasks(strategyData.actionPlan)
      });

      await this.linkAgentToUser(userId, standardAgent._id);

      console.log('✅ HTTP-integrated executor agent created successfully:', {
        standardAgent: standardAgent._id,
        executorAgent: executorAgent._id,
        httpIntegration: true
      });

      return {
        executorAgent,
        standardAgent,
        linkedStrategy: strategyData._id,
        httpIntegration: true,
        originalHttpResponse: agentCreationResult
      };

    } catch (error) {
      console.error('❌ Error creating HTTP-integrated executor agent:', error);
      
      // Fallback to direct creation if HTTP integration fails
      console.log('🔄 Falling back to direct agent creation...');
      return await this.createExecutorAgent(strategyData, userId, parentAgentId);
    }
  }

  /**
   * Prepare a strategy for execution by creating actionable tasks
   * @param {Object} strategy - Strategy document
   * @param {Object} marketData - Current market data
   * @returns {Object} Updated strategy with prepared action plan
   */
  async prepareStrategyExecution(strategy, marketData) {
    try {
      console.log('📋 Preparing strategy execution for:', strategy._id);

      // Enhance action plan with current market data
      const enhancedActionPlan = await this.enhanceActionPlanWithMarketData(
        strategy.actionPlan,
        marketData
      );

      // Generate unique task IDs and set initial conditions
      const preparedPlan = this.prepareTasks(enhancedActionPlan);

      // Update strategy document
      const updatedStrategy = await Strategy.findByIdAndUpdate(
        strategy._id,
        {
          actionPlan: preparedPlan,
          marketDataSnapshot: {
            timestamp: new Date(),
            hederaMarketCap: marketData.marketCap || 0,
            totalVolume24h: marketData.totalVolume || 0,
            tokensPrices: this.extractTokenPrices(marketData),
            topTokens: marketData.topTokens?.slice(0, 10) || [],
            marketSentiment: this.analyzeMarketSentiment(marketData)
          },
          executionStatus: 'not_started',
          'executionMetrics.tasksTotal': this.countTotalTasks(preparedPlan)
        },
        { new: true }
      );

      console.log('✅ Strategy execution prepared successfully');
      return updatedStrategy;

    } catch (error) {
      console.error('❌ Error preparing strategy execution:', error);
      throw error;
    }
  }

  /**
   * Execute a specific task from the action plan
   * @param {String} executorAgentId - Executor agent ID
   * @param {String} taskId - Task ID to execute
   * @param {Boolean} dryRun - Whether to simulate execution
   * @returns {Object} Execution result
   */
  async executeTask(executorAgentId, taskId, dryRun = true) {
    try {
      console.log(`${dryRun ? '🧪' : '⚡'} ${dryRun ? 'Simulating' : 'Executing'} task:`, taskId);

      const executorAgent = await ExecutorAgent.findById(executorAgentId)
        .populate('linkedStrategyId');
      
      if (!executorAgent) {
        throw new Error('Executor agent not found');
      }

      const strategy = executorAgent.linkedStrategyId;
      const task = this.findTaskInStrategy(strategy, taskId);
      
      if (!task) {
        throw new Error('Task not found in strategy');
      }

      // Check if agent can execute this task
      if (!this.canExecuteTask(executorAgent, task)) {
        throw new Error('Agent not authorized to execute this task');
      }

      // Get current market data for execution context
      const currentMarketData = await this.getLatestMarketData();
      
      // Check task execution conditions
      const conditionsCheck = await this.checkExecutionConditions(task, currentMarketData);
      if (!conditionsCheck.canExecute) {
        return {
          success: false,
          reason: 'Execution conditions not met',
          details: conditionsCheck.reason,
          task: task,
          dryRun: dryRun
        };
      }

      // Update agent state
      executorAgent.executionState.status = 'executing';
      executorAgent.executionState.currentTask = {
        taskId: taskId,
        taskType: task.taskType,
        startedAt: new Date(),
        expectedCompletion: new Date(Date.now() + 300000) // 5 minutes
      };
      await executorAgent.save();

      let executionResult;

      if (dryRun) {
        // Simulate execution
        executionResult = await this.simulateTaskExecution(task, currentMarketData);
      } else {
        // Actual execution
        executionResult = await this.performActualExecution(task, executorAgent, currentMarketData);
      }

      // Update task status in strategy
      await this.updateTaskStatus(strategy._id, taskId, executionResult);

      // Update executor agent metrics
      executorAgent.updateMetrics(executionResult);
      executorAgent.executionState.status = 'idle';
      executorAgent.executionState.lastExecution = {
        timestamp: new Date(),
        taskId: taskId,
        success: executionResult.success,
        details: executionResult.details || ''
      };
      await executorAgent.save();

      console.log(`✅ Task ${dryRun ? 'simulation' : 'execution'} completed:`, taskId);
      return {
        success: true,
        task: task,
        executionResult: executionResult,
        dryRun: dryRun,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Error ${dryRun ? 'simulating' : 'executing'} task:`, error);
      
      // Update agent error state
      if (executorAgentId) {
        try {
          const agent = await ExecutorAgent.findById(executorAgentId);
          if (agent) {
            agent.addError(taskId, error.message);
            agent.executionState.status = 'error';
            await agent.save();
          }
        } catch (updateError) {
          console.error('Error updating agent error state:', updateError);
        }
      }

      return {
        success: false,
        error: error.message,
        task: null,
        dryRun: dryRun,
        timestamp: new Date()
      };
    }
  }

  /**
   * Monitor market conditions and trigger actions when conditions are met
   * @param {String} executorAgentId - Executor agent ID
   * @returns {Object} Monitoring result
   */
  async monitorAndExecute(executorAgentId) {
    try {
      const executorAgent = await ExecutorAgent.findById(executorAgentId)
        .populate('linkedStrategyId');

      if (!executorAgent || executorAgent.status !== 'active') {
        return { success: false, reason: 'Agent not active' };
      }

      const strategy = executorAgent.linkedStrategyId;
      const currentMarketData = await this.getLatestMarketData();

      // Find tasks ready for execution
      const readyTasks = this.findReadyTasks(strategy, currentMarketData);

      if (readyTasks.length === 0) {
        // Update market monitoring timestamp
        executorAgent.marketMonitoring.lastMarketUpdate = new Date();
        await executorAgent.save();
        
        return {
          success: true,
          message: 'No tasks ready for execution',
          readyTasksCount: 0,
          marketData: {
            timestamp: currentMarketData.timestamp,
            sentiment: this.analyzeMarketSentiment(currentMarketData)
          }
        };
      }

      const executionResults = [];

      for (const task of readyTasks) {
        if (executorAgent.executionSettings.autoExecute) {
          // Auto-execute if enabled
          const result = await this.executeTask(executorAgentId, task.taskId, false);
          executionResults.push(result);
        } else {
          // Queue for manual approval
          this.executionQueue.push({
            agentId: executorAgentId,
            taskId: task.taskId,
            queuedAt: new Date(),
            priority: task.priority
          });
        }
      }

      return {
        success: true,
        readyTasksCount: readyTasks.length,
        executionResults: executionResults,
        queuedTasks: this.executionQueue.filter(q => q.agentId === executorAgentId).length,
        autoExecuted: executorAgent.executionSettings.autoExecute
      };

    } catch (error) {
      console.error('❌ Error in monitoring and execution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods

  async getLatestMarketData() {
    try {
      const topTokens = hederaTokenService.getTopTokens(20);
      const stats = hederaTokenService.getStats();
      
      return {
        topTokens: topTokens,
        hederaStats: stats,
        marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
        totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return {
        topTokens: [],
        hederaStats: {},
        marketCap: 0,
        totalVolume: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  extractTokensFromStrategy(strategy) {
    const tokens = new Set();
    
    if (strategy.actionPlan && strategy.actionPlan.phases) {
      strategy.actionPlan.phases.forEach(phase => {
        phase.tasks.forEach(task => {
          if (task.tokenSymbol) {
            tokens.add(task.tokenSymbol);
          }
        });
      });
    }

    return Array.from(tokens).map(symbol => ({ symbol }));
  }

  countTotalTasks(actionPlan) {
    if (!actionPlan || !actionPlan.phases) return 0;
    
    return actionPlan.phases.reduce((total, phase) => {
      return total + (phase.tasks ? phase.tasks.length : 0);
    }, 0);
  }

  async enhanceActionPlanWithMarketData(actionPlan, marketData) {
    // Add current market context to tasks
    if (actionPlan && actionPlan.phases) {
      actionPlan.phases.forEach(phase => {
        phase.tasks.forEach(task => {
          // Add market context to trigger conditions
          if (task.tokenSymbol && marketData.topTokens) {
            const tokenData = marketData.topTokens.find(t => t.symbol === task.tokenSymbol);
            if (tokenData) {
              task.currentPrice = tokenData.priceUsd;
              task.currentVolume = tokenData.volume24h;
              task.priceChange24h = tokenData.change24h;
            }
          }
        });
      });
    }

    return actionPlan;
  }

  prepareTasks(actionPlan) {
    if (!actionPlan || !actionPlan.phases) return actionPlan;

    actionPlan.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if (!task.taskId) {
          task.taskId = `task_${uuidv4()}`;
        }
        if (!task.createdAt) {
          task.createdAt = new Date();
        }
        if (!task.status) {
          task.status = 'pending';
        }
      });
    });

    return actionPlan;
  }

  extractTokenPrices(marketData) {
    const prices = {};
    if (marketData.topTokens) {
      marketData.topTokens.forEach(token => {
        prices[token.symbol] = token.priceUsd;
      });
    }
    return prices;
  }

  analyzeMarketSentiment(marketData) {
    if (!marketData.topTokens || marketData.topTokens.length === 0) {
      return 'neutral';
    }

    const changes = marketData.topTokens
      .filter(t => t.change24h !== undefined)
      .map(t => t.change24h);

    if (changes.length === 0) return 'neutral';

    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const volatility = Math.sqrt(changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length);

    if (volatility > 10) return 'volatile';
    if (avgChange > 2) return 'bullish';
    if (avgChange < -2) return 'bearish';
    return 'neutral';
  }

  findTaskInStrategy(strategy, taskId) {
    if (!strategy.actionPlan || !strategy.actionPlan.phases) return null;

    for (const phase of strategy.actionPlan.phases) {
      const task = phase.tasks.find(t => t.taskId === taskId);
      if (task) return task;
    }
    return null;
  }

  canExecuteTask(executorAgent, task) {
    // Check if agent has required capabilities
    if (!executorAgent.capabilities.canExecuteTrades && 
        ['BUY', 'SELL', 'SWAP'].includes(task.taskType)) {
      return false;
    }

    // Check token allowlist
    if (task.tokenSymbol && 
        !executorAgent.capabilities.allowedTokens.includes(task.tokenSymbol)) {
      return false;
    }

    // Check transaction amount limits
    if (task.allocation && 
        parseFloat(task.allocation) > executorAgent.capabilities.maxTransactionAmount) {
      return false;
    }

    return true;
  }

  async checkExecutionConditions(task, marketData) {
    if (!task.triggerConditions) {
      return { canExecute: true, reason: 'No conditions specified' };
    }

    const conditions = task.triggerConditions;
    const tokenData = marketData.topTokens?.find(t => t.symbol === task.tokenSymbol);

    if (!tokenData) {
      return { canExecute: false, reason: 'Token data not available' };
    }

    // Check price conditions
    if (conditions.priceAbove && tokenData.priceUsd <= conditions.priceAbove) {
      return { canExecute: false, reason: `Price ${tokenData.priceUsd} not above ${conditions.priceAbove}` };
    }

    if (conditions.priceBelow && tokenData.priceUsd >= conditions.priceBelow) {
      return { canExecute: false, reason: `Price ${tokenData.priceUsd} not below ${conditions.priceBelow}` };
    }

    // Check volume conditions
    if (conditions.volumeThreshold && tokenData.volume24h < conditions.volumeThreshold) {
      return { canExecute: false, reason: 'Volume threshold not met' };
    }

    return { canExecute: true, reason: 'All conditions met' };
  }

  async simulateTaskExecution(task, marketData) {
    // Simulate the execution without actually performing it
    const tokenData = marketData.topTokens?.find(t => t.symbol === task.tokenSymbol);
    
    return {
      success: true,
      simulated: true,
      taskType: task.taskType,
      tokenSymbol: task.tokenSymbol,
      simulatedPrice: tokenData?.priceUsd || 0,
      simulatedAmount: task.allocation || '0',
      estimatedGas: '0.001',
      details: `Simulated ${task.taskType} for ${task.tokenSymbol}`,
      timestamp: new Date()
    };
  }

  async performActualExecution(task, executorAgent, marketData) {
    // This would integrate with the actual Hedera transaction system
    // For now, return a mock result
    console.log('🚧 Actual execution not implemented yet - returning mock result');
    
    return {
      success: true,
      simulated: false,
      taskType: task.taskType,
      tokenSymbol: task.tokenSymbol,
      transactionHash: `mock_tx_${Date.now()}`,
      actualPrice: 0,
      actualAmount: task.allocation || '0',
      gasUsed: '0.001',
      details: `Mock execution of ${task.taskType} for ${task.tokenSymbol}`,
      timestamp: new Date()
    };
  }

  async updateTaskStatus(strategyId, taskId, executionResult) {
    const strategy = await Strategy.findById(strategyId);
    if (!strategy || !strategy.actionPlan) return;

    for (const phase of strategy.actionPlan.phases) {
      const task = phase.tasks.find(t => t.taskId === taskId);
      if (task) {
        task.status = executionResult.success ? 'executed' : 'failed';
        task.executedAt = new Date();
        task.executionResult = {
          success: executionResult.success,
          transactionHash: executionResult.transactionHash,
          amountExecuted: executionResult.actualAmount || executionResult.simulatedAmount,
          priceExecuted: executionResult.actualPrice || executionResult.simulatedPrice,
          gasUsed: executionResult.gasUsed,
          errorMessage: executionResult.success ? null : executionResult.details
        };
        break;
      }
    }

    await strategy.save();
  }

  findReadyTasks(strategy, marketData) {
    const readyTasks = [];
    
    if (!strategy.actionPlan || !strategy.actionPlan.phases) return readyTasks;

    for (const phase of strategy.actionPlan.phases) {
      for (const task of phase.tasks) {
        if (task.status === 'pending') {
          const conditionsCheck = this.checkExecutionConditions(task, marketData);
          if (conditionsCheck.canExecute) {
            readyTasks.push(task);
          }
        }
      }
    }

    return readyTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = new ActionExecutionService();
