const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const XLSX = require('xlsx');
const { body, validationResult } = require('express-validator');
const File = require('../models/File');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const { auth, ownerOrAdmin } = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../temp');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `excel-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .xls, .xlsx, and .csv files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper function to analyze Excel file
const analyzeExcelFile = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const analysis = {
      sheetNames: workbook.SheetNames,
      sheets: {},
      metadata: {
        application: workbook.Props?.Application || 'Unknown',
        author: workbook.Props?.Author || 'Unknown',
        lastModified: workbook.Props?.ModifiedDate || null,
        version: workbook.Props?.Version || 'Unknown'
      }
    };

    let totalRows = 0;
    let totalColumns = 0;

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      const sheetRows = range.e.r + 1;
      const sheetColumns = range.e.c + 1;
      
      totalRows += sheetRows;
      totalColumns = Math.max(totalColumns, sheetColumns);

      // Get column headers (first row)
      const headers = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c });
        const cell = worksheet[cellAddress];
        headers.push(cell ? cell.v : `Column_${c + 1}`);
      }

      // Sample some data for analysis
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: headers, range: 0 });
      const sampleData = jsonData.slice(0, 100); // First 100 rows for analysis

      // Analyze column types
      const columnInfo = headers.map(header => {
        const values = sampleData.map(row => row[header]).filter(val => val !== undefined && val !== null);
        const uniqueValues = [...new Set(values)];
        
        // Determine data type
        let type = 'string';
        if (values.length > 0) {
          const numberCount = values.filter(val => typeof val === 'number' || !isNaN(Number(val))).length;
          const dateCount = values.filter(val => val instanceof Date || !isNaN(Date.parse(val))).length;
          const booleanCount = values.filter(val => typeof val === 'boolean' || val === 'true' || val === 'false').length;
          
          if (numberCount / values.length > 0.8) type = 'number';
          else if (dateCount / values.length > 0.8) type = 'date';
          else if (booleanCount / values.length > 0.8) type = 'boolean';
          else if (uniqueValues.length < values.length * 0.5) type = 'mixed';
        }

        return {
          name: header,
          type,
          sampleValues: uniqueValues.slice(0, 5).map(val => String(val)),
          nullCount: sampleData.length - values.length,
          uniqueCount: uniqueValues.length
        };
      });

      analysis.sheets[sheetName] = {
        name: sheetName,
        rows: sheetRows,
        columns: sheetColumns,
        range: worksheet['!ref'],
        columnInfo,
        sampleData: sampleData.slice(0, 10) // Store first 10 rows as preview
      };
    }

    analysis.totalRows = totalRows;
    analysis.totalColumns = totalColumns;
    
    return analysis;
  } catch (error) {
    throw new Error(`Failed to analyze Excel file: ${error.message}`);
  }
};

// @route   POST /api/files/upload
// @desc    Upload Excel file
// @access  Private
router.post('/upload', 
  auth, 
  upload.single('file'),
  async (req, res) => {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { originalname, filename, path: filePath, size, mimetype } = req.file;
      const { description, tags, isPublic = false } = req.body;
      tempFilePath = filePath;

      // Determine file type
      const extension = path.extname(originalname).toLowerCase();
      let fileType = 'xlsx';
      if (extension === '.xls') fileType = 'xls';
      else if (extension === '.csv') fileType = 'csv';

      // Upload to Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadExcelFile(filePath, originalname);

      // Create file record
      const fileRecord = new File({
        userId: req.user.id,
        originalName: originalname,
        fileName: filename,
        filePath,
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.url,
        fileSize: size,
        mimeType: mimetype,
        fileType,
        description: description || '',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
        isPublic: Boolean(isPublic),
        status: 'processing'
      });

      await fileRecord.save();

      // Analyze the file in the background
      try {
        const analysis = await analyzeExcelFile(filePath);
        
        // Update file record with analysis results
        fileRecord.sheetNames = analysis.sheetNames;
        fileRecord.totalRows = analysis.totalRows;
        fileRecord.totalColumns = analysis.totalColumns;
        fileRecord.metadata = {
          ...analysis.metadata,
          processedAt: new Date(),
          fileFormat: fileType,
          encoding: 'UTF-8'
        };
        
        // Store column info from the first sheet
        if (analysis.sheetNames.length > 0) {
          const firstSheet = analysis.sheets[analysis.sheetNames[0]];
          fileRecord.columnInfo = firstSheet.columnInfo;
          fileRecord.dataPreview = firstSheet.sampleData;
        }
        
        fileRecord.status = 'processed';
        fileRecord.processedAt = new Date();
        
        await fileRecord.save();

        // Update user usage statistics
        await User.findByIdAndUpdate(req.user.id, {
          $inc: {
            'usage.filesUploaded': 1,
            'usage.storageUsed': size
          }
        });

      } catch (analysisError) {
        console.error('File analysis error:', analysisError);
        fileRecord.status = 'failed';
        fileRecord.processingError = {
          message: analysisError.message,
          stack: analysisError.stack,
          timestamp: new Date()
        };
        await fileRecord.save();
      }

      // Clean up temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
      }

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: fileRecord._id,
          originalName: fileRecord.originalName,
          fileSize: fileRecord.fileSize,
          fileType: fileRecord.fileType,
          status: fileRecord.status,
          uploadedAt: fileRecord.uploadedAt,
          sheetNames: fileRecord.sheetNames,
          totalRows: fileRecord.totalRows,
          totalColumns: fileRecord.totalColumns,
          cloudinaryUrl: fileRecord.cloudinaryUrl,
          isPublic: fileRecord.isPublic,
          tags: fileRecord.tags
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up temporary file if there's an error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete temporary file:', unlinkError);
        }
      }
      
      res.status(500).json({ message: 'Server error during file upload' });
    }
  }
);

