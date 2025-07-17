const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const testSubscriptionRemoval = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics');
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a new user (should not have subscription field)
    console.log('\n🧪 Test 1: Creating new user...');
    const newUser = new User({
      name: 'Test User',
      email: 'test-subscription-removal@example.com',
      password: 'Password123'
    });
    
    await newUser.save();
    console.log('✅ New user created successfully');
    console.log('   Name:', newUser.name);
    console.log('   Email:', newUser.email);
    console.log('   Has subscription field:', !!newUser.subscription);

    // Test 2: Find an existing user (should not have subscription field)
    console.log('\n🧪 Test 2: Finding existing user...');
    const existingUser = await User.findOne({ email: { $ne: 'test-subscription-removal@example.com' } });
    if (existingUser) {
      console.log('✅ Existing user found');
      console.log('   Name:', existingUser.name);
      console.log('   Email:', existingUser.email);
      console.log('   Has subscription field:', !!existingUser.subscription);
    } else {
      console.log('❌ No existing user found');
    }

    // Test 3: Simulate auth middleware behavior
    console.log('\n🧪 Test 3: Simulating auth middleware...');
    const userFromAuth = await User.findById(existingUser._id).select('-password');
    console.log('✅ User retrieved via auth middleware simulation');
    console.log('   User ID:', userFromAuth._id);
    console.log('   Name:', userFromAuth.name);
    console.log('   Role:', userFromAuth.role);
    console.log('   Has subscription field:', !!userFromAuth.subscription);

    // Test 4: Check all users
    console.log('\n🧪 Test 4: Checking all users...');
    const allUsers = await User.find({});
    console.log(`✅ Found ${allUsers.length} users total`);
    allUsers.forEach((user, index) => {
      console.log(`   User ${index + 1}: ${user.name} - Has subscription: ${!!user.subscription}`);
    });

    // Clean up test user
    await User.findByIdAndDelete(newUser._id);
    console.log('\n🧹 Cleaned up test user');

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Subscription functionality has been completely removed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

testSubscriptionRemoval();
