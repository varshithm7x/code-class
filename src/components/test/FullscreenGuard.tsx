import React, { useEffect, useState, useRef } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AlertTriangle, Maximize, Shield } from 'lucide-react';

interface FullscreenGuardProps {
  isEnabled: boolean;
  onViolation?: () => void;
  warningTimeoutMs?: number;
  children: React.ReactNode;
}

const FullscreenGuard: React.FC<FullscreenGuardProps> = ({
  isEnabled,
  onViolation,
  warningTimeoutMs = 8000,
  children
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if browser supports fullscreen
  const supportsFullscreen = !!(
    document.documentElement.requestFullscreen ||
    (document.documentElement as any).webkitRequestFullscreen ||
    (document.documentElement as any).msRequestFullscreen ||
    (document.documentElement as any).mozRequestFullScreen
  );

  // Enter fullscreen with vendor prefixes
  const enterFullscreen = async () => {
    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  };

  // Exit fullscreen with vendor prefixes
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  };

  // Check fullscreen status with vendor prefixes
  const getFullscreenElement = () => {
    return (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement ||
      (document as any).mozFullScreenElement
    );
  };

  // Start warning countdown
  const startWarningCountdown = () => {
    setTimeRemaining(warningTimeoutMs / 1000);
    setShowWarning(true);

    // Clear any existing timeouts
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Update countdown every second
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Final warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      if (!getFullscreenElement()) {
        onViolation?.();
      }
      setShowWarning(false);
    }, warningTimeoutMs);
  };

  // Stop warning countdown
  const stopWarningCountdown = () => {
    setShowWarning(false);
    setTimeRemaining(0);
    
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = getFullscreenElement();
      const isNowFullscreen = !!fullscreenElement;
      
      setIsFullscreen(isNowFullscreen);

      if (isEnabled) {
        if (!isNowFullscreen) {
          // Exited fullscreen - start warning countdown
          startWarningCountdown();
        } else {
          // Returned to fullscreen - stop warning
          stopWarningCountdown();
        }
      }
    };

    // Add event listeners for all vendor prefixes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [isEnabled]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Auto-enter fullscreen when enabled
  useEffect(() => {
    if (isEnabled && !isFullscreen && supportsFullscreen) {
      enterFullscreen();
    }
  }, [isEnabled]);

  // If fullscreen is not supported, show warning
  if (isEnabled && !supportsFullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Fullscreen Not Supported</h2>
            <p className="text-gray-600 mb-4">
              Your browser doesn't support fullscreen mode. Please use a modern browser like 
              Chrome, Firefox, Safari, or Edge to take this test.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not enabled, just render children
  if (!isEnabled) {
    return <>{children}</>;
  }

  // If enabled but not in fullscreen, show entry screen
  if (!isFullscreen && !showWarning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Secure Test Mode</h2>
            <p className="text-gray-600 mb-4">
              This test must be taken in fullscreen mode for security. 
              Click the button below to enter fullscreen and begin.
            </p>
            <Button onClick={enterFullscreen} className="w-full">
              <Maximize className="h-4 w-4 mr-2" />
              Enter Fullscreen Mode
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-semibold mb-2 text-red-600">
                Fullscreen Required
              </h2>
              <p className="text-gray-700 mb-4">
                You have exited fullscreen mode. Please return to fullscreen 
                within <span className="font-bold text-red-600">{timeRemaining}</span> seconds 
                or your test will be automatically submitted.
              </p>
              <div className="flex gap-2">
                <Button onClick={enterFullscreen} className="flex-1">
                  <Maximize className="h-4 w-4 mr-2" />
                  Return to Fullscreen
                </Button>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${((warningTimeoutMs / 1000 - timeRemaining) / (warningTimeoutMs / 1000)) * 100}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content */}
      {children}
    </>
  );
};

export default FullscreenGuard; 