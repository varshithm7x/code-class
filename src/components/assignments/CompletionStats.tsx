import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle2, Clock, AlertTriangle, Users } from 'lucide-react';

interface CompletionStatsProps {
  assignment: {
    problems: Array<{
      title: string;
      submissions: Array<{
        id: string;
        userId: string;
        completed: boolean;
        submissionTime?: string;
        isLate?: boolean;
        user: {
          id: string;
          name: string;
          email: string;
        };
      }>;
    }>;
    dueDate?: string;
  };
}

const CompletionStats: React.FC<CompletionStatsProps> = ({ assignment }) => {
  const totalStudents = assignment.problems?.[0]?.submissions?.length || 0;
  const totalProblems = assignment.problems?.length || 0;

  // Calculate student completion status
  const studentCompletionMap = new Map<string, number>();
  
  // Count completed problems per student
  if (assignment.problems && assignment.problems.length > 0) {
    assignment.problems.forEach(problem => {
      // Defensive check for submissions
      if (!problem?.submissions || !Array.isArray(problem.submissions)) {
        return;
      }
      
      problem.submissions.forEach(submission => {
        if (submission.completed) {
          const currentCount = studentCompletionMap.get(submission.userId) || 0;
          studentCompletionMap.set(submission.userId, currentCount + 1);
        }
      });
    });
  }

  // Categorize students by completion status
  let allCompleted = 0;
  let inProgress = 0;
  let notStarted = 0;

  // Get all unique student IDs from submissions
  const allStudentIds = new Set<string>();
  assignment.problems?.forEach(problem => {
    // Defensive check for submissions
    if (!problem?.submissions || !Array.isArray(problem.submissions)) {
      return;
    }
    
    problem.submissions.forEach(submission => {
      allStudentIds.add(submission.userId);
    });
  });

  allStudentIds.forEach(studentId => {
    const completedCount = studentCompletionMap.get(studentId) || 0;
    if (completedCount === totalProblems && totalProblems > 0) {
      allCompleted++;
    } else if (completedCount > 0) {
      inProgress++;
    } else {
      notStarted++;
    }
  });

  // Count late submissions (completed after dueDate)
  let lateCount = 0;
  const due = assignment?.dueDate ? new Date(assignment.dueDate).getTime() : null;
  assignment.problems?.forEach(problem => {
    // Defensive check for submissions
    if (!problem?.submissions || !Array.isArray(problem.submissions)) {
      return;
    }
    
    problem.submissions.forEach(submission => {
      if (submission.completed) {
        const isLate = submission.isLate ?? (due && submission.submissionTime ? (new Date(submission.submissionTime).getTime() > due) : false);
        if (isLate) lateCount++;
      }
    });
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">All Questions Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{allCompleted}</div>
          <p className="text-xs text-muted-foreground">
            {allCompleted === 1 ? 'student has' : 'students have'} completed all problems
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{inProgress}</div>
          <p className="text-xs text-muted-foreground">
            {inProgress === 1 ? 'student has' : 'students have'} started working
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          <AlertTriangle className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">{notStarted}</div>
          <p className="text-xs text-muted-foreground">
            {notStarted === 1 ? 'student has' : 'students have'} not started yet
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Late Submissions</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{lateCount}</div>
          <p className="text-xs text-muted-foreground">
            {lateCount === 1 ? 'submission was' : 'submissions were'} completed after the deadline
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionStats; 