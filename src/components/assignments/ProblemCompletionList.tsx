import React from 'react';
import { ProblemWithUserSubmission } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle2, Clock, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '../ui/button';

interface ProblemCompletionListProps {
  problems: ProblemWithUserSubmission[];
  isTeacher?: boolean;
}

const ProblemCompletionList: React.FC<ProblemCompletionListProps> = ({ problems, isTeacher = false }) => {
  return (
    <div className="space-y-3">
      {problems.map((problem, index) => {
        const isAutoCompleted = problem.completed;
        
        return (
        <Card key={problem.id} className={`border transition-all duration-200 ${
          isAutoCompleted 
                ? 'border-green-200 bg-green-50/50 hover:bg-green-50' 
            : 'border-gray-200 hover:bg-gray-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {/* Completion Status Icon */}
                <div className="flex-shrink-0">
                  {isAutoCompleted ? (
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                      <Clock className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Problem Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">
                      Problem #{index + 1}
                    </span>
                    {isAutoCompleted && (
                      <Badge className="bg-green-500 text-xs">Auto-Completed</Badge>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                    {problem.title}
                  </h4>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Badge variant="outline" className="text-xs">
                      {problem.platform}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        problem.difficulty === 'Easy' ? 'border-green-300 text-green-700' :
                        problem.difficulty === 'Medium' ? 'border-yellow-300 text-yellow-700' :
                        'border-red-300 text-red-700'
                      }`}
                    >
                      {problem.difficulty}
                    </Badge>
                    
                    {isAutoCompleted && problem.submissionTime && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Auto-completed {new Date(problem.submissionTime).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                  
                  {/* Action Button */}
                <div className="flex-shrink-0">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {isAutoCompleted ? 'Review' : 'Solve'}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
};

export default ProblemCompletionList; 