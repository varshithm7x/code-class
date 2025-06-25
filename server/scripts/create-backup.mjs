import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toCamelCase = (str) => {
  if (!str) return '';
  return str.charAt(0).toLowerCase() + str.slice(1);
};

// Dynamically get model names from Prisma's DMMF and convert to camelCase
const modelNames = Prisma.dmmf.datamodel.models.map(m => toCamelCase(m.name));

async function createBackup() {
  console.log('Starting database backup...');

  try {
    const backupData = {};
    
    for (const model of modelNames) {
      if (typeof prisma[model]?.findMany !== 'function') {
        console.warn(`- Skipping model: ${model} (does not have a findMany method)`);
        continue;
      }
      console.log(`- Backing up model: ${model}`);
      const records = await prisma[model].findMany();
      backupData[model] = records;
    }

    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    console.log(`\n✅ Backup successful!`);
    console.log(`   File created at: ${backupFile}`);
    
    const backedUpModels = Object.keys(backupData);
    console.log(`   Models backed up (${backedUpModels.length}): ${backedUpModels.join(', ')}`);

  } catch (error) {
    console.error('\n❌ Backup failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBackup(); 