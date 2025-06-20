import React from 'react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { StudentJudge0Status } from '../../types';
import { CheckCircle, AlertCircle, XCircle, Key, Users } from 'lucide-react';

interface Judge0StatusIndicatorProps {
  student: StudentJudge0Status;
  compact?: boolean;
}

const Judge0StatusIndicator: React.FC<Judge0StatusIndicatorProps> = ({ student, compact = false }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-3 w-3" />;
      case 'EXHAUSTED':
        return <AlertCircle className="h-3 w-3" />;
      case 'INVALID':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Key className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'EXHAUSTED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INVALID':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'EXHAUSTED':
        return 'Quota Full';
      case 'INVALID':
        return 'Invalid';
      default:
        return 'No Key';
    }
  };

  const TooltipDetails = () => (
    <div className="space-y-2 text-xs">
      <div className="font-medium">{student.name}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span>API Key:</span>
          <span className={student.hasKey ? 'text-green-600' : 'text-red-600'}>
            {student.hasKey ? 'Provided' : 'Missing'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span>{getStatusText(student.judge0KeyStatus)}</span>
        </div>
        {student.hasKey && (
          <>
            <div className="flex items-center justify-between">
              <span>Quota Used:</span>
              <span>{student.judge0QuotaUsed}/50</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pool Sharing:</span>
              <span className={student.isSharedWithClass ? 'text-green-600' : 'text-gray-600'}>
                {student.isSharedWithClass ? 'Yes' : 'No'}
              </span>
            </div>
            {student.judge0LastReset && (
              <div className="flex items-center justify-between">
                <span>Last Reset:</span>
                <span>{new Date(student.judge0LastReset).toLocaleDateString()}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Badge 
                variant="outline" 
                className={`${getStatusColor(student.judge0KeyStatus)} text-xs px-1.5 py-0.5 cursor-help`}
              >
                <div className="flex items-center gap-1">
                  {getStatusIcon(student.judge0KeyStatus)}
                  <span>{getStatusText(student.judge0KeyStatus)}</span>
                </div>
              </Badge>
              {student.isSharedWithClass && (
                <Users className="h-3 w-3 text-blue-600" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <TooltipDetails />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${getStatusColor(student.judge0KeyStatus)} flex items-center gap-1`}
        >
          {getStatusIcon(student.judge0KeyStatus)}
          <span>{getStatusText(student.judge0KeyStatus)}</span>
        </Badge>
        {student.isSharedWithClass && (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>Pooled</span>
          </Badge>
        )}
      </div>
      
      {student.hasKey && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center justify-between">
            <span>Daily Usage:</span>
            <span>{student.judge0QuotaUsed}/50</span>
          </div>
          {student.judge0LastReset && (
            <div className="flex items-center justify-between">
              <span>Last Reset:</span>
              <span>{new Date(student.judge0LastReset).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Judge0StatusIndicator; 