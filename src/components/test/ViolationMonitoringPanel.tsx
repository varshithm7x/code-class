import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertTriangleIcon, ShieldIcon, UserIcon } from 'lucide-react';

interface ViolationData {
  sessionId: string;
  studentName: string;
  violationType: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ViolationMonitoringPanelProps {
  testId: string;
  violations: ViolationData[];
  onTerminateStudent: (sessionId: string) => void;
  onWarnStudent: (sessionId: string) => void;
}

const ViolationMonitoringPanel: React.FC<ViolationMonitoringPanelProps> = ({
  testId,
  violations = [],
  onTerminateStudent,
  onWarnStudent
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-blue-100 text-blue-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'TAB_SWITCH':
      case 'FULLSCREEN_EXIT':
      case 'FOCUS_LOSS':
        return <AlertTriangleIcon className="h-4 w-4" />;
      case 'COPY_PASTE':
      case 'DEV_TOOLS':
      case 'CONTEXT_MENU':
        return <ShieldIcon className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Violation Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Total Violations</p>
                <p className="text-2xl font-bold">{violations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShieldIcon className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">High Risk</p>
                <p className="text-2xl font-bold">
                  {violations.filter(v => v.severity === 'HIGH' || v.severity === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <div>
                <p className="text-sm font-medium">Students Flagged</p>
                <p className="text-2xl font-bold">
                  {new Set(violations.map(v => v.sessionId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangleIcon className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Recent (5min)</p>
                <p className="text-2xl font-bold">
                  {violations.filter(v => 
                    new Date().getTime() - new Date(v.timestamp).getTime() < 5 * 60 * 1000
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Violations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Violations</CardTitle>
          <CardDescription>
            Real-time monitoring of student violations during the test
          </CardDescription>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="text-center py-8">
              <ShieldIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No violations detected</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Students are following test guidelines</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.slice(0, 10).map((violation, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getViolationIcon(violation.violationType)}
                        <span>{violation.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {violation.violationType.replace('_', ' ').toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(violation.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onWarnStudent(violation.sessionId)}
                        >
                          Warn
                        </Button>
                        {violation.severity === 'CRITICAL' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onTerminateStudent(violation.sessionId)}
                          >
                            Terminate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViolationMonitoringPanel; 
