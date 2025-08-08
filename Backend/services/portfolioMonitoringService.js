const Wallet = require('../models/Wallet');
const Agent = require('../models/Agent');
const Memory = require('../models/Memory');

class PortfolioMonitoringService {
  /**
   * Monitor all active agent portfolios
   * @returns {Object} Monitoring results
   */
  static async monitorAllPortfolios() {
    try {
      console.log('\n📊 PORTFOLIO MONITORING STARTED');
      console.log('═'.repeat(60));
      
      const activeWallets = await Wallet.find({ isActive: true })
        .populate('agentId', 'name primaryStrategy configuration');
      
      console.log(`📈 Found ${activeWallets.length} active wallets to monitor`);
      
      const results = {
        totalWallets: activeWallets.length,
        actionsTriggered: 0,
        alerts: [],
        performance: []
      };
      
      for (const wallet of activeWallets) {
        if (!wallet.agentId) continue;
        
        const monitoring = await this.monitorSinglePortfolio(wallet);
        results.actionsTriggered += monitoring.actionsTriggered;
        results.alerts.push(...monitoring.alerts);
        results.performance.push(monitoring.performance);
      }
      
      console.log(`✅ MONITORING COMPLETED: ${results.actionsTriggered} actions triggered`);
      return results;
      
    } catch (error) {
      console.error('❌ Portfolio monitoring error:', error);
      throw new Error(`Portfolio monitoring failed: ${error.message}`);
    }
  }

