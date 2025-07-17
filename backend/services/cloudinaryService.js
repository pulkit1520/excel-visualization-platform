const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

class CloudinaryService {
  /**
   * Upload Excel file to Cloudinary
   * @param {string} filePath - Local file path
   * @param {string} originalName - Original filename
   * @returns {Promise<Object>} Upload result
   */
  async uploadExcelFile(filePath, originalName) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw', // For non-image files
        folder: 'excel-analytics/files',
        public_id: `${Date.now()}-${originalName.replace(/\.[^/.]+$/, "")}`, // Remove extension
        use_filename: true,
        unique_filename: true,
        tags: ['excel', 'analytics']
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
        created_at: result.created_at
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });

      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Get file URL from public ID
   * @param {string} publicId - Cloudinary public ID
   * @returns {string} File URL
   */
  getFileUrl(publicId) {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true
    });
  }

  /**
   * Get file info from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'raw'
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
        created_at: result.created_at,
        tags: result.tags
      };
    } catch (error) {
      console.error('Cloudinary get file info error:', error);
      throw new Error(`Failed to get file info from Cloudinary: ${error.message}`);
    }
  }

  /**
   * List files in folder
   * @param {string} folder - Folder name
   * @param {number} maxResults - Maximum results to return
   * @returns {Promise<Array>} List of files
   */
  async listFiles(folder = 'excel-analytics/files', maxResults = 100) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: folder,
        max_results: maxResults
      });

      return result.resources.map(resource => ({
        public_id: resource.public_id,
        url: resource.secure_url,
        bytes: resource.bytes,
        format: resource.format,
        created_at: resource.created_at,
        tags: resource.tags
      }));
    } catch (error) {
      console.error('Cloudinary list files error:', error);
      throw new Error(`Failed to list files from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Update file tags
   * @param {string} publicId - Cloudinary public ID
   * @param {Array<string>} tags - New tags
   * @returns {Promise<Object>} Update result
   */
  async updateFileTags(publicId, tags) {
    try {
      const result = await cloudinary.uploader.add_tag(tags.join(','), [publicId], {
        resource_type: 'raw'
      });

      return result;
    } catch (error) {
      console.error('Cloudinary update tags error:', error);
      throw new Error(`Failed to update file tags in Cloudinary: ${error.message}`);
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats() {
    try {
      const result = await cloudinary.api.usage();
      
      return {
        storage: {
          used: result.storage.used_bytes || 0,
          limit: result.storage.limit || 0,
          percentage: result.storage.used_percent || 0
        },
        bandwidth: {
          used: result.bandwidth.used_bytes || 0,
          limit: result.bandwidth.limit || 0,
          percentage: result.bandwidth.used_percent || 0
        },
        resources: result.resources || 0,
        derived_resources: result.derived_resources || 0
      };
    } catch (error) {
      console.error('Cloudinary usage stats error:', error);
      throw new Error(`Failed to get usage stats from Cloudinary: ${error.message}`);
    }
  }
}

module.exports = new CloudinaryService();
