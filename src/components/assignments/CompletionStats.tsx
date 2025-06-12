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

        {submissionStats.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="text-md font-medium mb-4 text-center text-muted-foreground">Submission Breakdown</h4>
            <div className="space-y-2 max-w-lg mx-auto">
              {submissionStats.map(({ completedCount, studentCount }) => (
                <div key={completedCount} className="flex justify-between items-center text-sm p-3 rounded-lg bg-muted/50">
                  <span>
                      <span className="font-bold">{studentCount}</span> student{studentCount > 1 ? 's' : ''}
                  </span>
                  <Badge
                    variant={
                      completedCount === totalProblems && totalProblems > 0 ? "default" :
                      completedCount > 0 ? "secondary" : "destructive"
                    }
                    className="font-mono px-3"
                  >
                    Solved {completedCount}/{totalProblems}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {problemStats.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h4 className="text-md font-medium mb-4 text-center text-muted-foreground">Problem Breakdown</h4>
            <div className="space-y-3 max-w-lg mx-auto">
              {problemStats.map(problem => (
                <div key={problem.id} className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium mb-2">{problem.title}</p>
                  <div className="flex justify-start items-center gap-6 text-sm">
                      <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span><span className="font-bold">{problem.solvedCount}</span> Solved</span>
                      </span>
                      <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span><span className="font-bold">{problem.notSolvedCount}</span> Not Solved</span>
                      </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {studentProgress.length === 0 && (
           <p className="text-sm text-muted-foreground text-center pt-4">No submission data available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CompletionStats; 