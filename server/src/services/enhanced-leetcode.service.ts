import { LeetCode, Credential } from 'leetcode-query';
import { PrismaClient, User, Problem, Submission } from '@prisma/client';
import prisma from '../lib/prisma';

interface LeetCodeStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
}

interface LeetCodeSubmission {
  titleSlug: string;
  timestamp: number;
  statusDisplay: string;
  lang: string;
}

/**
 * Fetches LeetCode stats using unauthenticated API call
 */
export const fetchPublicLeetCodeStats = async (username: string): Promise<LeetCodeStats | null> => {
  console.log(`📊 Fetching public LeetCode stats for: ${username}`);
  
  try {
    const leetcode = new LeetCode();
    const user = await leetcode.user(username);
    
    if (!user) {
      console.log(`❌ Could not fetch public stats for ${username}`);
      return null;
    }

    // Extract stats from the user object - adjusting based on actual API structure
    const profile = (user as any).profile;
    const recentSubmissions = (user as any).recentSubmissions || [];
    
    // Count unique accepted submissions from recent submissions
    const acceptedSubmissions = recentSubmissions.filter((sub: any) => 
      sub.statusDisplay === 'Accepted'
    );
    const uniqueSolved = new Set(acceptedSubmissions.map((sub: any) => sub.titleSlug));
    const totalSolved = uniqueSolved.size;
    
    // For now, we can't categorize by difficulty from public API
    const easySolved = 0;
    const mediumSolved = 0;
    const hardSolved = 0;
    
    console.log(`📈 User ${username} public stats: Total=${totalSolved}, Easy=${easySolved}, Medium=${mediumSolved}, Hard=${hardSolved}`);
    
    return {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved
    };
    
  } catch (error: any) {
    console.error(`❌ Error fetching public stats for ${username}:`, error.message);
    return null;
  }
};

/**
 * Fetches recent submissions using authenticated API call
 */
export const fetchAuthenticatedSubmissions = async (cookie: string, limit: number = 100): Promise<LeetCodeSubmission[]> => {
  console.log(`🔒 Fetching authenticated submissions (limit: ${limit})`);
  
  try {
    const credential = new Credential();
    await credential.init(cookie);
    
    const leetcode = new LeetCode(credential);
    
    const submissionsResponse = await leetcode.submissions({ limit, offset: 0 });
    
    // Based on test results, the API returns an array directly, not an object with submissions property
    if (!submissionsResponse || !Array.isArray(submissionsResponse)) {
      console.log(`❌ Could not fetch authenticated submissions - invalid response format`);
      return [];
    }

    // Filter only accepted submissions
    const acceptedSubmissions = submissionsResponse.filter((sub: any) => 
      sub.statusDisplay === 'Accepted'
    );
    
    console.log(`📋 Found ${acceptedSubmissions.length} accepted submissions out of ${submissionsResponse.length} total`);
    
    return acceptedSubmissions.map((sub: any) => ({
      titleSlug: sub.titleSlug,
      timestamp: sub.timestamp,
      statusDisplay: sub.statusDisplay,
      lang: sub.lang
    }));
    
  } catch (error: any) {
    console.error(`❌ Error fetching authenticated submissions:`, error.message);
    throw error; // Re-throw to allow caller to handle expired sessions
  }
};

/**
 * Enhanced function to get comprehensive stats using authenticated API
 */
