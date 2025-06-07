import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Assignment, StudentAssignment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { formatDate } from '../../utils/date';

interface AssignmentListProps {
  assignments: Assignment[] | StudentAssignment[];
  onDelete?: (id: string) => void;
  showStatus?: boolean;
  className?: string;
}

const AssignmentList: React.FC<AssignmentListProps> = ({ 
  assignments, 
  onDelete, 
  showStatus = false,
  className
}) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRowClick = (assignmentId: string) => {
    navigate(`/assignments/${assignmentId}`);
  };

  const handleDelete = () => {
    if (selectedId && onDelete) {
      onDelete(selectedId);
      setSelectedId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'hackerrank':
        return <Badge className="bg-green-600">HackerRank</Badge>;
      case 'leetcode':
        return <Badge className="bg-yellow-600">LeetCode</Badge>;
      case 'gfg':
        return <Badge className="bg-brand-teal">GeeksForGeeks</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Badge className="bg-green-500">Easy</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'hard':
        return <Badge className="bg-red-500">Hard</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!assignments.length) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No assignments found</p>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Assigned Date</TableHead>
            <TableHead>Due Date</TableHead>
            {showStatus && <TableHead>Status</TableHead>}
            {isTeacher && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow 
              key={assignment.id} 
              onClick={() => handleRowClick(assignment.id)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">{assignment.title}</TableCell>
              <TableCell>{formatDate(assignment.assignDate)}</TableCell>
              <TableCell>{formatDate(assignment.dueDate)}</TableCell>
              {showStatus && 'status' in assignment && (
                <TableCell>{getStatusBadge(assignment.status)}</TableCell>
              )}
              {isTeacher && (
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(assignment.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this assignment and all related data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AssignmentList;
