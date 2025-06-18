import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  Code, 
  Play, 
  Eye, 
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface CodingTest {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  classId: string;
  problems: TestProblem[];
  sessions?: TestSession[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  explanation?: string;
}

export interface TestProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit: number; // in minutes
  memoryLimit: number; // in MB
  testCases: TestCase[] | string; // Array of test cases or JSON string for backward compatibility
  solution?: string;
  order: number;
  constraints?: string; // Problem constraints
  examples?: string; // Example inputs/outputs
}

export interface TestSession {
  id: string;
  userId: string;
  testId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED';
  startedAt?: Date;
  submittedAt?: Date;
  score?: number;
  penalties: number;
}

interface TestCardProps {
  test: CodingTest;
  isTeacher?: boolean;
  onEdit?: (testId: string) => void;
  onDelete?: (testId: string) => void;
  onView?: (testId: string) => void;
}

const TestCard: React.FC<TestCardProps> = ({ 
  test, 
  isTeacher = false, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'SCHEDULED': return 'Scheduled';
      case 'ACTIVE': return 'Active';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  };

  const isActive = test.status === 'ACTIVE';
  const isUpcoming = test.status === 'SCHEDULED' && new Date() < new Date(test.startTime);
  const canTakeTest = !isTeacher && (isActive || isUpcoming);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{test.title}</CardTitle>
              <Badge className={getStatusColor(test.status)}>
                {getStatusText(test.status)}
              </Badge>
            </div>
            {test.description && (
              <CardDescription className="line-clamp-2">
                {test.description}
              </CardDescription>
            )}
          </div>
          
          {isTeacher && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(test.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(test.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Test
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete?.(test.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Test
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(test.startTime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{test.duration} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <span>{test.problems?.length || 0} problems</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{test.sessions?.length || 0} participants</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <div>Start: {new Date(test.startTime).toLocaleString()}</div>
          <div>End: {new Date(test.endTime).toLocaleString()}</div>
        </div>

        <div className="flex gap-2 pt-2">
          {canTakeTest && (
            <Button asChild className="flex-1">
              <Link to={`/tests/${test.id}/take`}>
                <Play className="mr-2 h-4 w-4" />
                {isActive ? 'Take Test' : 'Join Test'}
              </Link>
            </Button>
          )}
          
          {isTeacher && (
            <>
              <Button asChild variant="outline">
                <Link to={`/tests/${test.id}/monitor`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Monitor
                </Link>
              </Button>
              {test.status === 'DRAFT' && (
                <Button asChild variant="outline">
                  <Link to={`/tests/${test.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              )}
            </>
          )}
          
          {!isTeacher && test.status === 'COMPLETED' && (
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/tests/${test.id}/results`}>
                <Eye className="mr-2 h-4 w-4" />
                View Results
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestCard; 