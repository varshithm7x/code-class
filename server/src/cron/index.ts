import cron from 'node-cron';
import { checkAllSubmissions } from '../services/submission.service';

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