import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Code,
  Timer,
  MemoryStick
} from 'lucide-react';

interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: string;
  score: number;
  submissionTime: string;
  executionTime: number;
  memoryUsed: number;
  judgeResponse: any;
}

interface Penalty {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface SubmissionPanelProps {
  submissions: Submission[];
  penalties: Penalty[];
  currentProblemId?: string;
}

const SubmissionPanel: React.FC<SubmissionPanelProps> = ({
  submissions,
  penalties,
  currentProblemId
}) => {
  const [activeTab, setActiveTab] = useState('submissions');

  // Filter submissions for current problem if specified
  const filteredSubmissions = currentProblemId 
    ? submissions.filter(s => s.problemId === currentProblemId)
    : submissions;

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'wrong_answer':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'wrong_answer':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get penalty type color
  const getPenaltyColor = (type: string) => {
    switch (type) {
      case 'TAB_SWITCH':
        return 'bg-orange-100 text-orange-800';
      case 'FULLSCREEN_EXIT':
        return 'bg-red-100 text-red-800';
      case 'RIGHT_CLICK':
        return 'bg-blue-100 text-blue-800';
      case 'MINIMIZE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format execution time
  const formatExecutionTime = (time: number) => {
    return time > 1000 ? `${(time / 1000).toFixed(2)}s` : `${time}ms`;
  };

  // Format memory
  const formatMemory = (memory: number) => {
    return memory > 1024 ? `${(memory / 1024).toFixed(2)} MB` : `${memory} KB`;
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-4 py-2 border-b">
          <TabsList>
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Submissions ({filteredSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="penalties" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Penalties ({penalties.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="submissions" className="h-full m-0 p-4 overflow-y-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((submission, index) => (
                  <Card key={submission.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(submission.status)}
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                          <Badge variant="outline">{submission.language}</Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            #{filteredSubmissions.length - index}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(submission.submissionTime)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Score:</span>
                          <span>{submission.score}/100</span>
                        </div>
                        {submission.executionTime > 0 && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            <span>{formatExecutionTime(submission.executionTime)}</span>
                          </div>
                        )}
                        {submission.memoryUsed > 0 && (
                          <div className="flex items-center gap-1">
                            <MemoryStick className="h-3 w-3" />
                            <span>{formatMemory(submission.memoryUsed)}</span>
                          </div>
                        )}
                      </div>

                      {submission.judgeResponse && submission.judgeResponse.compile_output && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Compiler Output:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {submission.judgeResponse.compile_output}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="penalties" className="h-full m-0 p-4 overflow-y-auto">
            {penalties.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No penalties recorded</p>
                <p className="text-sm">Keep up the good work!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {penalties.map((penalty, index) => (
                  <Card key={penalty.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <Badge className={getPenaltyColor(penalty.type)}>
                            {penalty.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            #{penalties.length - index}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(penalty.timestamp)}
                        </span>
                      </div>
                      {penalty.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {penalty.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SubmissionPanel; 