// @route   GET /api/files
// @desc    Get user's files
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, fileType } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId: req.user.id };
    
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (fileType) {
      query.fileType = fileType;
    }

    const files = await File.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-dataPreview -processingError');

    const total = await File.countDocuments(query);

    res.json({
      files,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalFiles: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Server error fetching files' });
  }
});

// @route   GET /api/files/stats
// @desc    Get file statistics for user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    // Get actual file count from database to ensure accuracy
    const actualFileCount = await File.countDocuments({ userId: req.user.id });
    
    // Get detailed file statistics
    const stats = await File.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          processedFiles: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
          failedFiles: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          processingFiles: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          avgFileSize: { $avg: '$fileSize' },
          maxFileSize: { $max: '$fileSize' },
          minFileSize: { $min: '$fileSize' }
        }
      }
    ]);
    
    const fileStats = stats[0] || {
      totalFiles: 0,
      totalSize: 0,
      processedFiles: 0,
      failedFiles: 0,
      processingFiles: 0,
      avgFileSize: 0,
      maxFileSize: 0,
      minFileSize: 0
    };
    
    // Ensure the count matches what we actually have in the database
    fileStats.totalFiles = actualFileCount;
    
    // Get user's stored usage stats for comparison
    const user = await User.findById(req.user.id).select('usage');
    
    res.json({ 
      stats: fileStats,
      userUsage: user.usage,
      userId: req.user.id,
      isAccurate: user.usage.filesUploaded === actualFileCount
    });
  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({ message: 'Server error fetching file statistics' });
  }
});

