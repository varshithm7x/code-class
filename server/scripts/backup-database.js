const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupDatabase() {
  try {
    console.log('🔄 Starting database backup...');
    
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      data: {}
    };

    // Backup all tables in dependency order (to avoid foreign key issues during restore)
    const tables = [
      'User',
      'Class', 
      'UsersOnClasses',
      'Assignment',
      'Problem',
      'Submission',
      'Announcement',
      'CodingTest',
      'TestProblem',
      'TestSession',
      'TestSubmission',
      'TestPenalty',
      'Judge0KeyPool'
    ];

    for (const table of tables) {
      console.log(`📋 Backing up ${table}...`);
      
      try {
        const modelName = table.charAt(0).toLowerCase() + table.slice(1);
        const data = await prisma[modelName].findMany();
        backup.data[table] = data;
        console.log(`✅ ${table}: ${data.length} records`);
      } catch (error) {
        console.error(`❌ Error backing up ${table}:`, error.message);
        backup.data[table] = [];
      }
    }

    // Save backup to file
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filename = `database-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    console.log(`💾 Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${filepath}`);
    
    // Generate summary
    const totalRecords = Object.values(backup.data).reduce((sum, records) => sum + records.length, 0);
    console.log(`📊 Total records backed up: ${totalRecords}`);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  backupDatabase()
    .then((filepath) => {
      console.log('🎉 Backup process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backup process failed:', error);
      process.exit(1);
    });
}

module.exports = { backupDatabase }; 