import { useEffect, useCallback } from 'react';
import { sessionManager, authApi } from '../store/authStore';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const WARNING_BEFORE_EXPIRY = 10 * 60 * 1000; // Warn 10 minutes before expiry

export const useAuthSession = () => {
  const { user, setUser } = useStore();

  const checkAndRefreshSession = useCallback(async () => {
    if (!user) return;

    const session = sessionManager.getSession();
    if (!session) {
      // No session found, force logout
      setUser(null);
      toast.error('Session expired. Please sign in again.');
      return;
    }

    // Check if refresh token is expired
    const now = Date.now();
    const refreshExpiryMs = session.refreshExpiresAt * 1000;
    
    if (now >= refreshExpiryMs) {
      // Refresh token expired, force re-login
      sessionManager.clearSession();
      setUser(null);
      toast.error('Session expired. Please sign in again.');
      return;
    }

    // Check if access token is expired or about to expire
    const accessExpiryMs = session.accessExpiresAt * 1000;
    const timeUntilExpiry = accessExpiryMs - now;

    if (timeUntilExpiry <= WARNING_BEFORE_EXPIRY && timeUntilExpiry > 0) {
      // Token expiring soon, try to refresh
      try {
        const refreshed = await sessionManager.refreshIfNeeded();
        if (!refreshed) {
          // Refresh failed, clear session
          sessionManager.clearSession();
          setUser(null);
          toast.error('Session expired. Please sign in again.');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        sessionManager.clearSession();
        setUser(null);
        toast.error('Session expired. Please sign in again.');
      }
    } else if (timeUntilExpiry <= 0) {
      // Token already expired, try to refresh
      try {
        const refreshed = await sessionManager.refreshIfNeeded();
        if (!refreshed) {
          sessionManager.clearSession();
          setUser(null);
          toast.error('Session expired. Please sign in again.');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        sessionManager.clearSession();
        setUser(null);
        toast.error('Session expired. Please sign in again.');
      }
    }
  }, [user, setUser]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkAndRefreshSession();

    // Set up periodic checks
    const intervalId = setInterval(checkAndRefreshSession, TOKEN_CHECK_INTERVAL);

    // Check on window focus (user returning to app)
    const handleFocus = () => {
      checkAndRefreshSession();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, checkAndRefreshSession]);

  return {
    isAuthenticated: !!user,
    checkAndRefreshSession,
  };
};