export const fetchAuthenticatedStats = async (cookie: string): Promise<LeetCodeStats | null> => {
  console.log(`🔒 Fetching authenticated LeetCode stats`);
  
  try {
    const credential = new Credential();
    await credential.init(cookie);
    
    const leetcode = new LeetCode(credential);
    
    // Fetch all submissions to calculate stats
    // Note: limit 0 might not work as expected, let's use a large number
    const submissionsResponse = await leetcode.submissions({ limit: 1000, offset: 0 });
    
    // Based on our testing, the API returns an array directly
    if (!submissionsResponse || !Array.isArray(submissionsResponse)) {
      console.log(`❌ Could not fetch authenticated submissions for stats - invalid response format`);
      return null;
    }

    // Filter accepted submissions and count by difficulty
    const acceptedSubmissions = submissionsResponse.filter((sub: any) => 
      sub.statusDisplay === 'Accepted'
    );
    
    // Get unique problems solved
    const uniqueSolved = new Set(acceptedSubmissions.map((sub: any) => sub.titleSlug));
    const totalSolved = uniqueSolved.size;
    
    // For now, we can't easily categorize by difficulty without additional API calls
    // We'll use the total count and estimate breakdown
    const easySolved = Math.floor(totalSolved * 0.4); // Rough estimation
    const mediumSolved = Math.floor(totalSolved * 0.4);
    const hardSolved = totalSolved - easySolved - mediumSolved;
    
    console.log(`📈 Authenticated stats: Total=${totalSolved}, Easy=${easySolved}, Medium=${mediumSolved}, Hard=${hardSolved}`);
    
    return {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved
    };
    
  } catch (error: any) {
    console.error(`❌ Error fetching authenticated stats:`, error.message);
    throw error;
  }
};

/**
 * Core function to fetch stats and submissions for a user
 */
export const fetchLeetCodeStatsAndSubmissions = async (user: User & {
  leetcodeCookieStatus?: string;
  leetcodeCookie?: string | null;
  leetcodeTotalSolved?: number | null;
}): Promise<boolean> => {
  console.log(`🚀 Enhanced LeetCode sync for user: ${user.leetcodeUsername} (ID: ${user.id})`);
  
  if (!user.leetcodeUsername) {
    console.log(`⚠️ User ${user.id} has no LeetCode username`);
    return false;
  }

  if (user.leetcodeCookieStatus !== 'LINKED' || !user.leetcodeCookie) {
    console.log(`⚠️ User ${user.id} does not have a linked LeetCode session`);
    return false;
  }

  try {
    // Step 1: Get authenticated stats (this gives us more accurate data)
    let authenticatedStats: LeetCodeStats | null = null;
    try {
      authenticatedStats = await fetchAuthenticatedStats(user.leetcodeCookie);
    } catch (error: any) {
      // If authenticated call fails, mark cookie as expired
      console.error(`❌ Authenticated stats call failed for ${user.leetcodeUsername}, marking cookie as expired`);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { leetcodeCookieStatus: 'EXPIRED' }
      });
      
      return false;
    }
    
    if (!authenticatedStats) {
      console.log(`❌ Could not fetch authenticated stats for ${user.leetcodeUsername}`);
      return false;
    }

    // Step 2: Check if we need to update (compare with cached values)
    const needsUpdate = 
      user.leetcodeTotalSolved === null || 
      authenticatedStats.totalSolved > (user.leetcodeTotalSolved || 0);
    
    if (!needsUpdate) {
      console.log(`✅ User ${user.leetcodeUsername} stats are up to date (${authenticatedStats.totalSolved} solved)`);
      return true;
    }

    console.log(`📈 User ${user.leetcodeUsername} has new submissions. Previous: ${user.leetcodeTotalSolved || 0}, Current: ${authenticatedStats.totalSolved}`);

    // Step 3: Fetch recent submissions (authenticated)
    let submissions: LeetCodeSubmission[] = [];
    try {
      submissions = await fetchAuthenticatedSubmissions(user.leetcodeCookie, 100);
    } catch (error: any) {
      console.error(`❌ Authenticated submissions call failed for ${user.leetcodeUsername}`);
      return false;
    }

    // Step 4: Process submissions and update database
    await processLeetCodeSubmissions(user, submissions, authenticatedStats);
    
    console.log(`✅ Successfully synced ${submissions.length} submissions for ${user.leetcodeUsername}`);
    return true;
    
  } catch (error: any) {
    console.error(`❌ Error in fetchLeetCodeStatsAndSubmissions for ${user.leetcodeUsername}:`, error.message);
    return false;
  }
};

