import React, { useState } from 'react';
import { Shield, Key, Lock, Eye, EyeOff, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';

interface ChangePasswordPageProps {
  onBack: () => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ onBack }) => {
  const { user } = useStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Simple entropy calc
  const getEntropyStrength = (pwd: string) => {
    if (pwd.length === 0) return 0;
    let strength = 0;
    if (pwd.length > 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    if (/[^A-Za-z0-0]/.test(pwd)) strength += 25;
    return strength;
  };

  const strength = getEntropyStrength(newPassword);

  const handleUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Master key must be at least 8 segments');
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
        toast.success(response.message);
        onBack();
      } else {
        toast.error(response.message);
      }
    } catch (err) {
      toast.error('System failure during re-key sequence');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Nav */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#737373] hover:text-white transition-colors mb-12 font-mono text-[10px] uppercase tracking-[1px]"
        >
          <ArrowLeft size={14} />
          Return to Settings
        </button>

        <div className="flex flex-col lg:flex-row gap-20">
          
          {/* Left Panel: Context Card */}
          <div className="lg:w-80 flex-shrink-0 space-y-8">
             <div className="bg-[#131313] border border-[#353534] relative">
               <div className="bg-[#1f1f22] p-2 border-b border-[#353534] flex items-center justify-between">
                 <span className="text-[10px] font-mono text-[#737373]">Security_Token_V4</span>
                 <div className="flex gap-1">
                   <div className="w-1 h-1 bg-[#e60000]" />
                   <div className="w-1 h-3 bg-[#e60000]" />
                 </div>
               </div>
               <div className="p-8 aspect-square flex items-center justify-center bg-[#0a0a0c]">
                  <div className="w-40 h-40 bg-[#1f1f22] border border-[#353534] flex items-center justify-center relative">
                    <Shield className="w-12 h-12 text-[#e60000]" />
                    <div className="absolute inset-0 border-[8px] border-black/80" />
                  </div>
               </div>
               <div className="p-8 bg-[#131313] border-t border-[#353534] space-y-4">
                 <h4 className="text-xl font-main font-black text-white uppercase">Vault Access</h4>
                 <p className="text-[9px] font-mono text-[#737373] leading-relaxed uppercase">
                   CRITICAL: Re-keying the vault requires full synchronization. Failure to maintain key integrity may result in permanent data redaction.
                 </p>
               </div>
               <div className="p-4 bg-[#0a0a0c] border-t border-[#353534]/50 grid grid-cols-2 gap-4">
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
              <span className="text-[#e60000] font-mono text-[10px] tracking-[2px] uppercase">Identity Management</span>
              <h1 className="text-7xl font-main font-black text-white tracking-[-4px] uppercase leading-none">
                Change Master<br />Key
              </h1>
            </div>

            <div className="space-y-16 max-w-xl">
              
              {/* 01 Current Key */}
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <span className="text-[#e60000] font-mono text-[11px]">01</span>
                  <label className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">Current Master Key</label>
                </div>
                <div className="relative group">
                   <Key className="absolute right-0 bottom-4 w-4 h-4 text-[#2a2a2e]" />
                   <input 
                     type={showCurrent ? "text" : "password"}
                     value={currentPassword}
                     onChange={(e) => setCurrentPassword(e.target.value)}
                     className="w-full bg-transparent border-b border-[#2a2a2e] focus:border-white transition-all py-3 font-main text-white placeholder:text-[#2a2a2e] outline-none tracking-[2px]"
                     placeholder="••••••••••••"
                   />
                   <button 
                     onClick={() => setShowCurrent(!showCurrent)}
                     className="absolute right-8 bottom-3.5"
                   >
                     {showCurrent ? <EyeOff size={16} className="text-[#737373]" /> : <Eye size={16} className="text-[#737373]" />}
                   </button>
                </div>
              </div>

              {/* 02 New Key */}
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <span className="text-[#e60000] font-mono text-[11px]">02</span>
                  <label className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">New Encryption Key</label>
                </div>
                <div className="relative">
                   <input 
                     type={showNew ? "text" : "password"}
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                     className="w-full bg-transparent border-b border-[#2a2a2e] focus:border-white transition-all py-3 font-main text-white placeholder:text-[#2a2a2e] outline-none tracking-[2px]"
                     placeholder="ENTER_SECURE_PHRASE"
                   />
                   <button 
                     onClick={() => setShowNew(!showNew)}
                     className="absolute right-0 bottom-3.5"
                   >
                     {showNew ? <EyeOff size={16} className="text-[#737373]" /> : <Eye size={16} className="text-[#737373]" />}
                   </button>
                </div>
                
                {/* Strength Meter */}
                <div className="space-y-2 pt-4">
                   <div className="flex justify-between items-end">
                      <span className="text-[9px] font-mono text-[#737373] uppercase">Entropy Strength</span>
                      <span className={`text-[10px] font-mono font-bold uppercase transition-colors ${strength > 75 ? 'text-[#e60000]' : 'text-[#737373]'}`}>
                         {strength === 100 ? 'OPTIMAL' : strength > 50 ? 'SECURE' : 'MINIMUM'}
                      </span>
                   </div>
                   <div className="h-0.5 w-full bg-[#1f1f22] overflow-hidden relative">
                      <div 
                        className="h-full bg-[#e60000] transition-all duration-500" 
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
                  <span className="text-[#e60000] font-mono text-[11px]">03</span>
                  <label className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">Confirm Key</label>
                </div>
                <input 
                   type="password"
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   className="w-full bg-transparent border-b border-[#2a2a2e] focus:border-white transition-all py-3 font-main text-white placeholder:text-[#2a2a2e] outline-none tracking-[2px]"
                   placeholder="RE-ENTER_PHRASE"
                />
              </div>

              {/* Action */}
              <div className="flex gap-4 pt-12">
                <button 
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-10 py-5 bg-[#e60000] hover:bg-[#ff0000] text-white font-main font-black uppercase text-[15px] tracking-[1px] flex items-center gap-3 transition-all disabled:opacity-50"
                >
                   {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                   RE-KEY VAULT
                </button>
                <button 
                  onClick={onBack}
                  className="px-10 py-5 bg-[#1f1f22] border border-[#353534] hover:bg-[#252529] text-[#adaaad] font-main font-black uppercase text-[15px] tracking-[1px] transition-all"
                >
                   CANCEL
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Footer info Decor */}
        <div className="mt-24 pt-12 border-t border-[#353534]/10 flex justify-between items-end">
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
