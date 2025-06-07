
import React from 'react';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  xLabel,
  yLabel,
  color = '#0d9488',
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
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
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={color} 
              activeDot={{ r: 8 }} 
              strokeWidth={2} 
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChart;
