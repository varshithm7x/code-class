import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  PlayIcon, 
  PauseIcon, 
  ClockIcon, 
  CodeIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  AlertTriangleIcon,
  SendIcon,
  ShieldIcon,
  MaximizeIcon,
  UploadIcon
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import { Editor } from '@monaco-editor/react';
import { useInvigilator, ViolationEvent } from '../../hooks/useInvigilator';
import ViolationWarningModal, { PenaltyInfo } from '../../components/test/ViolationWarningModal';
import LeetCodeStyleProblemViewer from '../../components/test/LeetCodeStyleProblemViewer';

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

interface Test {
  id: string;
  title: string;
  description?: string;
  duration: number;
  startTime: string;
  endTime: string;
  allowedLanguages?: string[];
  problems: Problem[];
}

interface ExecutionResult {
  success: boolean;
  results?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    status: string;
    passed: boolean;
    time: number;
    memory: number;
  }>;
  rateLimited?: boolean;
  error?: string;
}

interface Submission {
  problemId: string;
  code: string;
  language: string;
}

const TestTakingPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  // State
  const [test, setTest] = useState<Test | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [code, setCode] = useState<{ [problemId: string]: { [language: string]: string } }>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('cpp');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResults, setExecutionResults] = useState<ExecutionResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPenalty, setCurrentPenalty] = useState<PenaltyInfo | null>(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Handle violation events
  const handleViolation = (violation: ViolationEvent) => {
    console.log('Violation detected:', violation);
    toast({
      title: 'Violation Detected',
      description: `${violation.type.replace('_', ' ')} detected`,
      variant: 'destructive'
    });
  };

  // Invigilation hook
  const { enterFullscreen, exitFullscreen, isFullscreenActive } = useInvigilator({
    sessionId: sessionId || '',
    socket: socketRef.current,
    onViolation: handleViolation,
    isActive: test !== null && !hasSubmitted
  });

  // Handle penalty applied from server
  const handlePenaltyApplied = (penalty: PenaltyInfo) => {
    setCurrentPenalty(penalty);
    setIsViolationModalOpen(true);

    // Auto-close warning modals after 10 seconds (not termination)
    if (!penalty.shouldTerminate) {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
      const timer = setTimeout(() => {
        setIsViolationModalOpen(false);
        setCurrentPenalty(null);
      }, 10000);
      setAutoCloseTimer(timer);
    }
  };

  // Handle violation modal close
  const handleViolationModalClose = () => {
    setIsViolationModalOpen(false);
    
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }

    // If termination penalty, redirect to results
    if (currentPenalty?.shouldTerminate) {
      navigate(`/tests/${testId}/results`);
    }
    
    setCurrentPenalty(null);
  };

  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    if (isFullscreenMode) {
      exitFullscreen();
      setIsFullscreenMode(false);
    } else {
      enterFullscreen();
      setIsFullscreenMode(true);
    }
  };

  const languageTemplates = {
    cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Your code here
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
    }
}`,
    python: `def main():
    # Your code here
    pass

if __name__ == "__main__":
    main()`,
    javascript: `function main() {
    // Your code here
}

