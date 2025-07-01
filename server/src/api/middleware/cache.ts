import { Request, Response, NextFunction } from 'express';
import redisClient from '../../lib/redis';

const CACHE_EXPIRATION_SECONDS = 900; // 15 minutes

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.originalUrl && !req.url) {
    // Cannot determine a cache key, so skip caching
    return next();
  }
  const key = `__express__${req.originalUrl || req.url}`;
  
  redisClient.get(key, (err, data) => {
    if (err) {
      console.error('Redis get error:', err);
      return next(); // On error, proceed without cache
    }

    if (data !== null) {
      console.log(`✅ Cache HIT for ${key}`);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).send(data);
    } else {
      console.log(`❌ Cache MISS for ${key}`);
      res.setHeader('X-Cache', 'MISS');
      const originalSend = res.send;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.send = (body: any): Response => {
        // Only cache successful JSON responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                // Ensure what we are caching is valid JSON
                const jsonData = JSON.parse(body);
                redisClient.setex(key, CACHE_EXPIRATION_SECONDS, JSON.stringify(jsonData), (err) => {
                    if (err) {
                        console.error('Redis setex error:', err);
                    } else {
                        console.log(`✅ Cached successfully for ${key}`);
                    }
                });
            } catch (e) {
                console.warn(`Could not cache response for ${key}. Body was not valid JSON.`);
            }
        }
        return originalSend.call(res, body);
      };
      next();
    }
  });
}; 