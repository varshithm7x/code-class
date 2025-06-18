import api from './axios';
import { Class, ClassWithStudents, Assignment } from '../types';

export const getClasses = async (): Promise<{ classes: Class[] }> => {
  const response = await api.get('/classes');
  return response.data;
};

export const getClassDetails = async (classId: string) => {
  const response = await api.get(`/classes/${classId}`);
  return response.data as ClassWithStudents;
};

export const getClassAssignments = async (classId: string): Promise<Assignment[]> => {
  const response = await api.get(`/classes/${classId}/assignments`);
  return response.data;
};

export const createClass = async (name: string): Promise<Class> => {
  const response = await api.post('/classes', { name });
  return response.data;
};

export const deleteClass = async (classId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/classes/${classId}`);
  return response.data;
};

export const joinClass = async (joinCode: string): Promise<{ message: string }> => {
  const response = await api.post('/classes/join', { joinCode });
  return response.data;
};

export const leaveClass = async (classId: string): Promise<{ message: string }> => {
  const response = await api.post(`/classes/${classId}/leave`);
  return response.data;
};

export const removeStudentFromClass = async (classId: string, studentId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/classes/${classId}/students/${studentId}`);
  return response.data;
};
