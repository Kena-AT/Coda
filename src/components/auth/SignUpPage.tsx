import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { ParallaxBackground } from '../layout/ParallaxBackground';

interface SignUpPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onBack, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-12 relative overflow-hidden">
      <ParallaxBackground />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#121214]/90 backdrop-blur-3xl border border-[#222226] p-12 z-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-32 bg-[#e60000]" />
        
        <div className="mb-12">
          <div className="text-[#e60000] font-bold tracking-[6px] text-[8px] mb-4 uppercase font-mono">INITIALIZE_MASTER_KEY</div>
          <h2 className="text-3xl font-bold tracking-tight uppercase leading-none">Create Account</h2>
        </div>

        <form onSubmit={handleSignUp} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[3px] text-[#88888c] font-bold">Identifier.ID</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-[#222226] px-6 py-4 outline-none focus:border-[#e60000] transition-colors font-mono text-sm"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[3px] text-[#88888c] font-bold">Master_Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-[#222226] px-6 py-4 outline-none focus:border-[#e60000] transition-colors text-sm"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[3px] text-[#88888c] font-bold">Confirm_Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black/40 border border-[#222226] px-6 py-4 outline-none focus:border-[#e60000] transition-colors text-sm"
              required
            />
          </div>

          {error && <p className="text-[#e60000] text-xs font-bold bg-[#e6000008] p-4 border border-[#e600001a] tracking-tight">{error}</p>}

          <div className="pt-6 flex flex-col gap-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#e60000] py-4 font-bold text-xs tracking-[2px] uppercase shadow-[0_0_15px_rgba(230,0,0,0.15)] hover:shadow-[0_0_30px_rgba(230,0,0,0.3)] transition-all active:scale-[0.98]"
            >
              {loading ? 'INITIALIZING...' : 'ENCRYPT & START'}
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="text-[#88888c] text-[9px] hover:text-[#e60000] transition-all uppercase tracking-[3px]"
            >
              Back to welcome
            </button>
          </div>
        </form>

        <div className="mt-16 pt-10 border-t border-[#222226] opacity-30 flex justify-between items-center text-[8px] font-mono">
          <span>CODA_AUTH_v1.0.0</span>
          <span>SECURED: LOCAL_LOCAL</span>
        </div>
      </motion.div>
    </div>
  );
};
