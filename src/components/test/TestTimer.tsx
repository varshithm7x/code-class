import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface TestTimerProps {
  endTime: string;
  onTimeExpired?: () => void;
  warningThreshold?: number; // Minutes to show warning
}

const TestTimer: React.FC<TestTimerProps> = ({ 
  endTime, 
  onTimeExpired,
  warningThreshold = 5 
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const remaining = Math.max(0, end - now);

      setTimeLeft(remaining);

      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onTimeExpired?.();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeExpired, isExpired]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeVariant = (): 'default' | 'secondary' | 'destructive' => {
    const totalMinutes = Math.floor(timeLeft / (1000 * 60));
    
    if (isExpired || timeLeft === 0) return 'destructive';
    if (totalMinutes <= warningThreshold) return 'secondary'; // Using secondary for warning
    return 'default';
  };

  const getIcon = () => {
    const variant = getTimeVariant();
    if (variant === 'destructive' || variant === 'secondary') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  return (
    <Badge variant={getTimeVariant()} className="flex items-center gap-2 px-3 py-1">
      {getIcon()}
      {isExpired ? 'Time Expired' : formatTime(timeLeft)}
    </Badge>
  );
};

export default TestTimer; 