import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create or update test user
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      },
      create: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      },
    });
    
    console.log('✅ Test user created/updated:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: password123`);
    console.log(`  Role: ${user.role}`);
    
    // Also try to find an existing user for testing
    const existingUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });
    
    if (existingUser) {
      console.log('\n🔍 Found existing user for testing:');
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Name: ${existingUser.name}`);
      console.log('  Try using "password123" or "password" as the password');
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 