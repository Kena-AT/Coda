import { useState } from 'react';
import { WelcomePage } from './components/auth/WelcomePage';
import { SignUpPage } from './components/auth/SignUpPage';
import { SignInPage } from './components/auth/SignInPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast';

type AuthStep = 'welcome' | 'signup' | 'signin';

function App() {
  const [step, setStep] = useState<AuthStep>('welcome');
  const { user, setUser } = useStore();

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
          onSuccess={(id, username) => setUser({ id, username })}
        />
      )}
    </main>
  );
}

export default App;
