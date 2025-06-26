import { useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const ACTIVITY_UPDATE_INTERVAL = 2 * 60 * 1000; // Update activity every 2 minutes

export function useActivityTracker(isAuthenticated: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const updateActivity = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await apiRequest('/api/auth/activity', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }, [isAuthenticated]);

  const setUserInactive = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await apiRequest('/api/auth/set-inactive', {
        method: 'POST',
      });
      
      // Redirect to login after setting inactive
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Failed to set user inactive:', error);
      // Still logout even if API call fails
      window.location.href = '/api/auth/logout';
    }
  }, [isAuthenticated]);

  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setUserInactive();
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, setUserInactive]);

  const handleActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset timer if enough time has passed to avoid excessive calls
    if (timeSinceLastActivity > 1000) { // 1 second threshold
      resetInactivityTimer();
    }
  }, [isAuthenticated, resetInactivityTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up timers when user is not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up activity listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start inactivity timer
    resetInactivityTimer();

    // Set up periodic activity updates
    intervalRef.current = setInterval(() => {
      updateActivity();
    }, ACTIVITY_UPDATE_INTERVAL);

    // Initial activity update
    updateActivity();

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, handleActivity, resetInactivityTimer, updateActivity]);

  // Handle page visibility changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab, reset timer and update activity
        resetInactivityTimer();
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, resetInactivityTimer, updateActivity]);

  // Handle beforeunload to update activity status
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      if (navigator.sendBeacon) {
        const data = new FormData();
        navigator.sendBeacon('/api/auth/set-inactive', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  return {
    resetInactivityTimer,
    updateActivity,
  };
}