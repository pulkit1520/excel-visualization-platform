import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { fileService } from '../services/fileService';
import { analyticsService } from '../services/analyticsService';
import toast from 'react-hot-toast';
import { useDashboard } from '../context/DashboardContext';
import Chart from '../components/Chart';
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Plus, 
  Calendar,
  ChartBar,
  ChevronDown,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Filter,
  Download,
  Zap
} from 'lucide-react';

const AnalyticsPage = () => {
  const chartRef = useRef();
  const { notifyAnalysisCreated } = useDashboard();
  const [files, setFiles] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState({
    type: 'chart',
    chartType: 'bar',
    sheet: 'Sheet1'
  });
  const [availableColumns, setAvailableColumns] = useState([]);
  const [xAxisColumn, setXAxisColumn] = useState('');
  const [yAxisColumn, setYAxisColumn] = useState('');
  const [loadingColumns, setLoadingColumns] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchAnalyses();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fileService.getFiles();
      setFiles(response.files || []);
    } catch (error) {
      toast.error('Failed to load files.');
    }
  };

  const fetchAnalyses = async () => {
    try {
      const response = await analyticsService.getAnalyses();
      setAnalyses(response.analyses || []);
    } catch (error) {
      toast.error('Failed to load analyses.');
    } finally {
      setLoading(false);
    }
  };

  const selectAnalysis = async (analysis) => {
    setLoadingAnalysis(true);
    try {
      const response = await analyticsService.getAnalysis(analysis.id);
      setSelectedAnalysis(response.analysis);
    } catch (error) {
      console.error('Error fetching analysis details:', error);
      toast.error('Failed to load analysis details');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const fetchFileColumns = async (fileId) => {
    setLoadingColumns(true);
    try {
      const response = await fileService.getFileColumns(fileId);
      setAvailableColumns(response.columns || []);
      
      // Auto-select first two columns if available
      if (response.columns && response.columns.length >= 2) {
        setXAxisColumn(response.columns[0]);
        setYAxisColumn(response.columns[1]);
      }
    } catch (error) {
      console.error('Error fetching file columns:', error);
      toast.error('Failed to load file columns');
      setAvailableColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };


  const createAnalysis = async () => {
    if (!selectedFile) return;

    setCreating(true);
    try {
      const analysisData = {
        fileId: selectedFile.id,
        name: `${analysisConfig.chartType.charAt(0).toUpperCase() + analysisConfig.chartType.slice(1)} Analysis - ${selectedFile.originalName}`,
        type: analysisConfig.type,
        chartType: analysisConfig.chartType,
        config: {
          dataSelection: {
            sheet: analysisConfig.sheet,
            xAxisColumn: xAxisColumn,
            yAxisColumn: yAxisColumn,
            columns: [xAxisColumn, yAxisColumn]
          }
        }
      };
      
      console.log('Creating analysis with data:', analysisData);
      const response = await analyticsService.createAnalysis(analysisData);
      toast.success('Analysis created successfully!');
      fetchAnalyses();
      
      // Notify dashboard about new analysis
      notifyAnalysisCreated(response.analysis);
      
      // Select the newly created analysis
      if (response.analysis) {
        selectAnalysis(response.analysis);
      }
    } catch (error) {
      console.error('Create analysis error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create analysis';
      toast.error(errorMessage);
      
      // Show validation errors if any
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err.msg || err.message);
        });
      }
    } finally {
      setCreating(false);
    }
  };

