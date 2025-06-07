import React, { useState, useMemo } from 'react';
import { AssignmentWithSubmissions, ProblemWithSubmissions } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SubmissionStatusGridProps {
  assignment: AssignmentWithSubmissions;
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
    case 'hackerrank':
      const problemName = problemUrl.split('/challenges/')[1]?.split('/')[0];
      return submission.hackerrankUsername && problemName
        ? `https://www.hackerrank.com/challenges/${problemName}/submissions/username/${submission.hackerrankUsername}`
        : null;
    case 'geeksforgeeks':
      return submission.gfgUsername ? `https://auth.geeksforgeeks.org/user/${submission.gfgUsername}/practice/` : null;
    default:
      return null;
  }
};

const SubmissionStatusGrid: React.FC<SubmissionStatusGridProps> = ({ assignment }) => {
  const [unsolvedFilter, setUnsolvedFilter] = useState<string>('all');

  if (!assignment || !assignment.problems || assignment.problems.length === 0) {
    return <p>No problems in this assignment.</p>;
  }

  const students = useMemo(() => {
    return assignment.problems[0]?.submissions.map(s => ({
      id: s.studentId,
      name: s.studentName,
    })) || [];
  }, [assignment.problems]);

  const totalProblems = assignment.problems.length;

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
  }, [students, assignment.problems, unsolvedFilter, totalProblems]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="unsolved-filter" className="text-sm font-medium">
            Filter by students with:
          </label>
          <Select value={unsolvedFilter} onValueChange={setUnsolvedFilter}>
            <SelectTrigger className="w-[180px]" id="unsolved-filter">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All Students</SelectItem>
              {[...Array(totalProblems + 1).keys()].map(i => (
                <SelectItem key={i} value={String(i)}>
                  {i} unsolved problem(s)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Student</TableHead>
              {assignment.problems.map((problem: ProblemWithSubmissions) => (
                <TableHead key={problem.id} className="text-center min-w-[150px]">
                  <a href={problem.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {problem.title}
                  </a>
                </TableHead>
              ))}
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