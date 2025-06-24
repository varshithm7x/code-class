import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClassDetails, getClassAssignments, removeStudentFromClass } from '../../api/classes';
import { deleteAssignment } from '../../api/assignments';
import { ClassWithStudents, Assignment, TeacherAssignment, StudentAssignment, Student } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { triggerDataRefresh, DATA_REFRESH_EVENTS } from '../../utils/dataRefresh';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import AssignmentList from '../../components/assignments/AssignmentList';
import CompletionGrid from '../../components/assignments/CompletionGrid';
import LoadingScreen from '../../components/ui/LoadingScreen';
import LeetCodeStats from '../../components/ui/LeetCodeStats';
import AnnouncementList from '../../components/announcements/AnnouncementList';
import TestList from '../../components/tests/TestList';
import { CodingTest } from '../../components/tests/TestCard';
import { Plus, Users, BookOpen, Award, Copy, Code, TrendingUp, Search, Megaphone, Terminal, UserMinus, Key, Shield } from 'lucide-react';
import { Input } from '../../components/ui/input';
import SubmissionStatusChecker from '../../components/classes/SubmissionStatusChecker';


const ClassDetailsPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.role === 'TEACHER';
  
  const [classDetails, setClassDetails] = useState<ClassWithStudents | null>(null);
  const [assignments, setAssignments] = useState<(Assignment | TeacherAssignment | StudentAssignment)[]>([]);
  const [tests, setTests] = useState<CodingTest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [studentSearch, setStudentSearch] = useState('');

  
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
        
        // Mock test data for now - will be replaced with API call
        const mockTests: CodingTest[] = [
          {
            id: '1',
            title: 'Data Structures Quiz',
            description: 'Test covering arrays, linked lists, and stacks',
            duration: 90,
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
            status: 'SCHEDULED',
            classId: classId,
            problems: [],
            sessions: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setTests(mockTests);
        
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
      
      // Update local state immediately for better UX
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      
      // Refresh class details to ensure all counts are updated
      if (classId) {
        try {
          const [refreshedClassData, refreshedAssignments] = await Promise.all([
            getClassDetails(classId),
            getClassAssignments(classId),
          ]);
          setClassDetails(refreshedClassData);
          setAssignments(refreshedAssignments);
        } catch (refreshError) {
          console.error('Error refreshing data after deletion:', refreshError);
          // Don't show error toast for refresh failure since main operation succeeded
        }
      }
      
      // Trigger refresh events for other pages
      triggerDataRefresh(DATA_REFRESH_EVENTS.ASSIGNMENTS_UPDATED, { classId, deletedAssignmentId: assignmentId });
      triggerDataRefresh(DATA_REFRESH_EVENTS.CLASSES_UPDATED);
      triggerDataRefresh(DATA_REFRESH_EVENTS.LEADERBOARD_UPDATED);
      
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

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName} from this class? This will delete all their progress and submissions.`)) {
      return;
    }

    if (!classId) return;

    try {
      await removeStudentFromClass(classId, studentId);
      
      // Update local state immediately for better UX
      if (classDetails) {
        const updatedStudents = classDetails.students.filter(s => s.id !== studentId);
        setClassDetails({
          ...classDetails,
          students: updatedStudents
        });
      }
      
      // Trigger refresh events
      triggerDataRefresh(DATA_REFRESH_EVENTS.CLASSES_UPDATED);
      
      toast({
        title: 'Student Removed',
        description: `${studentName} has been successfully removed from the class.`,
      });
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove student from class.',
        variant: 'destructive',
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
            <Button asChild variant="outline">
              <Link to={`/classes/${classId}/tests/new`}>
                <Terminal className="mr-2 h-4 w-4" />
                Create Test
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
          <TabsTrigger value="tests">
            <Terminal className="h-4 w-4 mr-2" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="h-4 w-4 mr-2" />
            Announcements
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Class Statistics</span>
                </CardTitle>
                <CardDescription>LeetCode integration overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const linkedStudents = classDetails.students.filter(s => s.leetcodeCookieStatus === 'LINKED');
                  const expiredStudents = classDetails.students.filter(s => s.leetcodeCookieStatus === 'EXPIRED');
                  const totalSolved = linkedStudents.reduce((sum, s) => sum + (s.leetcodeTotalSolved || 0), 0);
                  const avgSolved = linkedStudents.length > 0 ? Math.round(totalSolved / linkedStudents.length) : 0;
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{linkedStudents.length}</div>
                          <div className="text-sm text-green-600">Linked Accounts</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{avgSolved}</div>
                          <div className="text-sm text-orange-600">Avg. Problems</div>
                        </div>
                      </div>
                      
                      {expiredStudents.length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-600">
                            {expiredStudents.length} student(s) have expired LeetCode links
                          </div>
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground">
                        {classDetails.students.length - linkedStudents.length - expiredStudents.length} students haven't linked LeetCode yet
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
          
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

        <TabsContent value="tests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Coding Tests</CardTitle>
                <CardDescription>
                  {isTeacher 
                    ? "Create and manage coding tests for this class" 
                    : "View upcoming and completed coding tests"
                  }
                </CardDescription>
              </div>
              {isTeacher && (
                <Button asChild>
                  <Link to={`/classes/${classId}/tests/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test
                  </Link>
                </Button>
              )}
            </CardHeader>
                         <CardContent>
               <TestList
                 tests={tests}
                 isTeacher={isTeacher}
                 emptyMessage={isTeacher 
                   ? "No tests created yet. Create your first coding test to get started." 
                   : "Your teacher hasn't created any tests yet."
                 }
               />
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          {classId && <AnnouncementList classId={classId} />}
        </TabsContent>
        
        {isTeacher && (
          <TabsContent value="students">
            <div className="space-y-6">
              {/* Submission Status Checker */}
              <SubmissionStatusChecker classId={classId || ''} />
              

              
              {/* Student List */}
              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>
                    Search for students and view their profiles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>

                  {classDetails.students.length === 0 ? (
                    <p className="py-4 text-muted-foreground text-center">
                      No students enrolled yet. Share the join code to invite students.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {classDetails.students
                        .filter(s => 
                          s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          s.email.toLowerCase().includes(studentSearch.toLowerCase())
                        )
                        .map((student: Student) => (
                        <div key={student.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <Link to={`/students/${student.id}`} className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="font-semibold text-lg">{student.name}</p>
                                  <p className="text-sm text-muted-foreground">{student.email}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex flex-wrap gap-2">
                                {student.leetcodeUsername && (
                                  <div className="flex items-center space-x-1 text-sm">
                                    <Code className="h-4 w-4 text-orange-500" />
                                    <span className="text-muted-foreground">@{student.leetcodeUsername}</span>
                                  </div>
                                )}
                                {student.gfgUsername && (
                                  <div className="flex items-center space-x-1 text-sm">
                                    <span className="text-green-600 font-bold">GFG</span>
                                    <span className="text-muted-foreground">@{student.gfgUsername}</span>
                                  </div>
                                )}
                                {student.hackerrankUsername && (
                                  <div className="flex items-center space-x-1 text-sm">
                                    <span className="text-blue-600 font-bold">HR</span>
                                    <span className="text-muted-foreground">@{student.hackerrankUsername}</span>
                                  </div>
                                )}
                              </div>
                            </Link>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 min-w-[200px]">
                                <LeetCodeStats user={student} compact={true} showDetails={false} />
                              </div>

                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveStudent(student.id, student.name);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <UserMinus className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
