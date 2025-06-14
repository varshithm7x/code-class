import React from 'react';
import { AssignmentWithSubmissions } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface CompletionStatsProps {
  assignment: AssignmentWithSubmissions;
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  completedCount: number;
}

const CompletionStats: React.FC<CompletionStatsProps> = ({ assignment }) => {
  const totalProblems = assignment.problems.length;

  // Robustly get all unique students from across all problems
  const studentsMap = new Map<string, { studentId: string; studentName: string }>();
  assignment.problems.forEach(problem => {
    problem.submissions.forEach(submission => {
      if (!studentsMap.has(submission.studentId)) {
        studentsMap.set(submission.studentId, {
          studentId: submission.studentId,
          studentName: submission.studentName,
        });
      }
    });
  });

  const studentProgress: StudentProgress[] = Array.from(studentsMap.values()).map(student => ({
    ...student,
    completedCount: 0,
  }));

  // Calculate each student's progress
  assignment.problems.forEach(problem => {
    problem.submissions.forEach(submission => {
      const student = studentProgress.find(p => p.studentId === submission.studentId);
      if (student && submission.completed) {
        student.completedCount++;
      }
    });
  });
  
  const totalStudents = studentProgress.length;

  if (totalProblems === 0 || totalStudents === 0) {
    return null;
  }

  const completedAll = studentProgress.filter(p => p.completedCount === totalProblems).length;
  const inProgress = studentProgress.filter(p => p.completedCount > 0 && p.completedCount < totalProblems).length;
  const notStarted = studentProgress.filter(p => p.completedCount === 0).length;

  // Aggregate the progress for the submission breakdown
  const completionCounts = new Map<number, number>();
  studentProgress.forEach(student => {
    const count = completionCounts.get(student.completedCount) || 0;
    completionCounts.set(student.completedCount, count + 1);
  });

  // Sort by number of problems solved
  const submissionStats = Array.from(completionCounts.entries())
    .sort(([countA], [countB]) => countB - countA)
    .map(([completedCount, studentCount]) => ({
      completedCount,
      studentCount,
    }));

  // Calculate per-problem stats
  const problemStats = assignment.problems.map(problem => {
    const solvedCount = problem.submissions.filter(s => s.completed).length;
    const notSolvedCount = totalStudents - solvedCount;
    return {
        id: problem.id,
        title: problem.title,
        solvedCount,
        notSolvedCount
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <Card>
                <CardContent className="p-4">
                    <p className="text-2xl font-bold text-green-500">{completedAll}</p>
                    <p className="text-sm text-muted-foreground">Completed All</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <p className="text-2xl font-bold text-yellow-500">{inProgress}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <p className="text-2xl font-bold text-red-500">{notStarted}</p>
                    <p className="text-sm text-muted-foreground">Not Started</p>
                </CardContent>
            </Card>
        </div>

        

       

        {studentProgress.length === 0 && (
           <p className="text-sm text-muted-foreground text-center pt-4">No submission data available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CompletionStats; 