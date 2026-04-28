import React from 'react';
import { 
  Shield, 
  Bell, 
  Palette, 
  Type, 
  ChevronRight, 
  LogOut, 
  Database, 
  Info, 
  Key,
  Lock,
  MessageSquare,
  Activity,
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
    <div className="flex-1 w-full h-full bg-[#131313] text-[#e5e2e1] overflow-y-auto font-main relative scrollbar-hide">
      
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center overflow-hidden">
        <h1 className="text-[200px] font-bold tracking-[-10px] leading-none select-none">CODE_BASE</h1>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12 relative flex flex-col z-10">
        
        {/* Header Section */}
        <header className="mb-8 md:mb-12 border-l-4 border-[var(--accent)] pl-4 md:pl-6 space-y-2 relative">
          <button 
            onClick={() => { playSound('click'); onBack(); }}
            onMouseEnter={() => playSound('hover')}
            className="absolute -top-6 md:-top-4 -left-6 p-2 text-[#e5e2e1]/20 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <p className="text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/40 uppercase tracking-[2px] md:tracking-[3px]">System.Configuration.Active</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1]">APP_SETTINGS</h1>
          <p className="text-[12px] md:text-[14px] font-mono text-[var(--accent)] uppercase">v4.0.2 // ENCRYPTION: MAX</p>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 flex-1">
          
          {/* Section: Lockout Policy */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col relative overflow-hidden group">
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[var(--accent)]/5 rotate-45 transform pointer-events-none" />
            <div className="bg-[var(--border)] py-1 px-4 text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              01 // Security_Override
            </div>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8 relative z-10">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 tracking-tight">
                <Shield className="text-[var(--accent)]" size={20} md:size={24} />
                LOCKOUT POLICY
              </h3>
              
              <div className="space-y-6">
                {/* Threshold Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[12px] md:text-[13px] font-bold text-[#e5e2e1]/80 uppercase">Threshold</p>
                    <span className="text-[var(--accent)] font-bold text-lg md:text-xl">{settings.lockoutThreshold}</span>
                  </div>
                  <div className="h-6 relative overflow-hidden flex items-center">
                    <div className="h-2 w-full bg-[var(--border)]/50 relative">
                      <div 
                        className="h-full bg-[var(--accent)] transition-all duration-300 shadow-[0_0_10px_var(--accent-glow)0.5)]" 
                        style={{ width: `${(settings.lockoutThreshold / 10) * 100}%` }}
                      />
                    </div>
                    <input 
                      type="range" min="1" max="10" 
                      value={settings.lockoutThreshold}
                      onChange={(e) => handleUpdateSetting({ lockoutThreshold: parseInt(e.target.value) })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Timer Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[12px] md:text-[13px] font-bold text-[#e5e2e1]/80 uppercase">Auto Lock</p>
                    <span className="text-[var(--accent)] font-bold text-lg md:text-xl">{settings.autoLockTimer}:00</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--border)]/50 relative">
                    <div 
                      className="h-full bg-[var(--accent)] transition-all duration-300" 
                      style={{ width: `${(settings.autoLockTimer / 60) * 100}%` }}
                    />
                    <input 
                      type="range" min="5" max="60" step="5"
                      value={settings.autoLockTimer}
                      onChange={(e) => handleUpdateSetting({ autoLockTimer: parseInt(e.target.value) })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[8px] md:text-[9px] font-mono text-[#e5e2e1]/30">Recommended: [05:00 - 30:00]</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Notifications */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              02 // Signal_Protocol
            </div>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 tracking-tight">
                <Bell className="text-[var(--accent)]" size={20} md:size={24} />
                NOTIFICATIONS
              </h3>

              <div className="space-y-4">
                {/* Push Alerts Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[12px] md:text-[13px] font-bold">PUSH_ALERTS</p>
                    <p className="text-[8px] md:text-[9px] font-mono text-[#e5e2e1]/30 uppercase tracking-tighter">System broadcast</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ pushAlerts: !settings.pushAlerts })}
                    className={`w-12 h-6 rounded-sm transition-all relative shrink-0 ${settings.pushAlerts ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.pushAlerts ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                {/* Sound Effects Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[12px] md:text-[13px] font-bold">SOUND_EFFECTS</p>
                    <p className="text-[8px] md:text-[9px] font-mono text-[#e5e2e1]/30 uppercase tracking-tighter">Auditory feedback</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ soundEffects: !settings.soundEffects })}
                    className={`w-12 h-6 rounded-sm transition-all relative shrink-0 ${settings.soundEffects ? 'bg-white/40' : 'bg-[var(--border)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.soundEffects ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Theme/Aesthetics & Font */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] xl:col-span-2 flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              03 // Core_Aesthetics
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 p-6 md:p-8 gap-8 md:gap-16">
              {/* Theme Selection */}
              <div className="space-y-6 md:space-y-8">
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 tracking-tight">
                  <Palette className="text-[var(--accent)]" size={20} md:size={24} />
                  THEME_ENGINE
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-1">
                  {(['crimson', 'void', 'matrix', 'glacier'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleUpdateSetting({ theme })}
                      className={`p-3 md:p-4 border font-mono text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${
                        settings.theme === theme 
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white' 
                        : 'bg-[#131313] border-[var(--border)] text-[#e5e2e1]/40 hover:border-white/20'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Configuration */}
              <div className="space-y-6 md:space-y-8">
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 tracking-tight">
                  <Type className="text-[var(--accent)]" size={20} md:size={24} />
                  FONT_CONFIG
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-[var(--border)] pb-2">
                    <p className="text-[12px] md:text-[13px] font-bold">DISPLAY_SCALE</p>
                    <span className="text-[var(--accent)] font-bold text-lg md:text-xl">{settings.fontSize}%</span>
                  </div>
                  <div className="h-0.5 w-full bg-[var(--border)] relative mt-4">
                    <div 
                      className="absolute top-[-4px] h-3 w-3 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent-glow)] cursor-pointer" 
                      style={{ left: `${((settings.fontSize - 80) / 70) * 100}%` }}
                    />
                    <input 
                      type="range" min="80" max="150" step="5"
                      value={settings.fontSize}
                      onChange={(e) => handleUpdateSetting({ fontSize: parseInt(e.target.value) })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] md:text-[11px] font-mono text-[#e5e2e1]/30 uppercase pt-2 bg-[#131313]/50 p-4">
                    Interface multipliers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Shortcuts */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              04 // Control_Binding
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 tracking-tight">
                <Shield className="text-[var(--accent)]" size={20} md:size={24} />
                HOTKEY_MAP
              </h3>
              <div className="space-y-3 font-mono text-[10px] md:text-[11px]">
                <div className="flex justify-between items-center p-3 bg-[#131313] border border-[var(--border)]/30">
                  <span className="text-[#e5e2e1]/40 uppercase">SAVE</span>
                  <span className="text-[var(--accent)] font-bold">CTRL + {settings.shortcuts.save}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#131313] border border-[var(--border)]/30">
                  <span className="text-[#e5e2e1]/40 uppercase">NEW</span>
                  <span className="text-[var(--accent)] font-bold">CTRL + {settings.shortcuts.newSnippet}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#131313] border border-[var(--border)]/30">
                  <span className="text-[#e5e2e1]/40 uppercase">SEARCH</span>
                  <span className="text-[var(--accent)] font-bold">CTRL + {settings.shortcuts.search}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Intelligence Layer */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              05 // Intelligence_Layer
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 tracking-tight">
                <Activity className="text-[var(--accent)]" size={20} md:size={24} />
                AI_CONFIG
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[12px] md:text-[13px] font-bold uppercase">Gemini_API</p>
                  <div className="p-3 bg-[#131313] border border-[var(--border)] text-[10px] md:text-[11px] font-mono text-white opacity-80 flex justify-between items-center">
                     <span>VIA .ENV FILE</span>
                     <Shield size={14} className="text-[var(--accent)]" />
                  </div>
                  <p className="text-[8px] md:text-[9px] font-mono text-[#e5e2e1]/30 uppercase tracking-tighter">
                    {import.meta.env.VITE_GEMINI_API_KEY ? 'ENABLED' : 'DISABLED'}
                  </p>
                </div>

                {/* Voice Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[12px] md:text-[13px] font-bold uppercase">JARVIS_MODE</p>
                    <p className="text-[8px] md:text-[9px] font-mono text-[#e5e2e1]/30 uppercase tracking-tighter">Verbal feedback</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ voiceEnabled: !settings.voiceEnabled })}
                    className={`w-12 h-6 rounded-sm transition-all relative shrink-0 ${settings.voiceEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.voiceEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                    <span className="text-[8px] md:text-[9px] font-mono font-bold text-[var(--accent)] uppercase">Status: Stable</span>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-[#adaaad] leading-relaxed italic">
                    AI co-pilot active.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Account */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[9px] md:text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              06 // Authentication
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <h3 className="text-lg md:text-xl font-bold tracking-tight uppercase">ACCOUNT</h3>
              
              <div className="space-y-2">
                <button 
                  onClick={() => { playSound('transition'); onNavigate('change-password'); }}
                  className="w-full flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 hover:border-[var(--accent)]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <Key size={18} className="text-[#e5e2e1]/40" />
                    <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-tight">PASSWORD</span>
                  </div>
                  <ChevronRight size={14} className="text-[#e5e2e1]/20" />
                </button>

                <button 
                  onClick={() => { playSound('transition'); onNavigate('backup'); }}
                  className="w-full flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 hover:border-[var(--accent)]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <Database size={18} className="text-[#e5e2e1]/40" />
                    <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-tight">BACKUP</span>
                  </div>
                  <ChevronRight size={14} className="text-[#e5e2e1]/20" />
                </button>

                <button 
                  onClick={() => { playSound('transition'); onNavigate('version'); }}
                  className="w-full flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 hover:border-[var(--accent)]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <Info size={18} className="text-[#e5e2e1]/40" />
                    <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-tight">VERSION</span>
                  </div>
                  <ChevronRight size={14} className="text-[#e5e2e1]/20" />
                </button>

                <button 
                  onClick={() => { playSound('error'); onNavigate('logout-confirm'); }}
                  className="w-full flex items-center justify-between p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <LogOut size={18} className="text-[var(--accent)]" />
                    <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-tight text-[var(--accent)]">LOGOUT</span>
                  </div>
                  <Activity size={14} className="text-[var(--accent)] animate-pulse" />
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Meta */}
        <footer className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <Lock size={12} className="text-[var(--accent)]" />
                 <span className="text-[9px] font-mono text-[#e5e2e1]/40 uppercase tracking-[1px]">CRYPTO_CORE: v4</span>
              </div>
              <div className="flex items-center gap-2">
                 <MessageSquare size={12} className="text-[#e5e2e1]/40" />
                 <span className="text-[9px] font-mono text-[#e5e2e1]/40 uppercase tracking-[1px]">LATENCY: 12ms</span>
              </div>
           </div>
           <p className="text-[9px] font-mono text-[#e5e2e1]/20 tracking-tighter uppercase whitespace-nowrap">
             © 2026 K.A.Y.E // ALL RIGHTS RESERVED.
           </p>
        </footer>
      </div>


    </div>
  );
};
