import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Tiptap } from '../ui/Tiptap';
import { Announcement } from '../../types';

interface CreateAnnouncementFormProps {
  classId: string;
  onAnnouncementCreated: (newAnnouncement: Announcement) => void;
  createFunction: (classId: string, content: string) => Promise<Announcement>;
}

const CreateAnnouncementForm: React.FC<CreateAnnouncementFormProps> = ({ classId, onAnnouncementCreated, createFunction }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content === '<p></p>') {
      toast({
        title: 'Error',
        description: 'Announcement content cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newAnnouncement = await createFunction(classId, content);
      onAnnouncementCreated(newAnnouncement);
      setContent('');
      toast({
        title: 'Success',
        description: 'Announcement posted successfully.',
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to post announcement. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">New Announcement</h3>
      <Tiptap description={content} onChange={setContent} />
      <Button type="submit" disabled={isSubmitting} className="mt-4">
        {isSubmitting ? 'Posting...' : 'Post Announcement'}
      </Button>
    </form>
  );
};

export default CreateAnnouncementForm; 