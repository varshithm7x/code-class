import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  Play,
  RotateCcw
} from 'lucide-react';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  explanation?: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  constraints?: string;
  examples?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
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

interface LeetCodeStyleProblemViewerProps {
  problem: Problem;
  currentIndex: number;
  totalProblems: number;
  onNavigate: (index: number) => void;
  submissions: Submission[];
  onRunCode?: () => void;
  onSubmitCode?: () => void;
  onResetCode?: () => void;
}

const LeetCodeStyleProblemViewer: React.FC<LeetCodeStyleProblemViewerProps> = ({
  problem,
  currentIndex,
  totalProblems,
  onNavigate,
  submissions,
  onRunCode,
  onSubmitCode,
  onResetCode
}) => {
  const [activeTab, setActiveTab] = useState('description');

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HARD':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'WRONG_ANSWER':
      case 'RUNTIME_ERROR':
      case 'COMPILATION_ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const latestSubmission = submissions
    .filter(s => s.problemId === problem.id)
    .sort((a, b) => new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime())[0];

  const publicTestCases = problem.testCases.filter(tc => tc.isPublic);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {currentIndex + 1} / {totalProblems}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate(Math.min(totalProblems - 1, currentIndex + 1))}
              disabled={currentIndex === totalProblems - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{problem.title}</h2>
            <Badge className={getDifficultyColor(problem.difficulty)}>
              {problem.difficulty}
            </Badge>
            {latestSubmission && getStatusIcon(latestSubmission.status)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{problem.timeLimit}min</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              <span>{problem.memoryLimit}MB</span>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex gap-2">
            {onRunCode && (
              <Button variant="outline" size="sm" onClick={onRunCode}>
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
            )}
            {onResetCode && (
              <Button variant="outline" size="sm" onClick={onResetCode}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
            {onSubmitCode && (
              <Button size="sm" onClick={onSubmitCode}>
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="description" className="h-full m-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-6 py-4">
                  {/* Problem Description */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Problem</h3>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {problem.description}
                      </p>
                    </div>
                  </div>

                  {/* Examples */}
                  {problem.examples && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Examples</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                          {problem.examples}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {problem.constraints && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Constraints</h3>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <pre className="text-sm text-blue-800 whitespace-pre-wrap font-mono">
                          {problem.constraints}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="examples" className="h-full m-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-4 py-4">
                  <h3 className="text-lg font-semibold">Test Cases</h3>
                  {publicTestCases.length > 0 ? (
                    <div className="space-y-4">
                      {publicTestCases.map((testCase, index) => (
                        <Card key={testCase.id} className="border-l-4 border-l-green-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Example {index + 1}</CardTitle>
                            {testCase.explanation && (
                              <CardDescription>{testCase.explanation}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Input:</div>
                              <div className="p-3 bg-gray-50 rounded border font-mono text-sm">
                                {testCase.input}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Output:</div>
                              <div className="p-3 bg-gray-50 rounded border font-mono text-sm">
                                {testCase.expectedOutput}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No public test cases available</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="submissions" className="h-full m-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-4 py-4">
                  <h3 className="text-lg font-semibold">Your Submissions</h3>
                  {submissions.filter(s => s.problemId === problem.id).length > 0 ? (
                    <div className="space-y-3">
                      {submissions
                        .filter(s => s.problemId === problem.id)
                        .sort((a, b) => new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime())
                        .map((submission) => (
                          <Card key={submission.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getStatusIcon(submission.status)}
                                  <div>
                                    <div className="font-medium">{submission.status.replace('_', ' ')}</div>
                                    <div className="text-sm text-gray-600">
                                      {new Date(submission.submissionTime).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <div>Score: {submission.score}/100</div>
                                  <div className="text-gray-600">
                                    {submission.executionTime}ms • {submission.memoryUsed}KB
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No submissions yet</p>
                      <p className="text-sm">Submit your solution to see results here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

// Helper component for labels
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => (
  <div className={`text-sm font-medium ${className}`}>
    {children}
  </div>
);

export default LeetCodeStyleProblemViewer; 