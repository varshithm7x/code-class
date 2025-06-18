import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Shield, 
  Key, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Activity,
  Clock
} from 'lucide-react';

interface Judge0ClassStatus {
  classId: string;
  className: string;
  students: Array<{
    id: string;
    name: string;
    email: string;
    hasKey: boolean;
    keyStatus: string;
    isSharedWithClass: boolean;
    poolStatus: string | null;
    dailyUsage: number;
    dailyLimit: number;
    lastUsed: string | null;
  }>;
  statistics: {
    totalStudents: number;
    studentsWithKeys: number;
    studentsSharing: number;
    totalDailyQuota: number;
    totalUsedQuota: number;
    availableQuota: number;
    keyProvisionPercentage: number;
    sharingPercentage: number;
  };
}

interface Judge0StatusDashboardProps {
  classId: string;
  className?: string;
}

const Judge0StatusDashboard: React.FC<Judge0StatusDashboardProps> = ({ classId, className }) => {
  const [status, setStatus] = useState<Judge0ClassStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/classes/${classId}/judge0-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch Judge0 status');
      }
    } catch (err) {
      setError('Error fetching Judge0 status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [classId]);

  const getStatusIcon = (keyStatus: string) => {
    switch (keyStatus) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'EXHAUSTED':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'INVALID':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (keyStatus: string, hasKey: boolean) => {
    if (!hasKey) {
      return <Badge variant="secondary">No Key</Badge>;
    }
    
    switch (keyStatus) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'EXHAUSTED':
        return <Badge variant="warning">Exhausted</Badge>;
      case 'INVALID':
        return <Badge variant="destructive">Invalid</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getQuotaColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Judge0 API Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading status...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Judge0 API Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={fetchStatus} 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const { students, statistics } = status;

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Judge0 API Status - {status.className}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Key Provision Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">API Keys</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.studentsWithKeys}/{statistics.totalStudents}
              </div>
              <div className="text-xs text-gray-600">
                {statistics.keyProvisionPercentage}% provision rate
              </div>
              <Progress 
                value={statistics.keyProvisionPercentage} 
                className="h-2"
              />
            </div>

            {/* Sharing Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Sharing</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.studentsSharing}/{statistics.studentsWithKeys}
              </div>
              <div className="text-xs text-gray-600">
                {statistics.sharingPercentage}% sharing rate
              </div>
              <Progress 
                value={statistics.sharingPercentage} 
                className="h-2"
              />
            </div>

            {/* Daily Quota */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Daily Quota</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {statistics.totalDailyQuota}
              </div>
              <div className="text-xs text-gray-600">
                Total available requests
              </div>
            </div>

            {/* Usage Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Usage</span>
              </div>
              <div className={`text-2xl font-bold ${getQuotaColor(statistics.totalUsedQuota, statistics.totalDailyQuota)}`}>
                {statistics.totalUsedQuota}/{statistics.totalDailyQuota}
              </div>
              <div className="text-xs text-gray-600">
                {statistics.availableQuota} remaining
              </div>
              <Progress 
                value={(statistics.totalUsedQuota / statistics.totalDailyQuota) * 100} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {statistics.keyProvisionPercentage < 70 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommendation:</strong> Only {statistics.keyProvisionPercentage}% of students have provided API keys. 
            Consider encouraging more students to add their Judge0 API keys for better test coverage.
          </AlertDescription>
        </Alert>
      )}

      {statistics.sharingPercentage < 50 && statistics.studentsWithKeys > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommendation:</strong> Only {statistics.sharingPercentage}% of students with keys are sharing with the class pool. 
            Encourage more sharing to increase total quota capacity.
          </AlertDescription>
        </Alert>
      )}

      {/* Student Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student API Key Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students.map((student) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(student.keyStatus)}
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Key Status */}
                  <div className="text-center">
                    {getStatusBadge(student.keyStatus, student.hasKey)}
                  </div>

                  {/* Sharing Status */}
                  <div className="text-center">
                    <Badge variant={student.isSharedWithClass ? "default" : "secondary"}>
                      {student.isSharedWithClass ? "Sharing" : "Private"}
                    </Badge>
                  </div>

                  {/* Usage Info */}
                  {student.isSharedWithClass && (
                    <div className="text-center min-w-[80px]">
                      <p className={`text-sm font-mono ${getQuotaColor(student.dailyUsage, student.dailyLimit)}`}>
                        {student.dailyUsage}/{student.dailyLimit}
                      </p>
                      <p className="text-xs text-gray-600">usage</p>
                    </div>
                  )}

                  {/* Last Used */}
                  {student.lastUsed && (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        {new Date(student.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {students.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                No students enrolled in this class yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Judge0StatusDashboard; 