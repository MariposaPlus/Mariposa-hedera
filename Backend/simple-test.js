const axios = require('axios');

async function testMemecoinStrategy() {
  console.log('🧪 Testing Memecoin Strategy Creation...\n');
  
  try {
    const response = await axios.post('http://localhost:5000/api/agents/strategy', {
      message: "I want to trade memecoins aggressively with high risk tolerance. I have 5000 dollars and want to make quick profits from viral tokens like DOGE, SHIB, and other trending memes",
      userId: "test-user-memecoin"
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    
    console.log('✅ Response received!');
    console.log('📊 Agent Created:', response.data.data.agent.name);
    console.log('🎯 Strategy:', response.data.data.agent.primaryStrategy);
    console.log('💰 Budget:', response.data.data.agent.configuration.defaultBudget);
    console.log('🎲 Risk:', response.data.data.agent.configuration.riskTolerance);
    
    if (response.data.data.portfolioAllocation) {
      console.log('\n📊 Portfolio Allocation:');
      Object.entries(response.data.data.portfolioAllocation).forEach(([key, token]) => {
        console.log(`   ${token.symbol}: ${token.percentage} - ${token.reasoning}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMemecoinStrategy(); 