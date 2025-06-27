import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import BarChart from '../../components/ui/charts/BarChart';
import PieChart from '../../components/ui/charts/PieChart';
import { 
  RefreshCw,
  Activity,
  Award,
  ArrowLeft
} from 'lucide-react';
import { 
  StudentDetailedAnalytics,
  getStudentDetailedAnalytics 
} from '../../api/analytics';
import { clearStudentAnalyticsCache } from '../../utils/analyticsCache';
import { format } from 'date-fns';

export const StudentAnalyticsPage: React.FC = () => {
  const { studentId, classId } = useParams<{ studentId: string; classId: string }>();
  const [analytics, setAnalytics] = useState<StudentDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // Cache key for localStorage
  const CACHE_KEY = `student_analytics_${studentId}_${classId}`;
  const CACHE_TIMESTAMP_KEY = `student_analytics_timestamp_${studentId}_${classId}`;

  useEffect(() => {
    if (studentId && classId) {
      loadCachedData();
    }
  }, [studentId, classId]);

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
        fetchStudentAnalytics();
      }
    } catch (error) {
      console.error('Failed to load cached student analytics:', error);
      // If cache is corrupted, fetch fresh data
      fetchStudentAnalytics();
    }
  };

  const fetchStudentAnalytics = async (isManualRefresh = false) => {
    if (!studentId || !classId) return;
    
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await getStudentDetailedAnalytics(studentId, classId);
      const now = new Date();
      
      // Update state
      setAnalytics(data);
      setLastUpdated(now);
      
      // Cache the data
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toISOString());
      
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchStudentAnalytics(true);
  };

  const handleBack = () => {
    // Navigate back to the specific class students tab
    if (classId) {
      navigate(`/classes/${classId}?tab=students`);
    } else {
      navigate(-1);
    }
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

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Class Students
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{analytics?.studentName} - Detailed Analytics</h2>
              <p className="text-muted-foreground">{analytics?.email}</p>
              {lastUpdated && (
                <p className="text-sm text-muted-foreground mt-1">
                  Updated {formatLastUpdated(lastUpdated)}
                </p>
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
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading detailed analytics...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold text-blue-600">
                      {analytics.performanceMetrics.totalPoints}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Points</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.performanceMetrics.averageScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Average Score</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold text-purple-600">
                      {analytics.performanceMetrics.completionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Completion Rate</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold text-orange-600">
                      {analytics.performanceMetrics.timeEfficiency.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Time Efficiency</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-3xl font-bold text-indigo-600">
                      {analytics.performanceMetrics.consistencyScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Consistency Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Stats and Progress Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Platform Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Stats</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="text-center p-3 sm:p-4 border rounded-lg">
                    <div className="text-sm sm:text-lg font-bold text-orange-600">LeetCode</div>
                    <div className="text-xl sm:text-2xl font-bold">{analytics.platformStats.leetcode.solved}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                      / {analytics.platformStats.leetcode.total} problems
                    </div>
                    <Progress 
                      value={(analytics.platformStats.leetcode.solved / Math.max(analytics.platformStats.leetcode.total, 1)) * 100} 
                      className="h-2 sm:h-3 w-full bg-gray-200 rounded-full overflow-hidden" 
                    />
                  </div>
                  <div className="text-center p-3 sm:p-4 border rounded-lg">
                    <div className="text-sm sm:text-lg font-bold text-green-600">GeeksforGeeks</div>
                    <div className="text-xl sm:text-2xl font-bold">{analytics.platformStats.geeksforgeeks.solved}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                      / {analytics.platformStats.geeksforgeeks.total} problems
                    </div>
                    <Progress 
                      value={(analytics.platformStats.geeksforgeeks.solved / Math.max(analytics.platformStats.geeksforgeeks.total, 1)) * 100} 
                      className="h-2 sm:h-3 w-full bg-gray-200 rounded-full overflow-hidden" 
                    />
                  </div>
                  <div className="text-center p-3 sm:p-4 border rounded-lg">
                    <div className="text-sm sm:text-lg font-bold text-blue-600">HackerRank</div>
                    <div className="text-xl sm:text-2xl font-bold">{analytics.platformStats.hackerrank.solved}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                      / {analytics.platformStats.hackerrank.total} problems
                    </div>
                    <Progress 
                      value={(analytics.platformStats.hackerrank.solved / Math.max(analytics.platformStats.hackerrank.total, 1)) * 100} 
                      className="h-2 sm:h-3 w-full bg-gray-200 rounded-full overflow-hidden" 
                    />
                  </div>
                </div>
                </CardContent>
              </Card>

              {/* Progress Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.weeklyProgress && analytics.weeklyProgress.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <BarChart 
                        data={analytics.weeklyProgress.map(item => ({
                          name: item.week,
                          "Questions Done": item.completedProblems
                        }))}
                        xKey="name"
                        yKey="Questions Done"
                        xLabel="Week"
                        yLabel="Questions Done"
                        color="#3b82f6"
                        height={300}
                      />
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No weekly progress data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentActivity?.length > 0 ? (
                    analytics.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Activity className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{activity.problemTitle}</p>
                            <p className="text-sm text-muted-foreground">{activity.activity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={activity.completed ? 'default' : 'secondary'}>
                            {activity.completed ? 'Completed' : 'In Progress'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.date), 'MMM dd')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        ) : (
          <div className="text-center p-8">
            <p>No analytics data available for this student.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 