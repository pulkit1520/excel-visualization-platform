import React from 'react';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage users, analytics, and system settings</p>
        <div className="bg-white rounded-lg p-8 shadow-sm">
          <p className="text-gray-500">This page will contain admin management features and system statistics.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