main();`
  };

  // Initialize test session
  useEffect(() => {
    const initializeTest = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/tests/${testId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to join test');
        }

        const data = await response.json();
        setTest(data.test as Test);
        
        // Initialize code for all problems
        const initialCode: { [problemId: string]: { [language: string]: string } } = {};
        data.test.problems.forEach((problem: any) => {
          initialCode[problem.id] = {};
          (data.test.allowedLanguages || ['cpp', 'python', 'java']).forEach((lang: string) => {
            initialCode[problem.id][lang] = languageTemplates[lang as keyof typeof languageTemplates] || '';
          });
        });
        setCode(initialCode);

        // Set default language
        if (data.test.allowedLanguages && data.test.allowedLanguages.length > 0) {
          setSelectedLanguage(data.test.allowedLanguages[0]);
        }

        // Calculate time left
        const endTime = new Date(data.test.endTime).getTime();
        const now = new Date().getTime();
        setTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)));

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to join test:', error);
        toast({
          title: 'Error',
          description: 'Failed to join test. Please try again.',
          variant: 'destructive'
        });
        navigate('/dashboard');
      }
    };

    if (testId) {
      initializeTest();
    }
  }, [testId, navigate, toast]);

  // Setup WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !testId) return;

    const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:4000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-test', { testId });
    });

    socket.on('execution-result', (result: ExecutionResult) => {
      setExecutionResults(result);
      setIsExecuting(false);
    });

    socket.on('time-warning', ({ minutesLeft }: { minutesLeft: number }) => {
      toast({
        title: 'Time Warning',
        description: `${minutesLeft} minutes remaining!`,
        variant: 'destructive'
      });
    });

    socket.on('test-ended', () => {
      toast({
        title: 'Test Ended',
        description: 'The test has been ended by the instructor.',
        variant: 'destructive'
      });
      navigate('/dashboard');
    });

    return () => {
      socket.disconnect();
    };
  }, [testId, toast, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit when time is up
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current problem
  const currentProblem = test?.problems[currentProblemIndex];

  // Handle code change
  const handleCodeChange = (value: string | undefined) => {
    if (!currentProblem || !value) return;
    
    setCode(prev => ({
      ...prev,
      [currentProblem.id]: {
        ...prev[currentProblem.id],
        [selectedLanguage]: value
      }
    }));
  };

  // Execute code in real-time
  const handleExecuteCode = async () => {
    if (!currentProblem || !test || isExecuting) return;

    const currentCode = code[currentProblem.id]?.[selectedLanguage] || '';
    if (!currentCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please write some code before testing.',
        variant: 'destructive'
      });
      return;
    }

    setIsExecuting(true);
    setExecutionResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/tests/${testId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: currentCode,
          language: selectedLanguage,
          problemId: currentProblem.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Execution failed');
      }

      setExecutionResults(result);

      if (result.rateLimited) {
        toast({
          title: 'Rate Limited',
          description: result.error || 'Please wait before testing again.',
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute code',
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle individual problem submission (for immediate feedback)
  const handleSubmitCode = async () => {
    if (!test || !code[currentProblem.id]?.[selectedLanguage] || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/test-sessions/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: currentProblem.id,
          code: code[currentProblem.id][selectedLanguage],
          language: selectedLanguage
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Submission Successful',
          description: `Problem ${currentProblemIndex + 1} submitted successfully. Score: ${result.submission?.score || 0}%`,
          variant: 'default'
        });
        
        // Mark as submitted for this problem
        setHasSubmitted(true);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit solution. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    if (!test || hasSubmitted) return;

    // Prepare submissions for all problems
    const finalSubmissions: Submission[] = [];
    
    test.problems.forEach(problem => {
      const problemCode = code[problem.id]?.[selectedLanguage] || '';
      if (problemCode.trim()) {
        finalSubmissions.push({
          problemId: problem.id,
          code: problemCode,
          language: selectedLanguage
        });
      }
    });

    if (finalSubmissions.length === 0) {
      toast({
        title: 'No Solutions',
        description: 'Please write solutions before submitting.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
              const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissions: finalSubmissions
        })
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setHasSubmitted(true);
      setSubmissions(finalSubmissions);

      toast({
        title: 'Submitted Successfully',
        description: 'Your solutions have been submitted for evaluation.',
        variant: 'default'
      });

      // Redirect to results page after a delay
      setTimeout(() => {
        navigate(`/test/${testId}/results`);
      }, 2000);

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit solutions. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading test...</div>
        </div>
      </div>
    );
  }

  if (!test || !currentProblem) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Test Not Found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{test.title}</h1>
          <p className="text-sm text-gray-600">
            Problem {currentProblemIndex + 1} of {test.problems.length}: {currentProblem.title}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            <span className="font-mono text-lg">
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button 
            onClick={handleFinalSubmit} 
            disabled={hasSubmitted}
            className="bg-green-600 hover:bg-green-700"
          >
            <SendIcon className="h-4 w-4 mr-2" />
            {hasSubmitted ? 'Submitted' : 'Final Submit'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 p-4 overflow-y-auto border-r">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CodeIcon className="h-5 w-5" />
                  {currentProblem.title}
                </CardTitle>
                <Badge 
                  variant={
                    currentProblem.difficulty === 'EASY' ? 'default' :
                    currentProblem.difficulty === 'MEDIUM' ? 'secondary' : 'destructive'
                  }
                >
                  {currentProblem.difficulty}
                </Badge>
              </div>
              <CardDescription>
                Time Limit: {currentProblem.timeLimit}s | Memory Limit: {currentProblem.memoryLimit}MB
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Problem Navigation */}
              <div className="mb-4">
                <div className="flex gap-2 mb-4">
                  {test.problems.map((problem, index) => (
                    <Button
                      key={problem.id}
                      variant={index === currentProblemIndex ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentProblemIndex(index)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Problem Description */}
              <Tabs defaultValue="description" className="mb-4">
                <TabsList>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                  <TabsTrigger value="constraints">Constraints</TabsTrigger>
                </TabsList>
                
                <TabsContent value="description" className="mt-4">
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentProblem.description }} />
                  </div>
                </TabsContent>
                
                <TabsContent value="examples" className="mt-4">
                  {currentProblem.examples ? (
                    <div className="prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: currentProblem.examples }} />
                    </div>
                  ) : (
                    <p className="text-gray-500">No examples provided.</p>
                  )}
                </TabsContent>
                
                <TabsContent value="constraints" className="mt-4">
                  {currentProblem.constraints ? (
                    <div className="prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: currentProblem.constraints }} />
                    </div>
                  ) : (
                    <p className="text-gray-500">No constraints specified.</p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Sample Test Cases */}
              {currentProblem.testCases && Array.isArray(currentProblem.testCases) && currentProblem.testCases.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Sample Test Cases:</h3>
                  {(currentProblem.testCases as Array<{id: string; input: string; expectedOutput: string; isPublic: boolean}>).map((testCase, index) => (
                    <div key={testCase.id} className="mb-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium mb-1">Test Case {index + 1}:</h4>
                      <div className="text-sm">
                        <div className="mb-1">
                          <strong>Input:</strong>
                          <pre className="mt-1 p-2 bg-white rounded border text-xs">{testCase.input}</pre>
                        </div>
                        <div>
                          <strong>Expected Output:</strong>
                          <pre className="mt-1 p-2 bg-white rounded border text-xs">{testCase.expectedOutput}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Editor Header */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(test.allowedLanguages || ['cpp', 'python', 'java']).map(lang => (
                      <SelectItem key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleExecuteCode} 
                    disabled={isExecuting}
                    variant="outline"
                  >
                    {isExecuting ? (
                      <PauseIcon className="h-4 w-4 mr-2" />
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-2" />
                    )}
                    {isExecuting ? 'Running...' : 'Test Code'}
                  </Button>
                  
                  <Button 
                    onClick={handleSubmitCode} 
                    disabled={isSubmitting || hasSubmitted}
                    variant="default"
                  >
                    {isSubmitting ? (
                      <PauseIcon className="h-4 w-4 mr-2" />
                    ) : (
                      <UploadIcon className="h-4 w-4 mr-2" />
                    )}
                    {isSubmitting ? 'Submitting...' : hasSubmitted ? 'Submitted' : 'Submit'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
              value={code[currentProblem.id]?.[selectedLanguage] || ''}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true
              }}
            />
          </div>

          {/* Execution Results */}
          {executionResults && (
            <div className="p-4 border-t bg-gray-50 max-h-64 overflow-y-auto">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              
              {executionResults.error ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertDescription>{executionResults.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {executionResults.results?.map((result, index) => (
                    <div key={index} className="p-2 bg-white rounded border">
                      <div className="flex items-center gap-2 mb-1">
                        {result.passed ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium text-sm">
                          Test Case {index + 1}: {result.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({result.time.toFixed(3)}s, {result.memory}KB)
                        </span>
                      </div>
                      
                      {!result.passed && (
                        <div className="text-xs space-y-1">
                          <div>
                            <strong>Expected:</strong> {result.expectedOutput}
                          </div>
                          <div>
                            <strong>Got:</strong> {result.actualOutput || '(no output)'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="text-sm text-gray-600 mt-2">
                    Showing results for first 3 test cases only. Final submission will test all cases.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestTakingPage; 