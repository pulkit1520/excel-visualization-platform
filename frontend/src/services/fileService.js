import { api } from './api';

export const fileService = {
  // Upload Excel file
  uploadFile: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    
    if (metadata.tags) {
      formData.append('tags', metadata.tags);
    }

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get user's files
  getFiles: async (params = {}) => {
    const response = await api.get('/files', { params });
    return response.data;
  },

  // Get specific file
  getFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  // Get file data
  getFileData: async (fileId, params = {}) => {
    const response = await api.get(`/files/${fileId}/data`, { params });
    return response.data;
  },

  // Get columns of a specific Excel file
  getFileColumns: async (fileId) => {
    const response = await api.get(`/files/${fileId}/columns`);
    return response.data;
  },

  // Update file metadata
  updateFile: async (fileId, updateData) => {
    const response = await api.put(`/files/${fileId}`, updateData);
    return response.data;
  },

  // Delete file
  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  // Get file statistics
  getFileStats: async () => {
    const response = await api.get('/files/stats');
    return response.data;
  },

  // Get dashboard statistics (accurate user-specific stats)
  getDashboardStats: async () => {
    const response = await api.get('/files/dashboard-stats');
    return response.data;
  },

  // Search files
  searchFiles: async (query, options = {}) => {
    const response = await api.get('/files', {
      params: { search: query, ...options }
    });
    return response.data;
  },

  // Get recent files
  getRecentFiles: async (limit = 5) => {
    const response = await api.get('/files/recent', { params: { limit } });
    return response.data;
  },

  // Download file
  downloadFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}/download`);
    return response.data;
  },

  // Duplicate file
  duplicateFile: async (fileId) => {
    const response = await api.post(`/files/${fileId}/duplicate`);
    return response.data;
  },

  // Validate file before upload
  validateFile: (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv'
    ];

    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.' };
    }

    return { valid: true };
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get file type icon
  getFileTypeIcon: (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'xlsx':
      case 'xls':
        return '📊';
      case 'csv':
        return '📋';
      default:
        return '📄';
    }
  },
};
