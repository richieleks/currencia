import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimeoutWarningProps {
  timeRemaining: number; // in seconds
  onExtendSession: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutWarning({ 
  timeRemaining, 
  onExtendSession, 
  onLogout 
}: SessionTimeoutWarningProps) {
  const [seconds, setSeconds] = useState(timeRemaining);

  useEffect(() => {
    setSeconds(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (seconds <= 0) {
      onLogout();
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onLogout]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progressValue = (seconds / timeRemaining) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5" />
            Session Timeout Warning
          </CardTitle>
          <CardDescription>
            Your session will expire due to inactivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatTime(seconds)}
            </div>
            <p className="text-sm text-muted-foreground">
              Time remaining before automatic logout
            </p>
          </div>

          <Progress 
            value={progressValue} 
            className="w-full h-2"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onLogout}
              className="flex-1"
            >
              Logout Now
            </Button>
            <Button
              onClick={onExtendSession}
              className="flex-1"
            >
              Stay Logged In
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can continue your session by clicking "Stay Logged In" or any activity on the page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}