const messageClassificationService = require('./services/messageClassificationService');

async function testClassification() {
  console.log('🧪 Testing message classification for investment goals...\n');
  
  const testMessages = [
    "I have 100 dollars I need to double it",
    "I have $500 and want to grow it",
    "Help me turn my $1000 into $2000",
    "Create a strategy for me",
    "What's the price of Bitcoin?",
    "Should I invest in ETH?"
  ];
  
  for (const message of testMessages) {
    try {
      console.log(`📝 Testing: "${message}"`);
      const classification = await messageClassificationService.classifyMessage(message);
      console.log(`✅ Result: ${classification.type} (confidence: ${classification.confidence})`);
      console.log(`💭 Reasoning: ${classification.reasoning}`);
      console.log('---');
    } catch (error) {
      console.error(`❌ Error classifying "${message}":`, error.message);
      console.log('---');
    }
  }
}

testClassification().catch(console.error);