import React, { useState, useEffect } from 'react';
import { Announcement } from '../../types';
import { useAuth } from '../../context/AuthContext';
import AnnouncementCard from './AnnouncementCard';
import CreateAnnouncementForm from './CreateAnnouncementForm';
import * as announcementApi from '../../api/announcements';
import { Skeleton } from '../ui/skeleton';

interface AnnouncementListProps {
  classId: string;
}

const AnnouncementList: React.FC<AnnouncementListProps> = ({ classId }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementApi.getClassAnnouncements(classId);
        setAnnouncements(data);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnnouncements();
  }, [classId]);

  const handleAnnouncementCreated = (newAnnouncement: Announcement) => {
    setAnnouncements([newAnnouncement, ...announcements]);
  };

  const handleAnnouncementDeleted = (announcementId: string) => {
    setAnnouncements(announcements.filter(a => a.id !== announcementId));
  };

  if (isLoading) {
    return (
        <div>
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
  }

  return (
    <div>
      {isTeacher && (
        <div className="mb-6">
          <CreateAnnouncementForm
            classId={classId}
            onAnnouncementCreated={handleAnnouncementCreated}
            createFunction={announcementApi.createAnnouncement}
          />
        </div>
      )}
      <h3 className="text-2xl font-bold mb-4">Announcements</h3>
      {announcements.length > 0 ? (
        announcements.map(announcement => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            onDelete={handleAnnouncementDeleted}
            deleteFunction={announcementApi.deleteAnnouncement}
          />
        ))
      ) : (
        <p className="text-muted-foreground">No announcements yet.</p>
      )}
    </div>
  );
};

export default AnnouncementList; 