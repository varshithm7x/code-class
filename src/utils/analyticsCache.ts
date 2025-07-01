// Utility functions for managing analytics cache

export const clearClassAnalyticsCache = (classId: string): void => {
  try {
    const cacheKey = `class_analytics_${classId}`;
    const timestampKey = `class_analytics_timestamp_${classId}`;
    
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
  } catch (error) {
    console.error('Failed to clear class analytics cache:', error);
  }
};

export const clearStudentAnalyticsCache = (studentId: string, classId: string): void => {
  try {
    const cacheKey = `student_analytics_${studentId}_${classId}`;
    const timestampKey = `student_analytics_timestamp_${studentId}_${classId}`;
    
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
  } catch (error) {
    console.error('Failed to clear student analytics cache:', error);
  }
};

export const clearAllAnalyticsCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const analyticsKeys = keys.filter(key => 
      key.startsWith('class_analytics_') || 
      key.startsWith('student_analytics_')
    );
    
    analyticsKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear all analytics cache:', error);
  }
};

export const getAnalyticsCacheInfo = (): { classCache: string[], studentCache: string[] } => {
  try {
    const keys = Object.keys(localStorage);
    const classKeys = keys.filter(key => key.startsWith('class_analytics_') && !key.includes('timestamp'));
    const studentKeys = keys.filter(key => key.startsWith('student_analytics_') && !key.includes('timestamp'));
    
    return {
      classCache: classKeys,
      studentCache: studentKeys
    };
  } catch (error) {
    console.error('Failed to get analytics cache info:', error);
    return { classCache: [], studentCache: [] };
  }
};

export const isAnalyticsCacheStale = (classId: string, maxAgeInMinutes: number = 30): boolean => {
  try {
    const timestampKey = `class_analytics_timestamp_${classId}`;
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (!cachedTimestamp) return true;
    
    const cacheDate = new Date(cachedTimestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - cacheDate.getTime()) / (1000 * 60);
    
    return diffInMinutes > maxAgeInMinutes;
  } catch (error) {
    console.error('Failed to check cache staleness:', error);
    return true;
  }
}; 