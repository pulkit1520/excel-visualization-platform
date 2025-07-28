const mongoose = require('mongoose');
const User = require('../models/User');
const File = require('../models/File');
const dotenv = require('dotenv');

dotenv.config();

async function fixUserStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const users = await User.find();

    for (const user of users) {
      const actualFileCount = await File.countDocuments({ userId: user._id });
      const storageAggregation = await File.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(user._id) } },
        { $group: { _id: null, totalStorage: { $sum: '$fileSize' } } }
      ]);
      const actualStorageUsed = storageAggregation.length > 0 ? storageAggregation[0].totalStorage : 0;

      if (user.usage.filesUploaded !== actualFileCount || user.usage.storageUsed !== actualStorageUsed) {
        console.log(`Fixing usage for user ${user.email}`);
        console.log(`  Files: ${user.usage.filesUploaded} -> ${actualFileCount}`);
        console.log(`  Storage: ${user.usage.storageUsed} -> ${actualStorageUsed}`);

        await User.findByIdAndUpdate(user._id, {
          'usage.filesUploaded': actualFileCount,
          'usage.storageUsed': actualStorageUsed
        });
      }
    }

    console.log('User stats fixed');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error fixing user stats:', err);
    mongoose.connection.close();
  }
}

fixUserStats();
