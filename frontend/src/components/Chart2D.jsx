import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler,
} from 'chart.js';
import {
  Bar,
  Line,
  Pie,
  Doughnut,
  Scatter,
} from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler
);

const Chart2D = forwardRef(({ analysis }, ref) => {
  // Hooks must be called first, before any early returns
  const chartRef = useRef(null);

  useImperativeHandle(ref, () => ({
    downloadImage: () => {
      if (chartRef.current) {
        const url = chartRef.current.toBase64Image();
        const link = document.createElement('a');
        link.href = url;
        link.download = `${analysis?.name || 'chart'}.png`;
        link.click();
      }
    }
  }));

  // Validate analysis data structure
  if (!analysis || !analysis.data || !analysis.data.processedData) {
    console.error('Invalid analysis data structure:', analysis);
    return (
      <div className="flex items-center justify-center h-80 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Invalid analysis data structure</p>
      </div>
    );
  }

  const { processedData, statistics } = analysis.data;
  const { chartType } = analysis;

  // Validate processed data
  if (!processedData || processedData.length === 0) {
    console.error('No processed data available:', processedData);
    return (
      <div className="flex items-center justify-center h-80 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }
  
  // Helper function to generate colors
  const generateColors = (count) => {
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(245, 101, 101, 0.8)',  // Red
      'rgba(251, 191, 36, 0.8)',   // Yellow
      'rgba(139, 92, 246, 0.8)',   // Purple
      'rgba(236, 72, 153, 0.8)',   // Pink
      'rgba(34, 197, 94, 0.8)',    // Emerald
      'rgba(249, 115, 22, 0.8)',   // Orange
      'rgba(6, 182, 212, 0.8)',    // Cyan
      'rgba(168, 85, 247, 0.8)',   // Violet
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  // Prepare data for charts
  const prepareChartData = () => {
    try {
      if (!processedData || processedData.length === 0) return null;

      // Ensure processedData is an array with objects
      if (!Array.isArray(processedData) || typeof processedData[0] !== 'object') {
        console.error('Invalid processed data format:', processedData);
        return null;
      }

      const keys = Object.keys(processedData[0]);
      if (keys.length === 0) {
        console.error('No keys found in processed data');
        return null;
      }

      const xAxisColumn = analysis.config?.dataSelection?.xAxisColumn;
      const yAxisColumn = analysis.config?.dataSelection?.yAxisColumn;
      
      const xKey = xAxisColumn && keys.includes(xAxisColumn) ? xAxisColumn : keys[0];
      const yKey = yAxisColumn && keys.includes(yAxisColumn) ? yAxisColumn : keys[1] || keys[0];

      // For charts that need numeric data
      const numericColumns = keys.filter(key => {
        return processedData.some(row => !isNaN(parseFloat(row[key])) && isFinite(row[key]));
      });

      switch (chartType) {
        case 'bar':
          return {
            labels: processedData.map(row => row[xKey]),
            datasets: [{
              label: yKey || 'Value',
              data: processedData.map(row => parseFloat(row[yKey]) || 0),
              backgroundColor: generateColors(processedData.length),
              borderColor: generateColors(processedData.length).map(color => color.replace('0.8', '1')),
              borderWidth: 1
            }]
          };

        case 'line':
          return {
            labels: processedData.map(row => row[xKey]),
            datasets: [{
              label: yKey || 'Value',
              data: processedData.map(row => parseFloat(row[yKey]) || 0),
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            }]
          };

        case 'pie':
          // Group data by the first column and sum values
          const groupedData = {};
          processedData.forEach(row => {
            const key = row[xKey];
            const value = parseFloat(row[yKey]) || 1;
            groupedData[key] = (groupedData[key] || 0) + value;
          });

          return {
            labels: Object.keys(groupedData),
            datasets: [{
              data: Object.values(groupedData),
              backgroundColor: generateColors(Object.keys(groupedData).length),
              borderColor: generateColors(Object.keys(groupedData).length).map(color => color.replace('0.8', '1')),
              borderWidth: 1
            }]
          };

        case 'doughnut':
          // Similar to pie but for doughnut
          const doughnutData = {};
          processedData.forEach(row => {
            const key = row[xKey];
            const value = parseFloat(row[yKey]) || 1;
            doughnutData[key] = (doughnutData[key] || 0) + value;
          });

          return {
            labels: Object.keys(doughnutData),
            datasets: [{
              data: Object.values(doughnutData),
              backgroundColor: generateColors(Object.keys(doughnutData).length),
              borderColor: generateColors(Object.keys(doughnutData).length).map(color => color.replace('0.8', '1')),
              borderWidth: 1
            }]
          };

        case 'scatter':
          if (numericColumns.length >= 2) {
            return {
              datasets: [{
                label: 'Data Points',
                data: processedData.map(row => ({
                  x: parseFloat(row[numericColumns[0]]) || 0,
                  y: parseFloat(row[numericColumns[1]]) || 0,
                })),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
              }]
            };
          }
          break;

        default:
          return {
            labels: processedData.map(row => row[xKey]),
            datasets: [{
              label: yKey || 'Value',
              data: processedData.map(row => parseFloat(row[yKey]) || 0),
              backgroundColor: generateColors(processedData.length),
              borderColor: generateColors(processedData.length).map(color => color.replace('0.8', '1')),
              borderWidth: 1
            }]
          };
      }
    } catch (error) {
      console.error('Error preparing chart data:', error);
      return null;
    }
  };

  const chartData = prepareChartData();

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Unable to generate chart from the available data</p>
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: analysis.name || 'Data Visualization',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: (chartType === 'pie' || chartType === 'doughnut') ? {} : {
      x: {
        display: true,
        title: {
          display: true,
          text: 'X Axis'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Y Axis'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  const renderChart = () => {
    const chartProps = { data: chartData, options };

    switch (chartType) {
      case 'bar':
        return <Bar ref={chartRef} {...chartProps} />;
      case 'line':
        return <Line ref={chartRef} {...chartProps} />;
      case 'pie':
        return <Pie ref={chartRef} {...chartProps} />;
      case 'doughnut':
        return <Doughnut ref={chartRef} {...chartProps} />;
      case 'scatter':
        return <Scatter ref={chartRef} {...chartProps} />;
      default:
        return <Bar {...chartProps} />;
    }
  };

  return (
    <div className="w-full h-80 bg-white rounded-lg p-4">
      {renderChart()}
    </div>
  );
});

export default Chart2D;
