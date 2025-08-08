# Dynamic Strategy System with Real-time Market Analysis

This document describes the implementation of a dynamic prompt system that integrates real-time market analysis data, creates actionable strategies, saves them to the database, and prepares AI agents for execution.

## 🎯 Overview

The system ensures that prompts are not static by:
1. **Real-time Market Data Integration**: Fetches live Hedera market data for analysis
2. **Dynamic Strategy Creation**: Generates strategies based on current market conditions
3. **Actionable Task Plans**: Creates specific, executable tasks with trigger conditions
4. **Database Persistence**: Saves strategies with market snapshots to the database
5. **Executor Agent Creation**: Creates specialized agents to execute the strategies
6. **Execution Framework**: Prepares the execution system (without executing yet)

## 🏗️ Architecture

### Core Components

1. **Enhanced Strategy Model** (`models/Strategy.js`)
   - Added real-time market data snapshot
   - Actionable task planning with phases
   - Execution tracking and metrics
   - Trigger conditions for automated execution

2. **ExecutorAgent Model** (`models/ExecutorAgent.js`)
   - Specialized agents for strategy execution
   - Capability management and constraints
   - Performance tracking and metrics
   - Market monitoring configuration

3. **Action Execution Service** (`services/actionExecutionService.js`)
   - Task execution engine (with dry-run capability)
   - Market condition monitoring
   - Trigger condition evaluation
   - Risk management and validation

4. **Enhanced Prompt Router** (`controllers/promptRouterController.js`)
   - Dynamic market data integration
   - Real-time strategy prompt generation
   - Database integration for strategy persistence
   - Executor agent creation coordination

## 📊 Real-time Market Data Integration

### Data Sources
- **Hedera Token Service**: Live token prices, volumes, market caps
- **Market Trends**: Volatility index, liquidity scores, sentiment analysis
- **Token-specific Data**: Live price feeds, trading volumes, pool liquidity

### Market Data Structure
```javascript
{
  topTokens: [...],           // Top Hedera tokens by volume/market cap
  hederaStats: {...},         // Network statistics
  marketCap: 123456789,       // Total market capitalization
  totalVolume: 987654321,     // 24h trading volume
  volatilityIndex: 15.2,      // Calculated volatility percentage
  marketTrend: 'bullish',     // bullish/bearish/sideways/volatile
  liquidityScore: 85,         // Liquidity availability score
  timestamp: '2024-01-20T...' // Data freshness timestamp
}
```

## 🎯 Strategy Creation Workflow

### 1. Dynamic Prompt Generation
The system builds AI prompts with real-time market context:

```javascript
// Example enhanced prompt structure
{
  systemPrompt: `You are a DeFi strategist with real-time market data:
    - Current Market Trend: ${marketTrend}
    - Volatility Index: ${volatilityIndex}%
    - Market Cap: $${marketCap}M
    - Create executable action plans with trigger conditions...`,
  
  userPrompt: `User Request: "${message}"
    Current Market Data: [live token prices and analysis]
    Create strategy with specific tasks and automation triggers...`
}
```

### 2. AI Strategy Generation
The AI generates comprehensive strategies with:
- **Market Analysis**: Current conditions and opportunities
- **Action Plans**: Phased execution with specific tasks
- **Risk Management**: Stop-loss, take-profit, position sizing
- **Trigger Conditions**: Automated execution parameters
- **Timeline**: Realistic execution schedule

### 3. Database Persistence
Strategies are saved with complete market context:

```javascript
const strategy = new Strategy({
  // Basic strategy info
  userId, agentId, description, riskTolerance,
  
  // Real-time market snapshot
  marketDataSnapshot: {
    timestamp: new Date(),
    hederaMarketCap: marketData.marketCap,
    tokensPrices: extractedPrices,
    marketSentiment: marketTrend
  },
  
  // Actionable task plan
  actionPlan: {
    phases: [{
      phaseNumber: 1,
      phaseName: "Initial Allocation",
      tasks: [{
        taskId: "task_12345",
        taskType: "BUY",
        tokenSymbol: "HBAR",
        allocation: "40%",
        triggerConditions: {
          priceBelow: 0.067,
          volumeThreshold: 1000000
        }
      }]
    }]
  }
});
```

## 🤖 Executor Agent System

### Agent Creation
When a strategy is created, an ExecutorAgent is automatically generated:

```javascript
const executorAgent = new ExecutorAgent({
  name: `Executor Agent - ${strategyName}`,
  linkedStrategyId: strategy._id,
  
  capabilities: {
    canExecuteTrades: true,
    maxTransactionAmount: budget * 0.1,
    allowedTokens: extractedTokens,
    riskLevel: strategy.riskTolerance
  },
  
  executionSettings: {
    autoExecute: false,  // Manual approval required initially
    executionSchedule: {
      frequency: 'daily',
      timeWindow: { start: '09:00', end: '17:00' }
    }
  },
  
  marketMonitoring: {
    isActive: true,
    monitoredTokens: tokensFromStrategy
  }
});
```