const handleDownload = () => {
    if (chartRef.current) {
      chartRef.current.downloadImage();
      toast.success('Chart image downloaded successfully!');
    } else {
      toast.error('No chart available to download');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Analytics Dashboard
          </h1>
          <p className="text-gray-800 text-lg max-w-2xl mx-auto">
            Transform your data into actionable insights with powerful visualizations
          </p>
        </motion.div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-20"
          >
            <div className="flex items-center space-x-2 text-blue-600">
              <Zap className="w-5 h-5 animate-spin" />
              <span>Loading analytics...</span>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* File Selection Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-300 shadow-lg"
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a File to Analyze</h2>
                <p className="text-gray-600 text-sm">Choose an Excel file from your uploads to create visualizations</p>
              </div>

              {/* File Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {files.length > 0 ? (
                  files.map((file) => (
                    <motion.div
                      key={file.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedFileId(file.id);
                        setSelectedFile(file);
                        fetchFileColumns(file.id);
                      }}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedFileId === file.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <FileText className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {file.originalName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {fileService.formatFileSize(file.fileSize)}
                          </p>
                        </div>
                      </div>
                      {selectedFileId === file.id && (
                        <div className="absolute top-2 right-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">No files uploaded yet</p>
                      <p className="text-sm text-gray-500">Upload Excel files to get started</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Column Selection and Chart Type Selection */}
              <div className="space-y-4">
                {/* Column Selection */}
                {selectedFile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        X-Axis Column
                      </label>
                      <div className="relative">
                        <select
                          value={xAxisColumn}
                          onChange={(e) => setXAxisColumn(e.target.value)}
                          disabled={loadingColumns}
                          className="w-full bg-white/80 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:opacity-50"
                        >
                          <option value="">Select X-Axis Column</option>
                          {availableColumns.map((column) => (
                            <option key={column} value={column}>{column}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Y-Axis Column
                      </label>
                      <div className="relative">
                        <select
                          value={yAxisColumn}
                          onChange={(e) => setYAxisColumn(e.target.value)}
                          disabled={loadingColumns}
                          className="w-full bg-white/80 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:opacity-50"
                        >
                          <option value="">Select Y-Axis Column</option>
                          {availableColumns.map((column) => (
                            <option key={column} value={column}>{column}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Chart Type Selection and Create Button */}
                <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chart Type
                    </label>
                    <div className="relative">
                      <select
                        value={analysisConfig.chartType}
                        onChange={(e) => setAnalysisConfig({...analysisConfig, chartType: e.target.value})}
                        className="w-full bg-white/80 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                      >
                      <optgroup label="2D Charts">
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="doughnut">Doughnut Chart</option>
                        <option value="scatter">Scatter Plot</option>
                      </optgroup>
                      <optgroup label="3D Charts">
                        <option value="bar3d">3D Bar Chart</option>
                        <option value="line3d">3D Line Chart</option>
                        <option value="scatter3d">3D Scatter Plot</option>
                        <option value="surface3d">3D Surface Plot</option>
                        <option value="area3d">3D Area Chart</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Create Analysis Button */}
                  <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectedFileId && xAxisColumn && yAxisColumn && createAnalysis()}
                  disabled={!selectedFileId || !xAxisColumn || !yAxisColumn || creating}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 min-w-fit h-[50px]"
                >
                  {creating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Analysis...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create Analysis</span>
                    </>
                  )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Analysis List */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-300 shadow-lg"
              >
                <div className="flex items-center space-x-2 mb-6">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Your Analyses</h2>
                </div>
                
                {analyses.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {analyses.map((analysis) => (
                      <motion.div
                        key={analysis.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => selectAnalysis(analysis)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedAnalysis?.id === analysis.id
                            ? 'bg-blue-100 border-blue-400'
                            : 'bg-white/50 border-gray-200 hover:bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800 truncate">{analysis.name}</h3>
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-700 rounded-full">
                            {analysis.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {analysis.chartType === 'bar' && <BarChart className="w-4 h-4" />}
                            {analysis.chartType === 'line' && <LineChart className="w-4 h-4" />}
                            {analysis.chartType === 'pie' && <PieChart className="w-4 h-4" />}
                            {analysis.chartType === 'scatter' && <Activity className="w-4 h-4" />}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChartBar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No analyses created yet</p>
                    <p className="text-sm text-gray-500">Select a file and create your first analysis</p>
                  </div>
                )}
              </motion.div>

              {/* Analysis Details & Visualization */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-300 shadow-lg"
              >
                {selectedAnalysis ? (
                  <div className="space-y-6">
                    {/* Analysis Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedAnalysis.name}</h2>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <FileText className="w-4 h-4" />
                            <span>Type: {selectedAnalysis.type}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="w-4 h-4" />
                            <span>Chart: {selectedAnalysis.chartType}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(selectedAnalysis.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleDownload}
                          className="p-2 bg-white/50 rounded-lg hover:bg-white/70 transition-colors border border-gray-200"
                          title="Download chart data"
                        >
                          <Download className="w-5 h-5 text-gray-600" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Visualization Area */}
                    <div className="bg-white/50 rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Visualization</h3>
                        <div className="flex items-center space-x-2">
                          <Filter className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">Chart Type: {selectedAnalysis.chartType}</span>
                        </div>
                      </div>
                      
                      {/* Chart Visualization */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200 min-h-[400px]">
                        {loadingAnalysis ? (
                          <div className="flex items-center justify-center h-full min-h-[300px]">
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-gray-500">Loading chart data...</p>
                            </div>
                          </div>
                        ) : selectedAnalysis.data?.processedData && selectedAnalysis.data.processedData.length > 0 ? (
                          <Chart 
                            ref={chartRef}
                            analysis={selectedAnalysis} 
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[300px]">
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-4">
                                {selectedAnalysis.chartType === 'bar' && <BarChart className="w-16 h-16 text-blue-400" />}
                                {selectedAnalysis.chartType === 'line' && <LineChart className="w-16 h-16 text-blue-400" />}
                                {selectedAnalysis.chartType === 'pie' && <PieChart className="w-16 h-16 text-blue-400" />}
                                {selectedAnalysis.chartType === 'scatter' && <Activity className="w-16 h-16 text-blue-400" />}
                              </div>
                              <p className="text-gray-500 mb-2">No data available for visualization</p>
                              <p className="text-sm text-gray-400">Check if the Excel file has data to process</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="text-center">
                      <TrendingUp className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">No Analysis Selected</h3>
                      <p className="text-gray-500 mb-4">Select an analysis from the list to view its details and visualization</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
  
};

export default AnalyticsPage;
