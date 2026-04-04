import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ParallaxBackground } from '../layout/ParallaxBackground';

interface SignUpPageProps {
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToSignIn?: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onBack, onSuccess, onNavigateToSignIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response: any = await invoke('signup', { username, password });
      if (response.success) {
        onSuccess();
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e10] p-6 selection:bg-[#00f5ff] selection:text-black overflow-hidden relative text-white">
      <ParallaxBackground />

      <main className="w-full max-w-md relative z-10 mx-auto bg-[#0e0e10]/80 backdrop-blur-xl border border-[#222226] p-10 flex flex-col items-center">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-6 right-6 text-[#adaaad] hover:text-[#e60000] transition-colors flex items-center gap-2 group"
        >
          <span className="text-[9px] font-main tracking-[2px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">Abort_Session</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Subtle cyan/pink overlays at bottom as per design */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#00f5ff]/50 to-[#ff59e3]/50" />

        <div className="w-full flex flex-col items-center mb-10 text-center">
          <h1 className="text-4xl font-main font-bold text-[#e60000] tracking-[-2px] mb-2">CODA</h1>
          <p className="text-[#adaaad] font-main text-[12px] tracking-[2.4px] uppercase">Establish Secure Terminal Session</p>
        </div>

        <form onSubmit={handleSignUp} className="w-full space-y-8">
          {/* Identity Handle Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[12px] tracking-[1.2px] text-[#adaaad] font-main uppercase">Identity_Handle</label>
              <span className="text-[10px] text-[#e60000]/50 uppercase">Required</span>
            </div>
            <input 
              type="text" 
              placeholder="e.g. root_admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent border-b border-[#48474a] px-0 py-3 text-white outline-none focus:border-[#e60000] transition-colors font-mono text-sm placeholder:text-[#48474a]/80"
              required
            />
          </div>

          {/* Master Password Field */}
          <div className="space-y-2">
            <label className="block text-[12px] tracking-[1.2px] text-[#adaaad] font-main uppercase mb-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-[#48474a] px-0 py-3 outline-none focus:border-[#e60000] transition-colors text-white font-mono text-sm placeholder:text-[#48474a]/80"
              required
            />
            {/* Strength Indicator */}
            {password.length > 0 && (
              <div className="pt-4 flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-1 flex-1 bg-[#f3ffca]" />
                  <div className="h-1 flex-1 bg-[#f3ffca]" />
                  <div className="h-1 flex-1 bg-[#f3ffca]/20" />
                  <div className="h-1 flex-1 bg-[#f3ffca]/20" />
                </div>
                <div className="flex items-center gap-2">
                  <svg width="9" height="11" viewBox="0 0 9 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 0C2.01472 0 0 2.01472 0 4.5V6H9V4.5C9 2.01472 6.98528 0 4.5 0ZM1.5 4.5C1.5 2.84315 2.84315 1.5 4.5 1.5C6.15685 1.5 7.5 2.84315 7.5 4.5V6H1.5V4.5ZM0 7.5V10.5H9V7.5H0Z" fill="#f3ffca"/>
                  </svg>
                  <span className="text-[10px] text-[#adaaad] uppercase tracking-[-0.5px]">Strength: Medium Security Protocol</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-[#9f0519]/10 border-l-2 border-[#ff716c] p-3 flex flex-col gap-1">
              <span className="text-[#ff716c] font-bold text-[10px] uppercase tracking-[0.6px]">Authorization_Failure</span>
              <span className="text-[#ffa8a3] text-[12px]">{error}</span>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#e60000] text-[#006165] flex items-center justify-center py-4 font-bold text-[14px] tracking-[2.8px] shadow-[0_0_20px_rgba(0,244,254,0.1)] hover:shadow-[0_0_30px_rgba(0,244,254,0.2)] transition-all uppercase"
            >
              {loading ? 'INIT...' : 'SIGN UP'}
            </button>
            <div className="text-center flex items-center justify-center gap-2 text-[12px] tracking-[1.2px]">
              <span className="text-[#adaaad]">Already have an account?</span>
              <button type="button" onClick={onNavigateToSignIn || onBack} className="text-[#ff59e3] hover:underline uppercase">Sign In</button>
            </div>
          </div>
        </form>

        <footer className="w-full mt-12 pt-8 flexjustify-between items-center text-[10px] font-mono opacity-30 flex gap-12 justify-center border-t border-[#48474a]/30">
          <div className="flex gap-2 items-center text-white">Loc: 34.0522° N, 118.2437° W</div>
        </footer>
      </main>
    </div>
  );
};
