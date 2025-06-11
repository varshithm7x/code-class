import { PracticeQuestion, CompanyData } from '../types';

export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
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

export const parseCSVData = (csvContent: string, companyName: string): PracticeQuestion[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const questions: PracticeQuestion[] = [];
  
  // Skip header row
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
        difficulty: (fields[5] as 'Easy' | 'Medium' | 'Hard') || 'Easy',
        frequency: fields[6] || '',
        topics,
        company: companyName
      });
    }
  }
  
  return questions;
};

// List of all company CSV files (you can expand this list)
export const COMPANY_FILES = [
  'accenture', 'amazon', 'apple', 'facebook', 'google', 'microsoft', 'netflix', 'uber', 'airbnb',
  'adobe', 'linkedin', 'twitter', 'salesforce', 'oracle', 'samsung', 'tesla', 'spotify', 'twilio',
  'dropbox', 'snapchat', 'pinterest', 'reddit', 'zoom', 'slack', 'stripe', 'square', 'coinbase',
  'robinhood', 'doordash', 'lyft', 'paypal', 'visa', 'mastercard', 'goldman-sachs', 'jpmorgan',
  'morgan-stanley', 'blackrock', 'two-sigma', 'citadel', 'jane-street', 'bloomberg', 'databricks',
  'snowflake', 'palantir', 'unity', 'roblox', 'nvidia', 'intel', 'amd', 'qualcomm', 'broadcom'
];

export const loadCompanyData = async (companyName: string): Promise<PracticeQuestion[]> => {
  try {
    const response = await fetch(`/data/${companyName}.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load ${companyName} data`);
    }
    const csvContent = await response.text();
    return parseCSVData(csvContent, companyName);
  } catch (error) {
    console.error(`Error loading ${companyName} data:`, error);
    return [];
  }
};

export const loadAllCompanyData = async (): Promise<CompanyData[]> => {
  const companyDataPromises = COMPANY_FILES.map(async (company) => {
    const questions = await loadCompanyData(company);
    const formattedCompanyName = company.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    const questionsWithFormattedCompany = questions.map(q => ({
      ...q,
      company: formattedCompanyName,
    }));

    return {
      name: formattedCompanyName,
      questions: questionsWithFormattedCompany
    };
  });
  
  const results = await Promise.allSettled(companyDataPromises);
  return results
    .filter((result): result is PromiseFulfilledResult<CompanyData> => 
      result.status === 'fulfilled' && result.value.questions.length > 0
    )
    .map(result => result.value);
};

export const getAllQuestions = (companyData: CompanyData[]): PracticeQuestion[] => {
  return companyData.flatMap(company => company.questions);
};

export const getQuestionStats = (questions: PracticeQuestion[]) => {
  const stats = {
    totalSolved: 0, // This would come from user data
    easy: questions.filter(q => q.difficulty === 'Easy').length,
    medium: questions.filter(q => q.difficulty === 'Medium').length,
    hard: questions.filter(q => q.difficulty === 'Hard').length,
    total: questions.length
  };
  
  return stats;
};

export const getAllTopics = (questions: PracticeQuestion[]): string[] => {
  const topicsSet = new Set<string>();
  questions.forEach(question => {
    question.topics.forEach(topic => topicsSet.add(topic));
  });
  return Array.from(topicsSet).sort();
};

export const getAllCompanies = (companyData: CompanyData[]): string[] => {
  return companyData.map(company => company.name).sort();
}; 