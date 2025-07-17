const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['chart', 'pivot', 'statistics', 'correlation', 'regression', 'custom'],
    required: true
  },
  chartType: {
    type: String,
    enum: [
      // 2D Charts
      'bar', 'column', 'line', 'area', 'pie', 'doughnut', 'scatter', 'bubble', 'radar', 'polar',
      'heatmap', 'histogram', 'box', 'violin', 'waterfall', 'funnel', 'gauge', 'treemap', 'sunburst', 'sankey',
      // 3D Charts
      'bar3d', 'column3d', 'line3d', 'area3d', 'pie3d', 'scatter3d', 'surface3d', 'wireframe3d',
      'cylinder3d', 'cone3d', 'pyramid3d', 'bubble3d', 'mesh3d', 'contour3d', 'volume3d',
      // Legacy 3D naming for backward compatibility
      '3d-bar', '3d-line', '3d-scatter'
    ],
    required: true
  },
  dimensions: {
    type: String,
    enum: ['2d', '3d'],
    default: '2d'
  },
  config: {
    // Chart.js configuration
    chartConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Three.js configuration for 3D charts
    threejsConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Data selection
    dataSelection: {
      sheet: String,
      xAxisColumn: String,
      yAxisColumn: String,
      columns: [{
        name: String,
        type: String,
        role: {
          type: String,
          enum: ['x', 'y', 'z', 'category', 'series', 'value', 'label']
        }
      }],
      filters: [{
        column: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'in', 'not_in']
        },
        value: mongoose.Schema.Types.Mixed
      }],
      aggregations: [{
        column: String,
        function: {
          type: String,
          enum: ['sum', 'avg', 'count', 'min', 'max', 'median', 'mode', 'std_dev']
        }
      }],
      groupBy: [String],
      orderBy: [{
        column: String,
        direction: {
          type: String,
          enum: ['asc', 'desc'],
          default: 'asc'
        }
      }]
    },
    // Styling options
    styling: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'colorful', 'minimal', 'corporate'],
        default: 'light'
      },
      colors: [{
        type: String,
        match: /^#[0-9A-F]{6}$/i
      }],
      fonts: {
        family: String,
        size: Number,
        weight: String
      },
      layout: {
        width: Number,
        height: Number,
        margin: {
          top: Number,
          right: Number,
          bottom: Number,
          left: Number
        }
      }
    }
  },
  data: {
    // Processed data for the chart
    processedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Raw data subset used
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Statistical information
    statistics: {
      rowCount: Number,
      columnCount: Number,
      nullValues: Number,
      uniqueValues: {
        type: Map,
        of: Number
      },
      dataTypes: {
        type: Map,
        of: String
      }
    }
  },
  insights: {
    // AI-generated insights
    aiInsights: [{
      type: {
        type: String,
        enum: ['trend', 'outlier', 'correlation', 'pattern', 'recommendation', 'summary']
      },
      title: String,
      description: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      importance: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      generatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // User annotations
    userAnnotations: [{
      text: String,
      position: {
        x: Number,
        y: Number
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  exports: [{
    format: {
      type: String,
      enum: ['png', 'jpg', 'pdf', 'svg', 'json']
    },
    fileName: String,
    filePath: String,
    fileSize: Number,
    exportedAt: {
      type: Date,
      default: Date.now
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'failed', 'archived'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date,
    default: Date.now
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  errorLogs: [{
    message: String,
    stack: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted processing time
analysisSchema.virtual('processingTimeFormatted').get(function() {
  if (this.processingTime < 1000) {
    return `${this.processingTime}ms`;
  } else if (this.processingTime < 60000) {
    return `${(this.processingTime / 1000).toFixed(1)}s`;
  } else {
    return `${(this.processingTime / 60000).toFixed(1)}m`;
  }
});

// Virtual for analysis age
analysisSchema.virtual('analysisAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Instance method to increment view count
analysisSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// Instance method to toggle favorite status
analysisSchema.methods.toggleFavorite = async function() {
  this.isFavorite = !this.isFavorite;
  return this.save({ validateBeforeSave: false });
};

// Instance method to add AI insight
analysisSchema.methods.addAIInsight = async function(insight) {
  this.insights.aiInsights.push(insight);
  return this.save({ validateBeforeSave: false });
};

// Instance method to add user annotation
analysisSchema.methods.addUserAnnotation = async function(annotation) {
  this.insights.userAnnotations.push(annotation);
  return this.save({ validateBeforeSave: false });
};

// Instance method to record export
analysisSchema.methods.recordExport = async function(exportData) {
  this.exports.push(exportData);
  return this.save({ validateBeforeSave: false });
};

// Static method to get analysis statistics
analysisSchema.statics.getAnalysisStats = async function(userId = null) {
  const matchStage = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        completedAnalyses: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        favoriteAnalyses: { $sum: { $cond: [{ $eq: ['$isFavorite', true] }, 1, 0] } },
        publicAnalyses: { $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] } },
        totalViews: { $sum: '$viewCount' },
        avgProcessingTime: { $avg: '$processingTime' },
        chartTypeDistribution: {
          $push: '$chartType'
        }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalAnalyses: 0,
    completedAnalyses: 0,
    favoriteAnalyses: 0,
    publicAnalyses: 0,
    totalViews: 0,
    avgProcessingTime: 0,
    chartTypeDistribution: []
  };

  // Count chart types
  if (result.chartTypeDistribution) {
    const chartTypeCounts = {};
    result.chartTypeDistribution.forEach(type => {
      if (type) {
        chartTypeCounts[type] = (chartTypeCounts[type] || 0) + 1;
      }
    });
    result.chartTypeDistribution = chartTypeCounts;
  }

  return result;
};

// Static method to get recent analyses
analysisSchema.statics.getRecentAnalyses = async function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('fileId', 'originalName fileType')
    .select('-data.rawData -errorLogs');
};

// Static method to get popular analyses
analysisSchema.statics.getPopularAnalyses = async function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ viewCount: -1 })
    .limit(limit)
    .populate('userId', 'name')
    .populate('fileId', 'originalName fileType')
    .select('-data.rawData -errorLogs');
};

// Static method to search analyses
analysisSchema.statics.searchAnalyses = async function(userId, query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ]
  };

  return this.find(matchStage)
    .sort({ updatedAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .populate('fileId', 'originalName fileType')
    .select('-data.rawData -errorLogs');
};

// Indexes for better performance
analysisSchema.index({ userId: 1, updatedAt: -1 });
analysisSchema.index({ fileId: 1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ isPublic: 1, viewCount: -1 });
analysisSchema.index({ isFavorite: 1 });
analysisSchema.index({ name: 'text', description: 'text', tags: 'text' });
analysisSchema.index({ chartType: 1 });
analysisSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
