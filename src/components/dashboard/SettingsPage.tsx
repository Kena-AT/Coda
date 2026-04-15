import React from 'react';
import { 
  Shield, 
  Bell, 
  Palette, 
  Type, 
  User, 
  ChevronRight, 
  LogOut, 
  Database, 
  Info, 
  Key,
  Volume2,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { soundService } from '../../utils/sounds';
import { invoke } from '@tauri-apps/api/core';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onNavigate }) => {
  const { settings, setSettings } = useStore();
  const playSound = useSoundEffect();

  const handleUpdateSetting = async (updates: Partial<typeof settings>) => {
    setSettings(updates);
    
    // Auditory feedback
    if (updates.soundEffects !== undefined) {
      if (updates.soundEffects) soundService.playSuccess();
      else soundService.playClick();
    } else {
      playSound('click');
    }
    
    try {
      await invoke('update_user_preferences', {
        prefs: {
          push_alerts: updates.pushAlerts ?? settings.pushAlerts,
          sound_effects: updates.soundEffects ?? settings.soundEffects,
          auto_lock_timer: updates.autoLockTimer ?? settings.autoLockTimer,
          lockout_threshold: updates.lockoutThreshold ?? settings.lockoutThreshold,
          font_size: updates.fontSize ?? settings.fontSize,
          theme_mode: updates.theme ?? settings.theme,
          keyboard_shortcuts: JSON.stringify(updates.shortcuts ?? settings.shortcuts),
        }
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0c] p-12">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-[#1f1f22] pb-12">
          <div className="space-y-4">
            <button 
              onClick={() => { playSound('click'); onBack(); }}
              className="group flex items-center gap-2 text-[#737373] hover:text-[#e60000] transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="text-[10px] font-mono uppercase tracking-[2px]">Terminal_Exit</span>
            </button>
            <h1 className="text-2xl font-main font-black text-white tracking-[-1px] uppercase">
              System_Settings<span className="text-[#e60000]">.env</span>
            </h1>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-mono text-[#737373] uppercase mb-1">Last Sync: {new Date().toLocaleTimeString()}</p>
             <div className="flex items-center justify-end gap-2 text-[#e60000]">
                <div className="w-1.5 h-1.5 bg-[#e60000] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[1px]">Data_Link_Secure</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 01 // SECURITY_OVERRIDE */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-sm overflow-hidden flex flex-col">
            <div className="bg-[#1f1f22]/50 p-3 border-b border-[#353534]/30">
              <span className="text-[10px] font-mono text-[#737373] tracking-[1px]">01 // SECURITY_OVERRIDE</span>
            </div>
            <div className="p-8 space-y-8 flex-1">
              <h3 className="text-lg font-main font-bold text-white uppercase flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#e60000]" />
                LOCKOUT POLICY
              </h3>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[13px] font-main font-bold text-white uppercase">Failed attempts threshold</p>
                    <span className="text-xl font-main font-bold text-[#e60000]">
                      {settings.lockoutThreshold} <span className="text-[9px] font-mono text-[#737373]">ATTEMPTS</span>
                    </span>
                  </div>
                  <div className="h-6 relative flex items-center">
                    <div className="h-1 w-full bg-[#1f1f22] rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-[#e60000] transition-all"
                         style={{ width: `${(settings.lockoutThreshold / 10) * 100}%` }}
                       />
                    </div>
                    <input 
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={settings.lockoutThreshold}
                      onChange={(e) => {
                        handleUpdateSetting({ lockoutThreshold: parseInt(e.target.value) });
                      }}
                      onMouseEnter={() => playSound('hover')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[13px] font-main font-bold text-white uppercase">Auto-lock timer</p>
                    <span className="text-xl font-main font-bold text-[#e60000]">
                      {settings.autoLockTimer}:00
                    </span>
                  </div>
                  <div className="h-6 relative flex items-center">
                    <div className="h-1 w-full bg-[#1f1f22] rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-[#e60000] transition-all"
                         style={{ width: `${(settings.autoLockTimer / 60) * 100}%` }}
                       />
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={settings.autoLockTimer}
                      onChange={(e) => {
                        handleUpdateSetting({ autoLockTimer: parseInt(e.target.value) });
                      }}
                      onMouseEnter={() => playSound('hover')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
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
              <h3 className="text-lg font-main font-bold text-white uppercase flex items-center gap-3">
                <Bell className="w-6 h-6 text-[#e60000]" />
                NOTIFICATIONS
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1f1f22]/30 border border-[#353534]/20 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[13px] font-main font-bold text-white uppercase">Push alerts</p>
                    <p className="text-[9px] font-mono text-[#737373] uppercase">System broadcast to device</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ pushAlerts: !settings.pushAlerts })}
                    className={`w-12 h-6 rounded-sm transition-all relative ${settings.pushAlerts ? 'bg-[#e60000]' : 'bg-[#2a2a2e]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.pushAlerts ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1f1f22]/30 border border-[#353534]/20 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[13px] font-main font-bold text-white uppercase flex items-center gap-2">
                       Sound effects
                       <Volume2 className="w-3.5 h-3.5 opacity-50" />
                    </p>
                    <p className="text-[9px] font-mono text-[#737373] uppercase">Auditory feedback loops</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ soundEffects: !settings.soundEffects })}
                    className={`w-12 h-6 rounded-sm transition-all relative ${settings.soundEffects ? 'bg-slate-600' : 'bg-[#2a2a2e]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.soundEffects ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 03 // CORE_AESTHETICS */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 lg:col-span-2 bg-[#131313] border border-[#353534]/30">
              <div className="space-y-8">
                <h3 className="text-lg font-main font-bold text-white uppercase flex items-center gap-3">
                  <Palette className="w-6 h-6 text-[#e60000]" />
                  THEME ENGINE
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['crimson', 'void', 'matrix'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleUpdateSetting({ theme })}
                      onMouseEnter={() => playSound('hover')}
                      className={`p-3 border transition-all text-center ${
                        settings.theme === theme 
                        ? 'border-[#e60000] bg-[#e60000]/10 text-white' 
                        : 'border-[#353534] text-[#737373] hover:border-white/30'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-[1px]">{theme}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-lg font-main font-bold text-white uppercase flex items-center gap-3">
                  <Type className="w-6 h-6 text-[#e60000]" />
                  FONT CONFIG
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-mono text-[#737373] uppercase">Display Scale</p>
                    <span className="text-xl font-main font-bold text-white">{settings.fontSize}%</span>
                  </div>
                  <div className="h-6 relative flex items-center">
                    <div className="h-1 w-full bg-[#1f1f22] rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-white transition-all"
                         style={{ width: `${((settings.fontSize - 80) / 70) * 100}%` }}
                       />
                    </div>
                    <input 
                      type="range"
                      min="80"
                      max="150"
                      step="5"
                      value={settings.fontSize}
                      onChange={(e) => handleUpdateSetting({ fontSize: parseInt(e.target.value) })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
          </div>

          {/* 04 // DATA_MANAGEMENT */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
             <button 
               onClick={() => { playSound('transition'); onNavigate('backup'); }}
               className="group flex flex-col items-start p-8 bg-[#1f1f22]/30 border border-[#353534]/20 hover:border-[#e60000]/50 transition-all text-left"
             >
                <Database className="w-8 h-8 text-[#adaaad] mb-6 group-hover:text-[#e60000] transition-colors" />
                <div className="space-y-1">
                  <span className="text-[13px] font-main font-bold text-white uppercase">Vault_Backup_Control</span>
                  <span className="text-[9px] font-mono text-[#737373] uppercase tracking-[1px]">Access local redundancy protocols</span>
                </div>
             </button>

             <button 
               onClick={() => { playSound('transition'); onNavigate('password'); }}
               className="group flex flex-col items-start p-8 bg-[#1f1f22]/30 border border-[#353534]/20 hover:border-[#e60000]/50 transition-all text-left"
             >
                <Key className="w-8 h-8 text-[#adaaad] mb-6 group-hover:text-[#e60000] transition-colors" />
                <div className="space-y-1">
                  <span className="text-[13px] font-main font-bold text-white uppercase">Security_Key_Rotation</span>
                  <span className="text-[9px] font-mono text-[#737373] uppercase tracking-[1px]">Modify administrative credentials</span>
                </div>
             </button>

             <button 
                onClick={() => { playSound('transition'); onNavigate('version'); }}
                className="group flex flex-col items-start p-8 bg-[#131313] border border-[#353534]/20 hover:bg-[#1f1f22] transition-all text-left"
             >
                <Info className="w-8 h-8 text-[#737373] mb-6" />
                <div className="space-y-1">
                  <span className="text-[13px] font-main font-bold text-white uppercase tracking-tight">System_Manifest</span>
                  <span className="text-[9px] font-mono text-[#737373] uppercase">Build_V2.0.4-STABLE // RED_CORE</span>
                </div>
             </button>

             <button 
                className="group flex flex-col items-start p-8 bg-[#131313] border border-[#353534]/20 hover:bg-[#1f1f22] transition-all text-left"
             >
                <User className="w-8 h-8 text-[#737373] mb-6" />
                <div className="space-y-1">
                  <span className="text-[13px] font-main font-bold text-white uppercase tracking-tight">Active_Operator</span>
                  <span className="text-[9px] font-mono text-[#737373] uppercase">Admin_clearance_Level_1</span>
                </div>
             </button>
          </div>

          <div className="lg:col-span-2 pt-12 space-y-6">
             <div className="flex items-center gap-4 text-[#737373]">
                <div className="h-[1px] flex-1 bg-[#1f1f22]" />
                <span className="text-[10px] font-mono uppercase tracking-[2px]">Advanced_Threat_Nullification</span>
                <div className="h-[1px] flex-1 bg-[#1f1f22]" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center justify-between p-6 border border-[#353534]/30 bg-red-600/5 hover:bg-red-600/10 transition-all group">
                   <div className="flex items-center gap-4">
                      <Trash2 className="text-[#e60000] w-5 h-5" />
                      <div className="text-left">
                        <p className="text-[11px] font-main font-bold text-white uppercase tracking-wider">Empty_Trash_Buffer</p>
                        <p className="text-[9px] font-mono text-[#737373] uppercase">Irreversible_Redaction</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-[#e60000] group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => { playSound('error'); onNavigate('logout'); }}
                  className="flex items-center justify-between p-6 border border-[#353534]/30 bg-white/5 hover:bg-white/10 transition-all group"
                >
                   <div className="flex items-center gap-4">
                      <LogOut className="text-white w-5 h-5" />
                      <div className="text-left">
                        <p className="text-[11px] font-main font-bold text-white uppercase tracking-wider">Terminate_Session</p>
                        <p className="text-[9px] font-mono text-[#737373] uppercase">Drop_All_Data_Links</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};
