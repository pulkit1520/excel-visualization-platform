import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fileService } from '../services/fileService';
import { api } from '../services/api';
import { FileSpreadsheet, BarChart3, Activity, TrendingUp } from 'lucide-react';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [dashboardStats, setDashboardStats] = useState({
    totalFiles: 0,
    totalAnalyses: 0,
    totalDataPoints: 0,
    totalSize: 0
  });

  // Upload counter state - persisted in localStorage
  const [uploadCount, setUploadCount] = useState(() => {
    const savedCount = localStorage.getItem('uploadCount');
    return savedCount ? parseInt(savedCount, 10) : 0;
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format storage size utility
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format number utility
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Fetch and update dashboard statistics
  const updateDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Updating dashboard stats...');
      
      // Use the new accurate dashboard stats endpoint
      try {
        console.log('📊 Fetching dashboard stats from dedicated endpoint...');
        const dashboardResponse = await fileService.getDashboardStats();
        console.log('📊 Dashboard stats response:', dashboardResponse);
        
        if (dashboardResponse && dashboardResponse.dashboardStats) {
          const stats = dashboardResponse.dashboardStats;
          const newStats = {
            totalFiles: stats.totalFiles || 0,
            totalAnalyses: stats.totalAnalyses || 0,
            totalDataPoints: stats.totalDataPoints || 0,
            totalSize: stats.totalSize || 0
          };
          
          console.log('✅ New dashboard stats:', newStats);
          console.log('📊 User info:', {
            name: dashboardResponse.userName,
            email: dashboardResponse.userEmail,
            userId: dashboardResponse.userId
          });
          
          if (dashboardResponse.discrepancy) {
            const { filesUploadedDiff, storageUsedDiff } = dashboardResponse.discrepancy;
            if (filesUploadedDiff !== 0 || storageUsedDiff !== 0) {
              console.warn('⚠️ Discrepancy detected in user usage stats:', dashboardResponse.discrepancy);
            }
          }
          
          setDashboardStats(newStats);
          
          // Update recent activity from files details
          const activities = (dashboardResponse.filesDetails || []).slice(0, 4).map(file => ({
            action: `Uploaded ${file.name}`,
            time: new Date(file.uploadedAt).toLocaleDateString(),
            type: 'upload'
          }));
          
          setRecentActivity(activities);
          
          return {
            ...newStats,
            activities
          };
        }
      } catch (dashboardError) {
        console.error('❌ Dashboard stats endpoint failed:', dashboardError);
        throw dashboardError;
      }
      
    } catch (error) {
      console.error('❌ Error updating dashboard stats:', error);
      setError('Failed to load dashboard data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to force refresh stats (called after file upload or analysis creation)
  const forceUpdateStats = useCallback(async () => {
    console.log('🔄 Force updating dashboard stats...');
    await updateDashboardStats();
  }, [updateDashboardStats]);

  // Function to refresh with multiple attempts for better reliability
  const refreshDashboardWithRetry = useCallback(async (attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`🔄 Refresh attempt ${i + 1}/${attempts}`);
        await updateDashboardStats();
        break;
      } catch (error) {
        console.error(`❌ Refresh attempt ${i + 1} failed:`, error);
        if (i === attempts - 1) {
          console.error('❌ All refresh attempts failed');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
  }, [updateDashboardStats]);

  // Notify about new file upload
  const notifyFileUploaded = useCallback(async (fileData) => {
    console.log('🔔 File uploaded notification:', fileData);
    
    // Increment upload count
    setUploadCount((prevCount) => {
      const newCount = prevCount + 1;
      localStorage.setItem('uploadCount', newCount);
      return newCount;
    });

    // Add to recent activity immediately
    const newActivity = {
      action: `Uploaded ${fileData?.originalName || 'file'}`,
      time: new Date().toLocaleDateString(),
      type: 'upload'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 3)]);
    
    // Force refresh dashboard stats multiple times to ensure backend processing is complete
    const refreshStats = async (attempt = 1) => {
      try {
        console.log(`🔄 Refreshing stats attempt ${attempt}...`);
        await forceUpdateStats();
        console.log('✅ Dashboard stats refreshed after file upload');
      } catch (error) {
        console.error(`❌ Error refreshing dashboard stats (attempt ${attempt}):`, error);
      }
    };
    
    // Immediate refresh
    await refreshStats(1);
    
    // Delayed refreshes to account for backend processing time
    setTimeout(() => refreshStats(2), 1000);  // 1 second
    setTimeout(() => refreshStats(3), 3000);  // 3 seconds
    setTimeout(() => refreshStats(4), 6000);  // 6 seconds
    setTimeout(() => refreshStats(5), 10000); // 10 seconds
    
  }, [forceUpdateStats]);

  // Notify about new analysis creation
  const notifyAnalysisCreated = useCallback(async (analysisData) => {
    console.log('🔔 Analysis created notification:', analysisData);
    
    // Force refresh dashboard stats after analysis creation
    await forceUpdateStats();
    
    // Add to recent activity
    const newActivity = {
      action: `Created analysis: ${analysisData.name}`,
      time: new Date().toLocaleDateString(),
      type: 'analysis'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 3)]);
  }, [forceUpdateStats]);

  // Generate formatted stats for display
  const getFormattedStats = () => {
    return [
      {
        title: 'Files Uploaded',
        value: dashboardStats.totalFiles.toString(),
        change: '+0%',
        icon: FileSpreadsheet,
        color: 'blue'
      },
      {
        title: 'Analyses Created',
        value: dashboardStats.totalAnalyses.toString(),
        change: '+0%',
        icon: BarChart3,
        color: 'green'
      },
      {
        title: 'Data Points',
        value: formatNumber(dashboardStats.totalDataPoints),
        change: '+0%',
        icon: Activity,
        color: 'purple'
      },
      {
        title: 'Storage Used',
        value: formatBytes(dashboardStats.totalSize),
        change: '+0%',
        icon: TrendingUp,
        color: 'yellow'
      }
    ];
  };

  // Load dashboard stats when component mounts
  useEffect(() => {
    updateDashboardStats();
  }, [updateDashboardStats]);

  // Refresh dashboard stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updateDashboardStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [updateDashboardStats]);


  // Function to reset upload count
  const resetUploadCount = useCallback(() => {
    setUploadCount(0);
    localStorage.setItem('uploadCount', '0');
  }, []);

  const value = {
    dashboardStats,
    recentActivity,
    loading,
    error,
    uploadCount,
    resetUploadCount,
    updateDashboardStats,
    forceUpdateStats,
    refreshDashboardWithRetry,
    notifyFileUploaded,
    notifyAnalysisCreated,
    getFormattedStats
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
