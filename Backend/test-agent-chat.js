require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

// Test messages for different demand types
const testMessages = [
  {
    name: 'STRATEGY Test',
    message: 'I have 100 dollars and I need to double it in 1 month',
    expectedType: 'STRATEGY'
  },
  {
    name: 'ACTION Test',
    message: 'I want to buy 50 USDC worth of ETH',
    expectedType: 'ACTION'
  },
  {
    name: 'INFORMATION Test',
    message: 'What is the current price of Bitcoin?',
    expectedType: 'INFORMATION'
  },
  {
    name: 'FEEDBACK Test',
    message: 'I bought 0.5 ETH yesterday, was it a good decision?',
    expectedType: 'FEEDBACK'
  }
];

async function testAgentChat() {
  console.log('🤖 TESTING AGENT CHAT ENDPOINT');
  console.log('═'.repeat(60));
  
  for (const test of testMessages) {
    try {
      console.log(`\n📝 Testing: ${test.name}`);
      console.log(`💬 Message: "${test.message}"`);
      console.log(`🎯 Expected: ${test.expectedType}`);
      
      const response = await fetch(`${BASE_URL}/api/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: test.message,
          sessionId: `test_session_${Date.now()}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Classification: ${result.data.classification.type}`);
        console.log(`📋 Reason: ${result.data.classification.reason}`);
        console.log(`⚡ Actions: ${result.data.actionPlan.length} planned`);
        console.log(`🎯 Correct Classification: ${result.data.classification.type === test.expectedType ? '✅ YES' : '❌ NO'}`);
        
        // Show first few lines of the response
        const responseLines = result.data.message.split('\n').slice(0, 3);
        console.log(`📄 Response Preview:`);
        responseLines.forEach(line => console.log(`   ${line}`));
        
      } else {
        console.log(`❌ Error: ${result.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Request Failed: ${error.message}`);
    }
    
    console.log('-'.repeat(40));
  }
}

async function testServerHealth() {
  try {
    console.log('🔍 Checking server health...');
    const response = await fetch(`${BASE_URL}/health`);
    
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Server is running');
      console.log(`📊 Version: ${health.version}`);
      return true;
    } else {
      console.log('❌ Server health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    console.log('💡 Make sure to start the server with: npm start');
    return false;
  }
}

async function main() {
  console.log('🚀 AGENT CHAT TESTING SUITE');
  console.log('═'.repeat(60));
  
  const serverHealthy = await testServerHealth();
  
  if (serverHealthy) {
    await testAgentChat();
    
    console.log('\n🎉 TESTING COMPLETE');
    console.log('═'.repeat(60));
    console.log('💡 Check the classifications above to verify accuracy');
    console.log('📊 The endpoint now features:');
    console.log('   ✅ Real LLM-powered demand classification (Together AI)');
    console.log('   ✅ Live market data integration (CoinGecko API)');
    console.log('   ✅ LLM-generated personalized responses');
    console.log('   ✅ Multi-stage processing pipeline');
    console.log('   ✅ Memory storage for conversation continuity');
    console.log('   ✅ Fallback systems for reliability');
    console.log('\n🔑 Key Improvements:');
    console.log('   • "I have 100 dollars I need to double it in 1 month" → STRATEGY (LLM)');
    console.log('   • Real market data fetched for price/market requests');
    console.log('   • Contextual responses based on user profile and market data');
    console.log('   • Professional crypto trading advisor personality');
  }
}

main().catch(console.error); 