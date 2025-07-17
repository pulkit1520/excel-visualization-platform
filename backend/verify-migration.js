const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics');
    console.log('Connected to MongoDB');
    
    // Force update all users to remove subscription field
    const result = await mongoose.connection.db.collection('users').updateMany(
      {},
      { $unset: { subscription: "" } }
    );
    
    console.log(`Updated ${result.modifiedCount} users out of ${result.matchedCount}`);
    
    // Check all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`Total users: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}: ${user.name} (${user.email}) - Has subscription: ${!!user.subscription}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
