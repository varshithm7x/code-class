const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function migrateToSupabase(backupPath, newDatabaseUrl) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    throw new Error('Backup file not found. Please provide a valid backup file path.');
  }

  if (!newDatabaseUrl) {
    throw new Error('New database URL is required. Please provide your Supabase connection string.');
  }

  // Initialize Prisma with new Supabase URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: newDatabaseUrl
      }
    }
  });

  try {
    console.log('🔄 Starting migration to Supabase...');
    
    // Load backup data
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📁 Loading backup from: ${backupPath}`);
    console.log(`📅 Backup timestamp: ${backup.metadata.timestamp}`);

    // Test connection to Supabase
    await prisma.$connect();
    console.log('✅ Connected to Supabase database');

    // Clear existing data (optional - uncomment if you want to start fresh)
    // console.log('🧹 Clearing existing data...');
    // await clearDatabase(prisma);

    // Restore data in dependency order
    const restoreOrder = [
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

    let totalRestored = 0;

    for (const table of restoreOrder) {
      const data = backup.data[table] || [];
      
      if (data.length === 0) {
        console.log(`⚠️  ${table}: No data to restore`);
        continue;
      }

      console.log(`📥 Restoring ${table} (${data.length} records)...`);
      
      try {
        const modelName = table.charAt(0).toLowerCase() + table.slice(1);
        
        // Use createMany for better performance
        if (data.length > 0) {
          await prisma[modelName].createMany({
            data: data,
            skipDuplicates: true // Skip if IDs already exist
          });
          console.log(`✅ ${table}: ${data.length} records restored`);
          totalRestored += data.length;
        }
      } catch (error) {
        console.error(`❌ Error restoring ${table}:`, error.message);
        
        // Try individual inserts if batch fails
        console.log(`🔄 Attempting individual inserts for ${table}...`);
        let individualSuccess = 0;
        
        for (const record of data) {
          try {
            await prisma[modelName].upsert({
              where: { id: record.id },
              update: record,
              create: record
            });
            individualSuccess++;
          } catch (individualError) {
            console.error(`❌ Failed to restore record ${record.id} in ${table}:`, individualError.message);
          }
        }
        
        console.log(`✅ ${table}: ${individualSuccess} records restored individually`);
        totalRestored += individualSuccess;
      }
    }

    console.log(`🎉 Migration completed successfully!`);
    console.log(`📊 Total records migrated: ${totalRestored}`);
    
    // Verify migration
    await verifyMigration(prisma, backup);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyMigration(prisma, backup) {
  console.log('🔍 Verifying migration...');
  
  const tables = [
    'user', 'class', 'usersOnClasses', 'assignment', 'problem', 
    'submission', 'announcement', 'codingTest', 'testProblem',
    'testSession', 'testSubmission', 'testPenalty', 'judge0KeyPool'
  ];

  for (const table of tables) {
    try {
      const count = await prisma[table].count();
      const originalCount = backup.data[table.charAt(0).toUpperCase() + table.slice(1)]?.length || 0;
      
      if (count === originalCount) {
        console.log(`✅ ${table}: ${count}/${originalCount} records verified`);
      } else {
        console.log(`⚠️  ${table}: ${count}/${originalCount} records (mismatch)`);
      }
    } catch (error) {
      console.log(`❌ ${table}: Verification failed - ${error.message}`);
    }
  }
}

async function clearDatabase(prisma) {
  const tables = [
    'testPenalty', 'testSubmission', 'testSession', 'testProblem', 'codingTest',
    'announcement', 'submission', 'problem', 'assignment', 'usersOnClasses',
    'judge0KeyPool', 'class', 'user'
  ];

  for (const table of tables) {
    try {
      await prisma[table].deleteMany({});
      console.log(`🧹 Cleared ${table}`);
    } catch (error) {
      console.log(`⚠️  Could not clear ${table}: ${error.message}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const backupPath = process.argv[2];
  const newDatabaseUrl = process.argv[3];

  if (!backupPath || !newDatabaseUrl) {
    console.log('Usage: node migrate-to-supabase.js <backup-file-path> <supabase-database-url>');
    console.log('Example: node migrate-to-supabase.js ./backups/database-backup-2024-01-01.json "postgresql://postgres:password@db.project.supabase.co:5432/postgres"');
    process.exit(1);
  }

  migrateToSupabase(backupPath, newDatabaseUrl)
    .then(() => {
      console.log('🎉 Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToSupabase }; 