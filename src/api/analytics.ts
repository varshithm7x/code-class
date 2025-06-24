import api from './axios';
import { CompletionData, PlatformData, DifficultyData, LeaderboardEntry } from '../types';

export interface StudentPerformanceData {
  studentId: string;
  studentName: string;
  email: string;
  leetcodeUsername?: string;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
  assignmentHistory: Array<{
    assignmentId: string;
    assignmentTitle: string;
    assignDate: string;
    dueDate: string;
    problemsTotal: number;
    problemsCompleted: number;
    completionRate: number;
    timeToComplete?: number; // in hours from assign date
    isLate: boolean;
  }>;
  performanceTrend: 'improving' | 'declining' | 'stable' | 'inactive';
  riskLevel: 'low' | 'medium' | 'high';
  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastSubmission?: string;
  };
}

export interface ClassAnalytics {
  classId: string;
  className: string;
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  averageClassPerformance: number;
  students: StudentPerformanceData[];
  assignmentTrends: Array<{
    assignmentId: string;
    assignmentTitle: string;
    assignDate: string;
    averageCompletion: number;
    completionRate: number;
    averageTimeToComplete: number;
  }>;
  performanceDistribution: {
    excellent: number; // 90-100%
    good: number; // 70-89%
    average: number; // 50-69%
    poor: number; // 0-49%
  };
  riskStudents: Array<{
    studentId: string;
    studentName: string;
    riskLevel: 'medium' | 'high';
    reasons: string[];
  }>;
}

export interface StudentDetailedAnalytics {
  studentId: string;
  studentName: string;
  email: string;
  performanceMetrics: {
    totalPoints: number;
    averageScore: number;
    completionRate: number;
    timeEfficiency: number;
    consistencyScore: number;
  };
  weeklyProgress: Array<{
    week: string;
    completedProblems: number;
    timeSpent: number;
    score: number;
  }>;
  difficultyBreakdown: {
    easy: { attempted: number; completed: number; successRate: number };
    medium: { attempted: number; completed: number; successRate: number };
    hard: { attempted: number; completed: number; successRate: number };
  };
  platformStats: {
    leetcode: { solved: number; total: number };
    hackerrank: { solved: number; total: number };
    geeksforgeeks: { solved: number; total: number };
  };
  recentActivity: Array<{
    date: string;
    activity: string;
    problemTitle: string;
    difficulty: string;
    completed: boolean;
  }>;
}

export const getClassAnalytics = async (classId: string): Promise<ClassAnalytics> => {
  const response = await api.get(`/analytics/class/${classId}`);
  return response.data;
};

export const getStudentDetailedAnalytics = async (studentId: string, classId?: string): Promise<StudentDetailedAnalytics> => {
  const url = classId 
    ? `/analytics/student/${studentId}?classId=${classId}`
    : `/analytics/student/${studentId}`;
  const response = await api.get(url);
  return response.data;
};

export const getClassCompletionData = async (classId: string) => {
  const response = await api.get(`/analytics/class/${classId}/completion`);
  return response.data;
};

export const getPlatformData = async (classId?: string) => {
  const url = classId ? `/analytics/platform?classId=${classId}` : '/analytics/platform';
  const response = await api.get(url);
  return response.data;
};

export const getDifficultyData = async (classId?: string) => {
  const url = classId ? `/analytics/difficulty?classId=${classId}` : '/analytics/difficulty';
  const response = await api.get(url);
  return response.data;
};

export const getStudentPerformanceComparison = async (classId: string) => {
  const response = await api.get(`/analytics/class/${classId}/comparison`);
  return response.data;
};

export const getAssignmentProgressAnalytics = async (classId: string) => {
  const response = await api.get(`/analytics/class/${classId}/assignment-progress`);
  return response.data;
};

export const getLeaderboard = async (classId?: string, sortBy?: string) => {
  const params = new URLSearchParams();
  if (classId) params.append('classId', classId);
  if (sortBy) params.append('sortBy', sortBy);
  
  const url = params.toString() ? `/analytics/leaderboard?${params.toString()}` : '/analytics/leaderboard';
  const response = await api.get(url);
  return response.data as LeaderboardEntry[];
};
