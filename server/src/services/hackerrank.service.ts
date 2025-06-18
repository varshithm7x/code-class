import axios from 'axios';
import { PrismaClient, User, Problem, Submission } from '@prisma/client';
import prisma from '../lib/prisma';

const HACKERRANK_API_URL = 'https://www.hackerrank.com/rest';

interface HackerRankSubmission {
  id: number;
  challenge_name: string;
  language: string;
  score: number;
  status: string;
  created_at: string;
  code?: string;
}

interface HackerRankSubmissionsResponse {
  models: unknown[];
}

interface HackerRankSubmissionDetailResponse {
  model: {
    code: string;
    id: number;
    challenge: {
      name: string;
    };
    language: string;
    status: string;
    created_at: string;
  };
}

/**
 * Fetches recent submissions from HackerRank using an authenticated session.
 */
export const fetchHackerRankSubmissions = async (sessionCookie: string, limit: number = 100): Promise<HackerRankSubmission[]> => {
  console.log(`🔶 HackerRank: Fetching submissions (limit: ${limit})`);

  const url = `${HACKERRANK_API_URL}/contests/master/submissions?offset=0&limit=${limit}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Cookie': `_hrank_session=${sessionCookie}`,
    'Referer': 'https://www.hackerrank.com/',
    'Origin': 'https://www.hackerrank.com',
  };

  try {
    const response = await axios.get<HackerRankSubmissionsResponse>(url, { headers });

    if (response.status !== 200 || !response.data.models) {
      console.error('🔶 HackerRank: Failed to fetch submissions, status:', response.status);
      return [];
    }

    const submissions = response.data.models
      .filter((sub: unknown) => (sub as Record<string, unknown>).status === 'Accepted') // Only accepted submissions
      .map((sub: unknown) => {
        const submission = sub as Record<string, unknown>;
        const challenge = submission.challenge as Record<string, unknown>;
        return {
          id: submission.id as number,
          challenge_name: challenge.name as string,
          language: submission.language as string,
          score: submission.score as number,
          status: submission.status as string,
          created_at: submission.created_at as string,
        };
      });
    
    console.log(`🔶 HackerRank: Found ${submissions.length} accepted submissions out of ${response.data.models.length} total`);
    return submissions;

  } catch (error: unknown) {
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      console.error('🔶 HackerRank: Unauthorized. The session cookie may be invalid or expired.');
      throw new Error('HackerRank session expired or invalid.');
    }
    console.error('🔶 HackerRank: Error fetching submissions:', (error as Error).message);
    throw error;
  }
};

/**
 * Fetches the code for a single HackerRank submission.
 */
export const fetchSubmissionCode = async (submissionId: number, sessionCookie: string): Promise<string | null> => {
  console.log(`🔶 HackerRank: Fetching code for submission ${submissionId}`);
  
  const url = `${HACKERRANK_API_URL}/contests/master/submissions/${submissionId}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Cookie': `_hrank_session=${sessionCookie}`,
    'Referer': 'https://www.hackerrank.com/',
    'Origin': 'https://www.hackerrank.com',
  };

  try {
    const response = await axios.get<HackerRankSubmissionDetailResponse>(url, { headers });
    if (response.status === 200 && response.data.model) {
      return response.data.model.code;
    }
    console.error(`🔶 HackerRank: Failed to fetch code for submission ${submissionId}, status:`, response.status);
    return null;
  } catch (error) {
    console.error(`🔶 HackerRank: Error fetching code for submission ${submissionId}:`, (error as Error).message);
    return null;
  }
};

/**
 * Extracts problem slug from HackerRank URL
 */
