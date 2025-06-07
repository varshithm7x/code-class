import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file in the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Add your problem links here
const LEETCODE_PROBLEM_SLUG = 'two-sum'; // e.g., 'two-sum', 'intersection-of-two-arrays'
const GFG_PROBLEM_URL = 'https://practice.geeksforgeeks.org/problems/subset-sums/0'; // e.g., 'https://practice.geeksforgeeks.org/problems/two-sum/1'

// --- Usernames to test ---
const GFG_USERNAME = 'technophyle';
const LEETCODE_USERNAME = 'Die_hard-PROGRAmmer';

// --- Do not edit below this line ---

// This is a simplified, non-operational mock of the real services for path resolution.
// The real services will be dynamically imported.
const mockSubmissionService = {
  checkLeetCode: async (username: string, slug: string) => {
    console.log(`(Mock) Checking LeetCode for ${username} on ${slug}`);
    return false;
  },
  checkGfg: async (username:string, url: string) => {
    console.log(`(Mock) Checking GFG for ${username} on ${url}`);
    return false;
  }
};


const main = async () => {
  console.log('--- Starting Submission Checker Test Script ---');

  try {
    // Dynamically import the actual service to bypass pathing issues in a script context
    const submissionService = await import('../src/services/submission.service');

    // --- Test LeetCode ---
    console.log(`\n[TESTING LEETCODE]`);
    console.log(`Username: ${LEETCODE_USERNAME}`);
    console.log(`Problem Slug: ${LEETCODE_PROBLEM_SLUG}`);
    if (LEETCODE_USERNAME && LEETCODE_PROBLEM_SLUG) {
      // @ts-ignore - Ignoring since these are now private functions but we still want to test them directly
      const solvedSlugs = await submissionService.getAllLeetCodeSolvedSlugs(LEETCODE_USERNAME);
      const isLeetCodeSolved = solvedSlugs.has(LEETCODE_PROBLEM_SLUG);
      console.log(`>>> LeetCode - Is Solved: ${isLeetCodeSolved}\n`);
    } else {
      console.log('Skipping LeetCode check, username or problem slug not provided.');
    }

    // --- Test GFG ---
    console.log(`\n[TESTING GFG]`);
    console.log(`Username: ${GFG_USERNAME}`);
    console.log(`Problem URL: ${GFG_PROBLEM_URL}`);
     if (GFG_USERNAME && GFG_PROBLEM_URL) {
      // @ts-ignore - Ignoring since these are now private functions but we still want to test them directly
      const gfgSolvedSlugs = await submissionService.getAllGfgSolvedSlugs(GFG_USERNAME);
      // @ts-ignore
      const targetGfgSlug = submissionService.getGfgProblemSlug(GFG_PROBLEM_URL);
      const isGfgSolved = gfgSolvedSlugs.has(targetGfgSlug);
      console.log(`>>> GFG - Is Solved: ${isGfgSolved}\n`);
    } else {
      console.log('Skipping GFG check, username or problem URL not provided.');
    }

  } catch (error) {
    console.error('\n--- AN ERROR OCCURRED ---');
    console.error('Failed to run test script:', error);
  } finally {
    console.log('--- Test Script Finished ---');
  }
};

main(); 