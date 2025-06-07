import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAssignmentDetails, checkSubmissionsForAssignment } from '../../api/assignments';
import { AssignmentWithSubmissions } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import SubmissionStatusGrid from '../../components/assignments/SubmissionStatusGrid';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

const AssignmentDetailsPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<AssignmentWithSubmissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';

  const fetchAssignment = async () => {
    if (!assignmentId) return;
    try {
      const data = await getAssignmentDetails(assignmentId);
      setAssignment(data);
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
      await checkSubmissionsForAssignment(assignmentId);
      toast.success('Submission check complete. Data has been updated.');
      await fetchAssignment();
    } catch (error) {
      console.error('Failed to check submissions', error);
      toast.error('Failed to check submissions.');
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!assignment) {
    return <div className="text-center py-10">Assignment not found.</div>;
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{assignment.title}</CardTitle>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>Assigned: {new Date(assignment.assignDate).toLocaleDateString()}</span>
                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
            {isTeacher && (
              <div className="flex gap-2">
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
              </div>
            )}
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
            <h3 className="font-semibold mb-4">
              {isTeacher ? 'Submission Status' : 'Problems'}
            </h3>
            {isTeacher ? (
              <SubmissionStatusGrid assignment={assignment} />
            ) : (
              <div className="space-y-4">
                {assignment.problems.map((problem) => (
                  <a
                    key={problem.id}
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{problem.title}</span>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline">{problem.platform}</Badge>
                        <Badge>{problem.difficulty}</Badge>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignmentDetailsPage; 