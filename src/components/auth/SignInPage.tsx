import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { ParallaxBackground } from '../layout/ParallaxBackground';

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-6 selection:bg-[#e60000] selection:text-white overflow-hidden">
      <ParallaxBackground />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-4xl h-[640px] bg-[#121214]/80 backdrop-blur-3xl border border-[#222226] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 relative overflow-hidden"
      >
        {/* Left Side: Visual Anchor */}
        <div className="hidden lg:flex w-[320px] bg-[#1a1a1d]/60 p-12 flex-col justify-between border-r border-[#222226] relative">
          <div className="z-10 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#e60000] rounded-full" />
              <h1 className="text-xl font-bold tracking-[2px] font-mono">CODA.SYS</h1>
            </div>
            <p className="text-[#88888c] text-[9px] font-mono uppercase tracking-[3px] leading-relaxed">
              ENCRYPTED DATA STREAM SECURED VIA AES-256 AND ARGON2ID. 
              LOCAL PERSISTENCE OPERATIONAL.
            </p>
          </div>

          <div className="z-10 relative h-48 flex items-center justify-center">
            <div className="absolute inset-0 border border-[#e600001a] rounded-full animate-ping opacity-20" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 border border-dashed border-[#e6000033] rounded-full flex items-center justify-center"
            >
              <div className="w-16 h-16 border border-[#e60000] rounded-full flex items-center justify-center neon-glow">
                 <div className="w-2 h-2 bg-[#e60000] rounded-full animate-pulse" />
              </div>
            </motion.div>
          </div>

          <footer className="z-10 text-[8px] font-mono text-[#88888c] space-y-2 uppercase tracking-widest leading-none">
            <p>0x74d77bd7-6e30-4ab2</p>
            <p>STATUS: SYSTEM_CORE_READY</p>
          </footer>
        </div>

        {/* Right Side: Interaction Canvas */}
        <div className="flex-1 bg-[#121214]/40 p-16 flex flex-col justify-center">
          <div className="mb-12">
            <div className="inline-block border border-[#e60000] text-[#e60000] text-[8px] font-bold px-3 py-1 mb-6 uppercase tracking-[4px]">Security: Master_Key</div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight leading-none uppercase">Enter Decryption Key</h2>
            <p className="text-[#88888c] text-xs leading-relaxed max-w-sm">Access your local encrypted repository by entering your master credentials.</p>
          </div>

          {error && error.includes('locked') && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8 p-4 bg-[#e60000]/10 border border-[#e60000] text-[#e60000] font-bold text-xs flex items-center gap-4"
            >
              <div className="uppercase tracking-[2px]">Account Locked // Max attempts 0/5</div>
            </motion.div>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[3px] text-[#88888c] font-bold">Identifier</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1a1a1d]/40 border border-[#222226] px-6 py-4 outline-none focus:border-[#e60000] transition-all text-sm font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[3px] text-[#88888c] font-bold">Master_Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1d]/40 border border-[#222226] px-6 py-4 outline-none focus:border-[#e60000] transition-all text-sm"
                required
              />
            </div>

            {error && !error.includes('locked') && <p className="text-[#e60000] text-[10px] font-bold uppercase tracking-tight py-2">{error}</p>}

            <div className="pt-6 flex flex-col gap-6">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#e60000] py-4 font-bold text-xs tracking-[3px] uppercase shadow-[0_0_20px_rgba(230,0,0,0.1)] hover:shadow-[0_0_30px_rgba(230,0,0,0.3)] transition-all active:scale-[0.98]"
              >
                {loading ? 'VERIFYING...' : 'ACCESS_REPOSITORY'}
              </button>
              
              <div className="flex items-center justify-between px-2">
                <button type="button" onClick={onBack} className="text-[#88888c] text-[9px] hover:text-[#e60000] transition-all uppercase tracking-[2px]">Cancel</button>
                <button type="button" onClick={onSignUp} className="text-[#e60000] text-[9px] font-bold hover:underline uppercase tracking-[2px]">Create ID</button>
              </div>
            </div>
          </form>

          <footer className="mt-16 pt-8 border-t border-[#222226] opacity-[0.15] flex justify-between items-center text-[8px] font-mono lowercase">
            <span>loc: 34.0522° n, 118.2437° w</span>
            <span>uptime: 100% // status: secure</span>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
