import { LeetCode, Credential } from 'leetcode-query';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file at the root of the server directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/*
 * =================================================================
 *  INSTRUCTIONS FOR TESTING ENHANCED LEETCODE INTEGRATION
 * =================================================================
 *
 * To test the enhanced LeetCode integration, you need a LeetCode session cookie.
 *
 * 1. HOW TO GET YOUR COOKIE:
 *    a. Open your web browser and log in to your LeetCode account.
 *    b. Open the developer tools (usually by pressing F12 or Ctrl+Shift+I).
 *    c. Go to the "Application" (in Chrome) or "Storage" (in Firefox) tab.
 *    d. Find the "Cookies" section and select "https://leetcode.com".
 *    e. Find the cookie named "LEETCODE_SESSION" and copy its entire "value".
 *
 * 2. HOW TO USE THE COOKIE:
 *    a. Create a file named `.env` in the `server/` directory if it doesn't exist.
 *    b. Add the following line to the `.env` file, pasting your cookie value:
 *       LEETCODE_SESSION_COOKIE="your_copied_cookie_value_here"
 *
 * 3. HOW TO RUN THE SCRIPT:
 *    a. Make sure you are in the `server/` directory.
 *    b. Run the following command in your terminal:
 *       npx ts-node -r tsconfig-paths/register ./scripts/test-enhanced-leetcode.ts
 *
 * =================================================================
 */

// --- Test Configuration ---
const LEETCODE_USERNAME = 'your_leetcode_username'; // <--- ⚠️ CHANGE THIS to a valid LeetCode username

async function testUnauthenticated() {
  console.log('--- Running Unauthenticated Test ---');
  if (LEETCODE_USERNAME === 'your_leetcode_username') {
    console.error('⚠️ Please update the LEETCODE_USERNAME in the script before running.');
    return;
  }
  
  try {
    const leetcode = new LeetCode();
    const user = await leetcode.user(LEETCODE_USERNAME);
    console.log('✅ Successfully fetched user profile:');
    console.log({
      name: (user as any).name,
      username: (user as any).username,
      profile: (user as any).profile,
      recentSubmissions: (user as any).recentSubmissions?.slice(0, 5).map((s: any) => ({
        title: s.title,
        status: s.statusDisplay,
        timestamp: s.timestamp,
      })),
    });
  } catch (error) {
    console.error('❌ Failed to fetch user profile:', error);
  }
  console.log('--- Finished Unauthenticated Test ---\n');
}

async function testAuthenticated() {
  console.log('--- Running Authenticated Test ---');
  const sessionCookie = process.env.LEETCODE_SESSION_COOKIE;

  if (!sessionCookie || sessionCookie === 'your_copied_cookie_value_here') {
    console.warn('⚠️ LEETCODE_SESSION_COOKIE not found in .env file.');
    console.warn('Skipping authenticated test. Please follow the instructions above to test this feature.');
    return;
  }

  try {
    console.log('🤫 Found session cookie. Attempting to authenticate...');
    const credential = new Credential();
    await credential.init(sessionCookie);
    console.log('✅ Authentication successful.');

    const leetcode = new LeetCode(credential);
    
    console.log('⏳ Fetching authenticated user info...');
    // For authenticated calls, we can get user info from the credential
    console.log('✅ Authentication successful - ready to fetch submissions');
    
    console.log('⏳ Fetching submissions (this might take a while)...');
    const submissions = await leetcode.submissions({ limit: 50, offset: 0 });

    console.log(`✅ Successfully fetched ${(submissions as any).submissions?.length} submissions.`);

    if ((submissions as any).submissions?.length > 0) {
        const solved = (submissions as any).submissions.filter((s: any) => s.statusDisplay === 'Accepted');
        const uniqueSolved = new Set(solved.map((s: any) => s.titleSlug));
        console.log(`📊 Found ${solved.length} accepted submissions, with ${uniqueSolved.size} unique problems solved.`);
        console.log('Sample of unique solved problems:', Array.from(uniqueSolved).slice(0, 10));
    }
    
    console.log('Has next:', (submissions as any).hasNext);

  } catch (error) {
    console.error('❌ Failed during authenticated test:', error);
  }
  console.log('--- Finished Authenticated Test ---');
}

async function testEnhancedIntegration() {
  console.log('--- Testing Enhanced Integration Logic ---');
  
  // Test our enhanced service functions
  try {
    // Import our enhanced service functions
    const { fetchPublicLeetCodeStats, fetchAuthenticatedStats } = await import('../src/services/enhanced-leetcode.service');
    
    if (LEETCODE_USERNAME !== 'your_leetcode_username') {
      console.log('🔍 Testing public stats fetch...');
      const publicStats = await fetchPublicLeetCodeStats(LEETCODE_USERNAME);
      console.log('Public stats result:', publicStats);
    }
    
    const sessionCookie = process.env.LEETCODE_SESSION_COOKIE;
    if (sessionCookie && sessionCookie !== 'your_copied_cookie_value_here') {
      console.log('🔒 Testing authenticated stats fetch...');
      const authStats = await fetchAuthenticatedStats(sessionCookie);
      console.log('Authenticated stats result:', authStats);
    }
    
  } catch (error) {
    console.error('❌ Error testing enhanced integration:', error);
  }
  
  console.log('--- Finished Enhanced Integration Test ---');
}

async function main() {
  await testUnauthenticated();
  await testAuthenticated();
  await testEnhancedIntegration();
}

main(); 