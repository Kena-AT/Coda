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

      <div className="max-w-6xl mx-auto p-12 relative flex flex-col z-10">
        
        {/* Header Section */}
        <header className="mb-12 border-l-4 border-[var(--accent)] pl-6 space-y-2 relative">
          <button 
            onClick={() => { playSound('click'); onBack(); }}
            onMouseEnter={() => playSound('hover')}
            className="absolute -top-4 -left-6 p-2 text-[#e5e2e1]/20 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <p className="text-[10px] font-mono text-[#e5e2e1]/40 uppercase tracking-[3px]">System.Configuration.Active</p>
          <h1 className="text-5xl font-bold tracking-tighter text-[#e5e2e1]">APP_SETTINGS</h1>
          <p className="text-[14px] font-mono text-[var(--accent)] uppercase">v4.0.2 // ENCRYPTION_STRENGTH: MAXIMUM</p>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 flex-1">
          
          {/* Section: Lockout Policy */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col relative overflow-hidden group">
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[var(--accent)]/5 rotate-45 transform pointer-events-none" />
            <div className="bg-[var(--border)] py-1 px-4 text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              01 // Security_Override
            </div>
            <div className="p-8 space-y-8 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                <Shield className="text-[var(--accent)]" size={24} />
                LOCKOUT POLICY
              </h3>
              
              <div className="space-y-6">
                {/* Threshold Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[13px] font-bold text-[#e5e2e1]/80">FAILED_ATTEMPTS_THRESHOLD</p>
                    <span className="text-[var(--accent)] font-bold text-xl">{settings.lockoutThreshold}</span>
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
                    <p className="text-[13px] font-bold text-[#e5e2e1]/80">AUTO_LOCK_TIMER</p>
                    <span className="text-[var(--accent)] font-bold text-xl">{settings.autoLockTimer}:00</span>
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
                  <p className="text-[9px] font-mono text-[#e5e2e1]/30">Recommended: [05:00 - 30:00]</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Notifications */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              02 // Signal_Protocol
            </div>
            <div className="p-8 space-y-8">
              <h3 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                <Bell className="text-[var(--accent)]" size={24} />
                NOTIFICATIONS
              </h3>

              <div className="space-y-4">
                {/* Push Alerts Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[13px] font-bold">PUSH_ALERTS</p>
                    <p className="text-[9px] font-mono text-[#e5e2e1]/30 uppercase tracking-tighter">System broadcast to device</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ pushAlerts: !settings.pushAlerts })}
                    className={`w-12 h-6 rounded-sm transition-all relative ${settings.pushAlerts ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.pushAlerts ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                {/* Sound Effects Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 rounded-sm">
                  <div className="space-y-1">
                    <p className="text-[13px] font-bold">SOUND_EFFECTS</p>
                    <p className="text-[9px] font-mono text-[#e5e2e1]/30 uppercase tracking-tighter">Auditory feedback loops</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSetting({ soundEffects: !settings.soundEffects })}
                    className={`w-12 h-6 rounded-sm transition-all relative ${settings.soundEffects ? 'bg-white/40' : 'bg-[var(--border)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${settings.soundEffects ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Theme/Aesthetics & Font */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] xl:col-span-2 flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              03 // Core_Aesthetics
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 p-8 gap-16">
              {/* Theme Selection */}
              <div className="space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                  <Palette className="text-[var(--accent)]" size={24} />
                  THEME_ENGINE
                </h3>
                <div className="grid grid-cols-3 gap-1">
                  {(['crimson', 'void', 'matrix'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleUpdateSetting({ theme })}
                      className={`p-4 border font-mono text-[10px] uppercase tracking-widest transition-all ${
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
              <div className="space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                  <Type className="text-[var(--accent)]" size={24} />
                  FONT_CONFIG
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-[var(--border)] pb-2">
                    <p className="text-[13px] font-bold">DISPLAY_SCALE</p>
                    <span className="text-[var(--accent)] font-bold text-xl">{settings.fontSize}%</span>
                  </div>
                  <div className="h-0.5 w-full bg-[var(--border)] relative">
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
                  <p className="text-[11px] font-mono text-[#e5e2e1]/30 uppercase pt-2 bg-[#131313]/50 p-4">
                    NOTE: This adjustment modifies the interface dimension multipliers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Shortcuts */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              04 // Control_Binding
            </div>
            <div className="p-8 space-y-8 flex-1 pb-40">
              <h3 className="text-xl font-bold tracking-tight uppercase">SHORTCUTS</h3>
              <div className="space-y-2">
                 {[
                   { label: 'Save Snippet', keys: ['⌘', 'S'] },
                   { label: 'New Snippet', keys: ['⌘', 'N'] },
                   { label: 'Search All', keys: ['⌘', 'F'] },
                 ].map((s, idx) => (
                   <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border)]/20 group">
                      <span className="text-[#e5e2e1]/60 text-[12px] uppercase font-mono group-hover:text-white transition-colors">{s.label}</span>
                      <div className="flex gap-1">
                        {s.keys.map((k, kidx) => (
                          <span key={kidx} className="bg-[#131313] border border-[var(--border)] px-1.5 py-0.5 rounded-sm text-[10px] text-[#e5e2e1]/80 min-w-[20px] text-center">{k}</span>
                        ))}
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </section>

          {/* Section: Account */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col">
            <div className="bg-[var(--border)] py-1 px-4 text-[10px] font-mono text-[#e5e2e1]/60 uppercase tracking-widest">
              05 // Authentication
            </div>
            <div className="p-8 space-y-4">
              <h3 className="text-xl font-bold tracking-tight uppercase">ACCOUNT</h3>
              
              <div className="space-y-2">
                <button 
                  onClick={() => { playSound('transition'); onNavigate('change-password'); }}
                  className="w-full flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 hover:border-[var(--accent)]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <Key size={18} className="text-[#e5e2e1]/40" />
                    <span className="text-[12px] font-bold uppercase tracking-tight">CHANGE MASTER PASSWORD</span>
                  </div>
                  <ChevronRight size={14} className="text-[#e5e2e1]/20" />
                </button>

                <button 
                  onClick={() => { playSound('transition'); onNavigate('backup'); }}
                  className="w-full flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 hover:border-[var(--accent)]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <Database size={18} className="text-[#e5e2e1]/40" />
                    <span className="text-[12px] font-bold uppercase tracking-tight">LOCAL BACKUP / RESTORE</span>
                  </div>
                  <ChevronRight size={14} className="text-[#e5e2e1]/20" />
                </button>

                <button 
                  onClick={() => { playSound('transition'); onNavigate('version'); }}
                  className="w-full flex items-center justify-between p-4 bg-[#131313] border border-[var(--border)]/50 hover:border-[var(--accent)]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <Info size={18} className="text-[#e5e2e1]/40" />
                    <span className="text-[12px] font-bold uppercase tracking-tight">VERSION_INFO_v.4.0.2</span>
                  </div>
                  <ChevronRight size={14} className="text-[#e5e2e1]/20" />
                </button>

                <button 
                  onClick={() => { playSound('error'); onNavigate('logout-confirm'); }}
                  className="w-full flex items-center justify-between p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <LogOut size={18} className="text-[var(--accent)]" />
                    <span className="text-[12px] font-bold uppercase tracking-tight text-[var(--accent)]">LOGOUT</span>
                  </div>
                  <Activity size={14} className="text-[var(--accent)] animate-pulse" />
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Meta */}
        <footer className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
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
