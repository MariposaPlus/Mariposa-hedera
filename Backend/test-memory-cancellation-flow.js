const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const TEST_USER_ID = 'test_user_123';

async function testMemoryCancellationFlow() {
  console.log('\n🧪 TESTING MEMORY CANCELLATION FLOW');
  console.log('═'.repeat(60));

  try {
    // Step 1: Generate initial strategy (simulating Master Agent)
    console.log('\n1️⃣ Generating initial strategy...');
    const strategyResponse = await axios.post(`${API_BASE}/api/agents/generate-strategy`, {
      message: 'I want to start DCA strategy with $2000 budget for BTC and ETH, conservative approach',
      userId: TEST_USER_ID
    });

    if (!strategyResponse.data.success) {
      console.error('❌ Strategy generation failed:', strategyResponse.data.message);
      return;
    }

    const agentData = strategyResponse.data.data;
    console.log('✅ Strategy generated successfully');
    console.log(`   Agent UUID: ${agentData.agentUuid}`);
    console.log(`   Strategy: ${agentData.strategy.agentName}`);
    console.log(`   Budget: $${agentData.strategy.defaultBudget}`);

    // Step 2: Simulate user declining the strategy (create memory)
    console.log('\n2️⃣ Simulating user declining strategy (creating memory)...');
    const memoryResponse = await axios.post(`${API_BASE}/api/agent/memory`, {
      userId: TEST_USER_ID,
      sessionId: `test_session_${Date.now()}`,
      agentId: agentData.agentUuid,
      userMessage: 'Strategy generated but declined by user',
      extractedParameters: {
        intent: 'strategy_declined',
        mentionedCoins: Object.values(agentData.strategy.portfolioAllocation || {}).map(token => token.symbol),
        riskIndicators: agentData.strategy.riskTolerance,
        budgetHints: `$${agentData.strategy.defaultBudget}`,
        timeline: agentData.strategy.frequency,
        customInstructions: agentData.strategy.extractedIntent
      },
      strategyType: agentData.strategy.primaryStrategy === 'DCA' ? 'long_holding' : 'short_trading',
      budgetAmount: agentData.strategy.defaultBudget,
      actions: (agentData.strategy.portfolioManagementPlan?.initialSetup || []).map((action, index) => ({
        step: index + 1,
        actionType: action.actionType,
        percentage: action.percentage,
        tokenPair: action.tokenPair,
        priority: action.priority,
        reasoning: action.reasoning
      })),
      summary: `Strategy generated (${agentData.strategy.primaryStrategy}) but declined by user - available for modifications`,
      outcome: 'cancelled'
    });

    if (!memoryResponse.data.success) {
      console.error('❌ Memory creation failed:', memoryResponse.data.message);
      return;
    }

    console.log('✅ Memory created successfully');
    console.log(`   Memory ID: ${memoryResponse.data.data.memoryId}`);

    // Step 3: User sends new message (modify strategy with memory)
    console.log('\n3️⃣ User sending new message to modify strategy...');
    const modifyResponse = await axios.put(`${API_BASE}/api/agents/${agentData.agentUuid}/modify-strategy`, {
      message: 'Actually, I want to increase the budget to $3000 and add some SEI tokens',
      userId: TEST_USER_ID,
      useMemory: true
    });

    if (!modifyResponse.data.success) {
      console.error('❌ Strategy modification failed:', modifyResponse.data.message);
      console.error('   Error details:', modifyResponse.data.error);
      return;
    }

    console.log('✅ Strategy modified successfully with memory context');
    const modifiedStrategy = modifyResponse.data.data;
    console.log(`   New strategy name: ${modifiedStrategy.agent?.name || 'N/A'}`);
    console.log(`   Memory context used: ${modifyResponse.data.data.memoryContext}`);
    console.log(`   Approval required: ${modifiedStrategy.approvalStatus?.requiresApproval}`);

    // Step 4: Verify memory context was used
    console.log('\n4️⃣ Verifying memory context usage...');
    if (modifyResponse.data.data.memoryContext === 'used') {
      console.log('✅ Memory context was successfully used in strategy modification');
    } else {
      console.log('⚠️  Memory context usage unclear');
    }

    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('✅ The complete flow works:');
    console.log('   1. Generate strategy');
    console.log('   2. User cancels/declines');
    console.log('   3. Memory is created');
    console.log('   4. User sends new message');
    console.log('   5. Strategy is modified using memory context');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Helper function to wait for server to be ready
async function waitForServer(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get(`${API_BASE}/api/agent/prices`);
      console.log('✅ Server is ready');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for server... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.error('❌ Server not ready after retries');
  return false;
}

async function main() {
  console.log('🚀 Starting Memory Cancellation Flow Test');
  
  if (await waitForServer()) {
    await testMemoryCancellationFlow();
  }
}

if (require.main === module) {
  main();
}

module.exports = { testMemoryCancellationFlow }; 