import React from 'react';
import { 
  Shield, 
  Bell, 
  Palette, 
  Type, 
  Keyboard, 
  User, 
  ChevronRight, 
  LogOut, 
  Database, 
  Info, 
  Key,
  Volume2,
  Zap
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { settings, setSettings } = useStore();

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] custom-scrollbar p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#adaaad] font-mono text-[10px] tracking-[1px] uppercase">
            <div className="w-1.5 h-1.5 bg-[#e60000] rounded-full animate-pulse" />
            System Configuration Active
          </div>
          <h1 className="text-5xl font-main font-bold text-white tracking-[-2px] uppercase">APP_SETTINGS</h1>
          <p className="text-[#e60000] font-mono text-[10px] tracking-[1px]">v4.0.2 // ENCRYPTION_STRENGTH: MAXIMUM</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* 01 // SECURITY_OVERRIDE */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-sm overflow-hidden flex flex-col">
            <div className="bg-[#1f1f22]/50 p-3 border-b border-[#353534]/30 flex justify-between items-center">
              <span className="text-[10px] font-mono text-[#737373] tracking-[1px]">01 // SECURITY_OVERRIDE</span>
            </div>
            <div className="p-8 space-y-8 flex-1">
              <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#e60000]" />
                LOCKOUT POLICY
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-mono text-[#adaaad] uppercase tracking-[1px]">
                    {">"} Failed attempts threshold
                  </label>
                  <div className="flex items-end gap-4 border-b border-[#353534]/50 pb-2">
                    <input 
                      type="number" 
                      value={settings.lockoutThreshold}
                      onChange={(e) => setSettings({ lockoutThreshold: parseInt(e.target.value) })}
                      className="bg-transparent text-3xl font-main font-bold text-white outline-none w-20"
                    />
                    <span className="text-[9px] font-mono text-[#737373] uppercase pb-1">ATTEMPTS</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <label className="text-[10px] font-mono text-[#adaaad] uppercase tracking-[1px]">
                    {">"} Auto-lock timer
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="flex-1 h-3 bg-[#1f1f22] rounded-sm overflow-hidden border border-[#353534]/30 relative group">
                      <div 
                        className="h-full bg-[#e60000] transition-all duration-300" 
                        style={{ width: `${(settings.autoLockTimer / 60) * 100}%` }} 
                      />
                      <input 
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={settings.autoLockTimer}
                        onChange={(e) => setSettings({ autoLockTimer: parseInt(e.target.value) })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-2xl font-main font-bold text-white w-20 text-right">
                      {settings.autoLockTimer}:00
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-[#737373] italic">Recommended: 05:00 - 30:00</p>
                </div>
              </div>
            </div>
          </div>

          {/* 02 // SIGNAL_PROTOCOL */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-sm overflow-hidden flex flex-col">
            <div className="bg-[#1f1f22]/50 p-3 border-b border-[#353534]/30">
              <span className="text-[10px] font-mono text-[#737373] tracking-[1px]">02 // SIGNAL_PROTOCOL</span>
            </div>
            <div className="p-8 space-y-8 flex-1">
              <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
                <Bell className="w-6 h-6 text-[#e60000]" />
                NOTIFICATIONS
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1f1f22]/30 border border-[#353534]/20 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[14px] font-main font-bold text-white uppercase">Push alerts</p>
                    <p className="text-[9px] font-mono text-[#737373] uppercase">System broadcast to device</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ pushAlerts: !settings.pushAlerts })}
                    className={`w-12 h-6 rounded-sm transition-all relative ${settings.pushAlerts ? 'bg-[#e60000]' : 'bg-[#2a2a2e]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.pushAlerts ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1f1f22]/30 border border-[#353534]/20 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[14px] font-main font-bold text-white uppercase flex items-center gap-2">
                       Sound effects
                       <Volume2 className="w-3.5 h-3.5 opacity-50" />
                    </p>
                    <p className="text-[9px] font-mono text-[#737373] uppercase">Auditory feedback loops</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ soundEffects: !settings.soundEffects })}
                    className={`w-12 h-6 rounded-sm transition-all relative ${settings.soundEffects ? 'bg-slate-600' : 'bg-[#2a2a2e]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.soundEffects ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 03 // OPTIC_ARRAY */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-sm overflow-hidden md:col-span-2">
            <div className="bg-[#1f1f22]/50 p-3 border-b border-[#353534]/30">
              <span className="text-[10px] font-mono text-[#737373] tracking-[1px]">03 // OPTIC_ARRAY</span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
                  <Palette className="w-6 h-6 text-[#e60000]" />
                  THEME ENGINE
                </h3>
                <div className="space-y-6">
                   <select 
                     value={settings.theme}
                     onChange={(e) => setSettings({ theme: e.target.value as any })}
                     className="w-full bg-[#1f1f22] border border-[#353534]/50 p-4 text-white font-main uppercase text-[12px] outline-none appearance-none cursor-pointer"
                   >
                     <option value="crimson">Crimson Protocol</option>
                     <option value="void">Void Null</option>
                     <option value="matrix">Matrix Grid</option>
                   </select>
                   <div className="flex gap-4">
                      {['crimson', 'void', 'matrix'].map((t) => (
                        <div 
                          key={t}
                          onClick={() => setSettings({ theme: t as any })}
                          className={`flex-1 h-12 border transition-all cursor-pointer ${settings.theme === t ? 'border-[#e60000]' : 'border-[#353534]'}`}
                          style={{ backgroundColor: t === 'crimson' ? '#e60000' : t === 'void' ? '#0e0e10' : '#00ff41' }}
                        />
                      ))}
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
                  <Type className="w-6 h-6 text-[#e60000]" />
                  FONT CONFIG
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#adaaad] uppercase">Scale Factor</span>
                    <span className="text-2xl font-main font-bold text-white">{settings.fontSize}%</span>
                  </div>
                  <input 
                    type="range"
                    min="100"
                    max="150"
                    step="5"
                    value={settings.fontSize}
                    onChange={(e) => setSettings({ fontSize: parseInt(e.target.value) })}
                    className="w-full appearance-none bg-[#1f1f22] h-1 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#e60000] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                  />
                  <div className="mt-8 p-4 bg-[#1f1f22]/50 border border-[#353534]/30 rounded-sm">
                    <p className="text-[9px] font-mono text-[#737373] mb-2 uppercase">Preview:</p>
                    <p className="text-white font-main" style={{ fontSize: `${(settings.fontSize / 100) * 14}px` }}>
                      The quick brown fox jumps over the lazy dog. 
                      0123456789. UTF-8 encoded.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 04 // RAPID_ACCESS */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-sm overflow-hidden">
            <div className="bg-[#1f1f22]/50 p-3 border-b border-[#353534]/30">
              <span className="text-[10px] font-mono text-[#737373] tracking-[1px]">04 // RAPID_ACCESS</span>
            </div>
            <div className="p-8 space-y-8">
              <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-[#e60000]" />
                SHORTCUTS
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Copy Snippet', key: settings.shortcuts.copy },
                  { label: 'New Snippet', key: settings.shortcuts.newSnippet },
                  { label: 'Global Search', key: settings.shortcuts.search }
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border-b border-[#353534]/10">
                    <span className="text-[12px] font-main text-[#adaaad]">{s.label}</span>
                    <div className="flex gap-2">
                       <span className="px-2 py-1 bg-[#1f1f22] border border-[#353534]/50 rounded text-[10px] font-mono text-white">Ctrl</span>
                       <span className="px-2 py-1 bg-[#1f1f22] border border-[#353534]/50 rounded text-[10px] font-mono text-white">{s.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 05 // IDENTITY_VAULT */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-sm overflow-hidden">
            <div className="bg-[#1f1f22]/50 p-3 border-b border-[#353534]/30">
              <span className="text-[10px] font-mono text-[#737373] tracking-[1px]">05 // IDENTITY_VAULT</span>
            </div>
            <div className="p-8 space-y-8">
              <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
                <User className="w-6 h-6 text-[#e60000]" />
                ACCOUNT
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => onNavigate('change-password')}
                  className="w-full flex items-center justify-between p-4 bg-[#1f1f22]/30 hover:bg-[#1f1f22]/60 border border-[#353534]/20 rounded-sm transition-all group"
                >
                  <div className="flex items-center gap-4 text-left">
                    <Key className="w-5 h-5 text-[#737373] group-hover:text-white transition-colors" />
                    <div className="space-y-0.5">
                      <p className="text-[14px] font-main font-bold text-white uppercase">Change master password</p>
                      <p className="text-[9px] font-mono text-[#737373] uppercase">Re-key security enclave</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#737373]" />
                </button>

                <button 
                  onClick={() => onNavigate('backup')}
                  className="w-full flex items-center justify-between p-4 bg-[#1f1f22]/30 hover:bg-[#1f1f22]/60 border border-[#353534]/20 rounded-sm transition-all group"
                >
                  <div className="flex items-center gap-4 text-left">
                    <Database className="w-5 h-5 text-[#737373] group-hover:text-white transition-colors" />
                    <div className="space-y-0.5">
                      <p className="text-[14px] font-main font-bold text-white uppercase">Local backup / restore</p>
                      <p className="text-[9px] font-mono text-[#737373] uppercase">Manage database snapshots and recovery</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#737373]" />
                </button>

                <button 
                  onClick={() => onNavigate('version')}
                  className="w-full flex items-center justify-between p-4 bg-[#1f1f22]/30 hover:bg-[#1f1f22]/60 border border-[#353534]/20 rounded-sm transition-all group"
                >
                  <div className="flex items-center gap-4 text-left">
                    <Info className="w-5 h-5 text-[#737373] group-hover:text-white transition-colors" />
                    <div className="space-y-0.5">
                      <p className="text-[14px] font-main font-bold text-white uppercase">About / version info</p>
                      <p className="text-[9px] font-mono text-[#737373] uppercase">System manifest and protocol history</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#737373]" />
                </button>

                <button 
                  onClick={() => onNavigate('logout-confirm')}
                  className="w-full flex items-center justify-between p-4 mt-4 bg-red-600/5 hover:bg-red-600/10 border border-red-600/20 rounded-sm transition-all group"
                >
                  <div className="flex items-center gap-4 text-left">
                    <LogOut className="w-5 h-5 text-red-600" />
                    <div className="space-y-0.5">
                      <p className="text-[14px] font-main font-bold text-red-600 uppercase">Logout</p>
                      <p className="text-[9px] font-mono text-red-600/50 uppercase">Terminate active session</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-600/50" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-12 border-t border-[#353534]/20 flex justify-between items-end pb-12">
           <div className="flex gap-12">
              <div className="space-y-1">
                 <span className="text-[9px] font-mono text-[#737373] uppercase block">Build</span>
                 <span className="text-[11px] font-main text-white uppercase">STABLE_2024.10.14</span>
              </div>
              <div className="space-y-1">
                 <span className="text-[9px] font-mono text-[#737373] uppercase block">Environment</span>
                 <span className="text-[11px] font-main text-white uppercase flex items-center gap-2">
                    <Zap size={12} className="text-[#e60000]" />
                    SECURE_NODE_B4
                 </span>
              </div>
           </div>
           <p className="text-[9px] font-mono text-[#737373] uppercase">© 2024 CODA_CORP // ALL RIGHTS REDACTED.</p>
        </div>

      </div>
    </div>
  );
};
