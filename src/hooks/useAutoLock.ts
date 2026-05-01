import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { sessionManager } from '../store/authStore';
import toast from 'react-hot-toast';

export const useAutoLock = () => {
  const { user, setUser, settings } = useStore();
   const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    if (!user) return;
    
    // Clear session and user state
    sessionManager.clearSession();
    setUser(null);
    toast('Auto-lock triggered due to inactivity', {
      icon: '🔒',
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid var(--accent)',
      },
    });
  }, [user, setUser]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!user) return;

    // Convert minutes to milliseconds
    const timeoutMs = settings.autoLockTimer * 60 * 1000;
    
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [user, settings.autoLockTimer, logout]);

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Events that reset the inactivity timer
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => resetTimer();

    // Set initial timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Clean up
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);

  return null;
};
