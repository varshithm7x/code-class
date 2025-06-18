import axios from 'axios';
import { PrismaClient, Submission, User, Problem } from '@prisma/client';
import { GfgAPIResponse } from '../types';
import prisma from '../lib/prisma';
import { groupBy } from '../utils/array.utils';
import { syncAllLinkedLeetCodeUsers, forceCheckLeetCodeSubmissionsForAssignment } from './enhanced-leetcode.service';
import { syncAllLinkedHackerRankUsers, forceCheckHackerRankSubmissionsForAssignment } from './hackerrank.service';

/**
 * Fetches all solved GeeksForGeeks problem slugs for a user.
 * @param username - The GFG username.
 * @returns A Set containing the slugs of all solved problems.
 */
export const getAllGfgSolvedSlugs = async (username: string): Promise<Set<string>> => {
    console.log(`Fetching all solved GFG problems for user: ${username}`);
    const GFG_API_URL = `https://geeks-for-geeks-api.vercel.app/${username}`;
    try {
        const response = await axios.get<GfgAPIResponse>(GFG_API_URL);

        if (response.data.error || !response.data.solvedStats) {
            console.error(`GFG API error for user ${username}: ${response.data.error || 'No solved stats found'}`);
            return new Set();
        }

        const solvedStats = response.data.solvedStats;
        const allSolved = [
            ...(solvedStats.school?.questions || []),
            ...(solvedStats.basic?.questions || []),
            ...(solvedStats.easy?.questions || []),
            ...(solvedStats.medium?.questions || []),
            ...(solvedStats.hard?.questions || []),
        ];
        
        const solvedSlugs = new Set<string>(
            allSolved.map((q: { questionUrl: string }) => getGfgProblemSlug(q.questionUrl)).filter(Boolean)
        );
        
        console.log(`Found ${solvedSlugs.size} solved GFG problems for ${username}.`);
        return solvedSlugs;
    } catch (error: unknown) {
        const axiosError = error as { response?: { status: number; data: unknown }; message?: string };
        if (axiosError.response) {
            console.error(`Error fetching GFG solved list for ${username}. Status: ${axiosError.response.status}, Data:`, axiosError.response.data);
        } else {
            console.error(`Error fetching GFG solved list for ${username}:`, axiosError.message);
        }
        return new Set();
    }
};

/**
 * Extracts the problem slug from a GeeksForGeeks problem URL.
 * @param url - The full URL of the problem.
 * @returns The problem slug or the original URL if extraction fails.
 */
export const getGfgProblemSlug = (url: string): string => {
    try {
        const match = url.match(/\/problems\/([^/]+)/);
        return match ? match[1] : url;
    } catch (error) {
        console.error(`Error extracting slug from GFG URL: ${url}`, error);
        return url;
    }
};

/**
 * Extracts the problem slug from a LeetCode problem URL.
 * @param url - The full URL of the problem.
 * @returns The problem slug or null if extraction fails.
 */
export const getLeetCodeProblemSlug = (url: string): string | null => {
    try {
        const match = url.match(/\/problems\/([^/]+)/);
        return match ? match[1] : null;
    } catch (error) {
        console.error(`Error extracting slug from LeetCode URL: ${url}`, error);
        return null;
    }
};

/**
 * Gets the problem identifier based on platform and URL.
 * @param platform - The platform name.
 * @param url - The problem URL.
 * @returns The problem identifier.
 */
const getProblemIdentifier = (platform: string, url: string): string => {
    if (platform.toLowerCase() === 'leetcode') {
        return getLeetCodeProblemSlug(url) || url;
    } else if (platform.toLowerCase() === 'gfg') {
        return getGfgProblemSlug(url);
    }
    return url;
};

/**
 * Process only GFG submissions - LeetCode is handled by the enhanced service
 */
const processGfgSubmissions = async (submissions: (Submission & { user: User, problem: Problem })[]) => {
    // Filter to only GFG submissions
    const gfgSubmissions = submissions.filter(s => s.problem.platform.toLowerCase() === 'gfg');
    
    if (gfgSubmissions.length === 0) {
        console.log('📚 No GFG submissions to process.');
        return;
    }

    console.log(`📚 Processing ${gfgSubmissions.length} GFG submissions`);

    // Group submissions by user to process one user at a time
    const submissionsByUser = groupBy(gfgSubmissions, 'userId');

    for (const userId in submissionsByUser) {
        const userSubmissions = submissionsByUser[userId];
        const user = userSubmissions[0].user;
        
        if (!user.gfgUsername) {
            console.log(`⚠️ User ${user.name} has no GFG username - skipping ${userSubmissions.length} GFG problems`);
            continue;
        }
        
        console.log(`👤 Processing ${userSubmissions.length} GFG submissions for user: ${user.name} (${user.email})`);

        // Fetch all solved GFG problems for this user
        console.log(`📚 Fetching GFG solved problems for ${user.name} (${user.gfgUsername})`);
        const gfgSolved = await getAllGfgSolvedSlugs(user.gfgUsername);

        // Process each GFG submission
        let updatedCount = 0;
        for (const submission of userSubmissions) {
            const { problem } = submission;
            const problemIdentifier = getProblemIdentifier('gfg', problem.url);
            console.log(`📝 Checking GFG problem: '${problem.title}' (slug: '${problemIdentifier}')`);
            
            const isCompleted = gfgSolved.has(problemIdentifier);

            if (isCompleted) {
                console.log(`✅ Marking GFG submission as completed for ${user.name} on ${problem.title}`);
                await prisma.submission.update({
                    where: { id: submission.id },
                    data: { completed: true, submissionTime: new Date() },
                });
                updatedCount++;
            } else {
                console.log(`❌ GFG problem '${problem.title}' not found in solved list`);
            }
        }
        
        console.log(`✅ Updated ${updatedCount}/${userSubmissions.length} GFG submissions for ${user.name}`);
    }
    
    console.log('✅ Finished processing all GFG submissions');
};

