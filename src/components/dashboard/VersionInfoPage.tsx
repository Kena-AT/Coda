import React, { useState } from 'react';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Activity, 
  ShieldCheck, 
  Terminal,
  History
} from 'lucide-react';

interface VersionInfoPageProps {
  onBack: () => void;
}

export const VersionInfoPage: React.FC<VersionInfoPageProps> = ({ onBack }) => {
  const [rebooting, setRebooting] = useState(false);

  const handleReboot = () => {
    setRebooting(true);
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Nav */}
        <button 
          onClick={onBack}
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
            <h1 className="text-8xl font-main font-black text-white tracking-[-6px] uppercase leading-none">VERSION_INFO</h1>
            <div className="text-right space-y-1 mb-2">
               <p className="text-[9px] font-mono text-[#737373] uppercase">Last Kernel Update: 2023.10.12_0400</p>
               <p className="text-[10px] font-main text-green-500 font-bold uppercase tracking-[1px]">Status: Fully_Operational</p>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#1f1f22]" />

        {/* Main Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
          <div className="bg-[#131313] p-8 border border-[#353534]/30 space-y-6">
            <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px] border-b border-[#353534]/50 pb-2">App Version</p>
            <h2 className="text-4xl font-main font-bold text-white uppercase tracking-[-1px]">V.2.0.4-STABLE</h2>
            <div className="flex items-center gap-2 text-[#737373]">
               <ShieldCheck size={14} className="text-[#e60000]" />
               <span className="text-[9px] font-mono uppercase">Encrypted_Sig_Valid</span>
            </div>
          </div>

          <div className="bg-[#131313] p-8 border border-[#353534]/30 space-y-6 lg:col-span-2 relative overflow-hidden">
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
            <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px] border-b border-[#353534]/50 pb-2">Build Identifier</p>
            <h2 className="text-5xl font-main font-bold text-white uppercase tracking-[-2px]">882-QX-ALPHA</h2>
          </div>

          <div className="bg-[#131313] p-8 border border-[#353534]/30 space-y-8">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">System Health</p>
                <Activity size={12} className="text-green-500 animate-pulse" />
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px] font-main uppercase">
                   <span className="text-[#adaaad]">Kernel</span>
                   <span className="text-green-500 font-bold">Stable</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-main uppercase">
                   <span className="text-[#adaaad]">Latency</span>
                   <span className="text-red-600 font-bold">12ms</span>
                </div>
                <div className="h-1 w-full bg-[#1f1f22]">
                   <div className="h-full bg-red-600 w-3/4" />
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12">
          
          {/* Changelog */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-2xl font-main font-bold text-white uppercase flex items-center gap-3">
              <History className="w-6 h-6 text-[#e60000]" />
              COMMIT_CHANGELOG_HISTORY
            </h3>
            <div className="space-y-6">
              {[
                { time: '2023.10.11_22:15', msg: 'Integrated sync.WaitGroup logic to monitor concurrent worker nodes during peak load handling.' },
                { time: '2023.10.09_14:30', msg: 'Initial buffer structure implementation for high-throughput packet processing on the crimson edge.' },
                { time: '2023.10.05_09:12', msg: 'Optimized memory allocation for large-scale dataset ingestion. Reduced overhead by 14.2%.' }
              ].map((log, i) => (
                <div key={i} className="flex gap-6 group">
                   <div className="w-1.5 h-1.5 bg-[#e60000] mt-1.5 shrink-0" />
                   <div className="space-y-2">
                      <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px] group-hover:text-red-600 transition-colors">{log.time}</p>
                      <p className="text-[13px] font-main text-[#adaaad] leading-relaxed">
                        <span className="text-[#e60000] mr-2 text-[10px]">{">"}</span>
                        {log.msg}
                      </p>
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Params */}
          <div className="space-y-8">
            <h3 className="text-2xl font-main font-bold text-white uppercase tracking-tight">OPERATIONAL_PARAMS</h3>
            <div className="bg-[#131313] border border-[#353534]/50 p-8 space-y-6">
               {[
                 { label: 'Node_Count', val: '1,024_ACTIVE' },
                 { label: 'Uptime', val: '342:12:09:44' },
                 { label: 'Encryption', val: 'AES_XTS_4096' },
                 { label: 'Protocol', val: 'CRIMSON_V2' }
               ].map((p, i) => (
                 <div key={i} className="flex justify-between items-center border-b border-[#353534]/20 pb-4">
                    <span className="text-[10px] font-mono text-[#737373] uppercase">{p.label}</span>
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
           <div className="space-y-3">
              <span className="text-[40px] font-main font-black text-[#1f1f22] leading-none">01</span>
              <p className="text-[11px] font-main font-bold text-red-600 uppercase">Architecture</p>
              <p className="text-[11px] font-main text-[#737373] leading-relaxed uppercase">Built on a distributed ledger backbone with real-time consensus mechanisms.</p>
           </div>
           <div className="space-y-3">
              <span className="text-[40px] font-main font-black text-[#1f1f22] leading-none">02</span>
              <p className="text-[11px] font-main font-bold text-red-600 uppercase">Security</p>
              <p className="text-[11px] font-main text-[#737373] leading-relaxed uppercase">Full zero-trust verification required for all endpoint interactions.</p>
           </div>
           <div className="space-y-3">
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
                    <h2 className="text-5xl font-main font-black text-white tracking-[-3px] uppercase">
                       {rebooting ? "REBOOTING..." : "EXECUTE_REBOOT_SIMULATION"}
                    </h2>
                 </div>

                 <button 
                   onClick={handleReboot}
                   disabled={rebooting}
                   className="px-12 py-5 bg-[#e60000] hover:bg-white hover:text-red-600 transition-all font-main font-black uppercase text-[16px] tracking-[1px] disabled:opacity-50"
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
