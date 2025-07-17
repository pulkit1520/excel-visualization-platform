const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const File = require('../models/File');
const Analysis = require('../models/Analysis');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Apply auth and adminAuth middleware to all routes
router.use(auth);
router.use(adminAuth);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const [userStats, fileStats, analysisStats] = await Promise.all([
      User.getUserStats(),
      File.getFileStats(),
      Analysis.getAnalysisStats()
    ]);

    // Get recent activities
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    const recentFiles = await File.find()
      .sort({ uploadedAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .select('originalName fileSize uploadedAt userId');

    res.json({
      stats: {
        users: userStats,
        files: fileStats,
        analyses: analysisStats
      },
      recentActivities: {
        users: recentUsers,
        files: recentFiles
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (role, status, etc.)
// @access  Private (Admin only)
router.put('/users/:id', 
  [
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
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

      const { role, isActive } = req.body;
      const updateData = {};

      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error updating user' });
    }
  }
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Soft delete - deactivate instead of removing
    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// @route   GET /api/admin/files
// @desc    Get all files with pagination
// @access  Private (Admin only)
router.get('/files', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, fileType } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) query.status = status;
    if (fileType) query.fileType = fileType;

    const files = await File.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
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

// @route   DELETE /api/admin/files/:id
// @desc    Delete file (admin override)
// @access  Private (Admin only)
router.delete('/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete the physical file
    try {
      await fs.unlink(file.filePath);
    } catch (unlinkError) {
      console.error('Failed to delete physical file:', unlinkError);
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

// @route   GET /api/admin/analytics
// @desc    Get system-wide analytics
// @access  Private (Admin only)
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get analytics data
    const [userGrowth, fileUploads, analysisCreation] = await Promise.all([
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      File.aggregate([
        {
          $match: {
            uploadedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$uploadedAt' },
              month: { $month: '$uploadedAt' },
              day: { $dayOfMonth: '$uploadedAt' }
            },
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Analysis.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    res.json({
      timeframe,
      data: {
        userGrowth,
        fileUploads,
        analysisCreation
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

module.exports = router;
