import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getAssignmentDetails, checkSubmissionsForAssignment, markAllAsCompleted } from '../../api/assignments';
import { AssignmentWithSubmissions, StudentAssignmentDetails, ProblemWithUserSubmission } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import SubmissionStatusGrid from '../../components/assignments/SubmissionStatusGrid';
import CompletionStats from '../../components/assignments/CompletionStats';
import ProblemCompletionList from '../../components/assignments/ProblemCompletionList';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Pencil, CheckCircle2, Clock, AlertCircle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '../../components/ui/progress';

const AssignmentDetailsPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<AssignmentWithSubmissions | StudentAssignmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const [hasMarkedCompleted, setHasMarkedCompleted] = useState(false);
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';

  const fetchAssignment = async () => {
    if (!assignmentId) return;
    try {
      const data = await getAssignmentDetails(assignmentId);
      setAssignment(data);
      // Reset the hasMarkedCompleted flag when we get fresh data
      setHasMarkedCompleted(false);
    } catch (error) {
      console.error('Failed to fetch assignment details', error);
      toast.error('Failed to fetch assignment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const handleCheckSubmissions = async () => {
    if (!assignmentId) return;
    setIsChecking(true);
    try {
      const result = await checkSubmissionsForAssignment(assignmentId);
      const now = new Date().toLocaleTimeString();
      toast.success(`Submission check complete at ${now}. Data has been updated.`);
      await fetchAssignment(); // Refresh to get the updated lastSubmissionCheck
    } catch (error) {
      console.error('Failed to check submissions', error);
      toast.error('Failed to check submissions.');
    } finally {
      setIsChecking(false);
    }
  };

  // Check if all problems are completed for students (manual marking is separate)
  const allCompleted = !isTeacher && assignment?.problems && 
    (assignment.problems as ProblemWithUserSubmission[]).every(problem => 
      problem.completed || problem.manuallyMarked
    );

  const handleMarkAllCompleted = useCallback(async () => {
    // Early return if already processing or conditions not met
    if (!assignmentId || !user?.id || isMarkingCompleted || hasMarkedCompleted || allCompleted) {
      return;
    }
    
    // Disable the button immediately when clicked
    setIsMarkingCompleted(true);
    setHasMarkedCompleted(true);
    
    try {
      await markAllAsCompleted(assignmentId, user.id);
      toast.success('Successfully marked all problems as manually completed!');
      await fetchAssignment(); // Refresh to show updated status
    } catch (error: unknown) {
      console.error('Failed to mark all as manually completed:', error);
      
      // Reset the flag if there was an error so user can try again
      setHasMarkedCompleted(false);
      
      const errorResponse = error as { response?: { data?: { migrationRequired?: boolean }; status?: number } };
      if (errorResponse.response?.data?.migrationRequired) {
        toast.error('Manual completion feature requires database setup. Please contact your teacher.');
      } else if (errorResponse.response?.status === 401) {
        toast.error('Please log in to mark problems as manually complete');
      } else if (errorResponse.response?.status === 403) {
        toast.error('You can only mark your own problems as manually completed');
      } else {
        toast.error('Failed to mark all problems as manually completed');
      }
    } finally {
      setIsMarkingCompleted(false);
    }
  }, [assignmentId, user?.id, isMarkingCompleted, hasMarkedCompleted, allCompleted, fetchAssignment]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!assignment) {
    return <div className="text-center py-10">Assignment not found.</div>;
  }

  // Calculate progress for students
  const studentProblems = assignment.problems as ProblemWithUserSubmission[];
  
  // For main progress: Only count automatic completion (actual submissions)
  const autoCompletedCount = studentProblems ? studentProblems.filter(p => p.completed).length : 0;
  const totalCount = studentProblems ? studentProblems.length : 0;
  const progressPercentage = totalCount > 0 ? Math.round((autoCompletedCount / totalCount) * 100) : 0;
  
  // Manual marking is tracked separately for student's self-reporting
  const manuallyMarkedCount = studentProblems ? studentProblems.filter(p => p.manuallyMarked && !p.completed).length : 0;

  // Button should be disabled if: 
  // 1. Currently marking as completed (API call in progress)
  // 2. Already marked as completed (until database confirms update)
  // 3. All problems are already completed
  const isButtonDisabled = isMarkingCompleted || hasMarkedCompleted || allCompleted;

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{assignment.title}</CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Assigned: {new Date(assignment.assignDate).toLocaleDateString()}</span>
                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                {isTeacher && assignment.lastSubmissionCheck && (
                  <span>Last checked: {new Date(assignment.lastSubmissionCheck).toLocaleString()}</span>
                )}
              </div>
            </div>
              <div className="flex gap-2">
              {isTeacher ? (
                <>
                <Button asChild variant="outline">
                  <Link to={`/assignments/${assignment.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button onClick={handleCheckSubmissions} disabled={isChecking}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Checking...' : 'Check Submissions'}
                </Button>
                </>
              ) : (
                <Button 
                  onClick={handleMarkAllCompleted}
                  disabled={isButtonDisabled}
                  variant={allCompleted ? "secondary" : "default"}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isMarkingCompleted ? 'Marking...' : 
                   allCompleted ? 'All Completed!' : 
                   hasMarkedCompleted ? 'Marked!' : 'Mark All as Completed'}
                </Button>
              )}
              </div>
          </div>
        </CardHeader>
        <CardContent>
          {assignment.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{assignment.description}</p>
            </div>
          )}

          <div>
            {isTeacher ? (
              <>
                <h3 className="font-semibold mb-4">Submission Status</h3>
                <div className="space-y-6">
                  <CompletionStats assignment={assignment as AssignmentWithSubmissions} />
                  <SubmissionStatusGrid 
                    assignment={assignment as AssignmentWithSubmissions} 
                    onRefresh={fetchAssignment}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Simple Progress Section for Students */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-4">Your Progress</h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Actual Completion (Verified Submissions)</span>
                        <span className="text-sm text-muted-foreground">
                          {autoCompletedCount} of {totalCount}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                          {progressPercentage}% Complete
                        </Badge>
                        {progressPercentage === 100 && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            All Verified!
                          </Badge>
                        )}
                      </div>
                      
                      {/* Manual marking is separate - for student self-reporting only */}
                      {manuallyMarkedCount > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Self-Reported Completion</span>
                            <span className="text-blue-600">{manuallyMarkedCount} manually marked</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            These are problems you've marked as completed. They don't count toward verified progress.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <h3 className="font-semibold mb-4">Problems</h3>
                <ProblemCompletionList 
                  problems={assignment.problems as ProblemWithUserSubmission[]} 
                  isTeacher={false}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignmentDetailsPage; 