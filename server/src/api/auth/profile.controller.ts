import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { LeetCode } from 'leetcode-query';
import { Credential } from 'leetcode-query';
import { fetchAuthenticatedStats } from '../../services/enhanced-leetcode.service';
import { Judge0KeyManager } from '../../services/judge0-key-manager.service';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hackerrankUsername: true,
        gfgUsername: true,
        leetcodeUsername: true,
        leetcodeCookieStatus: true,
        leetcodeTotalSolved: true,
        leetcodeEasySolved: true,
        leetcodeMediumSolved: true,
        leetcodeHardSolved: true,
        judge0KeyStatus: true,
        judge0QuotaUsed: true,
        judge0LastReset: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;
  const { hackerrankUsername, gfgUsername, leetcodeUsername } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        hackerrankUsername,
        gfgUsername,
        leetcodeUsername,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

export const linkLeetCodeCredentials = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;
  const { leetcodeCookie } = req.body;

  if (!leetcodeCookie) {
    res.status(400).json({ message: 'LeetCode cookie is required' });
    return;
  }

  try {
    console.log('🔐 Attempting to validate LeetCode session cookie...');
    
    // Test the cookie by initializing credentials
    const credential = new Credential();
    await credential.init(leetcodeCookie);
    
    console.log('✅ LeetCode credential initialization successful');

    // Fetch LeetCode statistics using the authenticated API
    console.log('📊 Fetching LeetCode statistics...');
    let leetcodeStats = null;
    try {
      leetcodeStats = await fetchAuthenticatedStats(leetcodeCookie);
      console.log('✅ LeetCode statistics fetched successfully:', leetcodeStats);
    } catch (statsError: any) {
      console.warn('⚠️ Could not fetch LeetCode statistics, but cookie is valid:', statsError.message);
      // We'll still link the account even if stats fetching fails
    }

    // If successful, save the cookie and update status with stats
    const updateData: any = {
      leetcodeCookie,
      leetcodeCookieStatus: 'LINKED',
    };

    // Add statistics if we successfully fetched them
    if (leetcodeStats) {
      updateData.leetcodeTotalSolved = leetcodeStats.totalSolved;
      updateData.leetcodeEasySolved = leetcodeStats.easySolved;
      updateData.leetcodeMediumSolved = leetcodeStats.mediumSolved;
      updateData.leetcodeHardSolved = leetcodeStats.hardSolved;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hackerrankUsername: true,
        gfgUsername: true,
        leetcodeUsername: true,
        leetcodeCookieStatus: true,
        leetcodeTotalSolved: true,
        leetcodeEasySolved: true,
        leetcodeMediumSolved: true,
        leetcodeHardSolved: true,
        createdAt: true,
      },
    });

    console.log(`✅ Successfully linked LeetCode account for user ${updatedUser.email}`);
    if (leetcodeStats) {
      console.log(`📈 Stats populated: Total=${leetcodeStats.totalSolved}, Easy=${leetcodeStats.easySolved}, Medium=${leetcodeStats.mediumSolved}, Hard=${leetcodeStats.hardSolved}`);
    }

    res.status(200).json({ 
      message: leetcodeStats 
        ? `LeetCode account linked successfully! Found ${leetcodeStats.totalSolved} solved problems.`
        : 'LeetCode account linked successfully! Statistics will be synced shortly.',
      user: updatedUser
    });
    
  } catch (error: any) {
    console.error('❌ LeetCode credential validation error:', error);
    
    // Check if error is due to invalid session or API issues
    if (error.message && (
      error.message.includes('login') || 
      error.message.includes('authentication') || 
      error.message.includes('401') ||
      error.message.includes('unauthorized') ||
      error.message.includes('invalid') ||
      error.message.includes('expired')
    )) {
      res.status(400).json({ 
        message: 'Invalid or expired LeetCode session cookie. Please get a fresh cookie from your browser.' 
      });
    } else {
      res.status(500).json({ 
        message: 'Error validating LeetCode credentials. Please try again or contact support.', 
        error: error.message 
      });
    }
  }
};

/**
 * Add or update Judge0 API key for a student
 */
