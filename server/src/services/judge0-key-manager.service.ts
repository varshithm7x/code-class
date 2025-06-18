import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any; // Temporary type assertion to fix generated client issues

interface Judge0KeyInfo {
  id: string;
  encryptedKey: string;
  userId: string;
  dailyUsage: number;
  dailyLimit: number;
}

export class Judge0KeyManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;

  /**
   * Get or create a 32-byte encryption key
   */
  private static getEncryptionKey(): Buffer {
    const keyString = process.env.JUDGE0_ENCRYPTION_KEY || 'default-key-change-in-production';
    // Create a 32-byte key from the string using SHA-256
    return crypto.createHash('sha256').update(keyString).digest();
  }

  /**
   * Encrypt a Judge0 API key
   */
  static encrypt(key: string): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const encryptionKey = this.getEncryptionKey();
      const cipher = crypto.createCipheriv(this.ALGORITHM, encryptionKey, iv);
      
      let encrypted = cipher.update(key, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, authTag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt a Judge0 API key
   */
  static decrypt(encryptedKey: string): string {
    try {
      const parts = encryptedKey.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted key format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const encryptionKey = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Add a new Judge0 API key to the pool
   */
  static async addKey(userId: string, apiKey: string, agreedToSharing: boolean = false): Promise<void> {
    try {
      // Validate the API key format (basic check)
      if (!apiKey || apiKey.length < 10) {
        throw new Error('Invalid API key format');
      }

      const encryptedKey = this.encrypt(apiKey);

      // First, update the user's personal key
      await prisma.user.update({
        where: { id: userId },
        data: {
          judge0ApiKey: encryptedKey,
          judge0KeyStatus: 'ACTIVE',
          judge0QuotaUsed: 0,
          judge0LastReset: new Date()
        }
      });

      // If agreed to sharing, also add to the shared pool
      if (agreedToSharing) {
        await prisma.judge0KeyPool.upsert({
          where: { userId },
          update: {
            encryptedKey,
            status: 'ACTIVE',
            dailyUsage: 0,
            lastReset: new Date()
          },
          create: {
            userId,
            encryptedKey,
            status: 'ACTIVE',
            dailyUsage: 0,
            dailyLimit: 50, // Free tier limit
            lastReset: new Date()
          }
        });
      }

      console.log(`Judge0 API key added for user ${userId}, sharing: ${agreedToSharing}`);
    } catch (error) {
      console.error('Error adding Judge0 key:', error);
      throw error;
    }
  }

  /**
   * Get an available API key from the pool
   */
  static async getAvailableKey(): Promise<{ key: string; keyInfo: Judge0KeyInfo } | null> {
    try {
      // Reset daily quotas if needed
      await this.resetDailyQuotas();

      // Find available keys in the pool (least used first)
      const availableKeys = await prisma.judge0KeyPool.findMany({
        where: {
          status: 'ACTIVE',
          dailyUsage: { lt: 45 } // Keep 5 requests buffer
        },
        orderBy: { dailyUsage: 'asc' },
        take: 1
      });

      if (availableKeys.length === 0) {
        console.warn('No available Judge0 keys in pool');
        return null;
      }

      const keyInfo = availableKeys[0];
      const decryptedKey = this.decrypt(keyInfo.encryptedKey);

      return {
        key: decryptedKey,
        keyInfo: {
          id: keyInfo.id,
          encryptedKey: keyInfo.encryptedKey,
          userId: keyInfo.userId,
          dailyUsage: keyInfo.dailyUsage,
          dailyLimit: keyInfo.dailyLimit
        }
      };
    } catch (error) {
      console.error('Error getting available key:', error);
      return null;
    }
  }

  /**
   * Track API key usage
   */
  static async trackKeyUsage(keyId: string): Promise<void> {
    try {
      await prisma.judge0KeyPool.update({
        where: { id: keyId },
        data: {
          dailyUsage: { increment: 1 },
          lastUsed: new Date()
        }
      });
    } catch (error) {
      console.error('Error tracking key usage:', error);
    }
  }

  /**
   * Mark a key as exhausted
   */
  static async markKeyExhausted(keyId: string): Promise<void> {
    try {
      await prisma.judge0KeyPool.update({
        where: { id: keyId },
        data: { status: 'EXHAUSTED' }
      });
      console.log(`Judge0 key ${keyId} marked as exhausted`);
    } catch (error) {
      console.error('Error marking key as exhausted:', error);
    }
  }

  /**
   * Reset daily quotas for all keys
   */
  static async resetDailyQuotas(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reset keys that haven't been reset today
      const result = await prisma.judge0KeyPool.updateMany({
        where: {
          lastReset: { lt: today }
        },
        data: {
          dailyUsage: 0,
          status: 'ACTIVE',
          lastReset: new Date()
        }
      });

      if (result.count > 0) {
        console.log(`Reset daily quotas for ${result.count} Judge0 keys`);
      }
    } catch (error) {
      console.error('Error resetting daily quotas:', error);
    }
  }

  /**
   * Get pool statistics
   */
  static async getPoolStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    exhaustedKeys: number;
    totalDailyUsage: number;
    totalDailyLimit: number;
  }> {
    try {
      const stats = await prisma.judge0KeyPool.aggregate({
        _count: { id: true },
        _sum: { dailyUsage: true, dailyLimit: true }
      });

      const statusCounts = await prisma.judge0KeyPool.groupBy({
        by: ['status'],
        _count: { id: true }
      });

      const activeKeys = statusCounts.find((s: any) => s.status === 'ACTIVE')?._count?.id || 0;
      const exhaustedKeys = statusCounts.find((s: any) => s.status === 'EXHAUSTED')?._count?.id || 0;

      return {
        totalKeys: stats._count.id || 0,
        activeKeys,
        exhaustedKeys,
        totalDailyUsage: stats._sum.dailyUsage || 0,
        totalDailyLimit: stats._sum.dailyLimit || 0
      };
    } catch (error) {
      console.error('Error getting pool stats:', error);
      return {
        totalKeys: 0,
        activeKeys: 0,
        exhaustedKeys: 0,
        totalDailyUsage: 0,
        totalDailyLimit: 0
      };
    }
  }

  /**
   * Validate an API key by making a test request
   */
  static async validateKey(apiKey: string): Promise<boolean> {
    try {
      // Make a simple test request to Judge0 API
      const response = await fetch('https://judge0-ce.p.rapidapi.com/languages', {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }
} 