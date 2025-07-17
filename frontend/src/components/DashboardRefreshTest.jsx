import React from 'react';
import { useDashboard } from '../context/DashboardContext';

const DashboardRefreshTest = () => {
  const { forceUpdateStats, refreshDashboardWithRetry, notifyFileUploaded, notifyAnalysisCreated } = useDashboard();

  const testFileUpload = async () => {
    console.log('🧪 Testing file upload notification...');
    await notifyFileUploaded({
      originalName: 'test-file.xlsx',
      fileSize: 1024 * 1024,
      totalRows: 100
    });
  };

  const testAnalysisCreation = async () => {
    console.log('🧪 Testing analysis creation notification...');
    await notifyAnalysisCreated({
      name: 'Test Analysis',
      type: 'chart',
      chartType: 'bar'
    });
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-semibold mb-4">Dashboard Refresh Test</h3>
      <div className="space-x-2">
        <button
          onClick={forceUpdateStats}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Force Update Stats
        </button>
        <button
          onClick={() => refreshDashboardWithRetry(3)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh with Retry
        </button>
        <button
          onClick={testFileUpload}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test File Upload
        </button>
        <button
          onClick={testAnalysisCreation}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Test Analysis Creation
        </button>
      </div>
    </div>
  );
};

export default DashboardRefreshTest;