export const updateJudge0Key = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;
  const { apiKey, agreedToSharing = false } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({ 
      message: 'Valid Judge0 API key is required (minimum 10 characters)' 
    });
    return;
  }

  try {
    console.log(`🔑 Adding Judge0 API key for user ${userId}, sharing: ${agreedToSharing}`);

    // Validate the API key first
    const isValid = await Judge0KeyManager.validateKey(apiKey.trim());
    
    if (!isValid) {
      res.status(400).json({ 
        message: 'Invalid Judge0 API key. Please check your RapidAPI key and try again.' 
      });
      return;
    }

    // Add the key using the Judge0KeyManager
    await Judge0KeyManager.addKey(userId, apiKey.trim(), agreedToSharing);

    console.log(`✅ Judge0 API key successfully added for user ${userId}`);

    res.status(200).json({
      message: agreedToSharing 
        ? 'Judge0 API key added successfully and shared with class pool!'
        : 'Judge0 API key added successfully to your profile!',
      keyStatus: 'ACTIVE'
    });

  } catch (error: any) {
    console.error('❌ Error adding Judge0 API key:', error);
    
    if (error.message.includes('Invalid API key')) {
      res.status(400).json({ 
        message: 'Invalid Judge0 API key format. Please check your RapidAPI key.' 
      });
    } else {
      res.status(500).json({ 
        message: 'Error saving Judge0 API key. Please try again.', 
        error: error.message 
      });
    }
  }
};

/**
 * Remove Judge0 API key for a student
 */
export const removeJudge0Key = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;

  try {
    console.log(`🗑️ Removing Judge0 API key for user ${userId}`);

    // Remove from shared pool
    await (prisma as any).judge0KeyPool.deleteMany({
      where: { userId }
    });

    // Update user status
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        judge0ApiKey: null,
        judge0KeyStatus: 'NOT_PROVIDED',
        judge0QuotaUsed: 0,
        judge0LastReset: null
      }
    });

    console.log(`✅ Judge0 API key successfully removed for user ${userId}`);

    res.status(200).json({
      message: 'Judge0 API key removed successfully'
    });

  } catch (error: any) {
    console.error('❌ Error removing Judge0 API key:', error);
    res.status(500).json({ 
      message: 'Error removing Judge0 API key. Please try again.', 
      error: error.message 
    });
  }
};

/**
 * Get Judge0 key status and quota information
 */
export const getJudge0Status = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        judge0KeyStatus: true,
        judge0QuotaUsed: true,
        judge0LastReset: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if in shared pool
    const sharedKey = await (prisma as any).judge0KeyPool.findFirst({
      where: { userId },
      select: {
        status: true,
        dailyUsage: true,
        dailyLimit: true,
        lastUsed: true
      }
    });

    const isShared = !!sharedKey;
    
    res.status(200).json({
      hasKey: user.judge0KeyStatus !== 'NOT_PROVIDED',
      keyStatus: user.judge0KeyStatus,
      quotaUsed: user.judge0QuotaUsed || 0,
      lastReset: user.judge0LastReset,
      isSharedWithClass: isShared,
      sharedKeyInfo: sharedKey ? {
        status: sharedKey.status,
        dailyUsage: sharedKey.dailyUsage,
        dailyLimit: sharedKey.dailyLimit,
        lastUsed: sharedKey.lastUsed
      } : null
    });

  } catch (error: any) {
    console.error('❌ Error fetching Judge0 status:', error);
    res.status(500).json({ 
      message: 'Error fetching Judge0 key status', 
      error: error.message 
    });
  }
};

/**
 * Add or update Gemini API key for a teacher
 */
export const updateGeminiKey = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const { userId, role } = req.user;
  const { apiKey } = req.body;

  // Only teachers can add Gemini API keys
  if (role !== 'TEACHER') {
    res.status(403).json({ 
      message: 'Only teachers can manage Gemini API keys' 
    });
    return;
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 20) {
    res.status(400).json({ 
      message: 'Valid Gemini API key is required (minimum 20 characters)' 
    });
    return;
  }

  try {
    console.log(`🔑 Adding Gemini API key for teacher ${userId}`);

    // Validate the API key first
    const isValid = await validateGeminiKey(apiKey.trim());
    
    if (!isValid) {
      res.status(400).json({ 
        message: 'Invalid Gemini API key. Please check your Google AI Studio key and try again.' 
      });
      return;
    }

    // Encrypt and store the key
    const encryptedKey = await encryptGeminiKey(apiKey.trim());

    // Update user with encrypted key
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        geminiApiKey: encryptedKey,
        geminiKeyStatus: 'ACTIVE'
      }
    });

    console.log(`✅ Gemini API key successfully added for teacher ${userId}`);

    res.status(200).json({
      message: 'Gemini API key added successfully! You can now generate AI-powered test cases.',
      keyStatus: 'ACTIVE'
    });

  } catch (error: any) {
    console.error('❌ Error adding Gemini API key:', error);
    
    if (error.message.includes('Invalid API key')) {
      res.status(400).json({ 
        message: 'Invalid Gemini API key format. Please check your Google AI Studio key.' 
      });
    } else {
      res.status(500).json({ 
        message: 'Error saving Gemini API key. Please try again.', 
        error: error.message 
      });
    }
  }
};

