import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClassDetails, getClassAssignments } from '../../api/classes';
import { deleteAssignment } from '../../api/assignments';
import { ClassWithStudents, Assignment, Student } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import AssignmentList from '../../components/assignments/AssignmentList';
import CompletionGrid from '../../components/assignments/CompletionGrid';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { Plus, Users, BookOpen, Award, Copy } from 'lucide-react';

const ClassDetailsPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.role === 'TEACHER';
  
  const [classDetails, setClassDetails] = useState<ClassWithStudents | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock data for the completion grid
  const [completionData, setCompletionData] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!classId) return;
      
      setIsLoading(true);
      try {
        const [classData, assignmentsData] = await Promise.all([
          getClassDetails(classId),
          getClassAssignments(classId),
        ]);
        
        setClassDetails(classData);
        setAssignments(assignmentsData);
        
        // Generate mock completion data
        // In a real app, this would come from the API
        const mockCompletionData: Record<string, Record<string, boolean>> = {};
        
        classData.students.forEach(student => {
          mockCompletionData[student.id] = {};
          assignmentsData.forEach(assignment => {
            mockCompletionData[student.id][assignment.id] = Math.random() > 0.3; // 70% chance of completion
          });
        });
        
        setCompletionData(mockCompletionData);
      } catch (error) {
        console.error('Error fetching class details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load class details.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [classId, toast]);

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId);
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      toast({
        title: 'Assignment deleted',
        description: 'The assignment has been successfully removed.',
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assignment.',
        variant: 'destructive',
      });
    }
  };

  const copyJoinCode = () => {
    if (classDetails) {
      navigator.clipboard.writeText(classDetails.joinCode);
      toast({
        title: 'Join code copied!',
        description: 'The class join code has been copied to clipboard.',
      });
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!classDetails) {
    return (
      <div className="py-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Class not found</h1>
        <Button asChild>
          <Link to="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{classDetails.name}</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher 
              ? `${classDetails.students.length} enrolled students` 
              : `Teacher: ${classDetails.teacherName}`
            }
          </p>
        </div>
        
        {isTeacher && (
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/classes/${classId}/assignments/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="bg-muted px-3 py-1 rounded font-mono text-sm">
                {classDetails.joinCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyJoinCode}
                title="Copy join code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">
            <BookOpen className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Award className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
          {isTeacher && (
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-2" />
              Students
            </TabsTrigger>
          )}
          {isTeacher && (
            <TabsTrigger value="progress">
              <Award className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
              <CardDescription>Details about this class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Class Name</h3>
                <p>{classDetails.name}</p>
              </div>
              <div>
                <h3 className="font-medium">Teacher</h3>
                <p>{classDetails.teacherName}</p>
              </div>
              <div>
                <h3 className="font-medium">Created On</h3>
                <p>{new Date(classDetails.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="font-medium">Students</h3>
                <p>{classDetails.students.length} enrolled</p>
              </div>
              <div>
                <h3 className="font-medium">Assignments</h3>
                <p>{assignments.length} total</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
              <CardDescription>Latest assignments for this class</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentList 
                assignments={assignments.slice(0, 5)} 
                onDelete={isTeacher ? handleDeleteAssignment : undefined}
              />
              {assignments.length > 5 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('assignments')}
                  >
                    View All Assignments
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assignments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Assignments</CardTitle>
                <CardDescription>Assignments for this class</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <AssignmentList 
                assignments={assignments} 
                onDelete={isTeacher ? handleDeleteAssignment : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {isTeacher && (
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>Students in this class</CardDescription>
              </CardHeader>
              <CardContent>
                {classDetails.students.length === 0 ? (
                  <p className="py-4 text-muted-foreground text-center">
                    No students enrolled yet. Share the join code to invite students.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platforms</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classDetails.students.map((student: Student) => (
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.email}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {student.profiles?.hackerrank && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    HackerRank
                                  </span>
                                )}
                                {student.profiles?.leetcode && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                    LeetCode
                                  </span>
                                )}
                                {student.profiles?.gfg && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    GeeksForGeeks
                                  </span>
                                )}
                                {!student.profiles?.hackerrank && !student.profiles?.leetcode && !student.profiles?.gfg && (
                                  <span className="text-gray-400 text-sm">None linked</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {isTeacher && (
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Class Progress</CardTitle>
                <CardDescription>Track completion for all students</CardDescription>
              </CardHeader>
              <CardContent>
                <CompletionGrid 
                  students={classDetails.students} 
                  assignments={assignments}
                  completionData={completionData} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ClassDetailsPage;
