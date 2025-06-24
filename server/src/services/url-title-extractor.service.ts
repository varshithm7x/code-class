import axios from 'axios';
import { getLeetCodeProblemDetails } from './leetcode.service';

interface ProblemDetails {
  title: string;
  difficulty?: string;
  platform: string;
}

/**
 * Extract problem slug from GeeksforGeeks URL
 */
const extractGfgSlug = (url: string): string | null => {
  try {
    const match = url.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Extract problem slug from HackerRank URL
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
 * Extract problem slug from CodeForces URL
 */
const extractCodeforcesSlug = (url: string): string | null => {
  try {
    const match = url.match(/\/problemset\/problem\/(\d+)\/([A-Z])/);
    if (match) {
      return `${match[1]}${match[2]}`;
    }
    const contestMatch = url.match(/\/contest\/(\d+)\/problem\/([A-Z])/);
    if (contestMatch) {
      return `Contest ${contestMatch[1]} - Problem ${contestMatch[2]}`;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Detect the platform from URL
 */
const detectPlatform = (url: string): string => {
  if (url.includes('leetcode.com')) return 'leetcode';
  if (url.includes('hackerrank.com')) return 'hackerrank';
  if (url.includes('geeksforgeeks.org')) return 'gfg';
  if (url.includes('codeforces.com')) return 'codeforces';
  if (url.includes('codechef.com')) return 'codechef';
  if (url.includes('atcoder.jp')) return 'atcoder';
  return 'other';
};

/**
 * Extract title and difficulty from GeeksforGeeks problem page
 */
const getGfgProblemTitle = async (url: string): Promise<{ title: string; difficulty?: string } | null> => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = response.data as string;
    
    // Try multiple selectors for GFG title - updated patterns
    const titleSelectors = [
      // Modern GFG structure
      /<h1[^>]*class="[^"]*problem[^"]*title[^"]*"[^>]*>(.*?)<\/h1>/i,
      /<h1[^>]*class="[^"]*header[^"]*"[^>]*>(.*?)<\/h1>/i,
      /<div[^>]*class="[^"]*problem[^"]*header[^"]*"[^>]*>[\s\S]*?<h1[^>]*>(.*?)<\/h1>/i,
      // Fallback patterns
      /<h1[^>]*>(.*?)<\/h1>/i,
      /<title>(.*?)\s*\|\s*GeeksforGeeks<\/title>/i,
      /<title>(.*?)\s*-\s*GeeksforGeeks<\/title>/i,
      /<title>(.*?)\s*\|\s*Practice\s*\|\s*GeeksforGeeks<\/title>/i,
    ];
    
    let title = null;
    for (const selector of titleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const extractedTitle = match[1].replace(/<[^>]+>/g, '').trim();
        // Filter out generic titles
        if (extractedTitle && 
            !extractedTitle.toLowerCase().includes('geeksforgeeks') && 
            !extractedTitle.toLowerCase().includes('practice') &&
            extractedTitle.length > 2) {
          title = extractedTitle;
          break;
        }
      }
    }

    // If title extraction fails, try to extract from URL
    if (!title) {
      const urlMatch = url.match(/\/problems\/([^/]+)/);
      if (urlMatch && urlMatch[1]) {
        // Convert kebab-case to title case
        title = urlMatch[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize each word
          .trim();
        
        console.log(`GFG Fallback: Extracted title from URL: "${title}"`); // Debug log
      }
    }

    // Special handling for common GeeksforGeeks problem patterns
    if (!title && url.includes('/problems/')) {
      // Extract the slug and convert to readable title
      const pathParts = url.split('/');
      const problemIndex = pathParts.indexOf('problems');
      if (problemIndex !== -1 && pathParts[problemIndex + 1]) {
        const slug = pathParts[problemIndex + 1];
        title = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`GFG Special handling: Extracted title from path: "${title}"`); // Debug log
      }
    }

    // Extract difficulty from GFG - updated patterns
    let difficulty = null;
    const difficultySelectors = [
      // Modern GFG patterns
      /<span[^>]*class="[^"]*difficulty[^"]*"[^>]*>[\s]*([^<]*)</i,
      /<div[^>]*class="[^"]*difficulty[^"]*"[^>]*>[\s\S]*?<span[^>]*>[\s]*([^<]*)</i,
      /<span[^>]*class="[^"]*level[^"]*"[^>]*>[\s]*([^<]*)</i,
      // Text-based patterns
      /difficulty[\s]*:[\s]*([^<\n]*(?:easy|medium|hard|basic|school)[^<\n]*)/i,
      /level[\s]*:[\s]*([^<\n]*(?:easy|medium|hard|basic|school)[^<\n]*)/i,
      // Badge patterns
      /<span[^>]*>[\s]*(Easy|Medium|Hard|Basic|School)[\s]*<\/span>/i,
      /<div[^>]*>[\s]*(Easy|Medium|Hard|Basic|School)[\s]*<\/div>/i,
      // Generic patterns
      /\b(Easy|Medium|Hard|Basic|School)\b/i
    ];

    for (const selector of difficultySelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const diffText = match[1].trim().toLowerCase();
        console.log(`GFG Difficulty match found: "${diffText}"`); // Debug log
        
        if (diffText.includes('easy') || diffText.includes('basic') || diffText.includes('school')) {
          difficulty = 'Easy';
        } else if (diffText.includes('medium')) {
          difficulty = 'Medium';
        } else if (diffText.includes('hard')) {
          difficulty = 'Hard';
        }
        if (difficulty) {
          console.log(`GFG Difficulty mapped to: ${difficulty}`); // Debug log
          break;
        }
      }
    }

    console.log(`GFG Extraction result - Title: "${title}", Difficulty: "${difficulty}"`); // Debug log

    if (title) {
      return { title, difficulty: difficulty || undefined };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching GFG problem title:', error);
    return null;
  }
};

