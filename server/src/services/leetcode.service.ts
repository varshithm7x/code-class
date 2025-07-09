import axios from 'axios';
import { LeetCodeGraphQLResponse, LeetCodeQuestionData } from '../types/index.js';

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

const getProblemSlugFromUrl = (url: string): string => {
    try {
        const urlObject = new URL(url);
        const pathParts = urlObject.pathname.split('/problems/');
        if (pathParts.length > 1) {
            // Extracts 'two-sum' from '/problems/two-sum/description/' or '/problems/two-sum/'
            return pathParts[1].split('/')[0];
        }
        return '';
    } catch (e) {
        console.error(`Invalid LeetCode URL passed to slug extractor: ${url}`, e);
        return '';
    }
}

/**
 * Fetches the canonical problem details from LeetCode using its URL.
 * @param url The full URL of the LeetCode problem.
 * @returns An object with the official title and difficulty, or null if not found.
 */
export const getLeetCodeProblemDetails = async (url: string): Promise<{ title: string; difficulty: string; } | null> => {
    const slug = getProblemSlugFromUrl(url);
    if (!slug) {
        console.error(`Could not extract a valid slug from LeetCode URL: ${url}`);
        return null;
    };

    const query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            difficulty
            titleSlug
          }
        }
    `;

    try {
        const response = await axios.post<LeetCodeGraphQLResponse<LeetCodeQuestionData>>(LEETCODE_API_ENDPOINT, {
            query,
            variables: { titleSlug: slug }
        });

        const question = response.data?.data?.question;
        if (!question) {
            console.error(`Could not fetch details for LeetCode slug: ${slug}. API response did not contain question data.`);
            return null;
        }

        console.log(`Successfully fetched details for LeetCode problem '${question.title}'`);
        return {
            title: question.title,
            difficulty: question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1).toLowerCase(), // Capitalize difficulty
        };
    } catch (error: unknown) {
        const axiosError = error as { response?: { status: number; data: unknown }; message?: string };
        console.error(`API Error fetching LeetCode details for slug '${slug}'. Status: ${axiosError.response?.status}`, axiosError.response?.data || axiosError.message);
        return null;
    }
} 