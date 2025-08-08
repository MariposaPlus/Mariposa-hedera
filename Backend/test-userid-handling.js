const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Test function to demonstrate userId handling
async function testUserIdHandling() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa');
    console.log('✅ Connected to MongoDB');

    // Test function that mimics the controller logic
    async function findUserByIdOrEmail(userId) {
      let existingUser;
      
      // Check if userId is an email (contains @) or ObjectId
      if (userId.includes('@')) {
        console.log(`🔍 Searching for user by email: ${userId}`);
        existingUser = await User.findOne({ email: userId });
      } else {
        console.log(`🔍 Searching for user by ObjectId: ${userId}`);
        try {
          existingUser = await User.findById(userId);
        } catch (error) {
          console.log(`⚠️  ObjectId invalid, trying email fallback: ${userId}`);
          existingUser = await User.findOne({ email: userId });
        }
      }
      
      if (existingUser) {
        console.log(`✅ User found: ${existingUser.name} (${existingUser.email})`);
        console.log(`📝 Actual ObjectId: ${existingUser._id}`);
        return existingUser;
      } else {
        console.log(`❌ User not found for: ${userId}`);
        return null;
      }
    }

    // Get a sample user to test with
    const sampleUser = await User.findOne();
    if (!sampleUser) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }

    console.log('\n🧪 Testing userId handling scenarios:');
    console.log('=====================================\n');

    // Test 1: Using email as userId
    console.log('📧 Test 1: Using email as userId');
    await findUserByIdOrEmail(sampleUser.email);
    console.log('');

    // Test 2: Using ObjectId as userId
    console.log('🆔 Test 2: Using ObjectId as userId');
    await findUserByIdOrEmail(sampleUser._id.toString());
    console.log('');

    // Test 3: Using invalid ObjectId (should fallback to email search)
    console.log('⚠️  Test 3: Using invalid ObjectId');
    await findUserByIdOrEmail('invalid-object-id');
    console.log('');

    // Test 4: Using non-existent email
    console.log('❌ Test 4: Using non-existent email');
    await findUserByIdOrEmail('nonexistent@example.com');
    console.log('');

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('💥 Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testUserIdHandling();
}

module.exports = { testUserIdHandling };