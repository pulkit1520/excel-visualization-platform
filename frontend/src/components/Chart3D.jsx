import React, { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// 3D Bar Chart Component
const Bar3D = ({ data, position, color, height, width = 0.8, depth = 0.8 }) => {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Html position={[0, height + 0.5, 0]} center>
        <div className="text-xs text-gray-700 font-medium bg-white/80 px-2 py-1 rounded shadow">
          {data.value}
        </div>
      </Html>
    </group>
  );
};

// 3D Line Chart Component
const Line3D = ({ points, color = '#3b82f6' }) => {
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(points.length * 3);
    
    points.forEach((point, index) => {
      vertices[index * 3] = point.x;
      vertices[index * 3 + 1] = point.y;
      vertices[index * 3 + 2] = point.z;
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }, [points]);

  return (
    <group>
      <line geometry={geometry}>
        <lineBasicMaterial color={color} linewidth={3} />
      </line>
      {points.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

// 3D Scatter Plot Component
const Scatter3D = ({ data, color = '#3b82f6' }) => {
  return (
    <group>
      {data.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[point.r || 0.2, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

// 3D Surface Plot Component
const Surface3D = ({ data, color = '#3b82f6' }) => {
  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(6, 6, 10, 10);
    const positions = geometry.attributes.position.array;
    
    // Add some wave-like surface
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      positions[i + 1] = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, [data]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} wireframe />
    </mesh>
  );
};

const Chart3D = forwardRef(({ analysis }, ref) => {
  const { processedData, statistics } = analysis.data;
  const { chartType } = analysis;
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  
  // Expose download functionality to parent component
  useImperativeHandle(ref, () => ({
    downloadImage: () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Force a render to ensure the latest frame is captured
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        
        // Wait for the next frame to complete
        requestAnimationFrame(() => {
          const canvas = rendererRef.current.domElement;
          const link = document.createElement('a');
          link.download = `${analysis.name || 'chart'}-3d.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      }
    }
  }));
  
  // Handler to capture the three.js renderer, scene, and camera
  const handleCanvasCreated = (state) => {
    rendererRef.current = state.gl;
    sceneRef.current = state.scene;
    cameraRef.current = state.camera;
  };
  
  // Prepare data for 3D visualization
  const chartData = useMemo(() => {
    if (!processedData || processedData.length === 0) return null;
    
    const keys = Object.keys(processedData[0]);
    const xAxisColumn = analysis.config?.dataSelection?.xAxisColumn;
    const yAxisColumn = analysis.config?.dataSelection?.yAxisColumn;
    
    const xKey = xAxisColumn && keys.includes(xAxisColumn) ? xAxisColumn : keys[0];
    const yKey = yAxisColumn && keys.includes(yAxisColumn) ? yAxisColumn : keys[1];
    
    return processedData.map((row, index) => ({
      label: row[xKey],
      value: parseFloat(row[yKey]) || 0,
      x: index - processedData.length / 2,
      y: parseFloat(row[yKey]) || 0,
      z: 0,
      r: 0.3
    }));
  }, [processedData, analysis.config]);

  const renderChart = () => {
    if (!chartData) return null;
    
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    
    switch (chartType) {
      case 'bar3d':
        return chartData.map((item, index) => (
          <Bar3D
            key={index}
            data={item}
            position={[item.x, 0, 0]}
            height={Math.max(item.value * 0.5, 0.1)}
            color={colors[index % colors.length]}
          />
        ));
        
      case 'line3d':
        return (
          <Line3D
            points={chartData.map(item => ({ x: item.x, y: item.y * 0.5, z: item.z }))}
            color={colors[0]}
          />
        );
        
      case 'scatter3d':
        return (
          <Scatter3D
            data={chartData.map(item => ({ x: item.x, y: item.y * 0.5, z: item.z, r: item.r }))}
            color={colors[0]}
          />
        );
        
      case 'surface3d':
        return <Surface3D data={chartData} color={colors[0]} />;
        
      case 'area3d':
        return (
          <>
            <Line3D
              points={chartData.map(item => ({ x: item.x, y: item.y * 0.5, z: item.z }))}
              color={colors[0]}
            />
            {/* Add a surface below the line */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[chartData.length, 2]} />
              <meshStandardMaterial color={colors[0]} opacity={0.3} transparent />
            </mesh>
          </>
        );
        
      default:
        return chartData.map((item, index) => (
          <Bar3D
            key={index}
            data={item}
            position={[item.x, 0, 0]}
            height={Math.max(item.value * 0.5, 0.1)}
            color={colors[index % colors.length]}
          />
        ));
    }
  };

  return (
    <div className="w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
      <Canvas 
        shadows 
        camera={{ position: [8, 8, 8], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)' }}
        onCreated={handleCanvasCreated}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          position={[5, 10, 5]}
          intensity={1}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        
        {/* Grid */}
        <gridHelper args={[10, 10, '#666666', '#888888']} />
        
        {/* Chart */}
        {renderChart()}
        
        {/* Chart Title */}
        <Text
          position={[0, 4, 0]}
          fontSize={0.5}
          color="#374151"
          anchorX="center"
          anchorY="middle"
        >
          {analysis.name || 'Data Visualization'}
        </Text>
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          maxDistance={20}
          minDistance={5}
        />
      </Canvas>
    </div>
  );
});

export default Chart3D;

