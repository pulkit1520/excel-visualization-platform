import { api } from './api';

class AdminService {
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get all users with pagination and filters
  async getUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Update user (role, status, etc.)
  async updateUser(userId, updateData) {
    try {
      const response = await api.put(`/admin/users/${userId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Block/Unblock user
  async toggleUserStatus(userId, isActive) {
    try {
      const response = await api.put(`/admin/users/${userId}`, { isActive });
      return response.data;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  }

  // Delete user (soft delete)
  async deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get all files with pagination and filters
  async getFiles(params = {}) {
    try {
      const response = await api.get('/admin/files', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  // Delete file (admin override)
  async deleteFile(fileId) {
    try {
      const response = await api.delete(`/admin/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get system-wide analytics
  async getAnalytics(timeframe = '30d') {
    try {
      const response = await api.get('/admin/analytics', { 
        params: { timeframe } 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  // Get user activity logs
  async getUserActivityLogs(params = {}) {
    try {
      const response = await api.get('/admin/activity-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  // Get system health metrics
  async getSystemHealth() {
    try {
      const response = await api.get('/admin/system-health');
      return response.data;
    } catch (error) {
      console.error('Error fetching system health:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
