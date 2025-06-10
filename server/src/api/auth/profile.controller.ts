import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { LeetCode } from 'leetcode-query';
import { Credential } from 'leetcode-query';
import { fetchAuthenticatedStats } from '../../services/enhanced-leetcode.service';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
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