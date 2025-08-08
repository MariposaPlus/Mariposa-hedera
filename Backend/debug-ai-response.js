const axios = require('axios');

async function debugAIResponse() {
  try {
    console.log('🔍 DEBUGGING AI RESPONSE...');
    
    const response = await axios.post('http://localhost:5001/api/agents/strategy', {
      message: "I want to invest $1000 in a simple DCA strategy for Bitcoin and Ethereum",
      userId: "debug_user"
    });
    
    console.log('\n📊 RESPONSE DATA STRUCTURE:');
    console.log('Keys in response:', Object.keys(response.data.data));
    
    if (response.data.data.portfolioManagementPlan) {
      console.log('\n📋 Portfolio Management Plan Keys:');
      console.log(Object.keys(response.data.data.portfolioManagementPlan));
      
      if (response.data.data.portfolioManagementPlan.initialSetup) {
        console.log('\n🎯 Initial Setup Length:', response.data.data.portfolioManagementPlan.initialSetup.length);
        console.log('Initial Setup Items:', response.data.data.portfolioManagementPlan.initialSetup.map(item => item.action));
      }
    }
    
    // Check for duplicates
    const dataStr = JSON.stringify(response.data.data, null, 2);
    const portfolioMatches = (dataStr.match(/portfolioManagementPlan/g) || []).length;
    const initialSetupMatches = (dataStr.match(/initialSetup/g) || []).length;
    
    console.log('\n⚠️ DUPLICATION CHECK:');
    console.log('portfolioManagementPlan mentions:', portfolioMatches);
    console.log('initialSetup mentions:', initialSetupMatches);
    
    if (portfolioMatches > 1 || initialSetupMatches > 1) {
      console.log('\n❌ DUPLICATION DETECTED!');
      console.log('Full response structure:');
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('\n✅ NO DUPLICATION FOUND');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  setTimeout(() => {
    debugAIResponse();
  }, 3000); // Wait for server to start
}

module.exports = debugAIResponse; 