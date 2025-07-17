const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: false // Not required for backward compatibility
  },
  cloudinaryUrl: {
    type: String,
    required: false // Not required for backward compatibility
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/csv']
  },
  fileType: {
    type: String,
    enum: ['xls', 'xlsx', 'csv'],
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'processed', 'failed'],
    default: 'uploading'
  },
  processedAt: Date,
  sheetNames: [{
    type: String
  }],
  totalRows: {
    type: Number,
    default: 0
  },
  totalColumns: {
    type: Number,
    default: 0
  },
  columnInfo: [{
    name: String,
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean', 'mixed']
    },
    sampleValues: [String],
    nullCount: Number,
    uniqueCount: Number
  }],
  dataPreview: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    author: String,
    lastModified: Date,
    application: String,
    version: String,
    sheets: [{
      name: String,
      rows: Number,
      columns: Number,
      range: String
    }]
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  processingError: {
    message: String,
    stack: String,
    timestamp: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for file size in human readable format
fileSchema.virtual('fileSizeFormatted').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.fileSize === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file age
fileSchema.virtual('fileAge').get(function() {
  const now = new Date();
  const uploaded = new Date(this.uploadedAt);
  const diffTime = Math.abs(now - uploaded);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to update lastAccessed
fileSchema.pre('save', function(next) {
  if (this.isModified('downloadCount')) {
    this.lastAccessed = new Date();
  }
  next();
});

// Instance method to increment download count
fileSchema.methods.incrementDownloadCount = async function() {
  this.downloadCount += 1;
  this.lastAccessed = new Date();
  return this.save({ validateBeforeSave: false });
};

// Instance method to update processing status
fileSchema.methods.updateProcessingStatus = async function(status, error = null) {
  this.status = status;
  if (status === 'processed') {
    this.processedAt = new Date();
  }
  if (error) {
    this.processingError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
  }
  return this.save({ validateBeforeSave: false });
};

// Static method to get file statistics
fileSchema.statics.getFileStats = async function(userId = null) {
  const matchStage = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        totalDataPoints: { $sum: '$totalRows' },
        totalRows: { $sum: '$totalRows' },
        processedFiles: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
        failedFiles: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgFileSize: { $avg: '$fileSize' },
        totalDownloads: { $sum: '$downloadCount' }
      }
    }
  ]);
  return stats[0] || { 
    totalFiles: 0, 
    totalSize: 0, 
    totalDataPoints: 0,
    totalRows: 0,
    processedFiles: 0, 
    failedFiles: 0, 
    avgFileSize: 0,
    totalDownloads: 0 
  };
};

// Static method to get recent files
fileSchema.statics.getRecentFiles = async function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .select('-dataPreview -processingError');
};

// Static method to search files
fileSchema.statics.searchFiles = async function(userId, query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { originalName: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ]
  };

  return this.find(matchStage)
    .sort({ uploadedAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .select('-dataPreview -processingError');
};

// Indexes for better performance
fileSchema.index({ userId: 1, uploadedAt: -1 });
fileSchema.index({ status: 1 });
fileSchema.index({ originalName: 'text', description: 'text', tags: 'text' });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ fileType: 1 });

module.exports = mongoose.model('File', fileSchema);
