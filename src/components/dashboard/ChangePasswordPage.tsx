import React, { useState } from 'react';
import { Shield, Key, Lock, Eye, EyeOff, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';

import { useSoundEffect } from '../../hooks/useSoundEffect';

interface ChangePasswordPageProps {
  onBack: () => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ onBack }) => {
  const { user } = useStore();
  const playSound = useSoundEffect();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Enhanced entropy & syntax validation
  const getRequirements = (pwd: string) => {
    return {
      length: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd)
    };
  };

  const reqs = getRequirements(newPassword);

  const getEntropyStrength = (pwd: string) => {
    if (pwd.length === 0) return 0;
    let score = 0;
    
    // Length bonus
    score += Math.min(pwd.length * 4, 40);
    
    // Variety bonuses
    if (reqs.uppercase) score += 15;
    if (reqs.lowercase) score += 15;
    if (reqs.number) score += 15;
    if (reqs.symbol) score += 15;

    return Math.min(score, 100);
  };

  const strength = getEntropyStrength(newPassword);

  const handleUpdate = async () => {
    if (!currentPassword) {
      toast.error('Current Master Key required');
      return;
    }
    if (newPassword !== confirmPassword) {
      playSound('error');
      toast.error('Key mismatch detected');
      return;
    }
    if (strength < 60) {
      playSound('error');
      toast.error('Entropy strength below security threshold');
      return;
    }

    setLoading(true);
    try {
      const response: any = await invoke('change_master_password', {
        userId: user?.id,
        currentPassword,
        newPassword
      });

      if (response.success) {
        playSound('success');
        toast.success('VAULT_REKEYED: Security protocols updated');
        onBack();
      } else {
        playSound('error');
        toast.error(response.message || 'AUTH_FAILURE: Key rejected');
      }
    } catch (err) {
      playSound('error');
      toast.error('SYSTEM_CRITICAL: Re-key handshake failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Nav */}
        <button 
          onClick={() => { playSound('transition'); onBack(); }}
          onMouseEnter={() => playSound('hover')}
          className="flex items-center gap-2 text-[#737373] hover:text-white transition-colors mb-12 font-mono text-[10px] uppercase tracking-[1px]"
        >
          <ArrowLeft size={14} />
          Return to Settings
        </button>

        <div className="flex flex-col lg:flex-row gap-20">
          
          {/* Left Panel: Context Card */}
          <div className="lg:w-80 flex-shrink-0 space-y-8">
             <div className="bg-[#131313] border border-[var(--border)] relative">
               <div className="bg-[#1f1f22] p-2 border-b border-[var(--border)] flex items-center justify-between">
                 <span className="text-[10px] font-mono text-[#737373]">Security_Token_V4</span>
                 <div className="flex gap-1">
                   <div className="w-1 h-1 bg-[var(--accent)]" />
                   <div className="w-1 h-3 bg-[var(--accent)]" />
                 </div>
               </div>
               <div className="p-8 aspect-square flex items-center justify-center bg-[var(--bg-primary)]">
                  <div className="w-40 h-40 bg-[#1f1f22] border border-[var(--border)] flex items-center justify-center relative">
                    <Shield className="w-12 h-12 text-[var(--accent)]" />
                    <div className="absolute inset-0 border-[8px] border-black/80" />
                  </div>
               </div>
               <div className="p-8 bg-[#131313] border-t border-[var(--border)] space-y-4">
                 <h4 className="text-md font-main font-bold text-white uppercase">Vault Access</h4>
                 <p className="text-[9px] font-mono text-[#737373] leading-relaxed uppercase">
                   CRITICAL: Re-keying the vault requires full synchronization. Failure to maintain key integrity may result in permanent data redaction.
                 </p>
               </div>
               <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border)]/50 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-[#4a4a4d] uppercase block">Encryption</span>
                    <span className="text-[9px] font-mono text-[#adaaad] uppercase">AES-256-GCM</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-[#4a4a4d] uppercase block">N</span>
                    <span className="text-[9px] font-mono text-[#adaaad] uppercase">12:04:45:01</span>
                  </div>
               </div>
             </div>
          </div>

          {/* Right Panel: Form */}
          <div className="flex-1 space-y-12 pb-12">
            <div className="space-y-2">
              <span className="text-[var(--accent)] font-mono text-[10px] tracking-[2px] uppercase">Identity Management</span>
              <h1 className="text-2xl font-main font-bold text-white tracking-[-1px] uppercase leading-none">
                Change Master Key
              </h1>
            </div>

            <div className="space-y-16 max-w-xl">
              
              {/* 01 Current Key */}
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--accent)] font-mono text-[11px]">01</span>
                  <label className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">Current Master Key</label>
                </div>
                <div className="relative group">
                   <Key className="absolute right-0 bottom-4 w-4 h-4 text-[#2a2a2e]" />
                   <input 
                     type={showCurrent ? "text" : "password"}
                     value={currentPassword}
                     onChange={(e) => setCurrentPassword(e.target.value)}
                     onMouseEnter={() => playSound('hover')}
                     className="w-full bg-transparent border-b border-[#2a2a2e] focus:border-white transition-all py-3 font-main text-white placeholder:text-[#2a2a2e] outline-none tracking-[2px]"
                     placeholder="••••••••••••"
                   />
                   <button 
                     onClick={() => { playSound('click'); setShowCurrent(!showCurrent); }}
                     onMouseEnter={() => playSound('hover')}
                     className="absolute right-8 bottom-3.5"
                   >
                     {showCurrent ? <EyeOff size={16} className="text-[#737373]" /> : <Eye size={16} className="text-[#737373]" />}
                   </button>
                </div>
              </div>

              {/* 02 New Key */}
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--accent)] font-mono text-[11px]">02</span>
                  <label className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">New Encryption Key</label>
                </div>
                 <div className="relative">
                   {/* Syntax Highlighting Overlay (visible when showNew is true) */}
                   {showNew && (
                     <div className="absolute inset-0 py-3 font-main pointer-events-none tracking-[2px] flex whitespace-pre">
                        {newPassword.split('').map((char, i) => {
                          let color = 'text-white';
                          if (/[0-9]/.test(char)) color = 'text-[var(--accent)]';
                          if (/[^A-Za-z0-9]/.test(char)) color = 'text-[#ff5f5f]';
                          if (/[A-Z]/.test(char)) color = 'text-[#ff9d9d]';
                          return <span key={i} className={color}>{char}</span>;
                        })}
                     </div>
                   )}
                   <input 
                     type={showNew ? "text" : "password"}
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                     onMouseEnter={() => playSound('hover')}
                     className={`w-full bg-transparent border-b border-[#2a2a2e] focus:border-white transition-all py-3 font-main placeholder:text-[#2a2a2e] outline-none tracking-[2px] ${showNew ? 'text-transparent caret-white' : 'text-white'}`}
                     placeholder={showNew ? "" : "ENTER_SECURE_PHRASE"}
                   />
                   <button 
                     onClick={() => { playSound('click'); setShowNew(!showNew); }}
                     onMouseEnter={() => playSound('hover')}
                     className="absolute right-0 bottom-3.5"
                   >
                     {showNew ? <EyeOff size={16} className="text-[#737373]" /> : <Eye size={16} className="text-[#737373]" />}
                   </button>
                </div>
                
                {/* Syntax-Aware Enhancements */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-4 border-y border-[var(--border)]/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full ${reqs.length ? 'bg-[var(--accent)] shadow-[0_0_5px_var(--accent)]' : 'bg-[#2a2a2e]'}`} />
                    <span className={`text-[8px] font-mono uppercase tracking-widest ${reqs.length ? 'text-white' : 'text-[#4a4a4d]'}`}>LEN_GT_12</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full ${reqs.uppercase ? 'bg-[var(--accent)] shadow-[0_0_5px_var(--accent)]' : 'bg-[#2a2a2e]'}`} />
                    <span className={`text-[8px] font-mono uppercase tracking-widest ${reqs.uppercase ? 'text-white' : 'text-[#4a4a4d]'}`}>ALPHA_CASE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full ${reqs.number ? 'bg-[var(--accent)] shadow-[0_0_5px_var(--accent)]' : 'bg-[#2a2a2e]'}`} />
                    <span className={`text-[8px] font-mono uppercase tracking-widest ${reqs.number ? 'text-white' : 'text-[#4a4a4d]'}`}>DIGIT_LINK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full ${reqs.symbol ? 'bg-[var(--accent)] shadow-[0_0_5px_var(--accent)]' : 'bg-[#2a2a2e]'}`} />
                    <span className={`text-[8px] font-mono uppercase tracking-widest ${reqs.symbol ? 'text-white' : 'text-[#4a4a4d]'}`}>SYM_BITRATE</span>
                  </div>
                </div>

                {/* Strength Meter */}
                <div className="space-y-2 pt-2">
                   <div className="flex justify-between items-end">
                      <span className="text-[9px] font-mono text-[#737373] uppercase">Entropy Strength</span>
                      <span className={`text-[10px] font-mono font-bold uppercase transition-colors ${strength > 75 ? 'text-[var(--accent)] shadow-[0_0_10px_rgba(255,0,0,0.3)]' : 'text-[#737373]'}`}>
                         {strength >= 100 ? 'OPTIMAL' : strength > 80 ? 'ENHANCED' : strength > 50 ? 'MODERATE' : 'UNSAFE'}
                      </span>
                   </div>
                   <div className="h-0.5 w-full bg-[#1f1f22] overflow-hidden relative">
                      <div 
                        className="h-full bg-[var(--accent)] transition-all duration-500 shadow-[0_0_10px_var(--accent)]" 
                        style={{ width: `${strength}%` }} 
                      />
                      <div className="absolute top-0 right-1/4 h-full w-[1px] bg-red-950" />
                      <div className="absolute top-0 right-1/2 h-full w-[1px] bg-red-950" />
                   </div>
                </div>
              </div>

              {/* 03 Confirm Key */}
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--accent)] font-mono text-[11px]">03</span>
                  <label className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">Confirm Key</label>
                </div>
                <input 
                   type="password"
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   onMouseEnter={() => playSound('hover')}
                   className="w-full bg-transparent border-b border-[#2a2a2e] focus:border-white transition-all py-3 font-main text-white placeholder:text-[#2a2a2e] outline-none tracking-[2px]"
                   placeholder="RE-ENTER_PHRASE"
                />
              </div>

              {/* Action */}
              <div className="flex gap-4 pt-12">
                <button 
                  onClick={() => { playSound('click'); handleUpdate(); }}
                  onMouseEnter={() => playSound('hover')}
                  disabled={loading}
                  className="px-10 py-5 bg-[var(--accent)] hover:bg-[#ff0000] text-white font-main font-bold uppercase text-[13px] tracking-[1px] flex items-center gap-3 transition-all disabled:opacity-50"
                >
                   {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                   RE-KEY VAULT
                </button>
                <button 
                  onClick={() => { playSound('transition'); onBack(); }}
                  onMouseEnter={() => playSound('hover')}
                  className="px-10 py-5 bg-[#1f1f22] border border-[var(--border)] hover:bg-[#252529] text-[#adaaad] font-main font-bold uppercase text-[13px] tracking-[1px] transition-all"
                >
                   CANCEL
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Footer info Decor */}
        <div className="mt-24 pt-12 border-t border-[var(--border)]/10 flex justify-between items-end">
           <div className="space-y-1 font-mono text-[9px] text-[#2a2a2e] uppercase">
             <p>SYSTEM_AUTH: REDACTED_NODE_09</p>
             <p>PROTOCOL: CRIMSON_LAYER_SECURE</p>
           </div>
           <div className="text-right space-y-1 font-mono text-[9px] text-[#2a2a2e] uppercase">
             <p>TIMESTAMP: {Date.now()}</p>
             <p>USER_ID: {user?.username.toUpperCase()}_{user?.id}</p>
           </div>
        </div>

      </div>
    </div>
  );
};