### Agent Capabilities
- **Trade Execution**: Buy, sell, swap operations
- **Portfolio Management**: Rebalancing, monitoring
- **Risk Management**: Stop-loss, position limits
- **Market Monitoring**: Price alerts, condition tracking

## ⚡ Task Execution Framework

### Task Types
- `BUY`: Purchase tokens
- `SELL`: Sell positions
- `SWAP`: Token exchanges
- `STAKE`: Staking operations
- `MONITOR`: Market monitoring
- `REBALANCE`: Portfolio adjustments
- `STOP_LOSS`: Risk management
- `TAKE_PROFIT`: Profit taking
- `DCA`: Dollar-cost averaging

### Trigger Conditions
```javascript
triggerConditions: {
  priceAbove: 0.08,           // Execute when price above this
  priceBelow: 0.06,           // Execute when price below this
  volumeThreshold: 1000000,   // Minimum volume requirement
  marketCondition: 'stable',  // Market state requirement
  timeCondition: 'market_hours' // Time-based triggers
}
```

### Execution Modes
1. **Dry Run**: Simulate execution without actual trades
2. **Manual Approval**: Queue tasks for user approval
3. **Automated**: Execute when conditions are met (future)

## 🛡️ Risk Management

### Portfolio Level
- Global stop-loss percentage
- Maximum drawdown limits
- Position size constraints
- Diversification requirements

### Task Level
- Individual task risk scoring
- Market condition validation
- Liquidity requirements
- Price impact assessment

### Agent Level
- Transaction amount limits
- Allowed token restrictions
- Time-based controls
- Error handling and recovery

## 📈 Performance Tracking

### Strategy Metrics
- Execution progress (tasks completed/total)
- Performance vs. targets
- Risk-adjusted returns
- Market timing effectiveness

### Agent Metrics
- Success rate (uptime percentage)
- Total executions
- Profit/loss tracking
- Error frequency

## 🔄 API Endpoints

### Strategy Management
- `POST /api/prompt-router/route` - Create strategy with real-time data
- `GET /api/strategies/{id}` - Get strategy details
- `PUT /api/strategies/{id}/status` - Update execution status

### Executor Agent Management
- `GET /api/executor-agents` - List user's executor agents
- `GET /api/executor-agents/{id}` - Get agent details
- `POST /api/executor-agents/{id}/execute-task` - Execute specific task
- `POST /api/executor-agents/{id}/monitor` - Monitor and auto-execute
- `GET /api/executor-agents/{id}/performance` - Get performance metrics

### Task Management
- `GET /api/executor-agents/{id}/tasks` - List strategy tasks
- `GET /api/executor-agents/{id}/strategy` - Get linked strategy

## 🧪 Testing

Run the comprehensive test suite:

```bash
node Backend/test-dynamic-strategy-system.js
```

The test demonstrates:
1. Real-time market data integration
2. Dynamic strategy creation with AI
3. Database persistence with market snapshots
4. Executor agent creation and linking
5. Task execution framework (dry run)
6. Market monitoring capabilities

## 🚀 Usage Example

### 1. Strategy Creation Request
```javascript
const response = await fetch('/api/prompt-router/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Create aggressive growth strategy for HBAR and SAUCE with $5000",
    userId: "user123",
    agentId: "agent456"
  })
});
```

### 2. System Response
```javascript
{
  success: true,
  data: {
    strategy: { /* AI-generated strategy */ },
    actionPlan: { /* Executable tasks */ },
    marketContext: { /* Real-time market data */ }
  },
  metadata: {
    savedStrategy: { id: "strategy_id", status: "generated" },
    executorAgent: { id: "agent_id", status: "created" },
    marketDataUsed: { realTimeData: true, tokensAnalyzed: 50 }
  }
}
```

### 3. Task Execution
```javascript
// Execute a specific task (dry run)
const result = await fetch('/api/executor-agents/agent_id/execute-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: "task_12345",
    dryRun: true
  })
});
```

## 🎯 Key Features Implemented

✅ **Non-static Prompts**: AI prompts built with real-time market data  
✅ **Real-time Market Analysis**: Live Hedera token data integration  
✅ **Actionable Strategies**: Specific tasks with execution parameters  
✅ **Database Persistence**: Strategies saved with market snapshots  
✅ **Executor Agents**: Specialized agents for strategy execution  
✅ **Execution Framework**: Ready for task execution (prepared, not executing)  
✅ **Risk Management**: Multi-level risk controls and validation  
✅ **Performance Tracking**: Comprehensive metrics and monitoring  
✅ **API Integration**: Complete REST API for management  

## 🔮 Future Enhancements

- **Live Execution**: Actual trade execution (currently prepared)
- **Advanced Triggers**: More sophisticated market conditions
- **Machine Learning**: Strategy optimization based on performance
- **Cross-chain Support**: Multi-network strategy execution
- **Social Trading**: Strategy sharing and copying
- **Portfolio Analytics**: Advanced performance analysis

## 📞 Support

For questions or issues with the Dynamic Strategy System:
1. Check the test script for usage examples
2. Review API documentation at `/api-docs`
3. Examine the database models for data structure
4. Test individual components using the provided endpoints

The system is now ready for integration and can be extended with actual trade execution when ready to go live.