// @route   GET /api/files/dashboard-stats
// @desc    Get accurate dashboard statistics for user
// @access  Private
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📊 Getting dashboard stats for user: ${userId}`);
    
    // Get actual file count and details for this user only
    const userFiles = await File.find({ userId }).select('originalName fileSize totalRows uploadedAt status');
    const actualFileCount = userFiles.length;
    
    // Calculate actual storage used
    const actualStorageUsed = userFiles.reduce((total, file) => total + (file.fileSize || 0), 0);
    
    // Calculate actual data points (total rows)
    const actualDataPoints = userFiles.reduce((total, file) => total + (file.totalRows || 0), 0);
    
    // Get user's stored usage from database
    const user = await User.findById(userId).select('usage name email');
    
    // Get analytics count for this user
    const analyticsCount = await Analysis.countDocuments({ userId });
    
    console.log(`📊 Dashboard stats calculated:`);
    console.log(`   - Files: ${actualFileCount}`);
    console.log(`   - Storage: ${actualStorageUsed} bytes`);
    console.log(`   - Data Points: ${actualDataPoints}`);
    console.log(`   - Analytics: ${analyticsCount}`);
    console.log(`   - User stored usage:`, user.usage);
    
    const dashboardStats = {
      totalFiles: actualFileCount,
      totalAnalyses: analyticsCount,
      totalDataPoints: actualDataPoints,
      totalSize: actualStorageUsed,
      processedFiles: userFiles.filter(f => f.status === 'processed').length,
      failedFiles: userFiles.filter(f => f.status === 'failed').length,
      processingFiles: userFiles.filter(f => f.status === 'processing').length
    };
    
    res.json({
      userId,
      userName: user.name,
      userEmail: user.email,
      dashboardStats,
      userStoredUsage: user.usage,
      filesDetails: userFiles.map(f => ({
        name: f.originalName,
        size: f.fileSize,
        rows: f.totalRows,
        uploadedAt: f.uploadedAt,
        status: f.status
      })),
      discrepancy: {
        filesUploadedDiff: user.usage.filesUploaded - actualFileCount,
        storageUsedDiff: user.usage.storageUsed - actualStorageUsed
      },
      isAccurate: {
        files: user.usage.filesUploaded === actualFileCount,
        storage: user.usage.storageUsed === actualStorageUsed
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard statistics' });
  }
});

// @route   GET /api/files/:id
// @desc    Get specific file details
// @access  Private
router.get('/:id', auth, ownerOrAdmin(File), async (req, res) => {
  try {
    const file = req.resource;
    
    // Increment download count for tracking
    await file.incrementDownloadCount();
    
    res.json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Server error fetching file details' });
  }
});

// @route   GET /api/files/:id/data
// @desc    Get Excel file data for specific sheet
// @access  Private
router.get('/:id/data', auth, ownerOrAdmin(File), async (req, res) => {
  try {
    const file = req.resource;
    const { sheet, limit = 1000 } = req.query;
    
    if (file.status !== 'processed') {
      return res.status(400).json({ message: 'File is not processed yet' });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(file.filePath);
    const sheetName = sheet || workbook.SheetNames[0];
    
    if (!workbook.Sheets[sheetName]) {
      return res.status(400).json({ message: 'Sheet not found' });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Limit the data returned
    const limitedData = jsonData.slice(0, parseInt(limit));
    
    res.json({
      sheetName,
      data: limitedData,
      totalRows: jsonData.length,
      availableSheets: workbook.SheetNames
    });
  } catch (error) {
    console.error('Get file data error:', error);
    res.status(500).json({ message: 'Server error fetching file data' });
  }
});

// @route   PUT /api/files/:id
// @desc    Update file metadata
// @access  Private
router.put('/:id', 
  auth, 
  ownerOrAdmin(File),
  [
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

      const file = req.resource;
      const { description, tags, isPublic } = req.body;

      if (description !== undefined) file.description = description;
      if (tags !== undefined) file.tags = tags;
      if (isPublic !== undefined) file.isPublic = isPublic;

      await file.save();

      res.json({
        message: 'File updated successfully',
        file: {
          id: file._id,
          originalName: file.originalName,
          description: file.description,
          tags: file.tags,
          isPublic: file.isPublic,
          updatedAt: file.updatedAt
        }
      });
    } catch (error) {
      console.error('Update file error:', error);
      res.status(500).json({ message: 'Server error updating file' });
    }
  }
);

// @route   DELETE /api/files/:id
// @desc    Delete file
// @access  Private
router.delete('/:id', auth, ownerOrAdmin(File), async (req, res) => {
  try {
    const file = req.resource;

    // Delete from Cloudinary if exists
    if (file.cloudinaryPublicId) {
      try {
        await cloudinaryService.deleteFile(file.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Failed to delete file from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Update user usage statistics
    await User.findByIdAndUpdate(file.userId, {
      $inc: {
        'usage.filesUploaded': -1,
        'usage.storageUsed': -file.fileSize
      }
    });

    // Delete from database
    await File.findByIdAndDelete(file._id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error deleting file' });
  }
});

// @route   GET /api/files/recent
// @desc    Get recent files for user
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const recentFiles = await File.getRecentFiles(req.user.id, parseInt(limit));
    res.json({ files: recentFiles });
  } catch (error) {
    console.error('Get recent files error:', error);
    res.status(500).json({ message: 'Server error fetching recent files' });
  }
});

// @route   GET /api/files/search
// @desc    Search files for user
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const searchResults = await File.searchFiles(query, req.user.id, parseInt(limit));
    res.json({ files: searchResults });
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({ message: 'Server error searching files' });
  }
});

// @route   GET /api/files/:id/download
// @desc    Download file
// @access  Private
router.get('/:id/download', auth, ownerOrAdmin(File), async (req, res) => {
  try {
    const file = req.resource;
    
    if (file.status !== 'processed') {
      return res.status(400).json({ message: 'File is not processed yet' });
    }
    
    // Increment download count
    await file.incrementDownloadCount();
    
    // Get Cloudinary URL for download
    const downloadUrl = file.cloudinaryUrl;
    
    res.json({
      downloadUrl,
      fileName: file.originalName,
      fileSize: file.fileSize,
      fileType: file.fileType
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Server error downloading file' });
  }
});

// @route   POST /api/files/:id/duplicate
// @desc    Duplicate file
// @access  Private
router.post('/:id/duplicate', auth, ownerOrAdmin(File), async (req, res) => {
  try {
    const originalFile = req.resource;
    
    if (originalFile.status !== 'processed') {
      return res.status(400).json({ message: 'Original file is not processed yet' });
    }
    
    // Create a new file record as a duplicate
    const duplicatedFile = new File({
      userId: req.user.id,
      originalName: `Copy of ${originalFile.originalName}`,
      fileName: originalFile.fileName,
      cloudinaryPublicId: originalFile.cloudinaryPublicId, // Reuse same Cloudinary file
      cloudinaryUrl: originalFile.cloudinaryUrl,
      fileSize: originalFile.fileSize,
      mimeType: originalFile.mimeType,
      fileType: originalFile.fileType,
      description: originalFile.description,
      tags: [...originalFile.tags],
      isPublic: false, // Duplicates are private by default
      status: 'processed',
      processedAt: new Date(),
      sheetNames: originalFile.sheetNames,
      totalRows: originalFile.totalRows,
      totalColumns: originalFile.totalColumns,
      metadata: originalFile.metadata,
      columnInfo: originalFile.columnInfo,
      dataPreview: originalFile.dataPreview
    });
    
    await duplicatedFile.save();
    
    // Update user usage statistics
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        'usage.filesUploaded': 1
        // Don't add to storage used since we're reusing the same Cloudinary file
      }
    });
    
    res.status(201).json({
      message: 'File duplicated successfully',
      file: {
        id: duplicatedFile._id,
        originalName: duplicatedFile.originalName,
        fileSize: duplicatedFile.fileSize,
        fileType: duplicatedFile.fileType,
        status: duplicatedFile.status,
        uploadedAt: duplicatedFile.uploadedAt,
        isPublic: duplicatedFile.isPublic,
        tags: duplicatedFile.tags
      }
    });
  } catch (error) {
    console.error('Duplicate file error:', error);
    res.status(500).json({ message: 'Server error duplicating file' });
  }
});

// @route   POST /api/files/recalculate-usage
// @desc    Recalculate user usage statistics
// @access  Private
router.post('/recalculate-usage', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Count actual files for this user
    const fileCount = await File.countDocuments({ userId });
    
    // Calculate total storage used
    const storageAggregation = await File.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: null, totalStorage: { $sum: '$fileSize' } } }
    ]);
    
    const totalStorageUsed = storageAggregation.length > 0 ? storageAggregation[0].totalStorage : 0;
    
    // Update user's usage statistics
    const updatedUser = await User.findByIdAndUpdate(userId, {
      'usage.filesUploaded': fileCount,
      'usage.storageUsed': totalStorageUsed
    }, { new: true }).select('usage');
    
    res.json({
      message: 'Usage statistics recalculated successfully',
      oldUsage: req.user.usage,
      newUsage: updatedUser.usage,
      actualFileCount: fileCount,
      actualStorageUsed: totalStorageUsed
    });
  } catch (error) {
    console.error('Recalculate usage error:', error);
    res.status(500).json({ message: 'Server error recalculating usage' });
  }
});


// @route   GET /api/files/usage-debug
// @desc    Debug user usage statistics
// @access  Private
router.get('/usage-debug', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current usage from database
    const user = await User.findById(userId).select('usage');
    
    // Count actual files
    const actualFileCount = await File.countDocuments({ userId });
    
    // Get file details
    const files = await File.find({ userId }).select('originalName fileSize uploadedAt status');
    
    // Calculate actual storage
    const actualStorageUsed = files.reduce((total, file) => total + file.fileSize, 0);
    
    res.json({
      userId,
      userUsageFromDB: user.usage,
      actualFileCount,
      actualStorageUsed,
      filesInDB: files,
      discrepancy: {
        filesUploadedDiff: user.usage.filesUploaded - actualFileCount,
        storageUsedDiff: user.usage.storageUsed - actualStorageUsed
      }
    });
  } catch (error) {
    console.error('Usage debug error:', error);
    res.status(500).json({ message: 'Server error debugging usage' });
  }
});

// @route   GET /api/files/:id/columns
// @desc    Get file columns for dropdowns
// @access  Private
router.get('/:id/columns', auth, ownerOrAdmin(File), async (req, res) => {
  try {
    const file = req.resource;
    
    if (file.status !== 'processed') {
      return res.status(400).json({ message: 'File is not processed yet' });
    }

    // If columnInfo is available from file processing, use it
    if (file.columnInfo && file.columnInfo.length > 0) {
      const columns = file.columnInfo.map(col => col.name);
      return res.json({ columns });
    }

    // Otherwise, read the file and extract columns
    let workbook;
    try {
      if (file.cloudinaryUrl) {
        // Download file from Cloudinary and read
        const axios = require('axios');
        const response = await axios.get(file.cloudinaryUrl, { responseType: 'arraybuffer' });
        workbook = XLSX.read(response.data);
      } else {
        // Read from local file system
        workbook = XLSX.readFile(file.filePath);
      }
    } catch (fileError) {
      console.error('Error reading file for columns:', fileError);
      return res.status(500).json({ message: 'Error reading file' });
    }

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Extract column headers (first row)
    const columns = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c });
      const cell = worksheet[cellAddress];
      columns.push(cell ? cell.v : `Column_${c + 1}`);
    }
    
    res.json({ columns });
  } catch (error) {
    console.error('Get file columns error:', error);
    res.status(500).json({ message: 'Server error fetching file columns' });
  }
});

module.exports = router;