/**
 * Safely convert a timestamp to a valid Date object
 */
const safeDateFromTimestamp = (timestamp: number): Date => {
  // Handle various timestamp formats
  let validTimestamp = timestamp;
  
  // If timestamp is in seconds (typical Unix timestamp), convert to milliseconds
  if (timestamp < 1e12) { // Less than year 2001 in milliseconds, likely in seconds
    validTimestamp = timestamp * 1000;
  }
  
  // Create date and validate it's reasonable (between 1970 and 2030)
  const date = new Date(validTimestamp);
  const year = date.getFullYear();
  
  if (isNaN(date.getTime()) || year < 1970 || year > 2030) {
    console.warn(`⚠️ Invalid timestamp ${timestamp}, using current date`);
    return new Date();
  }
  
  return date;
};

/**
 * Process submissions and update database records
 */
const processLeetCodeSubmissions = async (
  user: User, 
  submissions: LeetCodeSubmission[], 
  stats: LeetCodeStats
): Promise<void> => {
  console.log(`🔄 Processing ${submissions.length} submissions for user ${user.leetcodeUsername}`);
  
  // Get all LeetCode problems for this user's assignments
  const userProblems = await prisma.submission.findMany({
    where: {
      userId: user.id,
    },
    include: {
      problem: true
    }
  });

  // Create a map of problem slugs to problems
  const problemSlugMap = new Map<string, { problemId: string; submissionId: string }>();
  
  userProblems.forEach(submission => {
    if (submission.problem.platform.toLowerCase() === 'leetcode') {
      const slug = extractLeetCodeSlug(submission.problem.url);
      if (slug) {
        problemSlugMap.set(slug, {
          problemId: submission.problem.id,
          submissionId: submission.id
        });
      }
    }
  });

  // Update submissions that match our problems
  let updatedCount = 0;
  const submissionSlugs = new Set(submissions.map(s => s.titleSlug));
  
  for (const [slug, data] of problemSlugMap) {
    if (submissionSlugs.has(slug)) {
      // Find the corresponding submission to get timestamp
      const submission = submissions.find(s => s.titleSlug === slug);
      
      const submissionTime = submission 
        ? safeDateFromTimestamp(submission.timestamp)
        : new Date();
      
      await prisma.submission.update({
        where: { id: data.submissionId },
        data: {
          completed: true,
          submissionTime
        }
      });
      
      updatedCount++;
    }
  }

  // Update user's cached stats
  await prisma.user.update({
    where: { id: user.id },
    data: {
      leetcodeTotalSolved: stats.totalSolved,
      leetcodeEasySolved: stats.easySolved,
      leetcodeMediumSolved: stats.mediumSolved,
      leetcodeHardSolved: stats.hardSolved,
    }
  });

  console.log(`✅ Updated ${updatedCount} problem submissions out of ${submissions.length} fetched submissions`);
};

/**
 * Extract LeetCode problem slug from URL
 */
