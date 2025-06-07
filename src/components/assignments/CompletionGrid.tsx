import React, { useState, useMemo } from 'react';
import { Student, Assignment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckCircle2, XCircle, TrendingUp, Users, BookOpen, Calendar } from 'lucide-react';

interface CompletionGridProps {
  students: Student[];
  assignments: Assignment[];
  completionData: Record<string, Record<string, boolean>>;
}

const CompletionGrid: React.FC<CompletionGridProps> = ({ students, assignments, completionData }) => {
  const [viewMode, setViewMode] = useState<'students' | 'assignments'>('students');
  const [sortBy, setSortBy] = useState<'name' | 'completion'>('completion');

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalPossibleCompletions = students.length * assignments.length;
    const completedCount = Object.values(completionData).reduce(
      (sum, studentData) => sum + Object.values(studentData).filter(Boolean).length,
      0
    );
    
    const overallPercentage = totalPossibleCompletions > 0
      ? Math.round((completedCount / totalPossibleCompletions) * 100)
      : 0;

    // Calculate per-assignment completion rates
    const assignmentStats = assignments.map(assignment => {
      const completedStudents = students.filter(student => 
        completionData[student.id]?.[assignment.id]
      ).length;
      const completionRate = students.length > 0 
        ? Math.round((completedStudents / students.length) * 100)
        : 0;
      
      return {
        ...assignment,
        completedStudents,
        completionRate
      };
    });

    // Calculate per-student completion rates
    const studentStats = students.map(student => {
      const studentCompletions = completionData[student.id] || {};
      const completedCount = Object.values(studentCompletions).filter(Boolean).length;
      const completionRate = assignments.length > 0
        ? Math.round((completedCount / assignments.length) * 100)
        : 0;
      
      return {
        ...student,
        completedCount,
        completionRate
      };
    });

    return {
      overallPercentage,
      assignmentStats,
      studentStats,
      totalStudents: students.length,
      totalAssignments: assignments.length
    };
  }, [students, assignments, completionData]);

  // Sort students or assignments based on selection
  const sortedStudentStats = useMemo(() => {
    return [...stats.studentStats].sort((a, b) => {
      if (sortBy === 'completion') {
        return b.completionRate - a.completionRate;
      }
      return a.name.localeCompare(b.name);
    });
  }, [stats.studentStats, sortBy]);

  const sortedAssignmentStats = useMemo(() => {
    return [...stats.assignmentStats].sort((a, b) => {
      if (sortBy === 'completion') {
        return b.completionRate - a.completionRate;
      }
      return a.title.localeCompare(b.title);
    });
  }, [stats.assignmentStats, sortBy]);

  if (students.length === 0 || assignments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No data available to display the completion grid.
        </p>
      </div>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
                <p className={`text-2xl font-bold ${getTextColor(stats.overallPercentage)}`}>
                  {stats.overallPercentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assignments</p>
                <p className="text-2xl font-bold">{stats.totalAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Completion</p>
                <p className={`text-2xl font-bold ${getTextColor(stats.overallPercentage)}`}>
                  {stats.overallPercentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'students' ? 'default' : 'outline'}
            onClick={() => setViewMode('students')}
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            By Students
          </Button>
          <Button
            variant={viewMode === 'assignments' ? 'default' : 'outline'}
            onClick={() => setViewMode('assignments')}
            size="sm"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            By Assignments
          </Button>
        </div>

        <Select value={sortBy} onValueChange={(value: 'name' | 'completion') => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completion">Sort by Progress</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Student View */}
      {viewMode === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedStudentStats.map((student) => (
            <Card key={student.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <Badge variant="secondary" className={getTextColor(student.completionRate)}>
                    {student.completionRate}%
                  </Badge>
                </div>
                <Progress 
                  value={student.completionRate} 
                  className="w-full"
                />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>{student.completedCount} of {assignments.length} completed</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {assignments.slice(0, 6).map((assignment) => {
                    const isCompleted = completionData[student.id]?.[assignment.id] || false;
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center space-x-2 p-2 rounded-lg border"
                        title={assignment.title}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-xs truncate">{assignment.title}</span>
                      </div>
                    );
                  })}
                  {assignments.length > 6 && (
                    <div className="flex items-center justify-center p-2 rounded-lg border text-xs text-muted-foreground">
                      +{assignments.length - 6} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment View */}
      {viewMode === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedAssignmentStats.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <Badge variant="secondary" className={getTextColor(assignment.completionRate)}>
                    {assignment.completionRate}%
                  </Badge>
                </div>
                <Progress 
                  value={assignment.completionRate} 
                  className="w-full"
                />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>{assignment.completedStudents} of {students.length} completed</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {students.map((student) => {
                    const isCompleted = completionData[student.id]?.[assignment.id] || false;
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-2 rounded-lg border text-sm"
                      >
                        <span>{student.name}</span>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletionGrid;
