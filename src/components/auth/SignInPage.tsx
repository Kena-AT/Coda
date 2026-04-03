import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';

interface SignInPageProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess: (username: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onBack, onSignUp, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response: any = await invoke('login', { username, password });
      if (response.success) {
        onSuccess(username);
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
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e10] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-5xl h-[740px] bg-[#19191c] border border-[#333336] shadow-2xl overflow-hidden"
      >
        {/* Left Side: Visual Anchor (Brutalism Aesthetic) */}
        <div className="hidden lg:flex w-[373px] bg-[#1f1f22] p-10 flex-col justify-between border-r border-[#333336] relative">
          <div className="absolute top-0 left-0 w-full h-[230px] opacity-20 pointer-events-none" 
            style={{ background: 'linear-gradient(180deg, #ffffff0d 0%, #1f1f22 100%)' }}
          />

          <div className="z-10 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">CODA.SYSTEM</h1>
            <p className="text-[#adaaad] text-xs font-mono uppercase tracking-widest">v1.2.4 // PRODUCTION_BUILD</p>
          </div>

          <div className="z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="w-full aspect-square border-2 border-[#e60000] border-dashed rounded-full flex items-center justify-center"
            >
              <div className="w-[80%] h-[80%] border border-[#e60000] rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-[#e60000] animate-pulse rounded-full" />
              </div>
            </motion.div>
          </div>

          <div className="z-10 space-y-4">
            <p className="text-[10px] text-[#adaaad] font-mono leading-relaxed">
              ENCRYPTED DATA STREAM SECURED VIA AES-256 AND ARGON2ID. 
              LOCAL PERSISTENCE ACTIVE.
            </p>
          </div>
        </div>

        {/* Right Side: Interaction Canvas (The Form) */}
        <div className="flex-1 bg-[#0e0e10] p-16 flex flex-col justify-center">
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-block bg-[#e60000] text-xs font-bold px-2 py-1 mb-4 uppercase tracking-[2px]">AUTH_MODE: MASTER_PASSWORD</div>
            <h2 className="text-5xl font-bold mb-4">UNLOCK CODA</h2>
            <p className="text-[#adaaad]">Enter your master password to access your encrypted snippet library.</p>
          </div>

          {error && error.includes('locked') && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8 p-4 bg-[#e60000] text-black font-bold flex items-center gap-4"
            >
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="uppercase tracking-tighter">MAX ATTEMPTS EXCEEDED</p>
                <p className="text-xs opacity-70">Please contact support or clear local data.</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#adaaad] font-bold">Account Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1f1f22] border border-[#333336] px-6 py-4 outline-none focus:border-[#e60000] transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#adaaad] font-bold">Master Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1f1f22] border border-[#333336] px-6 py-4 outline-none focus:border-[#e60000] transition-all"
                required
              />
            </div>

            {error && !error.includes('locked') && <p className="text-[#e60000] text-sm font-bold bg-[#e600001a] p-4 border border-[#e6000033] uppercase">{error}</p>}

            <div className="pt-6 flex flex-col gap-6">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#e60000] py-5 font-bold text-xl hover:translate-y-[-2px] hover:shadow-[0_8px_20px_rgba(230,0,0,0.2)] transition-all"
              >
                {loading ? 'VERIFYING...' : 'ACCESS SYSTEM'}
              </button>
              
              <div className="flex items-center justify-between">
                <button type="button" onClick={onBack} className="text-[#adaaad] text-xs hover:text-white transition-colors uppercase tracking-[1px]">Back</button>
                <button type="button" onClick={onSignUp} className="text-[#e60000] text-xs font-bold hover:underline uppercase tracking-[1px]">Need an account?</button>
              </div>
            </div>
          </form>

          <footer className="mt-20 pt-8 border-t border-[#333336] opacity-30 flex justify-between items-center text-[9px] font-mono">
            <span>SYS_LOC: 34.0522° N, 118.2437° W</span>
            <span>UPTIME: 100% // STATUS: SECURE</span>
            <span>0x45A2 // 0xCC12</span>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
