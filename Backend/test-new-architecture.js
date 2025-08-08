const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testNewArchitecture() {
  console.log('🏗️  TESTING NEW ARCHITECTURE');
  console.log('═'.repeat(70));
  
  try {
    const userId = "test_user_new_arch";
    
    // Step 1: Generate strategy only (no agent creation)
    console.log('\n🎯 STEP 1: Generate Strategy Only');
    console.log('-'.repeat(50));
    
    const strategyResponse = await axios.post(`${API_BASE}/agents/generate-strategy`, {
      message: "I want to invest $2000 in a memecoin strategy with high risk tolerance. Focus on emerging memecoins with strong communities.",
      userId: userId
    });
    
    const strategy = strategyResponse.data.data.strategy;
    console.log('✅ Strategy Generated:', strategy.agentName);
    console.log('🎯 Strategy Type:', strategy.primaryStrategy);
    console.log('💰 Budget:', strategy.defaultBudget);
    console.log('⚖️ Risk:', strategy.riskTolerance);
    console.log('🪙 Portfolio Tokens:', Object.values(strategy.portfolioAllocation || {}).map(t => t.symbol));
    
    // Step 2: Create agent from strategy (not approved)
    console.log('\n🏗️  STEP 2: Create Agent from Strategy');
    console.log('-'.repeat(50));
    
    const agentResponse = await axios.post(`${API_BASE}/agents/create-from-strategy`, {
      strategy: strategy,
      userId: userId,
      isApproved: false // Not approved initially
    });
    
    const agent = agentResponse.data.data.agent;
    console.log('✅ Agent Created:', agent.name);
    console.log('🆔 Agent ID:', agent._id);
    console.log('✅ Approved:', agent.isApproved);
    console.log('🚀 Can Begin Work:', agent.canBeginWork);
    console.log('📱 Wallet Address:', agentResponse.data.data.walletInfo.address);
    
    // Step 3: Try to modify the agent strategy
    console.log('\n🔄 STEP 3: Modify Agent Strategy');
    console.log('-'.repeat(50));
    
    const modifyResponse = await axios.put(`${API_BASE}/agents/${agent._id}/modify-strategy`, {
      message: "Actually, I want to be more conservative. Change to moderate risk and include some stable tokens.",
      userId: userId
    });
    
    const modifiedAgent = modifyResponse.data.data.agent;
    console.log('✅ Strategy Modified:', modifiedAgent.name);
    console.log('🎯 New Strategy:', modifiedAgent.primaryStrategy);
    console.log('⚖️ New Risk:', modifiedAgent.configuration.riskTolerance);
    console.log('✅ Approved:', modifiedAgent.isApproved);
    console.log('🚀 Can Begin Work:', modifiedAgent.canBeginWork);
    console.log('📝 Requires Approval:', modifyResponse.data.data.approvalStatus.requiresApproval);
    
    // Step 4: Approve the agent
    console.log('\n✅ STEP 4: Approve Agent');
    console.log('-'.repeat(50));
    
    const approveResponse = await axios.put(`${API_BASE}/agents/${agent._id}/approve`, {
      userId: userId,
      isApproved: true
    });
    
    const approvedAgent = approveResponse.data.data.agent;
    console.log('✅ Agent Approved:', approvedAgent.name);
    console.log('🚀 Can Begin Work:', approvedAgent.canBeginWork);
    console.log('📈 Ready for Trading:', approvedAgent.isApproved && approvedAgent.canBeginWork);
    
    // Step 5: Get agent memory (should be saved to specific agent)
    console.log('\n💾 STEP 5: Check Agent Memory');
    console.log('-'.repeat(50));
    
    const memoryResponse = await axios.get(`${API_BASE}/agents/${agent._id}/memory`);
    const memories = memoryResponse.data.data.memories;
    console.log('📊 Total Memories:', memories.length);
    console.log('💭 Memory Types:', memories.map(m => m.summary));
    
    // Step 6: Workflow Summary
    console.log('\n📋 STEP 6: New Architecture Summary');
    console.log('-'.repeat(50));
    
    console.log('🎉 NEW ARCHITECTURE TEST COMPLETED!');
    console.log('\n✨ Workflow Demonstrated:');
    console.log('  1️⃣ Generate strategy using AI (no agent creation)');
    console.log('  2️⃣ Create agent from generated strategy');
    console.log('  3️⃣ Agent starts as NOT APPROVED');
    console.log('  4️⃣ Modify agent strategy with new prompt');
    console.log('  5️⃣ Strategy modification resets approval status');
    console.log('  6️⃣ User approves agent to begin work');
    console.log('  7️⃣ Memory is saved to specific agent (not default)');
    console.log('  8️⃣ Agent is properly associated with user ID');
    
    console.log('\n🔧 Architecture Benefits:');
    console.log('  ✅ Separated strategy generation from agent creation');
    console.log('  ✅ Added approval workflow for better control');
    console.log('  ✅ User can modify strategies before approval');
    console.log('  ✅ Memory is saved to specific agents');
    console.log('  ✅ Proper user ID validation and association');
    console.log('  ✅ Agents can only work when approved');
    
    return {
      strategy,
      agent: approvedAgent,
      memories,
      workflow: 'completed'
    };
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testNewArchitecture()
    .then((results) => {
      console.log('\n🎯 New architecture test completed successfully!');
      console.log('Strategy:', results.strategy.primaryStrategy);
      console.log('Agent:', results.agent.name);
      console.log('Memories:', results.memories.length);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testNewArchitecture; 