
import api from './axios';
import { CompletionData, PlatformData, DifficultyData, LeaderboardEntry } from '../types';

export const getClassCompletionData = async (classId: string) => {
  const response = await api.get(`/analytics/${classId}/completion`);
  return response.data as CompletionData[];
};

export const getPlatformData = async (classId: string) => {
  const response = await api.get(`/analytics/${classId}/platforms`);
  return response.data as PlatformData[];
};

export const getDifficultyData = async (classId: string) => {
  const response = await api.get(`/analytics/${classId}/difficulty`);
  return response.data as DifficultyData[];
};

export const getLeaderboard = async (classId?: string, sortBy?: string) => {
  const params = new URLSearchParams();
  if (classId) params.append('classId', classId);
  if (sortBy) params.append('sortBy', sortBy);
  
  const url = params.toString() ? `/analytics/leaderboard?${params.toString()}` : '/analytics/leaderboard';
  const response = await api.get(url);
  return response.data as LeaderboardEntry[];
};
