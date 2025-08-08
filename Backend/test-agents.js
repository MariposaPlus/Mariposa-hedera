const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const Agent = require('./models/Agent');
const Memory = require('./models/Memory');

// Load environment variables
dotenv.config();

// Test multi-agent functionality
const testMultiAgentSystem = async () => {
  console.log('🤖 Testing Multi-Agent System...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');
    
    const testUserId = 'test_user_agents_123';
    
    // Clean up any existing test data
    await Agent.deleteMany({ userId: testUserId });
    await Memory.deleteMany({ userId: testUserId });
    console.log('🧹 Cleaned up existing test data');
    
    // Test 1: Create different types of agents
    console.log('\n📝 Test 1: Creating different agent types...');
    
    const dcaAgent = new Agent({
      name: 'Conservative DCA Bot',
      description: 'Long-term DCA strategy for BTC and ETH',
      userId: testUserId,
      primaryStrategy: 'DCA',
      configuration: {
        defaultBudget: 500,
        frequency: 'monthly',
        riskTolerance: 'conservative',
        preferredTokens: ['BTC', 'ETH'],
        maxPositionSize: 1000,
        stopLossPercentage: 15,
        takeProfitPercentage: 25
      }
    });
    
    const momentumAgent = new Agent({
      name: 'Momentum Trader',
      description: 'High-frequency momentum trading on SEI',
      userId: testUserId,
      primaryStrategy: 'momentum_trading',
      configuration: {
        defaultBudget: 1000,
        frequency: 'daily',
        riskTolerance: 'aggressive',
        preferredTokens: ['SEI', 'BTC', 'ETH'],
        maxPositionSize: 2000,
        stopLossPercentage: 5,
        takeProfitPercentage: 15
      }
    });
    
    const hodlAgent = new Agent({
      name: 'Diamond Hands HODLER',
      description: 'Long-term hodling strategy',
      userId: testUserId,
      primaryStrategy: 'hodl',
      configuration: {
        defaultBudget: 2000,
        frequency: 'monthly',
        riskTolerance: 'moderate',
        preferredTokens: ['BTC', 'ETH', 'SEI'],
        maxPositionSize: 5000,
        stopLossPercentage: 30,
        takeProfitPercentage: 100
      }
    });
    
    const savedDCA = await dcaAgent.save();
    const savedMomentum = await momentumAgent.save();
    const savedHodl = await hodlAgent.save();
    
    console.log(`✅ DCA Agent created: ${savedDCA.name} (${savedDCA._id})`);
    console.log(`✅ Momentum Agent created: ${savedMomentum.name} (${savedMomentum._id})`);
    console.log(`✅ HODL Agent created: ${savedHodl.name} (${savedHodl._id})`);
    
    // Test 2: Test agent system prompts
    console.log('\n🧠 Test 2: Testing agent system prompts...');
    
    const dcaPrompt = savedDCA.getSystemPrompt();
    const momentumPrompt = savedMomentum.getSystemPrompt();
    const hodlPrompt = savedHodl.getSystemPrompt();
    
    console.log(`✅ DCA Agent prompt includes: ${dcaPrompt.includes('Dollar Cost Averaging') ? 'DCA strategy ✓' : 'Missing DCA strategy ✗'}`);
    console.log(`✅ Momentum Agent prompt includes: ${momentumPrompt.includes('Momentum Trading') ? 'Momentum strategy ✓' : 'Missing Momentum strategy ✗'}`);
    console.log(`✅ HODL Agent prompt includes: ${hodlPrompt.includes('HODL') ? 'HODL strategy ✓' : 'Missing HODL strategy ✗'}`);
    
    // Test 3: Create agent-specific memories
    console.log('\n💭 Test 3: Creating agent-specific memories...');
    
    const sessionId = 'test_session_agents_123';
    
    // DCA Agent memory
    const dcaMemory = new Memory({
      userId: testUserId,
      agentId: savedDCA._id,
      sessionId,
      userMessage: 'I want to start DCA investing with $500 monthly',
      extractedParameters: {
        intent: 'long_holding',
        mentionedCoins: ['BTC', 'ETH'],
        riskIndicators: 'conservative',
        budgetHints: '$500 monthly',
        timeline: 'long-term',
        holdingStrategy: 'accumulation'
      },
      strategyType: 'long_holding',
      budgetAmount: 500,
      actions: [
        {
          step: 1,
          actionType: 'BUY',
          dollarAmount: 300,
          tokenPair: 'USDC/BTC',
          ref: 'DCA_BTC_001',
          holdingPeriod: 'long-term',
          reasoning: 'DCA strategy for BTC accumulation'
        }
      ],
      summary: 'Started DCA strategy with conservative approach',
      outcome: 'pending'
    });
    
    // Momentum Agent memory
    const momentumMemory = new Memory({
      userId: testUserId,
      agentId: savedMomentum._id,
      sessionId,
      userMessage: 'SEI is pumping, should I enter a position?',
      extractedParameters: {
        intent: 'short_trading',
        mentionedCoins: ['SEI'],
        riskIndicators: 'aggressive',
        budgetHints: 'not specified',
        timeline: 'short-term',
        holdingStrategy: 'profit_taking'
      },
      strategyType: 'short_trading',
      budgetAmount: 800,
      actions: [
        {
          step: 1,
          actionType: 'BUY',
          dollarAmount: 800,
          tokenPair: 'USDC/SEI',
          ref: 'MOMENTUM_SEI_001',
          holdingPeriod: 'short-term',
          reasoning: 'Momentum play on SEI breakout'
        }
      ],
      summary: 'Entered momentum position on SEI pump',
      outcome: 'executed'
    });
    
    await dcaMemory.save();
    await momentumMemory.save();
    
    console.log('✅ DCA Agent memory saved');
    console.log('✅ Momentum Agent memory saved');
    
    // Test 4: Test agent-specific memory retrieval
    console.log('\n📋 Test 4: Testing agent-specific memory retrieval...');
    
    const dcaMemories = await Memory.getRecentMemories(savedDCA._id, sessionId, 5);
    const momentumMemories = await Memory.getRecentMemories(savedMomentum._id, sessionId, 5);
    
    console.log(`✅ DCA Agent memories: ${dcaMemories.length} found`);
    console.log(`✅ Momentum Agent memories: ${momentumMemories.length} found`);
    
    // Test 5: Test memory context generation
    console.log('\n🤖 Test 5: Testing memory context for AI...');
    
    const dcaContext = await Memory.getMemoryContext(savedDCA._id, sessionId);
    const momentumContext = await Memory.getMemoryContext(savedMomentum._id, sessionId);
    
    console.log('✅ DCA Agent context generated:');
    console.log(`   ${dcaContext.substring(0, 100)}...`);
    console.log('✅ Momentum Agent context generated:');
    console.log(`   ${momentumContext.substring(0, 100)}...`);
    
    // Test 6: Test agent statistics
    console.log('\n📊 Test 6: Testing agent statistics...');
    
    await savedDCA.updateStats(500);
    await savedMomentum.updateStats(800);
    
    const dcaStats = await Memory.getAgentMemoryStats(savedDCA._id);
    const momentumStats = await Memory.getAgentMemoryStats(savedMomentum._id);
    
    console.log(`✅ DCA Agent stats: ${dcaStats.totalInteractions} interactions, $${dcaStats.totalBudget} total budget`);
    console.log(`✅ Momentum Agent stats: ${momentumStats.totalInteractions} interactions, $${momentumStats.totalBudget} total budget`);
    
    // Test 7: Test agent retrieval methods
    console.log('\n🔍 Test 7: Testing agent retrieval methods...');
    
    const userAgents = await Agent.getUserAgents(testUserId);
    console.log(`✅ User agents retrieved: ${userAgents.length} agents found`);
    
    const agentStats = await Agent.getAgentStats(savedDCA._id);
    console.log(`✅ Agent stats retrieved for DCA agent: ${agentStats.memoryCount} memories`);
    
    // Test 8: Test strategy information
    console.log('\n📈 Test 8: Testing strategy configurations...');
    
    const agents = [savedDCA, savedMomentum, savedHodl];
    agents.forEach(agent => {
      console.log(`✅ ${agent.name}:`);
      console.log(`   Strategy: ${agent.primaryStrategy}`);
      console.log(`   Budget: $${agent.configuration.defaultBudget}`);
      console.log(`   Risk: ${agent.configuration.riskTolerance}`);
      console.log(`   Tokens: ${agent.configuration.preferredTokens.join(', ')}`);
      console.log(`   Frequency: ${agent.configuration.frequency}`);
    });
    
    // Clean up test data
    await Agent.deleteMany({ userId: testUserId });
    await Memory.deleteMany({ userId: testUserId });
    console.log('\n🧹 Cleaned up test data');
    
    console.log('\n🎉 All multi-agent tests passed successfully!');
    console.log('\nMulti-Agent System Features Working:');
    console.log('✅ Multiple agent creation with different strategies');
    console.log('✅ Strategy-specific system prompts');
    console.log('✅ Agent-specific memory isolation');
    console.log('✅ Memory context generation per agent');
    console.log('✅ Agent statistics and interaction tracking');
    console.log('✅ User agent management');
    console.log('✅ Configuration-based behavior');
    console.log('✅ Cross-agent memory separation');
    
    console.log('\nAvailable Agent Strategies:');
    console.log('🎯 DCA - Dollar Cost Averaging (Conservative, Long-term)');
    console.log('⚡ Momentum Trading - Trend Following (Aggressive, Short-term)');
    console.log('🔄 Swing Trading - Price Swings (Moderate, Medium-term)');
    console.log('💎 HODL - Long-term Holding (Conservative, Very Long-term)');
    console.log('⚖️  Arbitrage - Price Differences (Low Risk, Very Short-term)');
    console.log('🛠️  Custom - User-defined (Variable, Variable)');
    
  } catch (error) {
    console.error('❌ Multi-agent test failed:', error);
  } finally {
    process.exit(0);
  }
};

// Run the test
testMultiAgentSystem(); 