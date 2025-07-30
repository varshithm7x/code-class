import { DSASheet, DSAQuestion, DSATopic, DSASubTopic, DSAStats } from '../types';

// Load and parse the DSA sheet data
export const loadDSASheet = async (): Promise<DSASheet> => {
  try {
    const response = await fetch('/data/codolio_dsa_sheet_20250730_105425.json');
    if (!response.ok) {
      throw new Error('Failed to load DSA sheet data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading DSA sheet:', error);
    throw error;
  }
};

// Group questions by topic and subtopic
export const groupQuestionsByTopic = (questions: DSAQuestion[]): DSATopic[] => {
  const topicMap = new Map<string, Map<string, DSAQuestion[]>>();

  // Group questions by topic and sub_topic
  questions.forEach(question => {
    if (!topicMap.has(question.topic)) {
      topicMap.set(question.topic, new Map());
    }
    
    const subTopicMap = topicMap.get(question.topic)!;
    if (!subTopicMap.has(question.sub_topic)) {
      subTopicMap.set(question.sub_topic, []);
    }
    
    subTopicMap.get(question.sub_topic)!.push(question);
  });

  // Convert to DSATopic array
  const topics: DSATopic[] = [];
  
  topicMap.forEach((subTopicMap, topicName) => {
    const sub_topics: DSASubTopic[] = [];
    let totalQuestions = 0;
    let completedQuestions = 0;

    subTopicMap.forEach((questions, subTopicName) => {
      const subTopicCompleted = questions.filter(q => q.is_solved).length;
      
      sub_topics.push({
        name: subTopicName,
        questions,
        total_questions: questions.length,
        completed_questions: subTopicCompleted,
        progress_percentage: questions.length > 0 ? (subTopicCompleted / questions.length) * 100 : 0
      });

      totalQuestions += questions.length;
      completedQuestions += subTopicCompleted;
    });

    topics.push({
      name: topicName,
      sub_topics,
      total_questions: totalQuestions,
      completed_questions: completedQuestions,
      progress_percentage: totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0
    });
  });

  return topics;
};

// Calculate overall statistics
export const calculateDSAStats = (questions: DSAQuestion[]): DSAStats => {
  const completed = questions.filter(q => q.is_solved);
  
  const easyQuestions = questions.filter(q => q.difficulty === 'Easy' || q.difficulty === 'Basic');
  const mediumQuestions = questions.filter(q => q.difficulty === 'Medium');
  const hardQuestions = questions.filter(q => q.difficulty === 'Hard');
  
  const easyCompleted = completed.filter(q => q.difficulty === 'Easy' || q.difficulty === 'Basic');
  const mediumCompleted = completed.filter(q => q.difficulty === 'Medium');
  const hardCompleted = completed.filter(q => q.difficulty === 'Hard');

  return {
    total_questions: questions.length,
    completed_questions: completed.length,
    easy_completed: easyCompleted.length,
    easy_total: easyQuestions.length,
    medium_completed: mediumCompleted.length,
    medium_total: mediumQuestions.length,
    hard_completed: hardCompleted.length,
    hard_total: hardQuestions.length,
    overall_progress: questions.length > 0 ? (completed.length / questions.length) * 100 : 0
  };
};

// Get difficulty color
export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
    case 'basic':
      return 'text-green-400 bg-green-500/10';
    case 'medium':
      return 'text-orange-400 bg-orange-500/10';
    case 'hard':
      return 'text-red-400 bg-red-500/10';
    default:
      return 'text-gray-400 bg-gray-500/10';
  }
};

// Get difficulty background color
export const getDifficultyBgColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
    case 'basic':
      return 'bg-green-500';
    case 'medium':
      return 'bg-orange-500';
    case 'hard':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

// Filter questions based on criteria
export const filterQuestions = (
  questions: DSAQuestion[], 
  searchTerm: string = '',
  difficulty: string = 'all',
  showOnlyUnsolved: boolean = false
): DSAQuestion[] => {
  return questions.filter(question => {
    const matchesSearch = !searchTerm || 
      question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.sub_topic.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDifficulty = difficulty === 'all' || 
      question.difficulty.toLowerCase() === difficulty.toLowerCase();
    
    const matchesSolved = !showOnlyUnsolved || !question.is_solved;
    
    return matchesSearch && matchesDifficulty && matchesSolved;
  });
};

// Get random unsolved question
export const getRandomQuestion = (questions: DSAQuestion[]): DSAQuestion | null => {
  const unsolvedQuestions = questions.filter(q => !q.is_solved);
  if (unsolvedQuestions.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * unsolvedQuestions.length);
  return unsolvedQuestions[randomIndex];
}; 