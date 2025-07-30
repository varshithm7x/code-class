import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { DSAQuestion } from '../../types';

interface NotesDialogProps {
  question: DSAQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  initialNotes?: string;
  onSave: (notes: string) => void;
}

const NotesDialog: React.FC<NotesDialogProps> = ({
  question,
  isOpen,
  onClose,
  initialNotes = '',
  onSave
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, isOpen]);

  const handleSave = async () => {
    if (!question) return;

    setIsLoading(true);
    try {
      // Call the onSave function passed from parent (which handles localStorage)
      onSave(notes.trim());
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
      // You could add a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNotes(initialNotes); // Reset to initial value
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            {question?.title || 'Add your notes for this problem'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder="Write your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotesDialog; 