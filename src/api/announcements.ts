import api from './axios';
import { Announcement } from '../types';

export const getClassAnnouncements = async (classId: string): Promise<Announcement[]> => {
    const response = await api.get(`/announcements/class/${classId}`);
    return response.data;
};

export const createAnnouncement = async (classId: string, content: string): Promise<Announcement> => {
    const response = await api.post(`/announcements/class/${classId}`, { content });
    return response.data;
};

export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
    await api.delete(`/announcements/${announcementId}`);
}; 