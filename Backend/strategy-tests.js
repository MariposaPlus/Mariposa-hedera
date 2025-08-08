const axios = require('axios');

const testCases = [
  {
    name: "Scalping Strategy",
    message: "I want to do high-frequency scalping with $1000. I need quick profits from small price movements, very short timeframes, high risk tolerance.",
    userId: "test-scalper"
  },
  {
    name: "Yield Farming Strategy", 
    message: "I want to maximize yield farming returns with $3000. I'm interested in DeFi protocols, staking, liquidity mining, and earning passive income.",
    userId: "test-farmer"
  },
  {
    name: "Swing Trading Strategy",
    message: "I want to swing trade with moderate risk using $2500. Looking for medium-term positions, technical analysis, support and resistance levels.",
    userId: "test-swinger"
  }
];

async function testStrategy(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('📝 Message:', testCase.message);
  console.log('-'.repeat(80));
  
  try {
    const response = await axios.post('http://localhost:5000/api/agents/strategy', {
      message: testCase.message,
      userId: testCase.userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    
    const { agent, portfolioAllocation } = response.data.data;
    
    console.log('✅ SUCCESS!');
    console.log('📊 Agent:', agent.name);
    console.log('🎯 Strategy:', agent.primaryStrategy);
    console.log('💰 Budget:', agent.configuration.defaultBudget);
    console.log('🎲 Risk:', agent.configuration.riskTolerance);
    console.log('⏰ Frequency:', agent.configuration.frequency);
    console.log('📈 Stop Loss:', agent.configuration.stopLossPercentage, '%');
    console.log('📈 Take Profit:', agent.configuration.takeProfitPercentage, '%');
    
    if (portfolioAllocation) {
      console.log('\n📊 Portfolio:');
      Object.entries(portfolioAllocation).forEach(([key, token]) => {
        console.log(`   ${token.symbol}: ${token.percentage}`);
      });
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data?.message || error.message);
  }
  
  console.log('═'.repeat(80));
}

async function runAllTests() {
  console.log('🚀 TESTING DIFFERENT TRADING STRATEGIES');
  console.log('═'.repeat(80));
  
  for (const testCase of testCases) {
    await testStrategy(testCase);
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 ALL TESTS COMPLETED!');
}

runAllTests().catch(console.error); 