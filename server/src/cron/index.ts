import cron from 'node-cron';
import { checkAllSubmissions } from '../services/submission.service';
import { syncAllLinkedLeetCodeUsers } from '../services/enhanced-leetcode.service';

/**
 * Schedules the submission check to run once every day at 7:30 AM.
 */
export const scheduleSubmissionChecks = () => {
  cron.schedule('30 7 * * *', () => {
    console.log('Running daily submission check...');
    checkAllSubmissions().catch(error => {
      console.error('Error during scheduled submission check:', error);
    });
  });

  console.log('Scheduled submission checks to run daily at 7:30 AM.');
};

/**
 * Schedules LeetCode data sync to run every 4 hours
 */
export const scheduleLeetCodeSync = () => {
  cron.schedule('0 */4 * * *', () => {
    console.log('Running LeetCode data sync...');
    syncAllLinkedLeetCodeUsers().catch(error => {
      console.error('Error during scheduled LeetCode sync:', error);
    });
  });

  console.log('Scheduled LeetCode sync to run every 4 hours.');
};

/**
 * Initialize all scheduled jobs
 */
export const initializeScheduledJobs = () => {
  scheduleSubmissionChecks();
  scheduleLeetCodeSync();
}; 