import React from 'react';
import { Announcement } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface AnnouncementCardProps {
  announcement: Announcement;
  onDelete: (announcementId: string) => void;
  deleteFunction: (announcementId: string) => Promise<void>;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, onDelete, deleteFunction }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.role === 'TEACHER';

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
        try {
            await deleteFunction(announcement.id);
            onDelete(announcement.id);
            toast({
                title: 'Success',
                description: 'Announcement deleted successfully.',
            });
        } catch (error) {
            console.error('Error deleting announcement:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete announcement. Please try again.',
                variant: 'destructive',
            });
        }
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg">{announcement.author.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Posted on {format(new Date(announcement.createdAt), 'PPP')}
                </p>
            </div>
            {isTeacher && (
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          dangerouslySetInnerHTML={{ __html: announcement.content }}
          className="prose dark:prose-invert"
        />
      </CardContent>
    </Card>
  );
};

export default AnnouncementCard; 