/**
 * Check all pending submissions - uses enhanced LeetCode service + HackerRank service + GFG processing
 */
export const checkAllSubmissions = async () => {
    console.log('🚀 Starting comprehensive submission check...');
    
    // Step 1: Sync all LeetCode users with enhanced integration
    console.log('📱 Step 1: Syncing LeetCode users with enhanced integration...');
    await syncAllLinkedLeetCodeUsers();
    
    // Step 2: Sync all HackerRank users with enhanced integration
    console.log('🔶 Step 2: Syncing HackerRank users with enhanced integration...');
    await syncAllLinkedHackerRankUsers();
    
    // Step 3: Process remaining GFG submissions  
    console.log('📝 Step 3: Processing GFG submissions...');
    const pendingSubmissions = await prisma.submission.findMany({
        where: { completed: false },
        include: { user: true, problem: true },
    });
    
    console.log(`Found ${pendingSubmissions.length} total pending submissions`);
    await processGfgSubmissions(pendingSubmissions);

    console.log('✅ Comprehensive submission check completed');
};

/**
 * Check submissions for a specific assignment - uses enhanced LeetCode service + GFG processing
 */
export const checkSubmissionsForAssignment = async (assignmentId: string) => {
    console.log(`🎯 Starting submission check for assignment: ${assignmentId}...`);
    
    // Get assignment details for better logging
    const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { problems: true }
    });
    
    if (!assignment) {
        console.log(`❌ Assignment ${assignmentId} not found`);
        return;
    }
    
    console.log(`📋 Assignment: "${assignment.title}" with ${assignment.problems.length} problems`);
    
    // Show platform breakdown
    const leetcodeProblems = assignment.problems.filter(p => p.platform.toLowerCase() === 'leetcode');
    const hackerrankProblems = assignment.problems.filter(p => p.platform.toLowerCase() === 'hackerrank');
    const gfgProblems = assignment.problems.filter(p => p.platform.toLowerCase() === 'gfg');
    const otherProblems = assignment.problems.filter(p => !['leetcode', 'hackerrank', 'gfg'].includes(p.platform.toLowerCase()));
    
    console.log(`📊 Platform breakdown: ${leetcodeProblems.length} LeetCode, ${hackerrankProblems.length} HackerRank, ${gfgProblems.length} GFG, ${otherProblems.length} other`);
    
    // Step 1: Force check LeetCode submissions for this specific assignment
    if (leetcodeProblems.length > 0) {
        console.log('📱 Step 1: Force checking LeetCode submissions for assignment...');
        await forceCheckLeetCodeSubmissionsForAssignment(assignmentId);
    } else {
        console.log('⏭️ No LeetCode problems in this assignment - skipping LeetCode sync');
    }
    
    // Step 2: Force check HackerRank submissions for this specific assignment
    if (hackerrankProblems.length > 0) {
        console.log('🔶 Step 2: Force checking HackerRank submissions for assignment...');
        await forceCheckHackerRankSubmissionsForAssignment(assignmentId);
    } else {
        console.log('⏭️ No HackerRank problems in this assignment - skipping HackerRank sync');
    }
    
    // Step 3: Process GFG submissions for this assignment
    if (gfgProblems.length > 0) {
        console.log('📝 Step 3: Processing GFG submissions for assignment...');
    const pendingSubmissions = await prisma.submission.findMany({
        where: {
            problem: {
                assignmentId: assignmentId,
            },
            completed: false,
        },
        include: { user: true, problem: true },
    });
        
        console.log(`Found ${pendingSubmissions.length} pending submissions for assignment ${assignmentId}`);
        await processGfgSubmissions(pendingSubmissions);
    } else {
        console.log('⏭️ No GFG problems in this assignment - skipping GFG processing');
    }
    
    console.log(`✅ Assignment "${assignment.title}" submission check completed`);
};