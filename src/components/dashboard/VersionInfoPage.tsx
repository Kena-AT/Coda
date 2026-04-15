import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Activity, 
  ShieldCheck, 
  Terminal,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSoundEffect } from '../../hooks/useSoundEffect';

interface TelemetrySnapshot {
  latest_resource: {
    cpu_percent: number;
    global_cpu: number;
    ram_mb: number;
    core_temp: number;
    db_size_bytes: number;
    cache_entries: number;
    timestamp: number;
  } | null;
  tasks: {
    name: string;
    state: string;
    duration_ms: number | null;
    retry_count: number;
    last_error: string | null;
  }[];
  diagnostics_enabled: boolean;
  core_temp: number;
  global_cpu: number;
}

interface SystemStatus {
  db_healthy: boolean;
  telemetry_active: boolean;
  session_valid: boolean;
}

interface VersionInfoPageProps {
  onBack: () => void;
}

export const VersionInfoPage: React.FC<VersionInfoPageProps> = ({ onBack }) => {
  const playSound = useSoundEffect();
  const [rebooting, setRebooting] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, s] = await Promise.all([
          invoke<TelemetrySnapshot>('get_telemetry_snapshot'),
          invoke<SystemStatus>('get_system_status')
        ]);
        setTelemetry(t);
        setStatus(s);
      } catch (err) {
        console.error('Telemetry fetch failed:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReboot = () => {
    playSound('click');
    setRebooting(true);
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  const dbSizeMb = telemetry?.latest_resource?.db_size_bytes 
    ? (telemetry.latest_resource.db_size_bytes / (1024 * 1024)).toFixed(2) 
    : '0.00';

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Nav */}
        <button 
          onClick={() => { playSound('transition'); onBack(); }}
          onMouseEnter={() => playSound('hover')}
          className="flex items-center gap-2 text-[#737373] hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[1px]"
        >
          <ArrowLeft size={14} />
          Return to Settings
        </button>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#e60000] font-mono text-[10px] tracking-[2px] uppercase">
            <div className="w-1.5 h-1.5 bg-[#e60000] rounded-full" />
            System_About_Manifest
          </div>
          <div className="flex justify-between items-end">
            <h1 className="text-2xl font-main font-bold text-white tracking-[-1px] uppercase leading-none">VERSION_INFO</h1>
            <div className="text-right space-y-1 mb-2">
               <p className="text-[9px] font-mono text-[#737373] uppercase">Status: {status?.telemetry_active ? 'TELEMETRY_LINK_ESTABLISHED' : 'LINK_OFFLINE'}</p>
               <p className={`text-[10px] font-main font-bold uppercase tracking-[1px] ${status?.db_healthy ? 'text-green-500' : 'text-red-500'}`}>
                 DB_Kernel: {status?.db_healthy ? 'Operational' : 'Critical_Failure'}
               </p>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#1f1f22]" />

        {/* Main Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
          <div 
            onMouseEnter={() => playSound('hover')}
            className="bg-[#131313] p-8 border border-[#353534]/30 space-y-6 hover:border-[#e60000]/50 transition-colors cursor-default"
          >
            <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px] border-b border-[#353534]/50 pb-2">App Version</p>
            <h2 className="text-lg font-main font-bold text-white uppercase tracking-[-1px]">V.2.0.4-STABLE</h2>
            <div className="flex items-center gap-2 text-[#737373]">
               <ShieldCheck size={14} className="text-[#e60000]" />
               <span className="text-[9px] font-mono uppercase">Encrypted_Sig_Valid</span>
            </div>
          </div>

          <div 
            onMouseEnter={() => playSound('hover')}
            className="bg-[#131313] p-8 border border-[#353534]/30 space-y-6 lg:col-span-2 relative overflow-hidden hover:border-[#e60000]/50 transition-colors cursor-default"
          >
            <div className="absolute top-0 right-0 p-8 h-full flex flex-col justify-between">
               <div className="flex gap-1 justify-end">
                  <div className="w-8 h-0.5 bg-[#e60000]" />
                  <div className="w-2 h-0.5 bg-white/20" />
               </div>
               <div className="flex gap-4">
                  <span className="px-2 py-0.5 bg-red-600/10 border border-red-600/30 text-red-600 text-[8px] font-mono uppercase">Production</span>
                  <span className="px-2 py-0.5 bg-red-600 border border-red-600 text-white text-[8px] font-mono uppercase">CI/CD_Active</span>
               </div>
            </div>
            <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px] border-b border-[#353534]/50 pb-2">Resource Utilization</p>
            <div className="flex items-end gap-4">
              <h2 className="text-xl font-main font-bold text-white uppercase tracking-[-1px]">{telemetry?.latest_resource?.ram_mb.toFixed(1) || '0.0'}MB</h2>
              <span className="text-[10px] font-mono text-[#737373] pb-1 uppercase">RAM_ALLOC</span>
            </div>
          </div>

          <div 
            onMouseEnter={() => playSound('hover')}
            className="bg-[#131313] p-8 border border-[#353534]/30 space-y-8 hover:border-[#e60000]/50 transition-colors cursor-default"
          >
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">System Health</p>
                <Activity size={12} className="text-green-500 animate-pulse" />
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px] font-main uppercase">
                   <span className="text-[#adaaad]">CPU_Load</span>
                   <span className="text-green-500 font-bold">{telemetry?.latest_resource?.cpu_percent.toFixed(1) || '0.0'}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-main uppercase">
                   <span className="text-[#adaaad]">Core_Temp</span>
                   <span className="text-red-600 font-bold">{telemetry?.core_temp.toFixed(1) || '0.0'}°C</span>
                </div>
                <div className="h-1 w-full bg-[#1f1f22]">
                   <div 
                     className="h-full bg-red-600 transition-all duration-1000" 
                     style={{ width: `${Math.min(telemetry?.global_cpu || 0, 100)}%` }}
                   />
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12">
          
          {/* Active Tasks / Protocol States */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-lg font-main font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <Terminal className="w-6 h-6 text-[#e60000]" />
              ACTIVE_PROTOCOL_STATES
            </h3>
            <div className="space-y-4">
              {telemetry?.tasks.map((task, i) => (
                <div 
                  key={i} 
                  onMouseEnter={() => playSound('hover')}
                  className="flex items-center justify-between p-4 bg-[#131313] border border-[#353534]/30 hover:border-[#e60000]/30 transition-all cursor-default group"
                >
                   <div className="flex gap-4 items-center">
                      <div className={`w-1.5 h-1.5 ${task.state === 'running' ? 'bg-red-600 animate-pulse' : 'bg-[#353534]'} shrink-0`} />
                      <div className="space-y-1">
                        <p className="text-[11px] font-main font-bold text-white uppercase tracking-[1px]">{task.name}</p>
                        <p className="text-[9px] font-mono text-[#737373] uppercase">{task.last_error || 'No active exceptions'}</p>
                      </div>
                   </div>
                   <div className="text-right space-y-1">
                      <p className={`text-[10px] font-mono uppercase font-bold ${task.state === 'failed' ? 'text-red-600' : 'text-[#737373] group-hover:text-white transition-colors'}`}>
                        {task.state}
                      </p>
                      {task.duration_ms && (
                        <p className="text-[9px] font-mono text-[#353534] uppercase">{task.duration_ms.toFixed(0)}ms_elapsed</p>
                      )}
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Params */}
          <div className="space-y-8">
            <h3 className="text-xl font-main font-bold text-white uppercase tracking-tight">OPERATIONAL_PARAMS</h3>
            <div className="bg-[#131313] border border-[#353534]/50 p-8 space-y-6">
               {[
                 { label: 'DB_Pool_Size', val: `${dbSizeMb} MB` },
                 { label: 'Cache_Heads', val: telemetry?.latest_resource?.cache_entries.toString() || '0' },
                 { label: 'Lockout_Threshold', val: '3_LOGIN_ATTEMPTS' },
                 { label: 'System_Latency', val: '12ms' }
               ].map((p, i) => (
                 <div 
                  key={i} 
                  onMouseEnter={() => playSound('hover')}
                  className="flex justify-between items-center border-b border-[#353534]/20 pb-4 group"
                 >
                    <span className="text-[10px] font-mono text-[#737373] uppercase group-hover:text-[#e60000] transition-colors">{p.label}</span>
                    <span className="text-[11px] font-main font-black text-white uppercase">{p.val}</span>
                 </div>
               ))}
               
               <div className="pt-6 flex items-center gap-4">
                 <div className="w-2 h-2 bg-red-600 animate-pulse" />
                 <span className="text-[9px] font-mono text-[#737373] uppercase italic">Monitoring live telemetry...</span>
               </div>
            </div>
          </div>

        </div>

        {/* Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-[#353534]/20">
           <div onMouseEnter={() => playSound('hover')} className="space-y-3 p-4 -m-4 hover:bg-white/5 transition-colors cursor-default">
              <span className="text-[40px] font-main font-black text-[#1f1f22] leading-none">01</span>
              <p className="text-[11px] font-main font-bold text-red-600 uppercase">Architecture</p>
              <p className="text-[11px] font-main text-[#737373] leading-relaxed uppercase">Built on a distributed ledger backbone with real-time consensus mechanisms.</p>
           </div>
           <div onMouseEnter={() => playSound('hover')} className="space-y-3 p-4 -m-4 hover:bg-white/5 transition-colors cursor-default">
              <span className="text-[40px] font-main font-black text-[#1f1f22] leading-none">02</span>
              <p className="text-[11px] font-main font-bold text-red-600 uppercase">Security</p>
              <p className="text-[11px] font-main text-[#737373] leading-relaxed uppercase">Full zero-trust verification required for all endpoint interactions.</p>
           </div>
           <div onMouseEnter={() => playSound('hover')} className="space-y-3 p-4 -m-4 hover:bg-white/5 transition-colors cursor-default">
              <span className="text-[40px] font-main font-black text-[#1f1f22] leading-none">03</span>
              <p className="text-[11px] font-main font-bold text-red-600 uppercase">Deployment</p>
              <p className="text-[11px] font-main text-[#737373] leading-relaxed uppercase">Automated shard recovery and self-healing infrastructure protocols.</p>
           </div>
        </div>

        {/* Reboot Hero Section */}
        <div className="pt-24 pb-12">
           <div className="bg-[#131313] border border-[#353534] p-12 relative overflow-hidden text-center group">
              {/* Scanline decor */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e60000]/5 to-transparent h-20 w-full animate-scanline pointer-events-none" />
              
              <div className="space-y-8 relative z-10">
                 <div className="flex flex-col items-center gap-4">
                    <Terminal className="w-12 h-12 text-red-600" />
                    <h2 className="text-3xl font-main font-bold text-white tracking-[-1px] uppercase">
                       {rebooting ? "REBOOTING..." : "EXECUTE_REBOOT_SIMULATION"}
                    </h2>
                 </div>

                 <button 
                   onClick={handleReboot}
                   onMouseEnter={() => playSound('hover')}
                   disabled={rebooting}
                   className="px-12 py-5 bg-[#e60000] hover:bg-white hover:text-red-600 transition-all font-main font-bold uppercase text-[13px] tracking-[1px] disabled:opacity-50"
                 >
                   {rebooting ? <RefreshCcw className="w-6 h-6 animate-spin mx-auto" /> : "INIT_REBOOT_SEQUENCE"}
                 </button>
              </div>

              <div className="absolute top-4 left-4 font-mono text-[8px] text-[#2a2a2e] uppercase">Module_ID: RESBOOT_BRT</div>
              <div className="absolute bottom-4 right-4 font-mono text-[8px] text-[#2a2a2e] uppercase">POS_COORD: 45.092 / -122.981</div>
           </div>
        </div>

      </div>
    </div>
  );
};
