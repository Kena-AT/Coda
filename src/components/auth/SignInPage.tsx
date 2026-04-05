import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ParallaxBackground } from '../layout/ParallaxBackground';

interface SignInPageProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess: (id: number, username: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onBack, onSignUp, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response: any = await invoke('login', { username, password });
      if (response.success) {
        onSuccess(response.user_id, username);
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
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e10] p-6 selection:bg-[#e60000] selection:text-white overflow-hidden relative">
      <ParallaxBackground />

      <main className="w-full max-w-[896px] h-[741px] flex bg-[#19191c]/80 backdrop-blur-xl border border-[#222226] shadow-[0_25px_43px_-12px_rgba(0,0,0,0.25)] relative z-10 overflow-hidden">
        
        {/* Left Side: Visual Anchor */}
        <div className="hidden md:flex w-[373px] bg-[#1f1f22] p-10 flex-col justify-between relative overflow-hidden">
          {/* Abstract technological background representation */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f1f22] to-transparent opacity-50 z-0" />
          
          <div className="z-10 w-full">
            <h1 className="text-4xl font-main font-bold text-[#e60000] tracking-[-1.8px] mb-2 leading-none cursor-pointer" onClick={onBack}>CODA</h1>
            <p className="text-[#adaaad] font-main text-xs tracking-[1.2px] uppercase opacity-70">Sovereign Terminal Access</p>
          </div>

          <div className="z-10 w-full flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f3ffca]" />
              <span className="text-[#f3ffca] font-main text-[10px] tracking-[1px] uppercase">Root Access Protocol</span>
            </div>
            <p className="text-[#adaaad] text-xs font-mono leading-[1.6]">
              Identity verification is required to bridge the local environment with the secure cloud repository. Unauthorized access attempts are logged.
            </p>
          </div>
        </div>

        {/* Right Side: Interaction Canvas */}
        <div className="flex-1 bg-[#0e0e10] p-[64px] flex flex-col relative">
          
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="absolute top-8 right-8 text-[#adaaad] hover:text-[#e60000] transition-colors flex items-center gap-2 group"
          >
            <span className="text-[10px] font-main tracking-[2px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">Return_to_Central</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Header */}
          <div className="w-full flex justify-between items-start mb-10">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-main font-bold text-[#fffbfe] tracking-[-0.75px] uppercase">AUTH_INIT</h2>
              <div className="w-12 h-1 bg-[#e60000]" />
            </div>
            <div className="text-right">
              <span className="text-[#adaaad] font-main text-[10px] block mb-1">Local Node:</span>
              <span className="text-[#e60000] font-main text-[12px]">127.0.0.1:443</span>
            </div>
          </div>

          {/* Lockout Policy Warning */}
          {error && error.includes('locked') && (
            <div className="mb-8 p-4 bg-[#9f0519]/10 border-l-2 border-[#ff716c] flex gap-4">
              <div className="text-[#ff716c] mt-0.5">
                <svg width="22" height="19" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 0L22 19H0L11 0ZM12 14V16H10V14H12ZM12 7V13H10V7H12Z" fill="#ff716c"/>
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#ff716c] font-main font-bold text-[12px] tracking-[0.6px] uppercase">Lockout Policy Active</span>
                <span className="text-[#ffa8a3] font-mono text-[11px] leading-tight">
                  System will terminate session after 3 consecutive failed attempts. Master Password recovery requires hardware key validation.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSignIn} className="flex-1 flex flex-col gap-8 w-full max-w-sm">
            {/* Username */}
            <div className="relative">
              <label className="absolute -top-4 left-0 text-[12px] tracking-[1.2px] text-[#adaaad] font-main uppercase">Identity_Handle</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-b border-[#48474a] px-3 py-3 mt-4 text-[#48474a] outline-none focus:border-[#e60000] focus:text-white transition-colors font-main text-[14px]"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label className="absolute -top-4 left-0 text-[10px] tracking-[1px] text-[#adaaad] font-main uppercase">Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-[#48474a] px-3 py-3 mt-4 text-[#48474a] outline-none focus:border-[#e60000] focus:text-white transition-colors font-main text-[14px] pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-[#48474a] hover:text-[#e60000] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && !error.includes('locked') && (
              <p className="text-[#e60000] text-[12px] font-bold tracking-tight">{error}</p>
            )}

            <div className="pt-4 flex flex-col gap-6">
              <button 
                type="submit" 
                disabled={loading}
                className="relative w-full bg-[#e60000] text-[#006165] flex items-center justify-center py-4 font-main font-bold text-[14px] tracking-[2.8px] hover:shadow-[0_0_35px_rgba(0,244,254,0.1)] transition-all uppercase"
              >
                {loading ? 'VERIFYING...' : 'SIGN IN'}
              </button>
              
              <div className="flex items-center justify-between">
                <button type="button" className="text-[#adaaad] font-main text-[11px] tracking-[0.55px]">Forgot Password?</button>
                <div className="text-[#adaaad] font-main text-[11px] tracking-[0.55px]">
                  New to Coda? <button type="button" onClick={onSignUp} className="text-[#ff59e3] font-bold ml-1 hover:underline">SIGN UP</button>
                </div>
              </div>
            </div>
          </form>

          {/* Footer Stats */}
          <footer className="mt-16 w-full pt-6 flex justify-between items-center text-[9px] font-main tracking-[0.9px] text-[#fffbfe] opacity-40 border-t border-[#48474a]/30">
            <div className="flex gap-4">
              <div className="flex flex-col gap-1">
                <span className="opacity-80">Latency</span>
                <span className="text-[#f3ffca] text-[10px]">14ms</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="opacity-80">Encryption</span>
                <span className="text-[#f3ffca] text-[10px]">AES-256</span>
              </div>
            </div>
            <div>
              Build: stable_v2.0.4
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
};