/**
 * Extract title and difficulty from HackerRank problem page
 */
const getHackerRankProblemTitle = async (url: string): Promise<{ title: string; difficulty?: string } | null> => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data as string;
    
    // Try multiple selectors for HackerRank title
    const titleSelectors = [
      /<h1[^>]*class="[^"]*challenge[^"]*title[^"]*"[^>]*>(.*?)<\/h1>/i,
      /<h1[^>]*>(.*?)<\/h1>/i,
      /<title>(.*?)\s*\|\s*HackerRank<\/title>/i,
      /<title>(.*?)\s*-\s*HackerRank<\/title>/i
    ];
    
    let title = null;
    for (const selector of titleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        title = match[1].replace(/<[^>]+>/g, '').trim();
        break;
      }
    }

    // Extract difficulty from HackerRank
    let difficulty = null;
    const difficultySelectors = [
      /difficulty[^>]*>[\s]*([^<]*(?:easy|medium|hard)[^<]*)/i,
      /class="[^"]*difficulty[^"]*"[^>]*>[\s]*([^<]*)/i,
      /<span[^>]*>[\s]*(Easy|Medium|Hard)[\s]*<\/span>/i,
      /Difficulty:[\s]*([^<\n]*(?:easy|medium|hard)[^<\n]*)/i
    ];

    for (const selector of difficultySelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const diffText = match[1].trim().toLowerCase();
        if (diffText.includes('easy')) {
          difficulty = 'Easy';
        } else if (diffText.includes('medium')) {
          difficulty = 'Medium';
        } else if (diffText.includes('hard')) {
          difficulty = 'Hard';
        }
        if (difficulty) break;
      }
    }

    if (title) {
      return { title, difficulty: difficulty || undefined };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching HackerRank problem title:', error);
    return null;
  }
};

/**
 * Extract title and difficulty from CodeForces problem page
 */
const getCodeforcesProblemTitle = async (url: string): Promise<{ title: string; difficulty?: string } | null> => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data as string;
    
    // Try multiple selectors for CodeForces title
    const titleSelectors = [
      /<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/i,
      /<h1[^>]*>(.*?)<\/h1>/i,
      /<title>(.*?)\s*-\s*Codeforces<\/title>/i
    ];
    
    let title = null;
    for (const selector of titleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        title = match[1].replace(/<[^>]+>/g, '').trim();
        break;
      }
    }

    // Extract difficulty/rating from CodeForces
    let difficulty = null;
    const difficultySelectors = [
      /\*(\d{3,4})\*/g, // CodeForces uses *rating* format like *1200*, *1500*
      /rating[^>]*>[\s]*(\d{3,4})/i,
      /difficulty[^>]*>[\s]*(\d{3,4})/i
    ];

    for (const selector of difficultySelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const rating = parseInt(match[1]);
        if (rating <= 1200) {
          difficulty = 'Easy';
        } else if (rating <= 1600) {
          difficulty = 'Medium';
        } else {
          difficulty = 'Hard';
        }
        if (difficulty) break;
      }
    }

    if (title) {
      return { title, difficulty: difficulty || undefined };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching CodeForces problem title:', error);
    return null;
  }
};

/**
 * Extract title from generic webpage
 */
const getGenericPageTitle = async (url: string): Promise<{ title: string; difficulty?: string } | null> => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data as string;
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      return { title };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching generic page title:', error);
    return null;
  }
};

/**
 * Main function to extract problem details from URL
 */
export const extractProblemDetailsFromUrl = async (url: string): Promise<ProblemDetails | null> => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const platform = detectPlatform(url);
  
  try {
    switch (platform) {
      case 'leetcode': {
        const leetcodeDetails = await getLeetCodeProblemDetails(url);
        if (leetcodeDetails) {
          return {
            title: leetcodeDetails.title,
            difficulty: leetcodeDetails.difficulty,
            platform: 'leetcode'
          };
        }
        break;
      }
      
      case 'gfg': {
        const result = await getGfgProblemTitle(url);
        if (result) {
          return {
            title: result.title,
            difficulty: result.difficulty,
            platform: 'gfg'
          };
        }
        break;
      }
      
      case 'hackerrank': {
        const result = await getHackerRankProblemTitle(url);
        if (result) {
          return {
            title: result.title,
            difficulty: result.difficulty,
            platform: 'hackerrank'
          };
        }
        break;
      }
      
      case 'codeforces': {
        const result = await getCodeforcesProblemTitle(url);
        if (result) {
          return {
            title: result.title,
            difficulty: result.difficulty,
            platform: 'codeforces'
          };
        }
        break;
      }
      
      default: {
        // For unknown platforms, try to get the page title
        const result = await getGenericPageTitle(url);
        if (result) {
          return {
            title: result.title,
            platform: 'other'
          };
        }
        break;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting problem details from URL:', url, error);
    return null;
  }
};

/**
 * Extract just the title from URL (simpler version)
 */
export const extractTitleFromUrl = async (url: string): Promise<string | null> => {
  const details = await extractProblemDetailsFromUrl(url);
  return details ? details.title : null;
}; 