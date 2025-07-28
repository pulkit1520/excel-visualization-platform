const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixAdmin() {
  try {
    console.log('🔧 Fixing deactivated admin account...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics');
    
    // Reactivate all admin accounts
    const result = await User.updateMany(
      { role: 'admin' }, 
      { isActive: true }
    );
    
    console.log(`✅ Fixed ${result.modifiedCount} admin account(s)`);
    console.log('🎉 You can now log in to your admin account!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixAdmin();
