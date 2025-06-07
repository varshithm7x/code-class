import axios from 'axios';
import { PrismaClient, Submission, User, Problem } from '@prisma/client';
import { LeetCodeGraphQLResponse, GfgAPIResponse, LeetCodeRecentACResponse } from '../types';
import prisma from '../lib/prisma';
import { groupBy } from '../utils/array.utils';

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

/**
 * Fetches all recently accepted LeetCode problem slugs for a user.
 * @param username - The LeetCode username.
 * @returns A Set containing the titleSlugs of all accepted problems.
 */
export const getAllLeetCodeSolvedSlugs = async (username: string): Promise<Set<string>> => {
    console.log(`Fetching all solved LeetCode problems for user: ${username}`);
    const query = `
      query recentAcSubmissionList($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          titleSlug
        }
      }
    `;

    try {
        const response = await axios.post<LeetCodeGraphQLResponse<LeetCodeRecentACResponse>>(LEETCODE_API_ENDPOINT, {
            query,
            variables: { username, limit: 2000 }, // Fetch a large number of accepted submissions
        });

        const submissions = response.data.data.recentAcSubmissionList;
        if (!submissions) {
            console.log(`Could not find any accepted submissions for LeetCode user ${username}.`);
            return new Set();
        }

        const solvedSlugs = new Set<string>(submissions.map((s: { titleSlug: string }) => s.titleSlug));
        
        console.log(`Found ${solvedSlugs.size} unique accepted LeetCode submissions for ${username}.`);
        return solvedSlugs;
    } catch (error: any) {
        if (error.response) {
            const errorMessages = error.response.data.errors ? JSON.stringify(error.response.data.errors) : JSON.stringify(error.response.data);
            console.error(`Error fetching LeetCode solved list for ${username}. Status: ${error.response.status}, Data:`, errorMessages);
        } else {
            console.error(`Error fetching LeetCode solved list for ${username}:`, error.message);
        }
        return new Set();
    }
};

/**
 * Fetches all solved GeeksForGeeks problem slugs for a user.
 * @param username - The GFG username.
 * @returns A Set containing the slugs of all solved problems.
 */
export const getAllGfgSolvedSlugs = async (username: string): Promise<Set<string>> => {
    console.log(`Fetching all solved GFG problems for user: ${username}`);
    const GFG_API_URL = `https://geeks-for-geeks-api.vercel.app/${username}`;
    try {
        const { data } = await axios.get<GfgAPIResponse>(GFG_API_URL);

        if (data.error || !data.solvedStats) {
            console.error(`GFG API error for user ${username}: ${data.error || 'No solved stats found'}`);
            return new Set();
        }

        const solvedStats = data.solvedStats;
        const allSolved = [
            ...(solvedStats.school?.questions || []),
            ...(solvedStats.basic?.questions || []),
            ...(solvedStats.easy?.questions || []),
            ...(solvedStats.medium?.questions || []),
            ...(solvedStats.hard?.questions || []),
        ];
        
        const allSolvedSlugs = new Set<string>(
            allSolved.map((q: { questionUrl: string }) => getGfgProblemSlug(q.questionUrl)).filter(Boolean)
        );
        console.log(`Found ${allSolvedSlugs.size} unique solved GFG submissions for ${username}.`);
        return allSolvedSlugs;
    } catch (error: any) {
        if (error.response) {
            console.error(`Error fetching GFG data for user ${username}. Status: ${error.response.status}, Data:`, error.response.data);
        } else {
            console.error(`Error during GFG check for user ${username}:`, error.message);
        }
        return new Set();
    }
};

/**
 * Extracts the problem slug from a GeeksForGeeks URL for robust matching.
 * e.g., "https://practice.geeksforgeeks.org/problems/two-sum/1" -> "two-sum"
 * @param url - The GFG problem URL.
 * @returns The problem slug.
 */
export const getGfgProblemSlug = (url: string): string => {
    try {
        const urlObject = new URL(url);
        // Path will be like '/problems/problem-name/1' or '/problems/problem-name/'
        const pathParts = urlObject.pathname.split('/').filter(p => p.length > 0);
        const problemsIndex = pathParts.indexOf('problems');
        if (problemsIndex !== -1 && pathParts.length > problemsIndex + 1) {
            return pathParts[problemsIndex + 1];
        }
        return '';
    } catch (e) {
        console.error(`Could not parse GFG URL: ${url}`, e);
        return '';
    }
}

/**
 * Extracts the problem identifier (slug or name) from a URL.
 */
