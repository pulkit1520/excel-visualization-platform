import React from 'react';
import Chart2D from './Chart2D';
import Chart3D from './Chart3D';

const Chart = React.forwardRef(({ analysis }, ref) => {
  console.log('Chart component received analysis:', analysis);
  
  if (!analysis || !analysis.data || !analysis.data.processedData) {
    console.log('Missing data structure:', {
      hasAnalysis: !!analysis,
      hasData: !!(analysis && analysis.data),
      hasProcessedData: !!(analysis && analysis.data && analysis.data.processedData)
    });
    return (
      <div className="flex items-center justify-center h-80 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  const { chartType } = analysis;
  
  console.log('Chart routing for type:', chartType);

  // Check if this is a 3D chart type
  const is3DChart = chartType.includes('3d') || chartType.includes('3D');
  
  // Route to appropriate chart component
  if (is3DChart) {
    return <Chart3D ref={ref} analysis={analysis} />;
  } else {
    return <Chart2D ref={ref} analysis={analysis} />;
  }
});

export default Chart;
