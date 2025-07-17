const express = require('express');
const { body, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const OpenAI = require('openai');
const Analysis = require('../models/Analysis');
const File = require('../models/File');
const User = require('../models/User');
const { auth, ownerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Initialize OpenAI (if API key is provided)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Helper function to process data based on configuration
const processData = (rawData, config) => {
  let processedData = [...rawData];

  // Apply filters
  if (config.dataSelection?.filters?.length > 0) {
    config.dataSelection.filters.forEach(filter => {
      const { column, operator, value } = filter;
      processedData = processedData.filter(row => {
        const cellValue = row[column];
        
        switch (operator) {
          case 'equals':
            return cellValue == value;
          case 'not_equals':
            return cellValue != value;
          case 'contains':
            return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
          case 'not_contains':
            return !String(cellValue).toLowerCase().includes(String(value).toLowerCase());
          case 'greater_than':
            return Number(cellValue) > Number(value);
          case 'less_than':
            return Number(cellValue) < Number(value);
          case 'between':
            return Number(cellValue) >= Number(value[0]) && Number(cellValue) <= Number(value[1]);
          case 'in':
            return Array.isArray(value) && value.includes(cellValue);
          case 'not_in':
            return Array.isArray(value) && !value.includes(cellValue);
          default:
            return true;
        }
      });
    });
  }

  // Apply groupBy and aggregations
  if (config.dataSelection?.groupBy?.length > 0) {
    const grouped = {};
    
    processedData.forEach(row => {
      const groupKey = config.dataSelection.groupBy.map(col => row[col]).join('|');
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(row);
    });

    // Apply aggregations
    processedData = Object.entries(grouped).map(([groupKey, rows]) => {
      const result = {};
      
      // Add group by columns
      config.dataSelection.groupBy.forEach((col, index) => {
        result[col] = groupKey.split('|')[index];
      });

      // Apply aggregation functions
      if (config.dataSelection?.aggregations?.length > 0) {
        config.dataSelection.aggregations.forEach(agg => {
          const { column, function: aggFunc } = agg;
          const values = rows.map(row => Number(row[column])).filter(val => !isNaN(val));
          
          switch (aggFunc) {
            case 'sum':
              result[`${column}_sum`] = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              result[`${column}_avg`] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
              break;
            case 'count':
              result[`${column}_count`] = values.length;
              break;
            case 'min':
              result[`${column}_min`] = values.length > 0 ? Math.min(...values) : 0;
              break;
            case 'max':
              result[`${column}_max`] = values.length > 0 ? Math.max(...values) : 0;
              break;
            case 'median':
              const sorted = [...values].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              result[`${column}_median`] = sorted.length % 2 === 0 
                ? (sorted[mid - 1] + sorted[mid]) / 2 
                : sorted[mid];
              break;
            case 'std_dev':
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
              result[`${column}_std_dev`] = Math.sqrt(variance);
              break;
          }
        });
      }

      return result;
    });
  }

  // Apply orderBy
  if (config.dataSelection?.orderBy?.length > 0) {
    processedData.sort((a, b) => {
      for (const sort of config.dataSelection.orderBy) {
        const { column, direction } = sort;
        const aVal = a[column];
        const bVal = b[column];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  return processedData;
};

// Helper function to generate AI insights
const generateAIInsights = async (data, config) => {
  if (!openai) {
    return [{
      type: 'summary',
      title: 'AI Insights Unavailable',
      description: 'OpenAI API key not configured. AI insights are not available.',
      confidence: 0,
      importance: 'low'
    }];
  }

  try {
    const dataDescription = {
      rowCount: data.length,
      columns: Object.keys(data[0] || {}),
      chartType: config.chartType,
      sampleData: data.slice(0, 5)
    };

    const prompt = `
Analyze this data visualization and provide insights:

Chart Type: ${config.chartType}
Data Summary: ${JSON.stringify(dataDescription, null, 2)}

Please provide 3-5 key insights about this data in the following JSON format:
[
  {
    "type": "trend|outlier|correlation|pattern|recommendation|summary",
    "title": "Brief title",
    "description": "Detailed description",
    "confidence": 0.0-1.0,
    "importance": "low|medium|high"
  }
]

Focus on identifying trends, patterns, outliers, correlations, or actionable recommendations.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    const insights = JSON.parse(response.choices[0].message.content);
    return insights.map(insight => ({
      ...insight,
      generatedAt: new Date()
    }));
  } catch (error) {
    console.error('AI insights generation error:', error);
    return [{
      type: 'summary',
      title: 'Analysis Summary',
      description: `Data contains ${data.length} rows and ${Object.keys(data[0] || {}).length} columns. Chart type: ${config.chartType}.`,
      confidence: 0.5,
      importance: 'medium',
      generatedAt: new Date()
    }];
  }
};

// @route   POST /api/analytics/create
// @desc    Create new analysis
// @access  Private
router.post('/create',
  auth,
  [
    body('fileId').isMongoId().withMessage('Valid file ID is required'),
    body('name').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Analysis name is required and must be between 1-100 characters'),
    body('type').isIn(['chart', 'pivot', 'statistics', 'correlation', 'regression', 'custom']).withMessage('Invalid analysis type'),
    body('chartType').optional().isIn([
      // 2D Charts
      'bar', 'column', 'line', 'area', 'pie', 'doughnut', 'scatter', 'bubble', 'radar', 'polar', 'heatmap', 'histogram', 'box', 'violin', 'waterfall', 'funnel', 'gauge', 'treemap', 'sunburst', 'sankey',
      // 3D Charts
      'bar3d', 'column3d', 'line3d', 'area3d', 'pie3d', 'scatter3d', 'surface3d', 'wireframe3d', 'cylinder3d', 'cone3d', 'pyramid3d', 'bubble3d', 'mesh3d', 'contour3d', 'volume3d'
    ]).withMessage('Invalid chart type'),
    body('config').isObject().withMessage('Configuration object is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { fileId, name, description, type, chartType, dimensions, config } = req.body;
      const startTime = Date.now();

      // Debug: Log the incoming request body
      console.log('Creating analysis with request body:', JSON.stringify(req.body, null, 2));
      console.log('Config dataSelection:', JSON.stringify(config.dataSelection, null, 2));

      // Verify file exists and user has access
      const file = await File.findById(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      if (file.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (file.status !== 'processed') {
        return res.status(400).json({ message: 'File is not processed yet' });
      }

      // Read Excel data - handle both local and Cloudinary files
      let workbook;
      
      if (file.cloudinaryUrl) {
        // Download from Cloudinary if available
        const axios = require('axios');
        const response = await axios({
          method: 'GET',
          url: file.cloudinaryUrl,
          responseType: 'arraybuffer'
        });
        workbook = XLSX.read(response.data, { type: 'buffer' });
      } else {
        // Fallback to local file (check if file exists)
        const fs = require('fs');
        if (!fs.existsSync(file.filePath)) {
          return res.status(400).json({ 
            message: 'File not found. Please re-upload the file.',
            error: 'FILE_NOT_FOUND'
          });
        }
        workbook = XLSX.readFile(file.filePath);
      }
      
      const sheetName = config.dataSelection?.sheet || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) {
        return res.status(400).json({ message: 'No data found in the selected sheet' });
      }

      // Process data based on configuration
      const processedData = processData(rawData, config);

      // Create analysis record
      const analysis = new Analysis({
        userId: req.user.id,
        fileId,
        name,
        description: description || '',
        type,
        chartType: type === 'chart' ? chartType : undefined,
        dimensions: dimensions || '2d',
        config,
        data: {
          processedData,
          rawData: rawData.slice(0, 1000), // Store sample of raw data
          statistics: {
            rowCount: processedData.length,
            columnCount: Object.keys(processedData[0] || {}).length,
            nullValues: processedData.reduce((count, row) => {
              return count + Object.values(row).filter(val => val === null || val === undefined || val === '').length;
            }, 0),
            uniqueValues: Object.keys(processedData[0] || {}).reduce((acc, key) => {
              acc[key] = new Set(processedData.map(row => row[key])).size;
              return acc;
            }, {})
          }
        },
        status: 'processing',
        processingTime: Date.now() - startTime
      });

      await analysis.save();

      // Generate AI insights if enabled
      if (process.env.ENABLE_AI_INSIGHTS !== 'false') {
        try {
          const insights = await generateAIInsights(processedData, config);
          analysis.insights.aiInsights = insights;
        } catch (insightError) {
          console.error('Error generating AI insights:', insightError);
        }
      }

      // Update status and save
      analysis.status = 'completed';
      analysis.processingTime = Date.now() - startTime;
      await analysis.save();

      // Update user analytics count
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'usage.totalAnalyses': 1 }
      });

      res.status(201).json({
        message: 'Analysis created successfully',
        analysis: {
          id: analysis._id,
          name: analysis.name,
          type: analysis.type,
          chartType: analysis.chartType,
          status: analysis.status,
          processingTime: analysis.processingTimeFormatted,
          dataPoints: processedData.length,
          insights: analysis.insights.aiInsights?.length || 0,
          createdAt: analysis.createdAt
        }
      });
    } catch (error) {
      console.error('Create analysis error:', error);
      res.status(500).json({ message: 'Server error creating analysis' });
    }
  }
);

// @route   GET /api/analytics
// @desc    Get user's analyses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, status, favorite } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId: req.user.id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (favorite === 'true') query.isFavorite = true;

    const analyses = await Analysis.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fileId', 'originalName fileType')
      .select('-data.rawData -errors');

    const total = await Analysis.countDocuments(query);

    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      analyses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAnalyses: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ message: 'Server error fetching analyses' });
  }
});

// @route   GET /api/analytics/stats
// @desc    Get analytics statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Analysis.getAnalysisStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get analytics stats error:', error);
    res.status(500).json({ message: 'Server error fetching analytics statistics' });
  }
});

// @route   GET /api/analytics/:id
// @desc    Get specific analysis
// @access  Private
router.get('/:id', auth, ownerOrAdmin(Analysis), async (req, res) => {
  try {
    const analysis = req.resource;
    
    // Increment view count
    await analysis.incrementViewCount();
    
    res.json({ analysis });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ message: 'Server error fetching analysis' });
  }
});

// @route   PUT /api/analytics/:id
// @desc    Update analysis
// @access  Private
router.put('/:id',
  auth,
  ownerOrAdmin(Analysis),
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const analysis = req.resource;
      const { name, description, tags, isPublic, config } = req.body;

      if (name !== undefined) analysis.name = name;
      if (description !== undefined) analysis.description = description;
      if (tags !== undefined) analysis.tags = tags;
      if (isPublic !== undefined) analysis.isPublic = isPublic;
      if (config !== undefined) analysis.config = { ...analysis.config, ...config };

      await analysis.save();

      res.json({
        message: 'Analysis updated successfully',
        analysis: {
          id: analysis._id,
          name: analysis.name,
          description: analysis.description,
          tags: analysis.tags,
          isPublic: analysis.isPublic,
          updatedAt: analysis.updatedAt
        }
      });
    } catch (error) {
      console.error('Update analysis error:', error);
      res.status(500).json({ message: 'Server error updating analysis' });
    }
  }
);

// @route   DELETE /api/analytics/:id
// @desc    Delete analysis
// @access  Private
router.delete('/:id', auth, ownerOrAdmin(Analysis), async (req, res) => {
  try {
    const analysis = req.resource;
    const analysisId = analysis._id.toString();
    
    console.log(`Attempting to delete analysis with ID: ${analysisId}`);
    console.log(`Analysis belongs to user: ${analysis.userId}`);
    console.log(`Request user: ${req.user.id}`);

    // First, verify the analysis exists
    const existingAnalysis = await Analysis.findById(analysisId);
    if (!existingAnalysis) {
      console.error('Analysis not found before deletion');
      return res.status(404).json({ message: 'Analysis not found' });
    }

    // Perform the deletion using deleteOne for better reliability
    const deleteResult = await Analysis.deleteOne({ _id: analysisId });
    
    if (deleteResult.deletedCount === 0) {
      console.error('Analysis not deleted - deletedCount is 0');
      return res.status(500).json({ message: 'Failed to delete analysis' });
    }
    
    console.log(`Analysis deleted successfully: ${analysisId}`);
    
    // Verify deletion with a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));
    const verifyDeletion = await Analysis.findById(analysisId);
    if (verifyDeletion) {
      console.error('ERROR: Analysis still exists after deletion!', verifyDeletion._id);
      return res.status(500).json({ message: 'Failed to delete analysis completely' });
    }
    
    console.log('Deletion verified - analysis no longer exists in database');

    // Update user analytics count
    try {
      await User.findByIdAndUpdate(analysis.userId, {
        $inc: { 'usage.totalAnalyses': -1 }
      });
    } catch (userUpdateError) {
      console.error('Error updating user analytics count:', userUpdateError);
      // Don't fail the deletion if user update fails
    }

    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({ 
      message: 'Analysis deleted successfully',
      deletedId: analysisId,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ 
      message: 'Server error deleting analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/analytics/:id/favorite
// @desc    Toggle favorite status
// @access  Private
router.post('/:id/favorite', auth, ownerOrAdmin(Analysis), async (req, res) => {
  try {
    const analysis = req.resource;
    await analysis.toggleFavorite();

    res.json({
      message: `Analysis ${analysis.isFavorite ? 'added to' : 'removed from'} favorites`,
      isFavorite: analysis.isFavorite
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Server error toggling favorite status' });
  }
});

// @route   POST /api/analytics/:id/export
// @desc    Export analysis (placeholder for chart export functionality)
// @access  Private
router.post('/:id/export',
  auth,
  ownerOrAdmin(Analysis),
  [
    body('format').isIn(['png', 'jpg', 'pdf', 'svg', 'json']).withMessage('Invalid export format')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const analysis = req.resource;
      const { format } = req.body;

      // In a real implementation, you would generate the chart image/file here
      // For now, we'll just record the export request
      const exportData = {
        format,
        fileName: `${analysis.name.replace(/\s+/g, '_')}_${Date.now()}.${format}`,
        filePath: '', // Would be the actual file path
        fileSize: 0, // Would be the actual file size
        exportedAt: new Date()
      };

      await analysis.recordExport(exportData);

      res.json({
        message: 'Export request recorded',
        export: exportData
      });
    } catch (error) {
      console.error('Export analysis error:', error);
      res.status(500).json({ message: 'Server error exporting analysis' });
    }
  }
);

// @route   POST /api/analytics/:id/insights
// @desc    Generate new AI insights
// @access  Private
router.post('/:id/insights', auth, ownerOrAdmin(Analysis), async (req, res) => {
  try {
    const analysis = req.resource;

    if (!analysis.data.processedData || analysis.data.processedData.length === 0) {
      return res.status(400).json({ message: 'No processed data available for insights generation' });
    }

    const insights = await generateAIInsights(analysis.data.processedData, analysis.config);
    
    // Add new insights to existing ones
    insights.forEach(insight => {
      analysis.insights.aiInsights.push(insight);
    });

    await analysis.save();

    res.json({
      message: 'AI insights generated successfully',
      insights: insights
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({ message: 'Server error generating insights' });
  }
});

module.exports = router;
