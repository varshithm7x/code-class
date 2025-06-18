const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Setting up Milestone 1: Core Infrastructure');
console.log('=====================================');

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n⏳ ${description}...`);
    
    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      
      if (stdout) {
        console.log(stdout);
      }
      
      console.log(`✅ ${description} completed`);
      resolve(stdout);
    });
  });
}

async function setup() {
  try {
    // 1. Generate Prisma client with new models
    await runCommand(
      'npx prisma generate',
      'Generating Prisma client with new models'
    );

    // 2. Push schema changes to database (dev only)
    await runCommand(
      'npx prisma db push',
      'Pushing schema changes to database'
    );

    console.log('\n🎉 Milestone 1 setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test Judge0 API key endpoints');
    console.log('3. Test WebSocket connections');

  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  }
}

setup(); 