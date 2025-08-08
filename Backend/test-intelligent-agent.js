const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testIntelligentAgentCreation() {
  console.log('🧪 Testing Intelligent Agent Creation...\n');
  
  try {
    // Test with a comprehensive user message
    const testMessage = "I want to start investing in crypto with a conservative DCA strategy. I have $2000 to start with and can add $500 monthly. I'm interested in Bitcoin and Ethereum for long-term holding, but I also want some exposure to SEI since we're on their network. I'm risk-averse and prefer steady accumulation over quick gains.";
    
    console.log('📝 Test Message:', testMessage);
    console.log('\n🔄 Sending request to create intelligent agent...\n');
    
    const response = await axios.post(`${BASE_URL}/api/agents/strategy`, {
      message: testMessage,
      userId: 'test-user-123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });
    
    if (response.data.success) {
      console.log('✅ Agent created successfully!\n');
      
      const { agent, extractedParameters, memories, suggestedActions, marketInsights, riskAssessment } = response.data.data;
      
      console.log('🤖 Created Agent:');
      console.log(`   Name: ${agent.name}`);
      console.log(`   Strategy: ${agent.primaryStrategy}`);
      console.log(`   Risk Tolerance: ${agent.configuration.riskTolerance}`);
      console.log(`   Budget: $${agent.configuration.defaultBudget}`);
      console.log(`   Frequency: ${agent.configuration.frequency}`);
      console.log(`   Preferred Tokens: ${agent.configuration.preferredTokens.join(', ')}\n`);
      
      console.log('🎯 Extracted Parameters:');
      console.log(`   Agent Name: ${extractedParameters.agentName}`);
      console.log(`   Description: ${extractedParameters.description}`);
      console.log(`   Strategy: ${extractedParameters.primaryStrategy}`);
      console.log(`   Risk Level: ${extractedParameters.riskTolerance}`);
      console.log(`   Budget: $${extractedParameters.defaultBudget}`);
      console.log(`   Tokens: ${extractedParameters.preferredTokens.join(', ')}\n`);
      
      if (suggestedActions && suggestedActions.length > 0) {
        console.log('📋 Suggested Actions:');
        suggestedActions.forEach((action, index) => {
          console.log(`   ${index + 1}. ${action.action} (${action.priority} priority)`);
          console.log(`      Token Pair: ${action.tokenPair}`);
          console.log(`      Percentage: ${action.percentage}`);
          console.log(`      Reasoning: ${action.reasoning}\n`);
        });
      }
      
      console.log('💡 Market Insights:');
      console.log(`   ${marketInsights}\n`);
      
      console.log('⚠️ Risk Assessment:');
      console.log(`   ${riskAssessment}\n`);
      
      console.log('🧠 Memory IDs:');
      console.log(`   Default Agent Memory: ${memories.defaultAgentMemory}`);
      console.log(`   Agent Memory: ${memories.agentMemory}\n`);
      
      console.log('✅ Test completed successfully!');
      
      return agent._id;
      
    } else {
      console.error('❌ Failed to create agent:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing intelligent agent creation:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data.message || error.response.data);
      
      if (error.response.status === 500 && error.response.data.message?.includes('AI service not configured')) {
        console.log('\n💡 Note: Make sure to set TOGETHER_API_KEY in your .env file');
        console.log('   You can get an API key from: https://api.together.xyz/');
      }
    } else {
      console.error('   Error:', error.message);
    }
  }
}

async function testFallbackBehavior() {
  console.log('\n🧪 Testing Fallback Behavior (without API key)...\n');
  
  // Temporarily save the API key
  const originalApiKey = process.env.TOGETHER_API_KEY;
  delete process.env.TOGETHER_API_KEY;
  
  try {
    const testMessage = "I want a moderate risk DCA strategy with $1000 budget for BTC and ETH.";
    
    console.log('📝 Test Message:', testMessage);
    console.log('🔄 Sending request without API key (testing fallback)...\n');
    
    const response = await axios.post(`${BASE_URL}/api/agents/strategy`, {
      message: testMessage,
      userId: 'test-user-fallback'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data.success) {
      console.log('✅ Fallback agent created successfully!');
      
      const { agent, extractedParameters } = response.data.data;
      
      console.log('🤖 Created Agent (Fallback):');
      console.log(`   Name: ${agent.name}`);
      console.log(`   Strategy: ${agent.primaryStrategy}`);
      console.log(`   Risk Tolerance: ${agent.configuration.riskTolerance}`);
      console.log(`   Budget: $${agent.configuration.defaultBudget}\n`);
      
      if (response.data.data.note) {
        console.log('📝 Note:', response.data.data.note);
      }
      
      console.log('✅ Fallback test completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error testing fallback behavior:', error.response?.data || error.message);
  } finally {
    // Restore the API key
    if (originalApiKey) {
      process.env.TOGETHER_API_KEY = originalApiKey;
    }
  }
}

async function testAgentMemoryRetrieval(agentId) {
  if (!agentId) return;
  
  console.log('\n🧪 Testing Agent Memory Retrieval...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/agents/${agentId}/memory?limit=5`);
    
    if (response.data.success) {
      console.log('✅ Memory retrieved successfully!');
      console.log(`   Agent: ${response.data.data.agentName}`);
      console.log(`   Memories Count: ${response.data.data.count}\n`);
      
      response.data.data.memories.forEach((memory, index) => {
        console.log(`   Memory ${index + 1}:`);
        console.log(`     User Message: ${memory.userMessage.substring(0, 100)}...`);
        console.log(`     Strategy Type: ${memory.strategyType}`);
        console.log(`     Budget: $${memory.budgetAmount}`);
        console.log(`     Actions: ${memory.actions.length} actions`);
        console.log(`     Summary: ${memory.summary}\n`);
      });
      
      console.log('✅ Memory retrieval test completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error testing memory retrieval:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Intelligent Agent Creation Tests\n');
  console.log('=' .repeat(60));
  
  // Test 1: Full intelligent agent creation
  const agentId = await testIntelligentAgentCreation();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test 2: Fallback behavior
  await testFallbackBehavior();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test 3: Memory retrieval
  await testAgentMemoryRetrieval(agentId);
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testIntelligentAgentCreation,
  testFallbackBehavior,
  testAgentMemoryRetrieval,
  runAllTests
}; 