const extractHackerRankSlug = (url: string): string | null => {
  try {
    const match = url.match(/\/challenges\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Normalizes a HackerRank challenge name to match URL slug format
 */
const normalizeHackerRankChallengeName = (challengeName: string): string => {
  return challengeName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Safe date conversion from timestamp
 */
const safeDateFromTimestamp = (timestamp: unknown): Date => {
  try {
    const date = new Date((timestamp as number) * 1000); // HackerRank uses seconds
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
};

/**
 * Process HackerRank submissions and update database records
 */
const processHackerRankSubmissions = async (
  user: User, 
  submissions: HackerRankSubmission[]
): Promise<void> => {
  console.log(`🔶 HackerRank: Processing ${submissions.length} submissions for user ${user.hackerrankUsername}`);
  
  // Get all HackerRank problems for this user's assignments
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
    if (submission.problem.platform.toLowerCase() === 'hackerrank') {
      const slug = extractHackerRankSlug(submission.problem.url);
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
  const submissionSlugs = new Set(submissions.map(s => normalizeHackerRankChallengeName(s.challenge_name)));
  
  for (const [slug, data] of problemSlugMap) {
    // Try both exact match and normalized match
    const hasDirectMatch = submissions.some(s => s.challenge_name === slug);
    const hasNormalizedMatch = submissionSlugs.has(slug) || submissionSlugs.has(normalizeHackerRankChallengeName(slug));
    
    if (hasDirectMatch || hasNormalizedMatch) {
      // Find the corresponding submission to get timestamp
      const submission = submissions.find(s => 
        s.challenge_name === slug || 
        normalizeHackerRankChallengeName(s.challenge_name) === slug ||
        normalizeHackerRankChallengeName(s.challenge_name) === normalizeHackerRankChallengeName(slug)
      );
      
      const submissionTime = submission 
        ? safeDateFromTimestamp(submission.created_at)
        : new Date();
      
      await prisma.submission.update({
        where: { id: data.submissionId },
        data: {
          completed: true,
          submissionTime
        }
      });
      
      updatedCount++;
      console.log(`🔶 HackerRank: Marked ${slug} as completed for ${user.hackerrankUsername}`);
    }
  }

  console.log(`✅ HackerRank: Updated ${updatedCount} problem submissions out of ${submissions.length} fetched submissions`);
};

/**
 * Core function to fetch and process HackerRank submissions for a user
 */
export const fetchHackerRankStatsAndSubmissions = async (user: User & {
  hackerrankCookieStatus?: string;
  hackerrankCookie?: string | null;
}): Promise<boolean> => {
  console.log(`🚀 HackerRank sync for user: ${user.hackerrankUsername} (ID: ${user.id})`);
  
  if (!user.hackerrankUsername) {
    console.log(`⚠️ User ${user.id} has no HackerRank username`);
    return false;
  }

  if (user.hackerrankCookieStatus !== 'LINKED' || !user.hackerrankCookie) {
    console.log(`⚠️ User ${user.id} does not have a linked HackerRank session`);
    return false;
  }

  try {
    // Fetch recent submissions
    let submissions: HackerRankSubmission[] = [];
    try {
      submissions = await fetchHackerRankSubmissions(user.hackerrankCookie, 100);
    } catch (error: unknown) {
      // If authenticated call fails, mark cookie as expired
      console.error(`❌ HackerRank submissions call failed for ${user.hackerrankUsername}, marking cookie as expired`);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hackerrankCookieStatus: 'EXPIRED' }
      });
      
      return false;
    }

    // Process submissions and update database
    await processHackerRankSubmissions(user, submissions);
    
    console.log(`✅ Successfully synced ${submissions.length} HackerRank submissions for ${user.hackerrankUsername}`);
    return true;
    
  } catch (error: unknown) {
    console.error(`❌ Error in fetchHackerRankStatsAndSubmissions for ${user.hackerrankUsername}:`, (error as Error).message);
    return false;
  }
};

/**
 * Sync all users with linked HackerRank sessions
 */
export const syncAllLinkedHackerRankUsers = async (): Promise<void> => {
  console.log("🔶 HackerRank: Starting sync for all linked users");
  
  const users = await prisma.user.findMany({
    where: {
      hackerrankCookieStatus: 'LINKED',
      hackerrankCookie: { not: null },
      hackerrankUsername: { not: null }
    }
  });

  console.log(`🔶 HackerRank: Found ${users.length} users to sync`);
  
  for (const user of users) {
    try {
      console.log(`🔶 HackerRank: Syncing user ${user.hackerrankUsername}...`);
      await fetchHackerRankStatsAndSubmissions(user);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`🔶 HackerRank: Error syncing user ${user.hackerrankUsername}:`, error);
    }
  }
  
  console.log("✅ HackerRank: Finished sync for all linked users");
};

/**
 * Force sync HackerRank submissions for assignment checking (bypasses optimization)
 */
export const forceCheckHackerRankSubmissionsForAssignment = async (assignmentId: string): Promise<void> => {
  console.log(`🎯 Starting FORCED HackerRank submission check for assignment: ${assignmentId}`);
  
  // Get all users with HackerRank problems in this assignment
  const usersWithHackerRankProblems = await prisma.user.findMany({
    where: {
      hackerrankCookieStatus: 'LINKED',
      hackerrankCookie: { not: null },
      hackerrankUsername: { not: null },
      submissions: {
        some: {
          problem: {
            assignmentId: assignmentId,
            platform: 'hackerrank'
          }
        }
      }
    }
  });

  console.log(`📊 Found ${usersWithHackerRankProblems.length} users with HackerRank problems in assignment ${assignmentId}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of usersWithHackerRankProblems) {
    try {
      console.log(`🔍 Force checking HackerRank submissions for ${user.hackerrankUsername}...`);
      
      // Step 1: Get user's assignment problems
      const userAssignmentProblems = await prisma.submission.findMany({
        where: {
          userId: user.id,
          problem: {
            assignmentId: assignmentId,
            platform: 'hackerrank'
          }
        },
        include: {
          problem: true
        }
      });

      if (userAssignmentProblems.length === 0) {
        console.log(`⏭️ No HackerRank problems for ${user.hackerrankUsername} in this assignment`);
        continue;
      }

      console.log(`📝 Found ${userAssignmentProblems.length} HackerRank problems for ${user.hackerrankUsername} in assignment`);

      // Step 2: Always fetch fresh submissions (no optimization)
      let submissions: HackerRankSubmission[] = [];
      try {
        submissions = await fetchHackerRankSubmissions(user.hackerrankCookie!, 100);
        console.log(`📥 Fetched ${submissions.length} recent submissions for ${user.hackerrankUsername}`);
      } catch (error: unknown) {
        console.error(`❌ Failed to fetch HackerRank submissions for ${user.hackerrankUsername}:`, (error as Error).message);
        errorCount++;
        continue;
      }

      // Step 3: Check assignment problems against submissions
      let updatedCount = 0;

      for (const assignmentSubmission of userAssignmentProblems) {
        const problemSlug = extractHackerRankSlug(assignmentSubmission.problem.url);
        if (!problemSlug) {
          console.log(`⚠️ Could not extract slug from ${assignmentSubmission.problem.url}`);
          continue;
        }

        console.log(`🔍 Checking problem: ${assignmentSubmission.problem.title} (slug: ${problemSlug})`);

        // Check if we have a submission for this problem
        const hasSubmission = submissions.some(s => 
          s.challenge_name === problemSlug || 
          normalizeHackerRankChallengeName(s.challenge_name) === problemSlug ||
          normalizeHackerRankChallengeName(s.challenge_name) === normalizeHackerRankChallengeName(problemSlug)
        );

        if (hasSubmission) {
          // Find the submission for timestamp
          const submission = submissions.find(s => 
            s.challenge_name === problemSlug || 
            normalizeHackerRankChallengeName(s.challenge_name) === problemSlug ||
            normalizeHackerRankChallengeName(s.challenge_name) === normalizeHackerRankChallengeName(problemSlug)
          );
          
          const submissionTime = submission 
            ? safeDateFromTimestamp(submission.created_at)
            : new Date();

          await prisma.submission.update({
            where: { id: assignmentSubmission.id },
            data: {
              completed: true,
              submissionTime
            }
          });

          console.log(`✅ Marked ${assignmentSubmission.problem.title} as completed for ${user.hackerrankUsername}`);
          updatedCount++;
        } else {
          console.log(`❌ Problem ${assignmentSubmission.problem.title} not found in ${user.hackerrankUsername}'s submissions`);
        }
      }

      console.log(`✅ Updated ${updatedCount}/${userAssignmentProblems.length} problems for ${user.hackerrankUsername}`);
      successCount++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error force checking user ${user.hackerrankUsername}:`, error);
      errorCount++;
    }
  }
  
  console.log(`✅ Force check completed for assignment ${assignmentId}. Success: ${successCount}, Errors: ${errorCount}`);
}; 