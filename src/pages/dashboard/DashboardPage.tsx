import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments } from '../../api/assignments';
import { getClassCompletionData, getPlatformData, getDifficultyData } from '../../api/analytics';
import { StudentAssignment, CompletionData, PlatformData, DifficultyData } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AssignmentList from '../../components/assignments/AssignmentList';
import CalendarHeatmap from '../../components/ui/CalendarHeatmap';
import LoadingScreen from '../../components/ui/LoadingScreen';
import LineChart from '../../components/ui/charts/LineChart';
import BarChart from '../../components/ui/charts/BarChart';
import PieChart from '../../components/ui/charts/PieChart';
import CompletionGrid from '../../components/assignments/CompletionGrid';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'TEACHER';
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [completionData, setCompletionData] = useState<CompletionData[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [difficultyData, setDifficultyData] = useState<DifficultyData[]>([]);
  
  // For student dashboard
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [heatmapData, setHeatmapData] = useState<{date: string; count: number}[]>([]);

  // Mock data for teacher dashboard - would come from API in real app
  const mockCompletionGridData = {
    "student1": { "assignment1": true, "assignment2": false, "assignment3": true },
    "student2": { "assignment1": true, "assignment2": true, "assignment3": false },
    "student3": { "assignment1": false, "assignment2": false, "assignment3": true }
  };

  const mockStudents = [
    { id: "student1", name: "Alex Johnson", email: "alex@example.com" },
    { id: "student2", name: "Jamie Smith", email: "jamie@example.com" },
    { id: "student3", name: "Taylor Brown", email: "taylor@example.com" }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const assignmentsData = await getMyAssignments();
        setAssignments(assignmentsData);
        
        if (isTeacher) {
          // For teacher dashboard
          const classId = "class1"; // In a real app, you would select a class
          const completionData = await getClassCompletionData(classId);
          const platformData = await getPlatformData(classId);
          const difficultyData = await getDifficultyData(classId);
          
          setCompletionData(completionData);
          setPlatformData(platformData);
          setDifficultyData(difficultyData);
        } else {
          // For student dashboard
          const completed = assignmentsData.filter(a => a.status === 'completed');
          setSolvedCount(completed.length);
          
          // Generate heatmap data from completed assignments
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return {
              date: date.toISOString().split('T')[0],
              count: 0
            };
          }).reverse();
          
          // Count submissions by date
          completed.forEach(assignment => {
            if (assignment.submittedDate) {
              const submittedDate = assignment.submittedDate.split('T')[0];
              const heatmapEntry = last7Days.find(entry => entry.date === submittedDate);
              if (heatmapEntry) {
                heatmapEntry.count += 1;
              }
            }
          });
          
          setHeatmapData(last7Days);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isTeacher]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {isTeacher
            ? "Monitor your students' performance and assignments."
            : "Track your progress and manage your assignments."}
        </p>
      </div>

      {isTeacher ? (
        // Teacher Dashboard
        <div className="grid gap-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Class Completion Rate</CardTitle>
                <CardDescription>Daily completion percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart 
                  data={completionData} 
                  xKey="date" 
                  yKey="completionRate" 
                  xLabel="Date" 
                  yLabel="Completion Rate (%)" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Platform Distribution</CardTitle>
                <CardDescription>Submissions by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart 
                  data={platformData} 
                  xKey="platform" 
                  yKey="count" 
                  xLabel="Platform" 
                  yLabel="Submissions" 
                />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Difficulty Distribution</CardTitle>
                <CardDescription>Completed assignments by difficulty</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart 
                  data={difficultyData} 
                  nameKey="difficulty" 
                  dataKey="count" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Upcoming Assignments</CardTitle>
                <CardDescription>Recently assigned problems</CardDescription>
              </CardHeader>
              <CardContent>
                <AssignmentList 
                  assignments={assignments.slice(0, 3)} 
                  className="max-h-[300px] overflow-y-auto" 
                />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>Completion status by student and assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <CompletionGrid 
                students={mockStudents}
                assignments={assignments} 
                completionData={mockCompletionGridData} 
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        // Student Dashboard
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Problems Solved</CardTitle>
                <CardDescription>Your submission statistics</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="text-5xl font-bold text-brand-blue">{solvedCount}</span>
                  <span className="text-sm text-muted-foreground">assignments completed</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>Your submission activity for the last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <CalendarHeatmap data={heatmapData} />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Assignments</CardTitle>
              <CardDescription>Tasks due soon</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentList 
                assignments={assignments.filter(a => a.status === 'pending')} 
                showStatus 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recently Completed</CardTitle>
              <CardDescription>Your recent submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentList 
                assignments={assignments.filter(a => a.status === 'completed')} 
                showStatus 
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
