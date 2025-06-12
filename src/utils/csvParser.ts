import { PracticeQuestion, CompanyData } from '../types';
import allCompanyData from '../lib/questions.json';

// The parsing functions are no longer needed here, they live in the build script.

export const getAllCompanyData = (): CompanyData[] => {
  return allCompanyData as CompanyData[];
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