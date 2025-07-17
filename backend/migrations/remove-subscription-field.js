const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Migration function to remove subscription field from all users
const removeSubscriptionField = async () => {
  try {
    console.log('🔄 Starting migration to remove subscription field from users...');
    
    // Update all users to remove the subscription field
    const result = await mongoose.connection.db.collection('users').updateMany(
      {}, // Empty filter matches all documents
      { $unset: { subscription: "" } } // Remove the subscription field
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Modified ${result.modifiedCount} users`);
    console.log(`   - Matched ${result.matchedCount} users`);
    
    // Verify the change
    const sampleUser = await mongoose.connection.db.collection('users').findOne({});
    console.log('📋 Sample user after migration:');
    console.log(JSON.stringify(sampleUser, null, 2));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// Main migration function
const runMigration = async () => {
  try {
    await connectDB();
    await removeSubscriptionField();
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, removeSubscriptionField };
