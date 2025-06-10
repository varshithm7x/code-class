// Utility for triggering data refresh across different pages
// Uses localStorage events to notify other tabs/pages when data should be refreshed

export const DATA_REFRESH_EVENTS = {
  ASSIGNMENTS_UPDATED: 'assignments_updated',
  CLASSES_UPDATED: 'classes_updated',
  LEADERBOARD_UPDATED: 'leaderboard_updated',
} as const;

export type DataRefreshEvent = typeof DATA_REFRESH_EVENTS[keyof typeof DATA_REFRESH_EVENTS];

/**
 * Trigger a data refresh event that other pages can listen to
 */
export const triggerDataRefresh = (eventType: DataRefreshEvent, data?: any) => {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    data: data || null,
  };
  
  // Use localStorage to trigger events across tabs
  localStorage.setItem('dataRefreshEvent', JSON.stringify(event));
  
  // Remove immediately to ensure the event fires each time
  setTimeout(() => {
    localStorage.removeItem('dataRefreshEvent');
  }, 100);
};

/**
 * Listen for data refresh events
 */
export const onDataRefresh = (
  eventType: DataRefreshEvent | 'all',
  callback: (data?: any) => void
) => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'dataRefreshEvent' && e.newValue) {
      try {
        const event = JSON.parse(e.newValue);
        
        // Check if we should respond to this event type
        if (eventType === 'all' || event.type === eventType) {
          callback(event.data);
        }
      } catch (error) {
        console.error('Error parsing data refresh event:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

/**
 * Custom hook for data refresh events (React hook version)
 */
import { useEffect, DependencyList } from 'react';

export const useDataRefresh = (
  eventType: DataRefreshEvent | 'all',
  callback: (data?: any) => void,
  dependencies: DependencyList = []
) => {
  useEffect(() => {
    const cleanup = onDataRefresh(eventType, callback);
    return cleanup;
  }, dependencies);
}; 