import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AssignmentWithSubmissions } from '../../types';
import { CheckCircle2, Clock, Users, UserCheck } from 'lucide-react';

interface CompletionStatsProps {
  assignment: AssignmentWithSubmissions;
}

const CompletionStats: React.FC<CompletionStatsProps> = ({ assignment }) => {
  const totalStudents = assignment.problems?.[0]?.submissions?.length || 0;
  const totalProblems = assignment.problems?.length || 0;

  // Calculate completion statistics
  const completionStats = assignment.problems?.map(problem => {
    const autoCompleted = problem.submissions.filter(s => s.completed).length;
    const manuallyMarked = problem.submissions.filter(s => s.manuallyMarked && !s.completed).length;
    const totalCompleted = problem.submissions.filter(s => s.completed || s.manuallyMarked).length;
    
    return {
      problemTitle: problem.title,
      autoCompleted,
      manuallyMarked,
      totalCompleted,
      pending: totalStudents - totalCompleted
    };
  }) || [];

  // Overall statistics
  const totalAutoCompleted = completionStats.reduce((sum, stat) => sum + stat.autoCompleted, 0);
  const totalManuallyMarked = completionStats.reduce((sum, stat) => sum + stat.manuallyMarked, 0);
  const totalCompleted = completionStats.reduce((sum, stat) => sum + stat.totalCompleted, 0);
  const totalPossible = totalStudents * totalProblems;
  
  const completionPercentage = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const autoCompletionPercentage = totalPossible > 0 ? Math.round((totalAutoCompleted / totalPossible) * 100) : 0;
  const manualCompletionPercentage = totalPossible > 0 ? Math.round((totalManuallyMarked / totalPossible) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {totalCompleted} of {totalPossible} submissions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auto-Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{autoCompletionPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {totalAutoCompleted} detected submissions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Manually Marked</CardTitle>
          <UserCheck className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{manualCompletionPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {totalManuallyMarked} manual markings
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionStats; 