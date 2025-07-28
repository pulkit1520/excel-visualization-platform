const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Emergency script to reactivate admin account
const reactivateAdmin = async () => {
  try {
    console.log('🚨 Emergency Admin Reactivation Script Starting...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`📊 Found ${adminUsers.length} admin user(s)`);

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in the database');
      process.exit(1);
    }

    // Display all admin users and their status
    console.log('\n📋 Current Admin Users:');
    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Status: ${admin.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Last Login: ${admin.lastLogin ? admin.lastLogin.toDateString() : 'Never'}`);
      console.log('   ─────────────────────────────────');
    });

    // Reactivate ALL admin accounts (safer for emergency recovery)
    console.log('\n🔄 Reactivating all admin accounts...');
    
    const updateResult = await User.updateMany(
      { role: 'admin' },
      { 
        $set: { 
          isActive: true,
          lastLogin: new Date()
        } 
      }
    );

    console.log(`✅ Successfully reactivated ${updateResult.modifiedCount} admin account(s)`);

    // Verify the changes
    const reactivatedAdmins = await User.find({ role: 'admin', isActive: true });
    console.log('\n🎉 Verification - Active Admin Accounts:');
    reactivatedAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email}) - ✅ ACTIVE`);
    });

    console.log('\n✅ Emergency reactivation completed successfully!');
    console.log('🔐 You can now log in to your admin account.');
    
  } catch (error) {
    console.error('❌ Emergency reactivation failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Also create a function to create a new admin if needed
const createEmergencyAdmin = async () => {
  try {
    console.log('🆘 Creating Emergency Admin Account...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create emergency admin
    const emergencyAdmin = new User({
      name: 'Emergency Admin',
      email: 'emergency@admin.com',
      password: 'emergency123', // Change this immediately after login
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    await emergencyAdmin.save();
    console.log('✅ Emergency admin created successfully!');
    console.log('📧 Email: emergency@admin.com');
    console.log('🔑 Password: emergency123');
    console.log('⚠️ IMPORTANT: Change this password immediately after login!');
    
  } catch (error) {
    if (error.code === 11000) {
      console.log('ℹ️ Emergency admin already exists');
    } else {
      console.error('❌ Failed to create emergency admin:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--create-emergency')) {
  createEmergencyAdmin();
} else {
  reactivateAdmin();
}
