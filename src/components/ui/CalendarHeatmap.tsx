
import React from 'react';
import { format, eachDayOfInterval, subDays } from 'date-fns';

interface CalendarHeatmapProps {
  data: {
    date: string;
    count: number;
  }[];
  days?: number;
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ data, days = 7 }) => {
  const today = new Date();
  const startDate = subDays(today, days - 1);
  
  const dateRange = eachDayOfInterval({ start: startDate, end: today });
  
  // Create a map of dates to counts
  const countMap = data.reduce((acc, { date, count }) => {
    acc[date] = count;
    return acc;
  }, {} as Record<string, number>);
  
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-700';
    if (count === 1) return 'bg-brand-teal/30 dark:bg-brand-teal/40';
    if (count === 2) return 'bg-brand-teal/60 dark:bg-brand-teal/70';
    return 'bg-brand-teal dark:bg-brand-teal';
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md p-4 shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {dateRange.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = countMap[dateStr] || 0;
        
        return (
          <div key={dateStr} className="flex flex-col items-center mx-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">{format(date, 'EEE')}</div>
            <div
              className={`h-8 w-8 rounded-sm mt-1 ${getColor(count)} flex items-center justify-center`}
              title={`${format(date, 'MMM d')}: ${count} submissions`}
            >
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {format(date, 'd')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarHeatmap;