  /**
   * Monitor a single portfolio and execute actions based on rules
   * @param {Object} wallet - Wallet to monitor
   * @returns {Object} Monitoring result
   */
  static async monitorSinglePortfolio(wallet) {
    try {
      const agent = wallet.agentId;
      console.log(`\n🔍 MONITORING: ${agent.name} (${wallet.walletAddress})`);
      
      const result = {
        walletId: wallet._id,
        agentName: agent.name,
        actionsTriggered: 0,
        alerts: [],
        performance: null
      };
      
      // Calculate current performance
      const performance = wallet.calculatePerformance();
      result.performance = {
        ...performance,
        currentValue: wallet.portfolioValue.current,
        initialValue: wallet.portfolioValue.initial,
        peakValue: wallet.portfolioValue.peak
      };
      
      console.log(`💰 Portfolio Value: $${wallet.portfolioValue.current} (ROI: ${performance.roi.toFixed(2)}%)`);
      
      // Check for rebalancing triggers based on portfolio performance
      const triggers = await this.checkRebalancingTriggers(wallet, agent);
      
      if (triggers.length > 0) {
        console.log(`⚡ Found ${triggers.length} triggers:`, triggers.map(t => t.type));
        
        for (const trigger of triggers) {
          const action = await this.executeTriggerAction(wallet, agent, trigger);
          if (action) {
            result.actionsTriggered++;
            result.alerts.push({
              type: 'action_executed',
              trigger: trigger.type,
              action: action.actionType,
              details: action.reasoning
            });
          }
        }
      }
      
      // Check individual token performance (simulated for now)
      const tokenAlerts = await this.checkTokenPerformance(wallet, agent);
      result.alerts.push(...tokenAlerts);
      
      // Update last interaction time
      agent.lastInteraction = new Date();
      await agent.save();
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error monitoring ${agent?.name}:`, error);
      return {
        walletId: wallet._id,
        agentName: agent?.name || 'Unknown',
        actionsTriggered: 0,
        alerts: [{
          type: 'monitoring_error',
          message: error.message
        }],
        performance: null
      };
    }
  }

  /**
   * Check for portfolio rebalancing triggers
   * @param {Object} wallet - Wallet to check
   * @param {Object} agent - Associated agent
   * @returns {Array} List of triggered conditions
   */
  static async checkRebalancingTriggers(wallet, agent) {
    const triggers = [];
    const performance = wallet.calculatePerformance();
    const config = agent.configuration;
    
    // Portfolio value increase triggers
    if (performance.roi > 25) {
      triggers.push({
        type: 'high_profit',
        threshold: '25%',
        currentValue: `${performance.roi.toFixed(2)}%`,
        suggestion: 'take_partial_profit'
      });
    }
    
    if (performance.roi > 50) {
      triggers.push({
        type: 'very_high_profit',
        threshold: '50%',
        currentValue: `${performance.roi.toFixed(2)}%`,
        suggestion: 'take_major_profit'
      });
    }
    
    // Portfolio value decrease triggers
    if (performance.roi < -config.stopLossPercentage) {
      triggers.push({
        type: 'stop_loss',
        threshold: `-${config.stopLossPercentage}%`,
        currentValue: `${performance.roi.toFixed(2)}%`,
        suggestion: 'stop_loss_sell'
      });
    }
    
    if (performance.roi < -5 && performance.roi > -config.stopLossPercentage) {
      triggers.push({
        type: 'minor_loss',
        threshold: '-5%',
        currentValue: `${performance.roi.toFixed(2)}%`,
        suggestion: 'buy_dip_or_hold'
      });
    }
    
    // Time-based rebalancing (strategy-dependent)
    const lastUpdate = wallet.portfolioValue.lastUpdated;
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    const frequencyMap = {
      'scalping': 1,      // 1 hour
      'day_trading': 4,   // 4 hours
      'swing_trading': 24, // 1 day
      'DCA': 168,         // 1 week
      'hodl': 720         // 1 month
    };
    
    const requiredHours = frequencyMap[agent.primaryStrategy] || 24;
    
    if (hoursSinceUpdate > requiredHours) {
      triggers.push({
        type: 'scheduled_review',
        threshold: `${requiredHours} hours`,
        currentValue: `${hoursSinceUpdate.toFixed(1)} hours`,
        suggestion: 'periodic_rebalance'
      });
    }
    
    return triggers;
  }

  /**
   * Execute action based on trigger
   * @param {Object} wallet - Target wallet
   * @param {Object} agent - Associated agent
   * @param {Object} trigger - Trigger condition
   * @returns {Object} Executed action
   */
  static async executeTriggerAction(wallet, agent, trigger) {
    try {
      console.log(`🚀 EXECUTING ACTION: ${trigger.suggestion} for ${agent.name}`);
      
      let action = null;
      
      switch (trigger.suggestion) {
        case 'take_partial_profit':
          action = {
            actionType: 'SELL',
            percentage: '25%',
            reasoning: `Taking 25% profit due to ${trigger.currentValue} ROI`,
            priority: 'medium',
            tokenPair: 'PORTFOLIO/USDC'
          };
          break;
          
        case 'take_major_profit':
          action = {
            actionType: 'SELL',
            percentage: '50%',
            reasoning: `Taking 50% profit due to ${trigger.currentValue} ROI`,
            priority: 'high',
            tokenPair: 'PORTFOLIO/USDC'
          };
          break;
          
        case 'stop_loss_sell':
          action = {
            actionType: 'SELL',
            percentage: '100%',
            reasoning: `Stop loss triggered at ${trigger.currentValue}`,
            priority: 'high',
            tokenPair: 'PORTFOLIO/USDC'
          };
          break;
          
        case 'buy_dip_or_hold':
          action = {
            actionType: agent.configuration.riskTolerance === 'aggressive' ? 'BUY' : 'HOLD',
            percentage: '10%',
            reasoning: `Portfolio down ${trigger.currentValue}, buying dip or holding based on risk tolerance`,
            priority: 'medium',
            tokenPair: 'USDC/PORTFOLIO'
          };
          break;
          
        case 'periodic_rebalance':
          action = {
            actionType: 'HOLD',
            percentage: '0%',
            reasoning: `Scheduled review after ${trigger.currentValue}, portfolio rebalancing recommended`,
            priority: 'low',
            tokenPair: 'PORTFOLIO'
          };
          break;
      }
      
      if (action) {
        // Record the action in wallet trading history
        wallet.addTrade({
          action: action.actionType,
          tokenPair: action.tokenPair,
          amount: 0, // Simulated for now
          price: 0,  // Simulated for now
          status: 'pending'
        });
        
        // Save memory of the action
        const memory = new Memory({
          userId: 'system',
          sessionId: `monitoring_${Date.now()}`,
          agentId: agent._id,
          userMessage: `Automated action triggered: ${trigger.type}`,
          extractedParameters: {
            intent: 'automated_action',
            riskIndicators: trigger.suggestion,
            budgetHints: action.percentage
          },
          strategyType: agent.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
          budgetAmount: wallet.portfolioValue.current,
          actions: [{
            step: 1,
            actionType: action.actionType,
            percentage: action.percentage,
            tokenPair: action.tokenPair,
            ref: `AUTO_${Date.now()}`,
            priority: action.priority,
            reasoning: action.reasoning
          }],
          summary: `Automated ${action.actionType} action triggered by ${trigger.type}`,
          outcome: 'pending'
        });
        
        await memory.save();
        await wallet.save();
        
        console.log(`✅ Action executed and recorded: ${action.actionType} - ${action.reasoning}`);
      }
      
      return action;
      
    } catch (error) {
      console.error('❌ Error executing trigger action:', error);
      return null;
    }
  }

  /**
   * Check individual token performance in portfolio
   * @param {Object} wallet - Wallet to check
   * @param {Object} agent - Associated agent
   * @returns {Array} Token alerts
   */
  static async checkTokenPerformance(wallet, agent) {
    const alerts = [];
    
    // Simulated token performance checking
    // In a real implementation, this would check actual token prices and compare with thresholds
    
    for (const token of wallet.balance.tokens) {
      // Simulate price movements for demonstration
      const priceChange = (Math.random() - 0.5) * 20; // Random -10% to +10%
      
      if (priceChange > 15) {
        alerts.push({
          type: 'token_pump',
          token: token.symbol,
          change: `+${priceChange.toFixed(2)}%`,
          suggestion: 'Consider taking profits'
        });
      } else if (priceChange < -15) {
        alerts.push({
          type: 'token_dump',
          token: token.symbol,
          change: `${priceChange.toFixed(2)}%`,
          suggestion: 'Consider stop loss or buy dip'
        });
      }
    }
    
    return alerts;
  }

  /**
   * Get monitoring frequency based on strategy
   * @param {String} strategy - Trading strategy
   * @returns {String} Monitoring frequency
   */
  static getMonitoringFrequency(strategy) {
    const frequencies = {
      'scalping': 'every 15 minutes',
      'day_trading': 'every hour',
      'swing_trading': 'every 4 hours',
      'momentum_trading': 'every 2 hours',
      'DCA': 'daily',
      'hodl': 'weekly',
      'yield_farming': 'daily',
      'arbitrage': 'every 5 minutes',
      'memecoin': 'every 30 minutes'
    };
    
    return frequencies[strategy] || 'daily';
  }

  /**
   * Start automated monitoring service
   * @param {Number} intervalMinutes - Monitoring interval in minutes
   */
  static startAutomatedMonitoring(intervalMinutes = 60) {
    console.log(`🤖 STARTING AUTOMATED PORTFOLIO MONITORING (every ${intervalMinutes} minutes)`);
    
    const interval = setInterval(async () => {
      try {
        await this.monitorAllPortfolios();
      } catch (error) {
        console.error('❌ Automated monitoring error:', error);
      }
    }, intervalMinutes * 60 * 1000);
    
    return interval;
  }
}

module.exports = PortfolioMonitoringService; 