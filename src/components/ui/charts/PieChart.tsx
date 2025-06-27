import React from 'react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface PieDataItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieDataItem[];
  nameKey?: string; // Legacy support
  dataKey?: string; // Legacy support
  title?: string;
  colors?: string[];
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  nameKey = 'name',
  dataKey = 'value',
  title,
  colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
  height = 300,
}) => {
  // Transform data if it's in the new format with embedded colors
  const chartData = data.map(item => ({
    name: item.name || item[nameKey as keyof typeof item],
    value: item.value || item[dataKey as keyof typeof item],
    color: item.color
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius="80%"
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => {
                if (percent === 0) return null;
                // Extracts the first word from the name, e.g., "Average (40-69%)" -> "Average"
                const shortName = name.split('(')[0].trim();
                return `${shortName}: ${(percent * 100).toFixed(0)}%`;
              }}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || colors[index % colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}`, '']}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
              }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;
