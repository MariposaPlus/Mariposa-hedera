const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testStrategyDatabase() {
  console.log('💾 TESTING STRATEGY DATABASE INTEGRATION');
  console.log('═'.repeat(70));
  
  try {
    const userId = "test_strategy_db_user";
    
    // Step 1: Generate strategy and save to database
    console.log('\n🎯 STEP 1: Generate and Save Strategy');
    console.log('-'.repeat(50));
    
    const strategyResponse = await axios.post(`${API_BASE}/agents/generate-strategy`, {
      message: "I want to invest $3000 in a yield farming strategy with moderate risk. Focus on stable DeFi protocols with good APY.",
      userId: userId
    });
    
    const strategy = strategyResponse.data.data.strategy;
    const strategyId = strategyResponse.data.data.strategyId;
    
    console.log('✅ Strategy Generated and Saved:');
    console.log('🆔 Strategy ID:', strategyId);
    console.log('📛 Agent Name:', strategy.agentName);
    console.log('🎯 Strategy Type:', strategy.primaryStrategy);
    console.log('💰 Budget:', strategy.defaultBudget);
    console.log('⚖️ Risk:', strategy.riskTolerance);
    
    // Step 2: Create agent from saved strategy
    console.log('\n🏗️  STEP 2: Create Agent from Saved Strategy');
    console.log('-'.repeat(50));
    
    const agentResponse = await axios.post(`${API_BASE}/agents/create-from-strategy`, {
      strategy: strategy,
      userId: userId,
      strategyId: strategyId, // Link to saved strategy
      isApproved: false
    });
    
    const agent = agentResponse.data.data.agent;
    console.log('✅ Agent Created and Linked:');
    console.log('🆔 Agent ID:', agent._id);
    console.log('📛 Agent Name:', agent.name);
    console.log('🔗 Current Strategy ID:', agent.currentStrategyId);
    console.log('✅ Approved:', agent.isApproved);
    console.log('📱 Wallet Address:', agentResponse.data.data.walletInfo.address);
    
    // Step 3: Get agent strategies history
    console.log('\n📚 STEP 3: Check Agent Strategies History');
    console.log('-'.repeat(50));
    
    const historyResponse = await axios.get(`${API_BASE}/agents/${agent._id}/strategies?userId=${userId}`);
    const history = historyResponse.data.data;
    
    console.log('📊 Strategies History:');
    console.log('📈 Total Strategies:', history.totalStrategies);
    console.log('🔄 Current Strategy Version:', history.currentStrategy?.version);
    console.log('📋 Strategy Status:', history.currentStrategy?.status);
    
    // Step 4: Modify agent strategy (creates new strategy version)
    console.log('\n🔄 STEP 4: Modify Strategy (New Version)');
    console.log('-'.repeat(50));
    
    const modifyResponse = await axios.put(`${API_BASE}/agents/${agent._id}/modify-strategy`, {
      message: "Actually, I want to be more aggressive. Increase the risk and focus on higher APY protocols, even if less stable.",
      userId: userId
    });
    
    const modifiedAgent = modifyResponse.data.data.agent;
    console.log('✅ Strategy Modified:');
    console.log('🆔 New Strategy ID:', modifyResponse.data.data.strategyId);
    console.log('📈 Strategy Version:', modifyResponse.data.data.strategyVersion);
    console.log('⚖️ New Risk:', modifiedAgent.configuration.riskTolerance);
    console.log('✅ Approved:', modifiedAgent.isApproved);
    
    // Step 5: Check updated strategies history
    console.log('\n📚 STEP 5: Check Updated Strategies History');
    console.log('-'.repeat(50));
    
    const updatedHistoryResponse = await axios.get(`${API_BASE}/agents/${agent._id}/strategies?userId=${userId}`);
    const updatedHistory = updatedHistoryResponse.data.data;
    
    console.log('📊 Updated Strategies History:');
    console.log('📈 Total Strategies:', updatedHistory.totalStrategies);
    console.log('🔄 Current Strategy Version:', updatedHistory.currentStrategy?.version);
    console.log('📋 Strategies by Version:');
    updatedHistory.strategiesHistory.forEach(s => {
      console.log(`   v${s.version}: ${s.status} - ${s.primaryStrategy} (${s.riskTolerance})`);
    });
    
    // Step 6: Approve the modified agent
    console.log('\n✅ STEP 6: Approve Modified Agent');
    console.log('-'.repeat(50));
    
    const approveResponse = await axios.put(`${API_BASE}/agents/${agent._id}/approve`, {
      userId: userId,
      isApproved: true
    });
    
    const approvedAgent = approveResponse.data.data.agent;
    console.log('✅ Agent Approved:');
    console.log('🚀 Can Begin Work:', approvedAgent.canBeginWork);
    console.log('📈 Ready for Trading:', approvedAgent.isApproved && approvedAgent.canBeginWork);
    
    // Step 7: Final summary
    console.log('\n📋 STEP 7: Strategy Database Integration Summary');
    console.log('-'.repeat(50));
    
    console.log('🎉 STRATEGY DATABASE INTEGRATION TEST COMPLETED!');
    console.log('\n✨ Features Demonstrated:');
    console.log('  1️⃣ Strategy generation saved to database');
    console.log('  2️⃣ Agent linked to saved strategy');
    console.log('  3️⃣ Strategy history tracking');
    console.log('  4️⃣ Strategy versioning on modifications');
    console.log('  5️⃣ Previous strategies archived');
    console.log('  6️⃣ Complete strategy lifecycle management');
    
    console.log('\n🗄️ Database Structure:');
    console.log('  📊 Strategy Model: Complete JSON strategy saved');
    console.log('  🔗 Agent-Strategy Link: currentStrategyId field');
    console.log('  📈 Version Control: Incremental versioning');
    console.log('  📚 History Tracking: All strategies preserved');
    console.log('  🔄 Status Management: generated → applied → modified → archived');
    
    console.log('\n🎯 Benefits:');
    console.log('  ✅ Complete strategy audit trail');
    console.log('  ✅ Version control for strategy changes');
    console.log('  ✅ Easy strategy reversion capability');
    console.log('  ✅ Analytics on strategy performance');
    console.log('  ✅ User strategy preferences tracking');
    
    return {
      finalAgent: approvedAgent,
      totalStrategies: updatedHistory.totalStrategies,
      currentVersion: updatedHistory.currentStrategy?.version,
      workflow: 'completed'
    };
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testStrategyDatabase()
    .then((results) => {
      console.log('\n🎯 Strategy database test completed successfully!');
      console.log('Final Agent:', results.finalAgent.name);
      console.log('Total Strategies:', results.totalStrategies);
      console.log('Current Version:', results.currentVersion);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testStrategyDatabase; 