import React from 'react';
import { Power, ShieldAlert, Monitor } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { sessionManager, authApi } from '../../store/authStore';
import toast from 'react-hot-toast';

interface LogoutConfirmationPageProps {
  onCancel: () => void;
}

export const LogoutConfirmationPage: React.FC<LogoutConfirmationPageProps> = ({ onCancel }) => {
  const { user, setUser } = useStore();

  const handleLogout = async () => {
    try {
      if (user) {
        const session = sessionManager.getSession();
        if (session) {
          // Call backend to invalidate session
          await authApi.logout(
            session.accessToken,
            session.refreshToken,
            user.id
          );
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local session regardless of backend response
      sessionManager.clearSession();
      setUser(null);
      toast.success('Logged out successfully');
      window.location.href = '/';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c] p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-12 left-12 font-mono text-[10px] text-[#2a2a2e] space-y-1">
        <p>SYS_LOG: 0x00FF21</p>
        <p>BUFFER_DUMP: ACTIVE</p>
        <p>UID: CODE_ADMIN_01</p>
        <p>KERNEL: REDACTED_V.01</p>
      </div>

      <div className="absolute top-0 right-12 py-12">
         <h1 className="text-xl font-main font-black text-red-600 tracking-[4px]">CODA</h1>
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        
        <div className="flex justify-center">
            <div className="w-24 h-24 bg-[#1f1f22] border border-[#353534] flex items-center justify-center relative shadow-[0_0_50px_rgba(230,0,0,0.1)]">
                <Power className="w-12 h-12 text-[#e60000]" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#e60000]" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#e60000]" />
            </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-main font-bold text-white tracking-[-1px] uppercase">
            TERMINATE_SESSION?
          </h2>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#e60000]/50 to-transparent" />
          <p className="text-[#e60000] font-mono text-[11px] tracking-[2px] uppercase">
             All uncommitted buffers will be persisted to local storage.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 px-4">
          <button 
            onClick={handleLogout}
            className="group relative flex flex-col items-start p-8 bg-[#e60000] hover:bg-[#ff0000] transition-all text-left overflow-hidden"
          >
            <div className="mb-8 w-10 h-10 border border-white/30 flex items-center justify-center bg-white/10 group-hover:scale-110 transition-transform">
                <Monitor className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <span className="text-[14px] font-main font-bold text-white uppercase block leading-tight">Logout // End_session</span>
              <span className="text-[9px] font-mono text-white/70 uppercase">Execute_sig_quit</span>
            </div>
          </button>

          <button 
            onClick={onCancel}
            className="group relative flex flex-col items-start p-8 bg-[#1f1f22] hover:bg-[#252529] border border-[#353534] transition-all text-left"
          >
             <div className="mb-8 w-10 h-10 border border-[#353534] flex items-center justify-center group-hover:bg-[#353534]/30 transition-all">
                <ShieldAlert className="w-5 h-5 text-[#adaaad]" />
            </div>
            <div className="space-y-1">
              <span className="text-[14px] font-main font-bold text-white uppercase block leading-tight">Stay_active // Abort</span>
              <span className="text-[9px] font-mono text-[#737373] uppercase leading-tight">Return_to_root</span>
            </div>
          </button>
        </div>

      </div>

      <div className="absolute bottom-24 flex items-center gap-12 font-mono text-[9px] text-[#2a2a2e] uppercase tracking-[1px]">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 animate-pulse" />
            SYST_MONITOR_ACTIVE
        </div>
        <div>Build: 0.1.4_red</div>
        <div>Timestamp: {Date.now()}</div>
      </div>

      <div className="absolute bottom-12 right-12 text-right font-mono text-[9px] text-[#2a2a2e] uppercase space-y-1">
          <p>LATENCY: 12ms</p>
          <p>SEC_LEVEL: CLEARANCE_RED</p>
          <p>ENCRYPTION: AES_256_PROT</p>
          <p>STATUS: WAITING_FOR_SIG</p>
      </div>

    </div>
  );
};
