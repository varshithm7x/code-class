import api from './axios';
import { Assignment, StudentAssignment, Problem, AssignmentWithSubmissions } from '../types';

export interface AssignmentCreationData {
  title: string;
  description: string;
  classId: string;
  assignDate: Date;
  dueDate: Date;
  problems: {
    url: string;
    title: string;
    difficulty: string;
  }[];
}

export const createAssignment = async (
  assignmentData: AssignmentCreationData
): Promise<Assignment> => {
  const response = await api.post('/assignments', assignmentData);
  return response.data;
};

export const getAssignmentDetails = async (assignmentId: string): Promise<AssignmentWithSubmissions> => {
  const response = await api.get(`/assignments/${assignmentId}`);
  return response.data;
}

export const getClassAssignments = async (classId: string): Promise<Assignment[]> => {
  const response = await api.get(`/classes/${classId}/assignments`);
  return response.data;
};

export const getMyAssignments = async (): Promise<StudentAssignment[]> => {
  const response = await api.get('/assignments/my');
  return response.data;
};

export const updateAssignment = async (
  assignmentId: string,
  data: Partial<Assignment>
) => {
  const response = await api.patch(`/assignments/${assignmentId}`, data);
  return response.data;
};

export const deleteAssignment = async (assignmentId: string) => {
  const response = await api.delete(`/assignments/${assignmentId}`);
  return response.data;
};

export const checkSubmissions = async () => {
  const response = await api.post('/assignments/check-submissions');
  return response.data;
};

export const checkSubmissionsForAssignment = async (assignmentId: string) => {
  const response = await api.post(`/assignments/${assignmentId}/check-submissions`);
  return response.data;
};
