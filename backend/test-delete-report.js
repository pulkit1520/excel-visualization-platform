const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test the delete functionality through the API
async function testDeleteReport() {
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
    
    // Get first analysis for testing
    const testAnalysis = analyses[0];
    const analysisId = testAnalysis._id.toString();
    const userId = testAnalysis.userId.toString();
    
    console.log(`Testing delete of analysis: ${analysisId}`);
    console.log(`Analysis belongs to user: ${userId}`);
    
    // Create a test authentication token (you might need to adjust this based on your auth system)
    const testToken = 'your-test-token-here'; // Replace with actual token
    
    // Test API endpoint
    const apiUrl = `http://localhost:8000/api/analytics/${analysisId}`;
    
    try {
      // Make DELETE request
      const response = await axios.delete(apiUrl, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response:', response.data);
      
      // Verify deletion in database
      const verifyDeletion = await Analysis.findById(analysisId);
      console.log(`Database verification: ${verifyDeletion ? 'STILL EXISTS - PROBLEM!' : 'DELETED SUCCESSFULLY'}`);
      
    } catch (apiError) {
      console.error('API Error:', apiError.response?.data || apiError.message);
    }
    
    // Test direct database deletion
    console.log('\n--- Testing Direct Database Deletion ---');
    if (analyses.length > 1) {
      const testAnalysis2 = analyses[1];
      const analysisId2 = testAnalysis2._id.toString();
      
      console.log(`Testing direct deletion of analysis: ${analysisId2}`);
      
      // Delete the analysis directly
      const deleteResult = await Analysis.deleteOne({ _id: analysisId2 });
      console.log(`Direct deletion result: ${deleteResult.deletedCount > 0 ? 'SUCCESS' : 'FAILED'}`);
      
      // Verify deletion
      const checkDeleted = await Analysis.findById(analysisId2);
      console.log(`Direct deletion verification: ${checkDeleted ? 'STILL EXISTS - PROBLEM!' : 'DELETED SUCCESSFULLY'}`);
    }
    
    // Count remaining analyses
    const remainingAnalyses = await Analysis.find({});
    console.log(`Remaining analyses: ${remainingAnalyses.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testDeleteReport();
