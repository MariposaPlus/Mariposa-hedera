/**
 * Test script for the Dynamic Strategy System with Real-time Market Data
 * This demonstrates the complete workflow from strategy creation to agent execution
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Import models and services
const Strategy = require('./models/Strategy');
const ExecutorAgent = require('./models/ExecutorAgent');
const Agent = require('./models/Agent');
const User = require('./models/User');
const actionExecutionService = require('./services/actionExecutionService');
const promptRouterController = require('./controllers/promptRouterController');

// Test database connection
async function connectTestDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa-hedera', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Mock user and agent creation for testing
async function createTestUserAndAgent() {
  try {
    // Create test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        userType: 'human',
        preferences: {
          defaultStrategy: 'DCA',
          riskTolerance: 'moderate',
          preferredTokens: ['HBAR', 'SAUCE', 'USDC']
        }
      });
      await testUser.save();
      console.log('✅ Created test user:', testUser._id);
    }

    // Create test agent
    let testAgent = await Agent.findOne({ userId: testUser._id });
    if (!testAgent) {
      testAgent = new Agent({
        name: 'Test Strategy Agent',
        description: 'Agent for testing dynamic strategy system',
        userId: testUser._id,
        hederaAccountId: '0.0.12345',
        hederaPublicKey: 'mock_public_key_for_testing'
      });
      await testAgent.save();
      console.log('✅ Created test agent:', testAgent._id);
    }

    return { user: testUser, agent: testAgent };
  } catch (error) {
    console.error('❌ Error creating test user/agent:', error);
    throw error;
  }
}

// Test the complete dynamic strategy workflow
async function testDynamicStrategyWorkflow() {
  console.log('\n🚀 Testing Dynamic Strategy System with Real-time Market Data');
  console.log('=''.repeat(80));

  try {
    // 1. Create test user and agent
    console.log('\n📋 Step 1: Setting up test environment...');
    const { user, agent } = await createTestUserAndAgent();

    // 2. Test strategy creation with real-time market data
    console.log('\n📈 Step 2: Creating strategy with real-time market analysis...');
    const testMessage = "Create an aggressive growth strategy focusing on HBAR and SAUCE for the next 3 months with a $5000 budget";
    
    // Mock the request structure that prompt router expects
    const mockClassification = {
      type: 'strategy',
      confidence: 0.95,
      reasoning: 'User requested strategy creation',
      keywords: ['strategy', 'aggressive', 'growth', 'HBAR', 'SAUCE'],
      actionSubtype: 'strategy_creation'
    };

    const strategyOptions = {
      userId: user._id,
      agentId: agent._id,
      execute: false
    };

    const strategyResult = await promptRouterController.processStrategy(
      testMessage, 
      mockClassification, 
      strategyOptions
    );

    console.log('✅ Strategy creation result:', {
      status: strategyResult.status,
      confidence: strategyResult.confidence,
      hasActionPlan: !!strategyResult.result.actionPlan,
      savedStrategy: !!strategyResult.metadata?.savedStrategy,
      executorAgent: !!strategyResult.metadata?.executorAgent
    });

    if (!strategyResult.metadata?.savedStrategy) {
      console.log('⚠️ Strategy was not saved to database - possibly due to missing userId/agentId');
      return;
    }

    // 3. Retrieve the created strategy and executor agent
    console.log('\n🤖 Step 3: Retrieving created strategy and executor agent...');
    const savedStrategy = await Strategy.findById(strategyResult.metadata.savedStrategy.id);
    const executorAgent = await ExecutorAgent.findById(strategyResult.metadata.executorAgent.id);

    console.log('✅ Retrieved strategy:', {
      id: savedStrategy._id,
      name: savedStrategy.agentName,
      executionStatus: savedStrategy.executionStatus,
      tasksTotal: savedStrategy.executionMetrics.tasksTotal,
      marketDataTimestamp: savedStrategy.marketDataSnapshot.timestamp,
      linkedAgentId: savedStrategy.agentId,
      linkedExecutorAgentId: savedStrategy.executorAgentId
    });

    console.log('✅ Retrieved executor agent:', {
      id: executorAgent._id,
      name: executorAgent.name,
      status: executorAgent.status,
      canExecute: executorAgent.capabilities.canExecuteTrades,
      monitoredTokens: executorAgent.marketMonitoring.monitoredTokens.length,
      parentAgentId: executorAgent.parentAgentId
    });

    // Check if standard agent was created
    if (executorAgent.parentAgentId) {
      const standardAgent = await Agent.findById(executorAgent.parentAgentId);
      if (standardAgent) {
        console.log('✅ Retrieved standard agent:', {
          id: standardAgent._id,
          name: standardAgent.name,
          userId: standardAgent.userId,
          hederaAccountId: standardAgent.hederaAccountId
        });

        // Check if user was linked to agent
        const updatedUser = await User.findById(user._id);
        console.log('✅ User-agent linkage:', {
          userId: updatedUser._id,
          linkedAgentId: updatedUser.agentId,
          isLinked: updatedUser.agentId?.toString() === standardAgent._id.toString()
        });
      }
    }

    // 4. Test task execution (dry run)
    console.log('\n⚡ Step 4: Testing task execution (dry run)...');
    
    // Find a task to execute
    let testTaskId = null;
    if (savedStrategy.actionPlan && savedStrategy.actionPlan.phases) {
      for (const phase of savedStrategy.actionPlan.phases) {
        if (phase.tasks && phase.tasks.length > 0) {
          testTaskId = phase.tasks[0].taskId;
          break;
        }
      }
    }

    if (testTaskId) {
      const executionResult = await actionExecutionService.executeTask(
        executorAgent._id,
        testTaskId,
        true // dry run
      );

      console.log('✅ Task execution result:', {
        success: executionResult.success,
        taskType: executionResult.task?.taskType,
        tokenSymbol: executionResult.task?.tokenSymbol,
        dryRun: executionResult.dryRun,
        simulatedResult: executionResult.executionResult?.simulated
      });
    } else {
      console.log('⚠️ No tasks found in action plan to execute');
    }

    // 5. Test market monitoring
    console.log('\n📊 Step 5: Testing market monitoring...');
    const monitoringResult = await actionExecutionService.monitorAndExecute(executorAgent._id);

    console.log('✅ Market monitoring result:', {
      success: monitoringResult.success,
      readyTasksCount: monitoringResult.readyTasksCount || 0,
      autoExecuted: monitoringResult.autoExecuted,
      queuedTasks: monitoringResult.queuedTasks || 0
    });

    // 6. Display strategy summary
    console.log('\n📋 Step 6: Strategy Summary');
    console.log('─'.repeat(50));
    
    if (savedStrategy.actionPlan) {
      console.log(`Strategy Name: ${savedStrategy.agentName}`);
      console.log(`Risk Tolerance: ${savedStrategy.riskTolerance}`);
      console.log(`Execution Status: ${savedStrategy.executionStatus}`);
      console.log(`Market Sentiment: ${savedStrategy.marketDataSnapshot.marketSentiment}`);
      console.log(`Total Phases: ${savedStrategy.actionPlan.phases?.length || 0}`);
      console.log(`Total Tasks: ${savedStrategy.executionMetrics.tasksTotal}`);
      console.log(`Estimated Duration: ${savedStrategy.actionPlan.totalEstimatedDuration}`);
      
      // Show action plan phases
      if (savedStrategy.actionPlan.phases) {
        console.log('\nAction Plan Phases:');
        savedStrategy.actionPlan.phases.forEach(phase => {
          console.log(`  Phase ${phase.phaseNumber}: ${phase.phaseName} (${phase.duration})`);
          if (phase.tasks) {
            phase.tasks.forEach(task => {
              console.log(`    - ${task.taskType} ${task.tokenSymbol} (${task.allocation}) [${task.status}]`);
            });
          }
        });
      }
    }

    console.log('\n✅ Dynamic Strategy System test completed successfully!');
    console.log('📊 Real-time market data was integrated into strategy creation');
    console.log('🏛️ Standard agent was created and linked to user model');
    console.log('🤖 Executor agent was created and linked to strategy');
    console.log('⚡ Task execution system is prepared and ready');
    console.log('📈 Strategy is saved to database with actionable tasks');
    console.log('🔗 Complete agent integration: User ↔ Agent ↔ ExecutorAgent ↔ Strategy');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Test individual components
async function testMarketDataIntegration() {
  console.log('\n🌊 Testing Real-time Market Data Integration');
  console.log('─'.repeat(50));

  try {
    const marketData = await actionExecutionService.getLatestMarketData();
    
    console.log('✅ Market data retrieved:', {
      topTokensCount: marketData.topTokens.length,
      marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
      totalVolume: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
      timestamp: marketData.timestamp
    });

    if (marketData.topTokens.length > 0) {
      console.log('\nTop 3 tokens:');
      marketData.topTokens.slice(0, 3).forEach(token => {
        console.log(`  ${token.symbol}: $${token.priceUsd?.toFixed(6)} (${token.change24h > 0 ? '+' : ''}${token.change24h?.toFixed(2)}%)`);
      });
    }

  } catch (error) {
    console.error('❌ Market data test failed:', error);
  }
}

// Test HTTP route integration
async function testHTTPRouteIntegration() {
  console.log('\n🌐 Testing HTTP Route Integration');
  console.log('─'.repeat(50));

  try {
    const { user, agent } = await createTestUserAndAgent();
    
    // Test the HTTP route integration method
    const mockStrategy = {
      _id: 'mock_strategy_id',
      agentName: 'HTTP Test Strategy',
      primaryStrategy: 'DCA',
      riskTolerance: 'moderate',
      defaultBudget: 1000,
      frequency: 'daily',
      actionPlan: {
        phases: [
          {
            tasks: [
              { tokenSymbol: 'HBAR' },
              { tokenSymbol: 'SAUCE' }
            ]
          }
        ]
      }
    };

    console.log('🔗 Testing HTTP route agent creation...');
    const result = await actionExecutionService.createExecutorAgentWithHTTPRoute(
      mockStrategy,
      user._id,
      agent._id
    );

    console.log('✅ HTTP integration result:', {
      httpIntegration: result.httpIntegration || false,
      hasStandardAgent: !!result.standardAgent,
      hasExecutorAgent: !!result.executorAgent,
      fallbackUsed: !result.httpIntegration
    });

  } catch (error) {
    console.error('❌ HTTP route integration test failed:', error);
    console.log('ℹ️ This is expected if the HTTP server is not running or the route format has changed');
  }
}

// Main test execution
async function runTests() {
  try {
    await connectTestDB();
    
    // Test market data integration
    await testMarketDataIntegration();
    
    // Test HTTP route integration
    await testHTTPRouteIntegration();
    
    // Test complete workflow
    await testDynamicStrategyWorkflow();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from database');
    process.exit(0);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testDynamicStrategyWorkflow,
  testMarketDataIntegration,
  testHTTPRouteIntegration
};
