import { api } from './api';

export const analyticsService = {
  // Create new analysis
  createAnalysis: async (analysisData) => {
    const response = await api.post('/analytics/create', analysisData);
    return response.data;
  },

  // Get user's analyses
  getAnalyses: async (params = {}) => {
    const response = await api.get('/analytics', { params });
    return response.data;
  },

  // Get specific analysis
  getAnalysis: async (analysisId) => {
    const response = await api.get(`/analytics/${analysisId}`);
    return response.data;
  },

  // Update analysis
  updateAnalysis: async (analysisId, updateData) => {
    const response = await api.put(`/analytics/${analysisId}`, updateData);
    return response.data;
  },

  // Delete analysis
  deleteAnalysis: async (analysisId) => {
    const response = await api.delete(`/analytics/${analysisId}`);
    return response.data;
  },

  // Toggle favorite
  toggleFavorite: async (analysisId) => {
    const response = await api.post(`/analytics/${analysisId}/favorite`);
    return response.data;
  },

  // Export analysis
  exportAnalysis: async (analysisId, format) => {
    const response = await api.post(`/analytics/${analysisId}/export`, { format });
    return response.data;
  },

  // Generate insights
  generateInsights: async (analysisId) => {
    const response = await api.post(`/analytics/${analysisId}/insights`);
    return response.data;
  },

  // Get analytics statistics
  getAnalyticsStats: async () => {
    const response = await api.get('/analytics/stats');
    return response.data;
  },

  // Get chart types
  getChartTypes: () => {
    return [
      { value: 'bar', label: 'Bar Chart', icon: '📊' },
      { value: 'line', label: 'Line Chart', icon: '📈' },
      { value: 'pie', label: 'Pie Chart', icon: '🥧' },
      { value: 'doughnut', label: 'Doughnut Chart', icon: '🍩' },
      { value: 'scatter', label: 'Scatter Plot', icon: '📉' },
      { value: 'bubble', label: 'Bubble Chart', icon: '🫧' },
      { value: 'radar', label: 'Radar Chart', icon: '📡' },
      { value: 'polar', label: 'Polar Area', icon: '🎯' },
      { value: 'area', label: 'Area Chart', icon: '🏔️' },
      { value: '3d-bar', label: '3D Bar Chart', icon: '📊' },
      { value: '3d-line', label: '3D Line Chart', icon: '📈' },
      { value: '3d-scatter', label: '3D Scatter Plot', icon: '📉' }
    ];
  },

  // Get analysis types
  getAnalysisTypes: () => {
    return [
      { value: 'chart', label: 'Chart Visualization', description: 'Create interactive charts from your data' },
      { value: 'pivot', label: 'Pivot Table', description: 'Summarize and analyze data with pivot tables' },
      { value: 'statistics', label: 'Statistical Analysis', description: 'Generate statistical insights and summaries' },
      { value: 'correlation', label: 'Correlation Analysis', description: 'Find relationships between data columns' },
      { value: 'regression', label: 'Regression Analysis', description: 'Predict trends and future values' },
      { value: 'custom', label: 'Custom Analysis', description: 'Create custom data analysis workflows' }
    ];
  },

  // Validate analysis configuration
  validateAnalysisConfig: (config) => {
    const errors = [];
    
    if (!config.dataSelection?.sheet) {
      errors.push('Sheet selection is required');
    }
    
    if (config.type === 'chart' && !config.chartType) {
      errors.push('Chart type is required for chart analysis');
    }
    
    if (!config.dataSelection?.columns || config.dataSelection.columns.length === 0) {
      errors.push('At least one column must be selected');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Search analyses
  searchAnalyses: async (query, options = {}) => {
    const response = await api.get('/analytics', {
      params: { search: query, ...options }
    });
    return response.data;
  }
};
