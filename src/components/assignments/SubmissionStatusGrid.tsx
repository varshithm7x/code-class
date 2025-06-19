import React, { useState, useMemo } from 'react';
import { AssignmentWithSubmissions, ProblemWithSubmissions } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SubmissionStatusGridProps {
  assignment: AssignmentWithSubmissions;
  onRefresh?: () => void;
}

const getVerificationUrl = (
  platform: string,
  problemUrl: string,
  submission: {
    leetcodeUsername?: string | null;
    hackerrankUsername?: string | null;
    gfgUsername?: string | null;
  }
): string | null => {
  switch (platform.toLowerCase()) {
    case 'leetcode':
      return submission.leetcodeUsername ? `https://leetcode.com/${submission.leetcodeUsername}/` : null;
    case 'hackerrank': {
      const problemName = problemUrl.split('/challenges/')[1]?.split('/')[0];
      return submission.hackerrankUsername && problemName
        ? `https://www.hackerrank.com/challenges/${problemName}/submissions/username/${submission.hackerrankUsername}`
        : null;
    }
    case 'geeksforgeeks':
      return submission.gfgUsername ? `https://auth.geeksforgeeks.org/user/${submission.gfgUsername}/practice/` : null;
    default:
      return null;
  }
};

const SubmissionStatusGrid: React.FC<SubmissionStatusGridProps> = ({ assignment }) => {
  const [unsolvedFilter, setUnsolvedFilter] = useState<string>('all');

  const students = useMemo(() => {
    if (!assignment || !assignment.problems || assignment.problems.length === 0) {
      return [];
    }
    return assignment.problems[0]?.submissions.map(s => ({
      id: s.studentId,
      name: s.studentName,
    })) || [];
  }, [assignment]);

  const totalProblems = assignment?.problems?.length ?? 0;

  const unsolvedCounts = useMemo(() => {
    const counts: { [key: number]: number } = {};
    if (totalProblems > 0) {
      students.forEach(student => {
        const completedCount = assignment.problems.reduce((acc, problem) => {
          const submission = problem.submissions.find(s => s.studentId === student.id);
          return acc + (submission?.completed ? 1 : 0);
        }, 0);
        const unsolved = totalProblems - completedCount;
        counts[unsolved] = (counts[unsolved] || 0) + 1;
      });
    }
    return counts;
  }, [students, assignment, totalProblems]);

  const filteredStudents = useMemo(() => {
    if (unsolvedFilter === 'all') {
      return students;
    }
    const unsolvedCount = parseInt(unsolvedFilter, 10);
    return students.filter(student => {
      const completedCount = assignment.problems.reduce((acc, problem) => {
        const submission = problem.submissions.find(s => s.studentId === student.id);
        return acc + (submission?.completed ? 1 : 0);
      }, 0);
      return totalProblems - completedCount === unsolvedCount;
    });
  }, [students, assignment, unsolvedFilter, totalProblems]);

  if (!assignment || !assignment.problems || assignment.problems.length === 0) {
    return <p>No problems in this assignment.</p>;
  }
  
  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="unsolved-filter" className="text-sm font-medium">
            Filter by students with:
          </label>
          <Select value={unsolvedFilter} onValueChange={setUnsolvedFilter}>
            <SelectTrigger className="w-[350px]" id="unsolved-filter">
              <SelectValue placeholder="Show All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All Students</SelectItem>
              {[...Array(totalProblems + 1).keys()].map(i => {
                const studentCount = unsolvedCounts[i];
                const studentCountText = studentCount
                  ? ` [${studentCount} student${studentCount > 1 ? 's' : ''}]`
                  : '';

                return (
                  <SelectItem key={i} value={String(i)}>
                    {i} unsolved problem(s){studentCountText}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Student</TableHead>
              {assignment.problems.map((problem: ProblemWithSubmissions) => {
                const solvedCount = problem.submissions.filter(s => s.completed).length;
                const notSolvedCount = students.length - solvedCount;
                return (
                  <TableHead key={problem.id} className="text-center min-w-[200px]">
                    <a href={problem.url} target="_blank" rel="noopener noreferrer" className="hover:underline font-medium">
                      {problem.title}
                    </a>
                    <div className="flex items-center justify-center gap-3 text-xs mt-1.5 font-normal">
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        {solvedCount} Solved
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-3 w-3" />
                        {notSolvedCount} Not Solved
                      </span>
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="text-center">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => {
                let completedCount = 0;
                
                return (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{student.name}</TableCell>
                    {assignment.problems.map((problem: ProblemWithSubmissions) => {
                      const submission = problem.submissions.find(s => s.studentId === student.id);
                      if (submission?.completed) {
                        completedCount++;
                      }
                      
                      const verificationUrl = submission ? getVerificationUrl(problem.platform, problem.url, submission) : null;
                      
                      const cellContent = (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {submission?.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-500 mx-auto" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {submission?.completed
                                ? `Completed on ${new Date(submission.submissionTime!).toLocaleDateString()}`
                                : 'Pending'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );

                      return (
                        <TableCell key={problem.id} className="text-center">
                          {verificationUrl ? (
                            <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
                              {cellContent}
                            </a>
                          ) : (
                            cellContent
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-medium">
                      {Math.round((completedCount / assignment.problems.length) * 100)}%
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={assignment.problems.length + 2} className="text-center">
                  No students match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SubmissionStatusGrid; 