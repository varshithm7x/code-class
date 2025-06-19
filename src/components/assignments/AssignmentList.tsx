import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Assignment, StudentAssignment, TeacherAssignment } from '../../types';
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
import { Pencil, Trash2, ExternalLink, CheckCircle2, Clock, AlertCircle, Users, FileText } from 'lucide-react';
import { Progress } from '../ui/progress';
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
  assignments: Assignment[] | StudentAssignment[] | TeacherAssignment[];
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
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
            <TableHead>Progress</TableHead>
            {showStatus && <TableHead>Status</TableHead>}
            {isTeacher && <TableHead>Last Check</TableHead>}
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
              <TableCell>
                {'progress' in assignment && (
                  <div className="space-y-2">
                    {/* Student Progress */}
                    {'completed' in assignment.progress && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {assignment.progress.percentage === 100 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : assignment.progress.completed > 0 ? (
                              <Clock className="h-4 w-4 text-amber-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span>{assignment.progress.completed} / {assignment.progress.total} problems</span>
                          </div>
                          <span className="text-muted-foreground font-medium">{assignment.progress.percentage}%</span>
                        </div>
                        <Progress value={assignment.progress.percentage} className="h-2" />
                        {assignment.progress.percentage === 100 && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>All problems completed!</span>
                          </div>
                        )}
                      </>
                    )}
                    {/* Teacher Progress */}
                    {'totalStudents' in assignment.progress && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{assignment.progress.totalStudents} students</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{assignment.progress.totalProblems} problems</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>{assignment.progress.completedSubmissions} submissions completed</span>
                          <span className="text-muted-foreground">{assignment.progress.averageCompletion}% avg</span>
                        </div>
                        <Progress value={assignment.progress.averageCompletion} className="h-2" />
                      </>
                    )}
                  </div>
                )}
                {!('progress' in assignment) && (
                  <div className="text-sm text-muted-foreground">
                    {assignment.problems?.length || 0} problems
                  </div>
                )}
              </TableCell>
              {showStatus && 'status' in assignment && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(assignment.status)}
                    {getStatusBadge(assignment.status)}
                  </div>
                </TableCell>
              )}
              {isTeacher && (
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {assignment.lastSubmissionCheck 
                      ? new Date(assignment.lastSubmissionCheck).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </TableCell>
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
