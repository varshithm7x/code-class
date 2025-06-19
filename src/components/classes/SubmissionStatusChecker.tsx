import React, { useState } from 'react';
import { checkClassSubmissionStatus } from '../../api/classes';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, User } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface PlatformStatus {
  hasUsername: boolean;
  username: string | null;
  cookieStatus: string;
  isWorking: boolean;
  lastError: string | null;
}

interface StudentStatus {
  userId: string;
  name: string;
  email: string;
  platforms: {
    leetcode: PlatformStatus;
    hackerrank: PlatformStatus;
    gfg: PlatformStatus;
  };
}

interface SubmissionStatusReport {
  classId: string;
  className: string;
  studentCount: number;
  checkedAt: string;
  students: StudentStatus[];
}

interface SubmissionStatusCheckerProps {
  classId: string;
}

const SubmissionStatusChecker: React.FC<SubmissionStatusCheckerProps> = ({ classId }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkingStudentId, setCheckingStudentId] = useState<string | null>(null);
  const [statusReport, setStatusReport] = useState<SubmissionStatusReport | null>(null);
  const { toast } = useToast();

  const handleCheckStatus = async () => {
    if (!classId) return;
    
    setIsChecking(true);
    try {
      const response = await checkClassSubmissionStatus(classId);
      setStatusReport(response.data);
      
      toast({
        title: 'Status Check Complete',
        description: `Checked submission status for ${response.data.studentCount} students`,
      });
    } catch (error) {
      console.error('Error checking submission status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check submission status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckStudentStatus = async (studentId: string, studentName: string) => {
    if (!classId) return;
    
    setCheckingStudentId(studentId);
    try {
      const response = await checkClassSubmissionStatus(classId);
      // Update only this student's status in the existing report
      if (statusReport) {
        const updatedStudents = statusReport.students.map(student => 
          student.userId === studentId 
            ? response.data.students.find(s => s.userId === studentId) || student
            : student
        );
        setStatusReport({
          ...statusReport,
          students: updatedStudents,
          checkedAt: response.data.checkedAt
        });
      } else {
        setStatusReport(response.data);
      }
      
      toast({
        title: 'Student Status Updated',
        description: `Checked submission status for ${studentName}`,
      });
    } catch (error) {
      console.error('Error checking student status:', error);
      toast({
        title: 'Error',
        description: `Failed to check status for ${studentName}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setCheckingStudentId(null);
    }
  };

  const getStatusIcon = (isWorking: boolean, hasUsername: boolean, platform: string) => {
    if (!hasUsername) {
      return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
    if (isWorking) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    return <XCircle className="h-3 w-3 text-red-500" />;
  };

  const getErrorTooltip = (status: PlatformStatus, platform: string) => {
    if (!status.hasUsername) return `No ${platform} username provided`;
    if (status.isWorking) return `${platform} is working correctly`;
    if (status.lastError) return status.lastError;
    return `${platform} has an error`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Submission Status Checker
          </CardTitle>
          <CardDescription>
            Check platform credentials for all students or individual students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCheckStatus} 
            disabled={isChecking}
            className="w-full sm:w-auto"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking All Students...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check All Students
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {statusReport && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Status Report</CardTitle>
            <CardDescription>
              Last checked: {new Date(statusReport.checkedAt).toLocaleString()} • {statusReport.studentCount} students
            </CardDescription>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Working</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                <span>Error/Expired</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-gray-400" />
                <span>Not Configured</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statusReport.students.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No students found in this class.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Student</TableHead>
                      <TableHead className="text-center min-w-[120px]">LeetCode</TableHead>
                      <TableHead className="text-center min-w-[120px]">HackerRank</TableHead>
                      <TableHead className="text-center min-w-[140px]">GeeksforGeeks</TableHead>
                      <TableHead className="text-center min-w-[100px] bg-blue-50">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusReport.students.map((student) => (
                      <TableRow key={student.userId}>
                        <TableCell className="min-w-[200px]">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getStatusIcon(
                              student.platforms.leetcode.isWorking, 
                              student.platforms.leetcode.hasUsername, 
                              'LeetCode'
                            )}
                            {student.platforms.leetcode.username && (
                              <div className="text-xs text-muted-foreground">
                                @{student.platforms.leetcode.username}
                              </div>
                            )}
                            {student.platforms.leetcode.lastError && (
                              <div className="text-xs text-red-600 max-w-[100px] truncate" title={student.platforms.leetcode.lastError}>
                                {student.platforms.leetcode.lastError}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getStatusIcon(
                              student.platforms.hackerrank.isWorking, 
                              student.platforms.hackerrank.hasUsername, 
                              'HackerRank'
                            )}
                            {student.platforms.hackerrank.username && (
                              <div className="text-xs text-muted-foreground">
                                @{student.platforms.hackerrank.username}
                              </div>
                            )}
                            {student.platforms.hackerrank.lastError && (
                              <div className="text-xs text-red-600 max-w-[100px] truncate" title={student.platforms.hackerrank.lastError}>
                                {student.platforms.hackerrank.lastError}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getStatusIcon(
                              student.platforms.gfg.isWorking, 
                              student.platforms.gfg.hasUsername, 
                              'GFG'
                            )}
                            {student.platforms.gfg.username && (
                              <div className="text-xs text-muted-foreground">
                                @{student.platforms.gfg.username}
                              </div>
                            )}
                            {student.platforms.gfg.lastError && (
                              <div className="text-xs text-red-600 max-w-[100px] truncate" title={student.platforms.gfg.lastError}>
                                {student.platforms.gfg.lastError}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center bg-blue-50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckStudentStatus(student.userId, student.name)}
                            disabled={checkingStudentId === student.userId}
                            className="h-8 px-3 bg-white hover:bg-gray-50"
                            title={`Check ${student.name}'s status`}
                          >
                            {checkingStudentId === student.userId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <User className="h-3 w-3 mr-1" />
                                <span className="text-xs">Check</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubmissionStatusChecker; 