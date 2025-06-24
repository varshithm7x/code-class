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
  Award
} from 'lucide-react';
import { 
  StudentDetailedAnalytics,
  getStudentDetailedAnalytics 
} from '../../api/analytics';
import { format } from 'date-fns';

export const StudentAnalyticsPage: React.FC = () => {
  const { studentId, classId } = useParams<{ studentId: string; classId: string }>();
  const [analytics, setAnalytics] = useState<StudentDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (studentId && classId) {
      fetchStudentAnalytics();
    }
  }, [studentId, classId]);

  const fetchStudentAnalytics = async () => {
    if (!studentId || !classId) return;
    setLoading(true);
    try {
      const data = await getStudentDetailedAnalytics(studentId, classId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{analytics?.studentName} - Detailed Analytics</h2>
              <p className="text-muted-foreground">{analytics?.email}</p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>Back to Dashboard</Button>
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
                    <div className="text-3xl font-bold text-teal-600">
                      {analytics.performanceMetrics.consistencyScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Consistency</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly Progress */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Weekly Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    <BarChart
                      data={analytics.weeklyProgress.map(w => ({ name: w.week, completed: w.completedProblems }))}
                      xKey="name"
                      bars={[{ key: 'completed', name: 'Completed Problems', color: '#3b82f6' }]}
                      yLabel="Problems"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Difficulty Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Difficulty Breakdown (Completed)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    <PieChart
                      data={[
                        { name: 'Easy', value: analytics.difficultyBreakdown.easy.completed },
                        { name: 'Medium', value: analytics.difficultyBreakdown.medium.completed },
                        { name: 'Hard', value: analytics.difficultyBreakdown.hard.completed },
                      ]}
                      colors={['#22c55e', '#f97316', '#ef4444']}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Platform Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Stats</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-bold text-orange-600">LeetCode</div>
                    <div className="text-2xl font-bold">{analytics.platformStats.leetcode.solved}</div>
                    <div className="text-sm text-muted-foreground">
                      / {analytics.platformStats.leetcode.total} problems
                    </div>
                    <Progress 
                      value={(analytics.platformStats.leetcode.solved / Math.max(analytics.platformStats.leetcode.total, 1)) * 100} 
                      className="mt-2" 
                    />
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-bold text-green-600">GeeksforGeeks</div>
                    <div className="text-2xl font-bold">{analytics.platformStats.geeksforgeeks.solved}</div>
                    <div className="text-sm text-muted-foreground">
                      / {analytics.platformStats.geeksforgeeks.total} problems
                    </div>
                    <Progress 
                      value={(analytics.platformStats.geeksforgeeks.solved / Math.max(analytics.platformStats.geeksforgeeks.total, 1)) * 100} 
                      className="mt-2" 
                    />
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-bold text-blue-600">HackerRank</div>
                    <div className="text-2xl font-bold">{analytics.platformStats.hackerrank.solved}</div>
                    <div className="text-sm text-muted-foreground">
                      / {analytics.platformStats.hackerrank.total} problems
                    </div>
                    <Progress 
                      value={(analytics.platformStats.hackerrank.solved / Math.max(analytics.platformStats.hackerrank.total, 1)) * 100} 
                      className="mt-2" 
                    />
                  </div>
                </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-3">
                  {analytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        <div>
                          <div className="font-medium">{activity.problemTitle}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.activity} • {activity.difficulty}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(activity.date), 'MMM dd')}
                      </div>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>No analytics data available for this student.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 