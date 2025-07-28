const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics');
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      
      // Update existing user to admin role and set the password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Admin123', salt);
      
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      existingAdmin.emailVerified = true;
      
      await existingAdmin.save();
      console.log('✅ Updated existing user to admin with new credentials');
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: 'Admin123', // This will be hashed by the pre-save middleware
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }

    console.log('\n🎉 Admin credentials:');
    console.log('Email: admin@gmail.com');
    console.log('Password: Admin123');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

createAdminUser();
