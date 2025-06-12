import fs from 'fs/promises';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'public/data');
const outputDir = path.resolve(process.cwd(), 'src/lib');
const outputFile = path.join(outputDir, 'questions.json');

// This is the parsing logic from your csvParser.ts, adapted for a script
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] === ',')) {
      inQuotes = true;
    } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const parseCSVData = (csvContent, companyName) => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 8) {
      const topics = fields[7]
        .replace(/^"/, '')
        .replace(/"$/, '')
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic && topic !== 'No Topics Found');
      questions.push({
        id: parseInt(fields[0]) || 0,
        title: fields[1] || '',
        url: fields[2] || '',
        isPremium: fields[3] === 'Y',
        acceptance: fields[4] || '',
        difficulty: fields[5] || 'Easy',
        frequency: fields[6] || '',
        topics,
        company: companyName,
      });
    }
  }
  return questions;
};


async function prepareData() {
  try {
    console.log('🚀 Starting data preparation...');
    const files = await fs.readdir(dataDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    console.log(`🔍 Found ${csvFiles.length} CSV files.`);

    let allCompanyData = [];

    for (const file of csvFiles) {
      const companySlug = path.basename(file, '.csv');
      const formattedCompanyName = companySlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const filePath = path.join(dataDir, file);
      const csvContent = await fs.readFile(filePath, 'utf-8');
      const questions = parseCSVData(csvContent, formattedCompanyName);

      if (questions.length > 0) {
        allCompanyData.push({
          name: formattedCompanyName,
          questions: questions,
        });
      }
    }
    
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Write to a single JSON file
    await fs.writeFile(outputFile, JSON.stringify(allCompanyData, null, 2));
    
    console.log(`✅ Successfully prepared data and saved to ${outputFile}`);
    console.log(`📊 Processed data for ${allCompanyData.length} companies.`);

  } catch (error) {
    console.error('❌ Error during data preparation:', error);
    process.exit(1);
  }
}

prepareData(); 