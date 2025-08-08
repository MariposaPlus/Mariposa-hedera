const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testHumanNamesAndUUIDs() {
  console.log('👤 TESTING HUMAN NAMES AND UUIDs');
  console.log('═'.repeat(70));
  
  try {
    const userId = "test_human_names_user";
    
    // Test different strategy types to see various human names
    const testCases = [
      {
        message: "I want to invest $1000 in DCA strategy for Bitcoin",
        expectedStrategy: "DCA"
      },
      {
        message: "I'm interested in memecoin trading with high risk",
        expectedStrategy: "memecoin"
      },
      {
        message: "I want to do yield farming in DeFi protocols",
        expectedStrategy: "yield_farming"
      },
      {
        message: "I want to do scalping with quick trades",
        expectedStrategy: "scalping"
      }
    ];
    
    const results = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n🎯 TEST ${i + 1}: ${testCase.expectedStrategy.toUpperCase()}`);
      console.log('-'.repeat(50));
      console.log('Message:', testCase.message);
      
      const response = await axios.post(`${API_BASE}/agents/generate-strategy`, {
        message: testCase.message,
        userId: userId
      });
      
      const strategy = response.data.data.strategy;
      const agentUuid = response.data.data.agentUuid;
      
      console.log('✅ Generated Agent:');
      console.log('📛 Name:', strategy.agentName);
      console.log('🆔 UUID:', agentUuid);
      console.log('🎯 Strategy:', strategy.primaryStrategy);
      console.log('💰 Budget:', strategy.defaultBudget);
      
      // Verify naming pattern
      const namePattern = /^[A-Z][a-z]+ [A-Z]/; // Human name + title
      const hasHumanName = namePattern.test(strategy.agentName);
      const hasUUID = agentUuid && agentUuid.length === 36; // UUID v4 format
      
      console.log('✔️ Human Name Format:', hasHumanName ? '✅' : '❌');
      console.log('✔️ UUID Format:', hasUUID ? '✅' : '❌');
      
      results.push({
        test: i + 1,
        agentName: strategy.agentName,
        agentUuid: agentUuid,
        strategy: strategy.primaryStrategy,
        hasCorrectNameFormat: hasHumanName,
        hasValidUUID: hasUUID
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n📋 SUMMARY OF RESULTS');
    console.log('═'.repeat(70));
    
    results.forEach(result => {
      console.log(`\n${result.test}. ${result.agentName}`);
      console.log(`   🆔 UUID: ${result.agentUuid}`);
      console.log(`   🎯 Strategy: ${result.strategy}`);
      console.log(`   ✔️ Name Format: ${result.hasCorrectNameFormat ? '✅' : '❌'}`);
      console.log(`   ✔️ UUID Valid: ${result.hasValidUUID ? '✅' : '❌'}`);
    });
    
    // Validation
    const allNamesValid = results.every(r => r.hasCorrectNameFormat);
    const allUUIDsValid = results.every(r => r.hasValidUUID);
    const allUUIDsUnique = new Set(results.map(r => r.agentUuid)).size === results.length;
    
    console.log('\n🎉 VALIDATION RESULTS:');
    console.log('📛 All names have human format:', allNamesValid ? '✅' : '❌');
    console.log('🆔 All UUIDs are valid:', allUUIDsValid ? '✅' : '❌');
    console.log('🔄 All UUIDs are unique:', allUUIDsUnique ? '✅' : '❌');
    
    console.log('\n✨ EXAMPLE GENERATED AGENTS:');
    results.forEach(result => {
      console.log(`  • ${result.agentName} (${result.strategy})`);
    });
    
    if (allNamesValid && allUUIDsValid && allUUIDsUnique) {
      console.log('\n🎉 ALL TESTS PASSED! Human names and UUIDs working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Check the results above.');
    }
    
    return {
      results,
      allValid: allNamesValid && allUUIDsValid && allUUIDsUnique,
      totalTests: results.length
    };
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testHumanNamesAndUUIDs()
    .then((summary) => {
      console.log('\n🎯 Human names and UUIDs test completed!');
      console.log('Total Tests:', summary.totalTests);
      console.log('All Valid:', summary.allValid ? '✅' : '❌');
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testHumanNamesAndUUIDs; 