const extractLeetCodeSlug = (url: string): string | null => {
  try {
    const match = url.match(/\/problems\/([^\/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Force sync LeetCode submissions for assignment checking (bypasses optimization)
 */
export const forceCheckLeetCodeSubmissionsForAssignment = async (assignmentId: string): Promise<void> => {
  console.log(`🎯 Starting FORCED LeetCode submission check for assignment: ${assignmentId}`);
  
  // Get all users with LeetCode problems in this assignment
  const usersWithLeetCodeProblems = await prisma.user.findMany({
    where: {
      leetcodeCookieStatus: 'LINKED',
      leetcodeCookie: { not: null },
      leetcodeUsername: { not: null },
      submissions: {
        some: {
          problem: {
            assignmentId: assignmentId,
            platform: 'leetcode'
          }
        }
      }
    }
  });

  console.log(`📊 Found ${usersWithLeetCodeProblems.length} users with LeetCode problems in assignment ${assignmentId}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of usersWithLeetCodeProblems) {
    try {
      console.log(`🔍 Force checking LeetCode submissions for ${user.leetcodeUsername}...`);
      
      // Step 1: Get user's assignment problems
      const userAssignmentProblems = await prisma.submission.findMany({
        where: {
          userId: user.id,
          problem: {
            assignmentId: assignmentId,
            platform: 'leetcode'
          }
        },
        include: {
          problem: true
        }
      });

      if (userAssignmentProblems.length === 0) {
        console.log(`⏭️ No LeetCode problems for ${user.leetcodeUsername} in this assignment`);
        continue;
      }

      console.log(`📝 Found ${userAssignmentProblems.length} LeetCode problems for ${user.leetcodeUsername} in assignment`);

      // Step 2: Always fetch fresh submissions (no optimization)
      let submissions: LeetCodeSubmission[] = [];
      try {
        submissions = await fetchAuthenticatedSubmissions(user.leetcodeCookie!, 100);
        console.log(`📥 Fetched ${submissions.length} recent submissions for ${user.leetcodeUsername}`);
      } catch (error: any) {
        console.error(`❌ Failed to fetch submissions for ${user.leetcodeUsername}:`, error.message);
        errorCount++;
        continue;
      }

      // Step 3: Check assignment problems against submissions
      const submissionSlugs = new Set(submissions.map(s => s.titleSlug));
      let updatedCount = 0;

      for (const assignmentSubmission of userAssignmentProblems) {
        const problemSlug = extractLeetCodeSlug(assignmentSubmission.problem.url);
        if (!problemSlug) {
          console.log(`⚠️ Could not extract slug from ${assignmentSubmission.problem.url}`);
          continue;
        }

        console.log(`🔍 Checking problem: ${assignmentSubmission.problem.title} (slug: ${problemSlug})`);

        if (submissionSlugs.has(problemSlug)) {
          // Find the submission for timestamp
          const submission = submissions.find(s => s.titleSlug === problemSlug);
          const submissionTime = submission 
            ? safeDateFromTimestamp(submission.timestamp)
            : new Date();

          await prisma.submission.update({
            where: { id: assignmentSubmission.id },
            data: {
              completed: true,
              submissionTime
            }
          });

          console.log(`✅ Marked ${assignmentSubmission.problem.title} as completed for ${user.leetcodeUsername}`);
          updatedCount++;
        } else {
          console.log(`❌ Problem ${assignmentSubmission.problem.title} not found in ${user.leetcodeUsername}'s submissions`);
        }
      }

      console.log(`✅ Updated ${updatedCount}/${userAssignmentProblems.length} problems for ${user.leetcodeUsername}`);
      successCount++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error force checking user ${user.leetcodeUsername}:`, error);
      errorCount++;
    }
  }
  
  console.log(`✅ Force check completed for assignment ${assignmentId}. Success: ${successCount}, Errors: ${errorCount}`);
};

/**
 * Sync LeetCode data for all users with linked accounts (background sync)
 */
export const syncAllLinkedLeetCodeUsers = async (): Promise<void> => {
  console.log(`🔄 Starting sync for all linked LeetCode users`);
  
  const linkedUsers = await prisma.user.findMany({
    where: {
      leetcodeCookieStatus: 'LINKED',
      leetcodeCookie: { not: null },
      leetcodeUsername: { not: null }
    }
  });

  console.log(`📊 Found ${linkedUsers.length} users with linked LeetCode accounts`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of linkedUsers) {
    try {
      const success = await fetchLeetCodeStatsAndSubmissions(user);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Rate limiting - space out requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error syncing user ${user.leetcodeUsername}:`, error);
      errorCount++;
    }
  }
  
  console.log(`✅ Sync completed. Success: ${successCount}, Errors: ${errorCount}`);
}; 