import React from 'react';
import { AlertTriangle, XCircle, Shield, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export interface PenaltyInfo {
  level: 'WARNING' | 'MINOR' | 'MAJOR' | 'TERMINATION';
  message: string;
  violationType: string;
  count: number;
  shouldTerminate: boolean;
}

interface ViolationWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  penalty: PenaltyInfo | null;
  testTitle?: string;
}

const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({
  isOpen,
  onClose,
  penalty,
  testTitle = 'Test'
}) => {
  if (!penalty) return null;

  const getIcon = () => {
    switch (penalty.level) {
      case 'WARNING':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'MINOR':
        return <AlertTriangle className="h-6 w-6 text-orange-500" />;
      case 'MAJOR':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'TERMINATION':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Shield className="h-6 w-6 text-blue-500" />;
    }
  };

  const getColor = () => {
    switch (penalty.level) {
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50';
      case 'MINOR':
        return 'border-orange-200 bg-orange-50';
      case 'MAJOR':
        return 'border-red-200 bg-red-50';
      case 'TERMINATION':
        return 'border-red-300 bg-red-100';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getBadgeVariant = () => {
    switch (penalty.level) {
      case 'WARNING':
        return 'secondary' as const;
      case 'MINOR':
        return 'secondary' as const;
      case 'MAJOR':
        return 'destructive' as const;
      case 'TERMINATION':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getTitle = () => {
    switch (penalty.level) {
      case 'WARNING':
        return 'Violation Warning';
      case 'MINOR':
        return 'Minor Penalty Applied';
      case 'MAJOR':
        return 'Major Penalty Applied';
      case 'TERMINATION':
        return 'Test Terminated';
      default:
        return 'Test Violation';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={`max-w-md ${getColor()}`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            Violation detected during {testTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Violation Details */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Violation Type:</span>
            <Badge variant={getBadgeVariant()}>
              {penalty.violationType.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Violation Count:</span>
            <Badge variant="outline">
              #{penalty.count}
            </Badge>
          </div>

          {/* Penalty Message */}
          <Alert>
            <AlertDescription className="text-sm">
              {penalty.message}
            </AlertDescription>
          </Alert>

          {/* Instructions */}
          {!penalty.shouldTerminate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">To avoid further penalties:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Stay in fullscreen mode</li>
                    <li>Don't switch browser tabs</li>
                    <li>Avoid copy/paste operations</li>
                    <li>Don't open developer tools</li>
                    <li>Keep focus on the test window</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Termination Notice */}
          {penalty.shouldTerminate && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-800">
                  <p className="font-medium mb-1">Your test has been terminated due to multiple violations.</p>
                  <p>Your current progress has been automatically submitted.</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            {penalty.shouldTerminate ? (
              <Button 
                onClick={onClose}
                variant="destructive"
                size="sm"
              >
                Exit Test
              </Button>
            ) : (
              <Button 
                onClick={onClose}
                variant="default"
                size="sm"
              >
                I Understand
              </Button>
            )}
          </div>

          {/* Timer for auto-close (non-termination only) */}
          {!penalty.shouldTerminate && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                This dialog will close in 10 seconds
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViolationWarningModal; 