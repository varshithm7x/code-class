import api from './axios';
import { StudentProfile } from '../types';

export const getStudentProfile = async (studentId: string): Promise<StudentProfile> => {
    const response = await api.get(`/students/${studentId}`);
    return response.data;
}; 