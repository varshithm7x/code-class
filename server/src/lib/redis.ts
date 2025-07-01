import { Redis } from 'ioredis';

let redisClient: Redis;

if (process.env.REDIS_URL) {
  console.log(`Connecting to Redis via URL`);
  
  // If we have a separate password, include it in the connection options
  const connectionOptions: {
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    retryStrategy: (times: number) => number;
    password?: string;
  } = {
    maxRetriesPerRequest: 20, // Reconnect retries
    enableReadyCheck: true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000); // 2s max backoff
      return delay;
    },
  };

  // Add password if provided separately
  if (process.env.REDIS_PASSWORD) {
    connectionOptions.password = process.env.REDIS_PASSWORD;
  }

  redisClient = new Redis(process.env.REDIS_URL, connectionOptions);
} else {
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  console.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: 20, // Reconnect retries
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000); // 2s max backoff
      return delay;
    },
  });
}

redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client connection error:', err);
});

export default redisClient; 