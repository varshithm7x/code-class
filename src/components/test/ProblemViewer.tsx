import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock,
  HardDrive,
  FileText,
  Play
} from 'lucide-react';

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  constraints: string;
  examples: string;
  difficulty: string;
  timeLimit: number;
  memoryLimit: number;
  order: number;
  testCases: TestCase[];
}

interface Submission {
  id: string;
  problemId: string;
  status: string;
  score: number;
  submissionTime: string;
  executionTime: number;
  memoryUsed: number;
}

interface ProblemViewerProps {
  problem: Problem;
  currentIndex: number;
  totalProblems: number;
  onNavigate: (index: number) => void;
  submissions: Submission[];
}

const ProblemViewer: React.FC<ProblemViewerProps> = ({
  problem,
  currentIndex,
  totalProblems,
  onNavigate,
  submissions
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubmissionStatus = () => {
    if (submissions.length === 0) return null;
    
    const latestSubmission = submissions[0]; // Assuming submissions are sorted by time desc
    const hasAccepted = submissions.some(s => s.status === 'ACCEPTED');
    
    if (hasAccepted) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        text: 'Solved',
        variant: 'default' as const
      };
    }
    
    if (latestSubmission?.status === 'PENDING' || latestSubmission?.status === 'QUEUED') {
      return {
        icon: <Clock className="h-4 w-4 text-yellow-600" />,
        text: 'Running',
        variant: 'secondary' as const
      };
    }
    
    return {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      text: 'Attempted',
      variant: 'outline' as const
    };
  };

  const submissionStatus = getSubmissionStatus();

  // Parse examples from the examples string (assuming JSON format)
  let parsedExamples: Array<{ input: string; output: string; explanation?: string }> = [];
  try {
    parsedExamples = JSON.parse(problem.examples || '[]');
  } catch {
    // If not JSON, try to parse as plain text
    if (problem.examples) {
      parsedExamples = [{ input: '', output: problem.examples }];
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm text-gray-600">
            Problem {currentIndex + 1} of {totalProblems}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex === totalProblems - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {submissionStatus && (
          <Badge variant={submissionStatus.variant} className="flex items-center gap-1">
            {submissionStatus.icon}
            {submissionStatus.text}
          </Badge>
        )}
      </div>

      {/* Problem content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Title and metadata */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-semibold">{problem.title}</h1>
              <Badge className={getDifficultyColor(problem.difficulty)}>
                {problem.difficulty}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {problem.timeLimit}s
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                {problem.memoryLimit}MB
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {submissions.length} submissions
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-lg font-medium mb-3">Description</h2>
            <div className="prose prose-sm max-w-none">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: problem.description.replace(/\n/g, '<br>') 
                }} 
              />
            </div>
          </div>

          {/* Examples */}
          {parsedExamples.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3">Examples</h2>
              <div className="space-y-4">
                {parsedExamples.map((example, index) => (
                  <Card key={index} className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {example.input && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Input:</div>
                            <pre className="bg-white dark:bg-gray-900 p-2 rounded text-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {example.input}
                            </pre>
                          </div>
                        )}
                        
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Output:</div>
                          <pre className="bg-white dark:bg-gray-900 p-2 rounded text-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                            {example.output}
                          </pre>
                        </div>

                        {example.explanation && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Explanation:</div>
                            <div className="text-sm text-gray-600">
                              {example.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sample test cases */}
          {problem.testCases.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3">Sample Test Cases</h2>
              <div className="space-y-3">
                {problem.testCases.map((testCase, index) => (
                  <Card key={index} className="bg-blue-50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-blue-700 mb-1">
                            Test Case {index + 1} - Input:
                          </div>
                          <pre className="bg-white dark:bg-gray-900 p-2 rounded text-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                            {testCase.input}
                          </pre>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-blue-700 mb-1">
                            Expected Output:
                          </div>
                          <pre className="bg-white dark:bg-gray-900 p-2 rounded text-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {problem.constraints && (
            <div>
              <h2 className="text-lg font-medium mb-3">Constraints</h2>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: problem.constraints.replace(/\n/g, '<br>') 
                  }} 
                />
              </div>
            </div>
          )}

          {/* Recent submissions */}
          {submissions.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3">Recent Submissions</h2>
              <div className="space-y-2">
                {submissions.slice(0, 3).map((submission, index) => (
                  <div 
                    key={submission.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {submission.status === 'ACCEPTED' && 
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      }
                      {submission.status === 'PENDING' && 
                        <Clock className="h-4 w-4 text-yellow-600" />
                      }
                      {submission.status === 'WRONG_ANSWER' && 
                        <XCircle className="h-4 w-4 text-red-600" />
                      }
                      
                      <span className="text-sm capitalize">
                        {submission.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(submission.submissionTime).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProblemViewer; 