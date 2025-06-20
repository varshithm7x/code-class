import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'pretty',
}).$extends(withAccelerate());

// Handle connection errors gracefully
prisma.$connect().catch((error) => {
  console.error('❌ Database connection failed:', error.message);
  console.log('⚠️  Server will continue without database functionality');
});

export default prisma; 