const getProblemIdentifier = (platform: string, url: string): string => {
    try {
        const urlObject = new URL(url);
        if (platform.toLowerCase() === 'leetcode') {
            const pathParts = urlObject.pathname.split('/problems/');
            if (pathParts.length > 1) {
                // Extracts 'two-sum' from '/problems/two-sum/description/' or '/problems/two-sum/'
                return pathParts[1].split('/')[0];
            }
        }
        // For GFG, the full URL is used for parsing within the checker.
        return url;
    } catch (error) {
        console.error(`Invalid problem URL: ${url}`);
        return '';
    }
}

const processSubmissionsInBulk = async (submissions: (Submission & { user: User, problem: Problem })[]) => {
    if (submissions.length === 0) {
        console.log('No pending submissions to process.');
        return;
    }

    // Group submissions by user to process one user at a time
    const submissionsByUser = groupBy(submissions, 'userId');

    for (const userId in submissionsByUser) {
        const userSubmissions = submissionsByUser[userId];
        const user = userSubmissions[0].user;
        console.log(`Processing ${userSubmissions.length} submissions for user: ${user.name} (${user.email})`);

        // Fetch all solved problems ONCE per user for each platform they use
        let leetCodeSolved = new Set<string>();
        if (user.leetcodeUsername && userSubmissions.some(s => s.problem.platform.toLowerCase() === 'leetcode')) {
            leetCodeSolved = await getAllLeetCodeSolvedSlugs(user.leetcodeUsername);
        }

        let gfgSolved = new Set<string>();
        if (user.gfgUsername && userSubmissions.some(s => s.problem.platform.toLowerCase() === 'gfg')) {
            gfgSolved = await getAllGfgSolvedSlugs(user.gfgUsername);
        }

        // Now, check each of this user's submissions against the cached data
        for (const submission of userSubmissions) {
            const { problem } = submission;
            let isCompleted = false;
            
            const platform = problem.platform.toLowerCase();
            const problemIdentifier = getProblemIdentifier(platform, problem.url);
            
            if (platform === 'leetcode' && problemIdentifier) {
                console.log(`[Debug] Checking LeetCode problem: '${problem.title}' (DB slug: '${problemIdentifier}')`);
                isCompleted = leetCodeSolved.has(problemIdentifier);
                if (!isCompleted) {
                    // Log details only on failure to avoid spamming the console
                    console.log(`[Debug] Match not found. Comparing DB slug against ${leetCodeSolved.size} fetched slugs:`, Array.from(leetCodeSolved));
                }
            } else if (platform === 'gfg' && problemIdentifier) {
                const targetSlug = getGfgProblemSlug(problem.url);
                console.log(`[Debug] Checking GFG problem: '${problem.title}' (DB slug: '${targetSlug}')`);
                isCompleted = gfgSolved.has(targetSlug);
                 if (!isCompleted) {
                    console.log(`[Debug] Match not found. Comparing DB slug against ${gfgSolved.size} fetched slugs:`, Array.from(gfgSolved));
                }
            }

            if (isCompleted) {
                console.log(`SUCCESS: Marking submission as completed for ${user.name} on ${problem.title}`);
                await prisma.submission.update({
                    where: { id: submission.id },
                    data: { completed: true, submissionTime: new Date() },
                });
            } else {
                console.log(`PENDING: Submission for ${user.name} on ${problem.title} is not yet accepted.`);
            }
        }
    }
    console.log('Finished processing all pending submissions.');
};


/**
 * Iterates through all pending submissions and updates their status.
 */
export const checkAllSubmissions = async () => {
    console.log('Checking all pending submissions with optimized logic...');
    const pendingSubmissions = await prisma.submission.findMany({
        where: { completed: false },
        include: { user: true, problem: true },
    });
    console.log(`Found ${pendingSubmissions.length} total pending submissions.`);

    await processSubmissionsInBulk(pendingSubmissions);
};

/**
 * Iterates through all pending submissions for a specific assignment and updates their status.
 * @param assignmentId - The ID of the assignment to check.
 */
export const checkSubmissionsForAssignment = async (assignmentId: string) => {
    console.log(`Checking submissions for assignment ID: ${assignmentId} with optimized logic...`);
    const pendingSubmissions = await prisma.submission.findMany({
        where: {
            problem: {
                assignmentId: assignmentId,
            },
            completed: false,
        },
        include: { user: true, problem: true },
    });
    console.log(`Found ${pendingSubmissions.length} pending submissions for assignment ${assignmentId}.`);

    await processSubmissionsInBulk(pendingSubmissions);
};