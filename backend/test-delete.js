const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test the delete functionality directly
async function testDelete() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/excel-analytics');
    console.log('Connected to MongoDB');
    
    const Analysis = require('./models/Analysis');
    
    // Find all analyses
    const analyses = await Analysis.find({});
    console.log(`Found ${analyses.length} analyses in database`);
    
    if (analyses.length === 0) {
      console.log('No analyses found to test delete');
      return;
    }
    
    // Test deleting one analysis
    const testAnalysis = analyses[0];
    console.log(`Testing delete of analysis: ${testAnalysis._id}`);
    
    // Delete the analysis
    const deletedAnalysis = await Analysis.findByIdAndDelete(testAnalysis._id);
    console.log(`Deleted analysis: ${deletedAnalysis ? 'SUCCESS' : 'FAILED'}`);
    
    // Verify deletion
    const checkDeleted = await Analysis.findById(testAnalysis._id);
    console.log(`Verification: ${checkDeleted ? 'STILL EXISTS - PROBLEM!' : 'DELETED SUCCESSFULLY'}`);
    
    // Count remaining analyses
    const remainingAnalyses = await Analysis.find({});
    console.log(`Remaining analyses: ${remainingAnalyses.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDelete();
