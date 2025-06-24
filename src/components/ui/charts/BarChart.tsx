import React from 'react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface BarData {
  key: string;
  name: string;
  color: string;
}

interface BarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKey?: string; // Legacy support
  bars?: BarData[]; // New multi-bar support
  title?: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  bars,
  title,
  xLabel,
  yLabel,
  color = '#1a365d',
  height = 300,
}) => {
  // Use either multi-bar configuration or legacy single-bar
  const barConfigs = bars || (yKey ? [{ key: yKey, name: yKey, color }] : []);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }} 
              label={{ 
                value: xLabel || '', 
                position: 'insideBottomRight', 
                offset: -10 
              }} 
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ 
                value: yLabel || '', 
                angle: -90, 
                position: 'insideLeft'
              }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
              }} 
            />
            <Legend verticalAlign="top" height={36} />
            {barConfigs.map((bar, index) => (
              <Bar 
                key={bar.key}
                dataKey={bar.key} 
                name={bar.name}
                fill={bar.color} 
                radius={[4, 4, 0, 0]} 
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