/**
 * Remove Gemini API key for a teacher
 */
export const removeGeminiKey = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const { userId, role } = req.user;

  // Only teachers can remove Gemini API keys
  if (role !== 'TEACHER') {
    res.status(403).json({ 
      message: 'Only teachers can manage Gemini API keys' 
    });
    return;
  }

  try {
    console.log(`🗑️ Removing Gemini API key for teacher ${userId}`);

    // Update user status
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        geminiApiKey: null,
        geminiKeyStatus: 'NOT_PROVIDED'
      }
    });

    console.log(`✅ Gemini API key successfully removed for teacher ${userId}`);

    res.status(200).json({
      message: 'Gemini API key removed successfully'
    });

  } catch (error: any) {
    console.error('❌ Error removing Gemini API key:', error);
    res.status(500).json({ 
      message: 'Error removing Gemini API key. Please try again.', 
      error: error.message 
    });
  }
};

/**
 * Get Gemini key status for a teacher
 */
export const getGeminiStatus = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const { userId, role } = req.user;

  // Only teachers can check Gemini API key status
  if (role !== 'TEACHER') {
    res.status(403).json({ 
      message: 'Only teachers can check Gemini API key status' 
    });
    return;
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        geminiKeyStatus: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({
      hasKey: user.geminiKeyStatus !== 'NOT_PROVIDED',
      keyStatus: user.geminiKeyStatus || 'NOT_PROVIDED'
    });

  } catch (error: any) {
    console.error('❌ Error fetching Gemini status:', error);
    res.status(500).json({ 
      message: 'Error fetching Gemini key status', 
      error: error.message 
    });
  }
};

/**
 * Validate Gemini API key
 */
async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Test the API key with a simple request
    const result = await model.generateContent('Test');
    const response = await result.response;
    const text = response.text();
    
    return text && text.length > 0;
  } catch (error) {
    console.error('Gemini API key validation error:', error);
    return false;
  }
}

/**
 * Encrypt Gemini API key (using same encryption as Judge0)
 */
async function encryptGeminiKey(apiKey: string): Promise<string> {
  const crypto = require('crypto');
  const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
  
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  cipher.setAAD(Buffer.from('gemini-api-key'));
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export const linkHackerRankCredentials = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;
  const { hackerrankCookie } = req.body;

  if (!hackerrankCookie) {
    res.status(400).json({ message: 'HackerRank session cookie is required' });
    return;
  }

  try {
    console.log('🔐 Attempting to validate HackerRank session cookie...');
    
    // Test the cookie by trying to fetch submissions
    const { fetchHackerRankSubmissions } = await import('../../services/hackerrank.service');
    
    try {
      await fetchHackerRankSubmissions(hackerrankCookie, 1); // Just fetch 1 submission to test
      console.log('✅ HackerRank session cookie validation successful');
    } catch (error: any) {
      console.error('❌ HackerRank session cookie validation failed:', error.message);
      
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        res.status(400).json({ 
          message: 'Invalid or expired HackerRank session cookie. Please get a fresh cookie from your browser.' 
        });
        return;
      }
      
      throw error;
    }

    // If successful, save the cookie and update status
    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        hackerrankCookie,
        hackerrankCookieStatus: 'LINKED',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hackerrankUsername: true,
        hackerrankCookieStatus: true,
        gfgUsername: true,
        leetcodeUsername: true,
        leetcodeCookieStatus: true,
        leetcodeTotalSolved: true,
        leetcodeEasySolved: true,
        leetcodeMediumSolved: true,
        leetcodeHardSolved: true,
        createdAt: true,
      },
    });

    console.log(`✅ Successfully linked HackerRank account for user ${updatedUser.email}`);

    res.status(200).json({ 
      message: 'HackerRank account linked successfully! Submissions will be synced shortly.',
      user: updatedUser
    });
    
  } catch (error: any) {
    console.error('❌ HackerRank credential validation error:', error);
    
    res.status(500).json({ 
      message: 'Error validating HackerRank credentials. Please try again or contact support.', 
      error: error.message 
    });
  }
};