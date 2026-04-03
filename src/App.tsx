import React, { useState } from 'react';
import { WelcomePage } from './components/auth/WelcomePage';
import { SignUpPage } from './components/auth/SignUpPage';
import { SignInPage } from './components/auth/SignInPage';

type AuthStep = 'welcome' | 'signup' | 'signin';

function App() {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [user, setUser] = useState<{username: string} | null>(null);

  if (user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-4xl font-bold">Dashboard Coming Soon...</h1>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
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
        />
      )}
      {step === 'signin' && (
        <SignInPage 
          onBack={() => setStep('welcome')} 
          onSignUp={() => setStep('signup')}
          onSuccess={(username) => setUser({ username })}
        />
      )}
    </main>
  );
}

export default App;
