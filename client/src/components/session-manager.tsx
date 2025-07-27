import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function SessionManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  
  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const WARNING_TIME = 4 * 60 * 1000; // 4 minutes (1 minute before logout)

  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set warning timeout
    timeoutRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        toast({
          title: "Session Expiring",
          description: "You will be logged out in 1 minute due to inactivity.",
          variant: "destructive",
          duration: 10000,
        });
        
        // Set final logout timeout
        timeoutRef.current = setTimeout(() => {
          handleAutoLogout();
        }, SESSION_TIMEOUT - WARNING_TIME);
      }
    }, WARNING_TIME);
  };

  const handleAutoLogout = async () => {
    try {
      // Call logout endpoint
      await fetch('/api/auth/logout', { method: 'POST' });
      
      toast({
        title: "Session Expired",
        description: "You have been logged out due to 5 minutes of inactivity.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Redirect to home and reload to clear auth state
      window.location.href = "/";
    } catch (error) {
      console.error("Error during auto-logout:", error);
      // Fallback: just redirect home
      window.location.href = "/";
    }
  };

  useEffect(() => {
    if (!user) return;

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      resetActivityTimer();
    };

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetActivityTimer();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user]);

  // Component doesn't render anything visible
  return null;
}