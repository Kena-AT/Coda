import React, { useMemo } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';

export const HardwareVisualization: React.FC = () => {
  const { snapshot, loading } = useTelemetry(2000); // Faster polling for viz

  const res = snapshot?.latest_resource;
  
  // Normalize values for visualization
  const cpuVal = res?.cpu_percent || 0;
  const ramVal = res?.ram_mb || 0;
  const dbSizeStr = res ? (res.db_size_bytes / (1024 * 1024)).toFixed(1) + 'MB' : '0MB';
  
  const snippetLoadTime = snapshot?.snippet_load_ms?.toFixed(0) || '0';
  const copyExecTime = snapshot?.copy_ms?.toFixed(0) || '0';
  const searchLatency = snapshot?.search_ms?.toFixed(0) || '0';
  const dbQueryTime = snapshot?.db_query_ms?.toFixed(0) || '0';


  const analyticsTask = snapshot?.tasks.find(t => t.name === 'analytics');
  const maintenanceTask = snapshot?.tasks.find(t => t.name === 'maintenance');

  // Pulse animation speed based on CPU
  const pulseDuration = useMemo(() => {
    if (cpuVal > 80) return '0.5s';
    if (cpuVal > 50) return '1s';
    if (cpuVal > 20) return '2s';
    return '4s';
  }, [cpuVal]);

  // Glow intensity based on RAM (normalized to 500MB approx)
  const glowOpacity = Math.min(ramVal / 500, 1) * 0.8;

  if (loading && !snapshot) {
    return <div className="animate-pulse text-[10px] text-[#adaaad] font-mono">INITIALIZING_TELEMETRY...</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top labels */}
      <div className="flex justify-between px-2">
        <div className="flex flex-col items-start">
           <span className="text-[8px] text-[#adaaad] uppercase">Snippet load time: {snippetLoadTime}ms</span>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[8px] text-[#adaaad] uppercase">Copy execution: {copyExecTime}ms</span>
        </div>
      </div>

      <div className="w-full aspect-square bg-transparent border border-[#e60000] relative grid grid-cols-2 grid-rows-2">
        {/* Grid Lines */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#e60000]/30" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-[#e60000]/30" />

        {/* TOP LEFT: RAM & CPU */}
        <div className="relative p-4 flex flex-col gap-4 border-r border-b border-[#e60000]/10">
          <div className="flex gap-4 items-start">
            <div 
              className="w-12 h-12 bg-[#e60000] shadow-[0_0_20px_rgba(230,0,0,0.5)] transition-all duration-500"
              style={{ opacity: 0.2 + glowOpacity, boxShadow: `0 0 ${20 + glowOpacity * 30}px rgba(230,0,0,${0.3 + glowOpacity})` }}
            />
            <div className="flex flex-col">
               <span className="text-[9px] text-[#adaaad] uppercase">Coda RAM MB</span>
               <span className="text-[12px] text-white font-bold leading-tight">{ramVal.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="flex gap-4 items-center mt-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
               <div className="absolute w-full h-full border-2 border-[#e60000]/20 rounded-full" />
               <div 
                 className="absolute w-full h-full border-2 border-t-[#e60000] rounded-full animate-spin"
                 style={{ animationDuration: pulseDuration }}
               />
               <div className="text-[8px] text-white font-bold">{cpuVal.toFixed(0)}%</div>
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] text-[#adaaad] uppercase leading-tight">Coda CPU %</span>
               <span className="text-[7px] text-[#e60000] uppercase tracking-tighter opacity-70">Faster pulse %</span>
               <span className="text-[7px] text-[#e60000] uppercase tracking-tighter opacity-70">a brighter</span>
            </div>
          </div>
        </div>

        {/* TOP RIGHT: DB HEALTH & CACHE */}
        <div className="relative p-4 flex flex-col gap-6 border-b border-[#e60000]/10">
          <div className="flex gap-3 items-start">
             <div className="w-10 h-10 bg-[#e60000]/10 border border-[#e60000]/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#e60000] animate-pulse opacity-20" />
                <div className="absolute bottom-0 left-0 w-full bg-[#e60000] transition-all duration-1000" style={{ height: `${Math.min(parseFloat(dbQueryTime) * 2, 100)}%` }} />
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] text-[#adaaad] uppercase font-bold">Database Health:</span>
                <span className="text-[8px] text-[#adaaad] uppercase">DB query time</span>
                <span className="text-[10px] text-white">{dbQueryTime}ms</span>
             </div>
          </div>

          <div className="flex gap-3 items-center">
             <div className="w-8 h-8 rounded-full border border-[#e60000] flex items-center justify-center relative">
                <div className="absolute inset-1 rounded-full border border-dashed border-[#e60000]/40 animate-[spin_10s_linear_infinite]" />
                <span className="text-[8px] text-white font-bold">{res?.cache_entries || 0}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[8px] text-[#adaaad] uppercase leading-tight">Cache size:</span>
                <span className="text-[7px] text-[#e60000] font-bold">Cache size</span>
             </div>
          </div>
        </div>

        {/* BOTTOM LEFT: RADAR & IMPORT */}
        <div className="relative p-4 flex flex-col justify-end border-r border-[#e60000]/10">
          <div className="absolute top-2 right-2 w-16 h-16 opacity-30">
             <div className="w-full h-full rounded-full border border-[#e60000] relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-[#e60000] -translate-y-1/2 -translate-x-1/2 opacity-20" />
                <div className="absolute top-1/2 left-1/2 w-[1px] h-full bg-[#e60000] -translate-y-1/2 -translate-x-1/2 opacity-20" />
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#e60000_0%,transparent_25%)] animate-[spin_3s_linear_infinite]" />
             </div>
          </div>
          
          <div className="flex flex-col gap-1 z-10 bg-[#111111]/80 p-1">
             <span className="text-[8px] text-[#adaaad] uppercase font-bold">Query Operations</span>
             
             <div className="flex flex-col mt-2 gap-1">
                <div className="flex justify-between items-center pr-2">
                   <span className="text-[8px] text-white">SEARCH: {searchLatency}ms</span>
                </div>
                <div className="flex justify-between items-center pr-2">
                   <span className="text-[8px] text-white">ANALYTICS: <span className={analyticsTask?.state === 'running' ? 'text-[#3b82f6]' : ''}>{analyticsTask?.state.toUpperCase() || 'IDLE'}</span></span>
                </div>
             </div>
          </div>
        </div>

        {/* BOTTOM RIGHT: BACKUP & FSIZE */}
        <div className="relative p-4 flex flex-col gap-4">
          <div className="flex gap-3 items-center">
             <div className="relative w-6 h-6 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full blur-[4px]  ${
                  maintenanceTask?.state === 'running' ? 'bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]' :
                  maintenanceTask?.state === 'failed' ? 'bg-[#ff0000] shadow-[0_0_10px_#ff0000]' :
                  'bg-[#adaaad]'
                } ${maintenanceTask?.state === 'running' ? 'animate-pulse' : ''}`} />
                <div className={`absolute w-2 h-2 rounded-full ${
                  maintenanceTask?.state === 'running' ? 'bg-[#fff]' :
                  maintenanceTask?.state === 'failed' ? 'bg-[#ff0000]' :
                  'bg-[#000]'
                }`} />
             </div>
             <div className="flex flex-col">
                <span className="text-[8px] text-[#adaaad] uppercase font-bold">Vault Maintenance</span>
                <span className={`text-[9px] font-bold ${
                  maintenanceTask?.state === 'running' ? 'text-[#3b82f6]' :
                  maintenanceTask?.state === 'failed' ? 'text-[#ff0000]' :
                  'text-[#adaaad]'
                }`}>
                  {maintenanceTask?.state.toUpperCase() || 'IDLE'}
                </span>
             </div>
          </div>

          <div className="mt-auto flex flex-col items-end">
             <span className="text-[10px] text-white font-mono">DB_FSIZE: {dbSizeStr}</span>
             <button className="mt-2 bg-[#e60000] text-white px-3 py-1 flex items-center gap-1 group overflow-hidden relative">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                <span className="text-[8px] font-bold">+</span>
                <span className="text-[8px] font-bold uppercase tracking-tighter">Add Monitor</span>
             </button>
          </div>
        </div>
      </div>

      {/* Footer metrics */}
      <div className="flex gap-4 text-[9px] font-main text-[#adaaad] uppercase tracking-[1px]">
        <span>CORE_TEMP: {snapshot?.core_temp ? `${snapshot.core_temp.toFixed(1)}°C` : 'N/A'}</span>
        <span>CPU_LOAD: {snapshot?.global_cpu ? `${snapshot.global_cpu.toFixed(1)}%` : '0%'}</span>
      </div>
    </div>
  );
};
