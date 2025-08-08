/**
 * Test file to demonstrate the Enhanced Intent System
 * Run with: node test-enhanced-intent-system.js
 */

const ContactsTokensService = require('./services/contactsTokensService');
const EnhancedIntentService = require('./services/enhancedIntentService');

async function testEnhancedIntentSystem() {
  console.log('🚀 Testing Enhanced Intent System...\n');

  const enhancedIntent = new EnhancedIntentService();
  const contactsTokens = new ContactsTokensService();

  // Test cases
  const testCases = [
    {
      name: 'Complete Transfer Request',
      message: 'Send 100 HBAR to Samir',
      expectedResult: 'Should execute immediately'
    },
    {
      name: 'Incomplete Transfer Request', 
      message: 'Send HBAR to Alice',
      expectedResult: 'Should ask for amount'
    },
    {
      name: 'Incomplete Swap Request',
      message: 'Swap HBAR for USDC',
      expectedResult: 'Should ask for amount'
    },
    {
      name: 'Unknown Contact',
      message: 'Send 50 USDC to John',
      expectedResult: 'Should ask to specify contact address'
    },
    {
      name: 'Token by Name',
      message: 'Swap 1000 sauce for usdt',
      expectedResult: 'Should resolve token symbols'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    console.log(`Expected: ${testCase.expectedResult}`);
    
    try {
      const result = await enhancedIntent.parseMessageWithValidation(testCase.message);
      
      console.log('📊 Results:');
      console.log(`  Classification: ${result.classification.type} (${result.classification.confidence})`);
      
      if (result.classification.type === 'actions') {
        console.log(`  Action Type: ${result.extraction.actionType}`);
        console.log(`  Arguments: ${JSON.stringify(result.extraction.args, null, 2)}`);
        console.log(`  Validation: ${result.validation.isValid ? '✅ Valid' : '❌ Missing args'}`);
        
        if (!result.validation.isValid) {
          console.log(`  Missing: ${result.validation.missing.join(', ')}`);
          console.log(`  Interactive: ${result.interactiveData ? '🔄 Required' : '❌ None'}`);
        }
        
        if (result.validation.resolved) {
          console.log(`  Resolved: ${JSON.stringify(result.validation.resolved, null, 2)}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(80));
  }

  // Test contacts and tokens lookup
  console.log('\n🔍 Testing Contacts & Tokens Lookup:');
  
  console.log('\n📞 Contacts:');
  console.log('  samir ->', contactsTokens.findContact('samir'));
  console.log('  0.0.1393 ->', contactsTokens.findContact('0.0.1393'));
  console.log('  unknown ->', contactsTokens.findContact('unknown'));
  
  console.log('\n🪙 Tokens:');
  console.log('  HBAR ->', contactsTokens.findToken('HBAR'));
  console.log('  sauce ->', contactsTokens.findToken('sauce'));
  console.log('  0.0.456858 ->', contactsTokens.findToken('0.0.456858'));
  console.log('  unknown ->', contactsTokens.findToken('unknown'));

  // Test combobox options
  console.log('\n🎛️ Combobox Options:');
  console.log('  Recipients:', contactsTokens.getComboboxOptions('recipient').slice(0, 2));
  console.log('  Tokens:', contactsTokens.getComboboxOptions('fromToken').slice(0, 2));

  console.log('\n✅ Enhanced Intent System test completed!');
}

// Run the test
if (require.main === module) {
  testEnhancedIntentSystem().catch(console.error);
}

module.exports = { testEnhancedIntentSystem };
