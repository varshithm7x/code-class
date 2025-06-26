import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import BarChart from '../ui/charts/BarChart';
import LineChart from '../ui/charts/LineChart';
import PieChart from '../ui/charts/PieChart';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  Clock, 
  Target,
  Award,
  Activity,
  Calendar,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  User,
  RefreshCw
} from 'lucide-react';
import { 
  ClassAnalytics, 
  StudentPerformanceData,
  getClassAnalytics,
} from '../../api/analytics';
import { clearClassAnalyticsCache } from '../../utils/analyticsCache';
import { format } from 'date-fns';

// Utility function to truncate long strings
const truncate = (str: string, maxLength: number) => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

interface StudentAnalyticsDashboardProps {
  classId: string;
  className?: string;
}

interface StudentDetailCardProps {
  student: StudentPerformanceData;
  onViewDetails: (studentId: string) => void;
}

const StudentDetailCard: React.FC<StudentDetailCardProps> = ({ student, onViewDetails }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'inactive':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-blue-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">{student.studentName}</CardTitle>
              <CardDescription className="text-sm">{student.email}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon(student.performanceTrend)}
            <Badge className={getRiskColor(student.riskLevel)}>
              {student.riskLevel} risk
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center">
              <div className={`text-xl sm:text-2xl font-bold ${getCompletionColor(student.completionRate)}`}>
                {student.completionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mb-2">Completion Rate</div>
              <Progress value={student.completionRate} className="h-3 w-full bg-gray-200 rounded-full overflow-hidden" />
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {student.completedQuestions}/{student.totalQuestions}
              </div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
          </div>

          {/* Streak Data */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1">
                <Activity className="h-4 w-4 text-orange-500" />
                <span>Current Streak: <strong>{student.streakData.currentStreak}</strong></span>
              </div>
              <div className="text-muted-foreground">
                Best: {student.streakData.longestStreak}
              </div>
            </div>
            {student.streakData.lastSubmission && (
              <div className="text-xs text-muted-foreground mt-1">
                Last submission: {format(new Date(student.streakData.lastSubmission), 'MMM dd, yyyy')}
              </div>
            )}
          </div>

          {/* Performance Trend */}
          <div className="text-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">Recent Trend: {student.performanceTrend}</span>
            </div>
            {student.averageCompletionTime > 0 && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Avg completion: {student.averageCompletionTime.toFixed(1)}h</span>
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewDetails(student.studentId)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Detailed Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export const StudentAnalyticsDashboard: React.FC<StudentAnalyticsDashboardProps> = ({
  classId,
  className
}) => {
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // Cache key for localStorage
  const CACHE_KEY = `class_analytics_${classId}`;
  const CACHE_TIMESTAMP_KEY = `class_analytics_timestamp_${classId}`;

  // Load cached data on component mount
  useEffect(() => {
    loadCachedData();
  }, [classId]);

  const loadCachedData = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cachedTimestamp) {
        const parsedData = JSON.parse(cachedData);
        const timestamp = new Date(cachedTimestamp);
        setAnalytics(parsedData);
        setLastUpdated(timestamp);
      } else {
        // If no cached data, fetch fresh data automatically only once
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to load cached analytics:', error);
      // If cache is corrupted, fetch fresh data
      fetchAnalytics();
    }
  };

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await getClassAnalytics(classId);
      const now = new Date();
      
      // Update state
      setAnalytics(data);
      setLastUpdated(now);
      
      // Cache the data
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toISOString());
      
    } catch (error) {
      console.error("Failed to fetch class analytics:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const handleViewDetails = (studentId: string) => {
    navigate(`/classes/${classId}/students/${studentId}/analytics`);
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-4" />
        <p>Loading class analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p>Could not load analytics for this class.</p>
        <Button onClick={() => fetchAnalytics()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const performanceData = [
    { name: 'Excellent (90-100%)', value: analytics.performanceDistribution.excellent },
    { name: 'Good (70-89%)', value: analytics.performanceDistribution.good },
    { name: 'Average (50-69%)', value: analytics.performanceDistribution.average },
    { name: 'Poor (0-49%)', value: analytics.performanceDistribution.poor },
  ].filter(item => item.value > 0);

  return (
    <div className={className}>
      {/* Header with refresh button and last updated info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Class Analytics</h3>
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh Data'}
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Class Overview</TabsTrigger>
          <TabsTrigger value="students">Student Drilldown</TabsTrigger>
          <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalStudents}</div>
                <p className="text-xs text-muted-foreground">{analytics.activeStudents} active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averageClassPerformance.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Across all assignments</p>
              </CardContent>
            </Card>
                      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalQuestions}</div>
              <p className="text-xs text-muted-foreground">Across {analytics.totalAssignments} assignments</p>
            </CardContent>
          </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At-Risk Students</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.riskStudents.length}</div>
                <p className="text-xs text-muted-foreground">High or medium risk</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Assignment Performance Trends
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Average completion rate per assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="h-[250px] sm:h-[300px] w-full overflow-hidden">
                  <LineChart
                    data={analytics.assignmentTrends.map(t => ({ 
                      name: t.assignmentTitle, // Show full assignment title
                      'Completion Rate': t.completionRate
                    }))}
                    xKey="name"
                    lines={[
                      { key: 'Completion Rate', name: 'Completion Rate', color: '#3b82f6' }
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <PieChartIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Performance Distribution
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Student performance breakdown by completion rate
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="h-[250px] sm:h-[300px] w-full overflow-hidden">
                  <PieChart
                    data={performanceData}
                    colors={['#10b981', '#3b82f6', '#f59e0b', '#ef4444']}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>At-Risk Students</span>
              </CardTitle>
              <CardDescription>
                Students who might need extra help
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.riskStudents.length > 0 ? (
                <ul className="space-y-3">
                  {analytics.riskStudents.map(student => (
                    <li key={student.studentId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center">
                        <Badge className={student.riskLevel === 'high' ? 'bg-red-500' : 'bg-yellow-500'}>
                          {student.riskLevel}
                        </Badge>
                        <span className="ml-3 font-medium">{student.studentName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{student.reasons.join(', ')}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No students are currently identified as at-risk. Great job!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="students" className="mt-6">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {analytics.students.map(student => (
                <StudentDetailCard 
                  key={student.studentId} 
                  student={student} 
                  onViewDetails={handleViewDetails} 
                />
              ))}
            </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <p>Trend analysis coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentAnalyticsDashboard; 