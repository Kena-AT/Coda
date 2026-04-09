import { useState, useEffect } from 'react';
import { WelcomePage } from './components/auth/WelcomePage';
import { SignUpPage } from './components/auth/SignUpPage';
import { SignInPage } from './components/auth/SignInPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast';
import { sessionManager, authApi } from './store/authStore';
import toast from 'react-hot-toast';

type AuthStep = 'welcome' | 'signup' | 'signin';

function App() {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const { user, setUser } = useStore();

  // Auto-login on app startup
  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        // Check if we have a stored session
        if (sessionManager.isSessionValid()) {
          // Try to refresh the access token if needed
          const refreshed = await sessionManager.refreshIfNeeded();
          
          if (refreshed) {
            const session = sessionManager.getSession();
            if (session) {
              // Validate the token with the backend
              const isValid = await authApi.validateToken(session.accessToken, 'access');
              
              if (isValid) {
                setUser({ id: session.userId, username: session.username });
                toast.success(`Welcome back, ${session.username}`);
              } else {
                // Token invalid, clear session and require login
                sessionManager.clearSession();
              }
            }
          } else {
            // Refresh failed, clear session
            sessionManager.clearSession();
          }
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
        sessionManager.clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    attemptAutoLogin();
  }, [setUser]);

  // Show loading state while checking for auto-login
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#e60000] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#adaaad] font-mono text-xs uppercase tracking-wider">Initializing...</span>
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen">
        <Toaster position="bottom-right" />
        <Dashboard />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Toaster position="bottom-right" />
      {step === 'welcome' && (
        <WelcomePage 
          onGetStarted={() => setStep('signup')} 
          onLogin={() => setStep('signin')} 
        />
      )}
      {step === 'signup' && (
        <SignUpPage 
          onBack={() => setStep('welcome')} 
          onSuccess={() => setStep('signin')} 
          onNavigateToSignIn={() => setStep('signin')}
        />
      )}
      {step === 'signin' && (
        <SignInPage 
          onBack={() => setStep('welcome')} 
          onSignUp={() => setStep('signup')}
          onSuccess={(id, username, _accessToken) => setUser({ id, username })}
        />
      )}
    </main>
  );
}

export default App;
