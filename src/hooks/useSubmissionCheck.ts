
import { useEffect, useRef } from 'react';
import { checkSubmissions } from '../api/assignments';
import { useToast } from '../hooks/use-toast';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export const useSubmissionCheck = () => {
  const intervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const runSubmissionCheck = async () => {
      try {
        const result = await checkSubmissions();
        if (result.updatedSubmissions > 0) {
          toast({
            title: "Submissions Updated",
            description: `${result.updatedSubmissions} new submission${result.updatedSubmissions === 1 ? '' : 's'} detected.`,
          });
        }
      } catch (error) {
        console.error('Failed to check submissions:', error);
      }
    };

    // Run once when component mounts
    runSubmissionCheck();

    // Set interval to run every 12 hours
    intervalRef.current = window.setInterval(runSubmissionCheck, TWELVE_HOURS_MS);

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [toast]);

  // Return function to manually trigger a check
  return { triggerCheck: checkSubmissions };
};
