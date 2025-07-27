import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function SessionManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Testing state to show countdown (disable in production)
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [showDebug, setShowDebug] = useState(false); // Set to false for production
  
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  
  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const WARNING_TIME = 4 * 60 * 1000; // 4 minutes (1 minute before logout)

  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setTimeRemaining(300); // Reset countdown (5 minutes)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set warning timeout
    timeoutRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        console.log("⚠️ Session warning shown - 1 minute until logout");
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
      console.log("🔴 Auto-logout triggered after 5 minutes of inactivity");
      
      // Call logout endpoint
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      console.log("Logout response:", response.status);
      
      toast({
        title: "Session Expired",
        description: "You have been logged out due to 5 minutes of inactivity.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Redirect to home and reload to clear auth state
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
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

    // Countdown timer for testing
    const countdownInterval = setInterval(() => {
      setTimeRemaining(prev => {
        const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        const remaining = Math.max(0, 300 - elapsed);
        return remaining;
      });
    }, 1000);

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      clearInterval(countdownInterval);
    };
  }, [user]);

  // Debug component for testing
  if (!user || !showDebug) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm z-50">
      <div className="flex items-center gap-2">
        <div className="text-green-400">🕐</div>
        <div>Auto-logout in: <span className="font-mono text-yellow-400">{Math.floor(timeRemaining / 60)}m {timeRemaining % 60}s</span></div>
        <button 
          onClick={() => setShowDebug(false)}
          className="ml-2 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {timeRemaining <= 60 ? "⚠️ Warning shown" : "📱 Tracking activity"}
      </div>
    </div>
  );
}