import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fileService } from '../services/fileService';
import { useDashboard } from '../context/DashboardContext';
import toast from 'react-hot-toast';

const FilesPage = () => {
  const { notifyFileUploaded } = useDashboard();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fileService.getFiles();
      setFiles(response.files);
    } catch (error) {
      toast.error('Failed to load files.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const validation = fileService.validateFile(selectedFile);
    if (validation.valid) {
      setFile(selectedFile);
    } else {
      toast.error(validation.error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setUploading(true);

    try {
      const uploadResponse = await fileService.uploadFile(file, { description, tags });
      toast.success('File uploaded successfully!');
      
      // Notify dashboard about file upload to increment counter
      await notifyFileUploaded(uploadResponse.file);
      
      setFile(null);
      setDescription('');
      setTags('');
      fetchFiles();
    } catch (error) {
      toast.error('File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await fileService.searchFiles(searchQuery);
      setFiles(response.files);
    } catch (error) {
      toast.error('Search failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Files Management</h1>
        <p className="text-gray-600 mb-8">Upload and manage your Excel files</p>

        <form onSubmit={handleUpload} className="bg-white rounded-lg p-8 shadow-sm mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
            <input type="file" onChange={handleFileChange} className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g., finance, 2023" />
          </div>
          <button type="submit" disabled={uploading} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-4"
          />
          <button onClick={handleSearch} className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition">
            Search
          </button>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-sm">
          {files.length > 0 ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Files</h2>
              <ul>
                {files.map((file) => (
                  <li key={file.id} className="mb-4">
                    {fileService.getFileTypeIcon(file.fileType)}
                    <span className="ml-2">{file.originalName}</span>
                    <span className="ml-2 text-sm text-gray-500">({fileService.formatFileSize(file.fileSize)})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500">No files found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FilesPage;
