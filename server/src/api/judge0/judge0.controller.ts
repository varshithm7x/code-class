import { Request, Response } from 'express';
import { Judge0KeyManager } from '../../services/judge0-key-manager.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any; // Temporary type assertion to fix generated client issues

/**
 * Add Judge0 API key for a user
 */
export const addApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey, agreedToSharing = false } = req.body;
    // @ts-ignore
    const { userId } = req.user;

    if (!apiKey) {
      res.status(400).json({ message: 'API key is required' });
      return;
    }

    // Validate the API key first
    const isValid = await Judge0KeyManager.validateKey(apiKey);
    if (!isValid) {
      res.status(400).json({ message: 'Invalid API key. Please check your key and try again.' });
      return;
    }

    await Judge0KeyManager.addKey(userId, apiKey, agreedToSharing);

    res.status(200).json({
      message: 'API key added successfully',
      sharedWithPool: agreedToSharing
    });
  } catch (error: any) {
    console.error('Error adding API key:', error);
    res.status(500).json({
      message: 'Failed to add API key',
      error: error.message
    });
  }
};

/**
 * Validate Judge0 API key
 */
export const validateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      res.status(400).json({ message: 'API key is required' });
      return;
    }

    const isValid = await Judge0KeyManager.validateKey(apiKey);

    res.status(200).json({
      valid: isValid,
      message: isValid ? 'API key is valid' : 'API key is invalid'
    });
  } catch (error: any) {
    console.error('Error validating API key:', error);
    res.status(500).json({
      message: 'Failed to validate API key',
      error: error.message
    });
  }
};

/**
 * Remove Judge0 API key for a user
 */
export const removeApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    // Remove from user profile and shared pool
    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: {
          judge0ApiKey: null,
          judge0KeyStatus: 'NOT_PROVIDED',
          judge0QuotaUsed: 0,
          judge0LastReset: null
        }
      }),
      prisma.judge0KeyPool.deleteMany({
        where: { userId }
      })
    ]);

    res.status(200).json({
      message: 'API key removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing API key:', error);
    res.status(500).json({
      message: 'Failed to remove API key',
      error: error.message
    });
  }
};

/**
 * Get Judge0 key pool statistics (Teacher only)
 */
export const getPoolStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Judge0KeyManager.getPoolStats();

    res.status(200).json({
      stats,
      message: 'Pool statistics retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting pool stats:', error);
    res.status(500).json({
      message: 'Failed to get pool statistics',
      error: error.message
    });
  }
}; 