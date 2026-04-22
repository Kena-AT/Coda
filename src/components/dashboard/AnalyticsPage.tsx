import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Activity, 
  ShieldCheck, 
  Clock,
  Copy,
  Search
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

interface ActivityData {
  hour: string;
  count: number;
}

interface SnippetAnalytics {
  id: number;
  title: string;
  language: string;
  copy_count: number;
  last_used_at: string;
}

interface AnalyticsSummary {
  global_copies: number;
  last_entry: string;
  activity: ActivityData[];
  ledger: SnippetAnalytics[];
  resource_usage?: {
    cpu_percent: number;
    global_cpu: number;
    ram_mb: number;
    db_size_bytes: number;
  };
  copy_growth: number;
  db_size_bytes: number;
}

export const AnalyticsPage: React.FC = () => {
  const { user, snippets } = useStore();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [popularSnippets, setPopularSnippets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await invoke<AnalyticsSummary>('get_analytics_summary', { userId: user.id });
      setSummary(data);
      
      const popularRecs: any[] = await invoke('get_popular_snippets', { userId: user.id });
      setPopularSnippets(popularRecs.map(r => ({
        id: r.id,
        title: r.title,
        language: r.language,
        copies: r.match_score,
        reason: r.reason
      })));
    } catch (err: any) {
      console.error(err);
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // 10s live feed
    return () => clearInterval(interval);
  }, [user, snippets.length]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "No entries") return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !summary) {
    return <div className="flex-1 flex items-center justify-center text-[var(--accent)] font-mono animate-pulse">QUERYING_SYSTEM_LEDGER...</div>;
  }

  // Calculate storage quota (soft limit 100MB for visual effect, or 1GB)
  const quotaLimit = 100 * 1024 * 1024; // 100MB
  const storageUsed = summary?.db_size_bytes || 0;
  const quotaPercent = Math.min(100, Math.ceil((storageUsed / quotaLimit) * 100));

  return (
    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#0a0a0a] selection:bg-[var(--accent)] selection:text-white">
      
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-[var(--accent)]" />
            <span className="text-[10px] font-mono text-[var(--accent)] tracking-[2px] uppercase">System Monitor // Analytics.root</span>
        </div>
        <div className="flex items-center justify-between">
           <h1 className="text-[56px] font-main font-bold text-white tracking-[-3px] uppercase leading-none">Usage Stats</h1>
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#adaaad] font-mono uppercase">User Session ID</span>
              <span className="text-[14px] text-white font-bold font-mono">0x{user?.id.toString(16).padStart(4, '0').toUpperCase()}</span>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-12 gap-6 mb-12">
        
        {/* Traffic Velocity Chart */}
        <div className="col-span-8 bg-[var(--bg-primary)] border border-[var(--border)] p-8 flex flex-col gap-6 relative overflow-hidden">
           <div className="flex items-center justify-between z-10">
              <div className="flex flex-col gap-1">
                 <h3 className="text-white text-[16px] font-main font-bold uppercase tracking-[1px]">Traffic Velocity</h3>
                 <span className="text-[#adaaad] text-[10px] font-mono">{'>'} Activity over last 24h</span>
              </div>
              <div className="flex gap-2">
                 <div className="px-3 py-1 bg-[var(--accent)] text-white text-[9px] font-bold uppercase tracking-[1px]">Live_Feed</div>
                 <div className="px-3 py-1 bg-[#19191c] text-[#adaaad] text-[9px] font-bold uppercase tracking-[1px]">Historic</div>
              </div>
           </div>

           {/* Custom SVG Bar Chart */}
           <div className="h-[200px] flex items-end gap-2 mt-4 px-2">
              {Array.from({ length: 24 }).map((_, i) => {
                const hourStr = `${i.toString().padStart(2, '0')}:00`;
                const data = summary?.activity.find(a => a.hour === hourStr);
                const height = data ? Math.min(100, (data.count * 20) + 10) : 5;
                const opacity = data ? 1 : 0.1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group transition-all">
                    <div 
                      className="w-full bg-[var(--accent)] transition-all duration-500 rounded-t-[1px]" 
                      style={{ height: `${height}%`, opacity }}
                    />
                    {i % 4 === 0 && (
                      <span className="text-[8px] font-mono text-[#adaaad] opacity-50">{hourStr}</span>
                    )}
                  </div>
                );
              })}
           </div>
           
           <div className="flex justify-between mt-4 text-[8px] font-mono text-[#adaaad] opacity-50 uppercase tracking-[2px]">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:59</span>
           </div>
        </div>

        {/* Global Copies Info Card */}
        <div className="col-span-4 flex flex-col gap-6">
           <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] p-8 flex flex-col gap-4 group hover:border-[var(--accent)]/50 transition-all">
              <div className="flex justify-between items-start">
                  <Copy size={20} className="text-[var(--accent)]" />
                  <span className="text-[10px] text-[#adaaad] font-mono uppercase">Global Copies</span>
              </div>
              <div className="mt-2">
                 <div className="text-[42px] font-main font-bold text-white leading-none">
                    {summary?.global_copies.toLocaleString() || '0'}
                 </div>
                 <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--accent)] mt-1">
                    <Activity size={12} className={summary?.copy_growth && summary.copy_growth > 0 ? "animate-pulse" : ""} />
                    <span>{summary?.copy_growth && summary.copy_growth >= 0 ? '+' : ''}{summary?.copy_growth?.toFixed(1) || '0.0'}% vs last mo</span>
                 </div>
              </div>
           </div>

           <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] p-8 flex flex-col gap-4 group hover:border-[var(--accent)]/50 transition-all">
              <div className="flex justify-between items-start">
                  <Clock size={20} className="text-[var(--accent)]" />
                  <span className="text-[10px] text-[#adaaad] font-mono uppercase">Last Entry</span>
              </div>
              <div className="mt-2">
                 <div className="text-lg font-main font-bold text-white uppercase truncate">
                    {summary?.last_entry || 'N/A'}
                 </div>
                 <div className="text-[11px] font-mono text-[#adaaad] mt-1">
                    {'>'} {summary?.last_entry !== "No entries" ? "Last recorded buffer activity" : "No snippets added yet"}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Popular Snippets / Velocity Radar */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-[2px] bg-[var(--accent)]" />
            <h3 className="text-xl font-main font-bold text-white uppercase tracking-[1px]">High Velocity Snippets</h3>
        </div>
        <div className="grid grid-cols-5 gap-4">
           {popularSnippets.map((s, i) => (
             <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border)] p-5 flex flex-col gap-3 group hover:border-[var(--accent)]/50 transition-all">
                <div className="flex justify-between items-start">
                   <div className="px-2 py-0.5 bg-[var(--accent)] text-white text-[8px] font-bold uppercase tracking-[1px]">RANK_{i+1}</div>
                   <Activity size={12} className="text-[var(--accent)]/50" />
                </div>
                <h4 className="text-[12px] font-main font-bold text-white uppercase mt-1 truncate">{s.title}</h4>
                <div className="flex flex-col gap-1 mt-1">
                   <span className="text-[10px] text-[var(--accent)] font-bold font-mono">{s.copies} PTS</span>
                   <span className="text-[8px] text-[#adaaad] font-mono leading-tight">{s.reason}</span>
                </div>
             </div>
           ))}
           {popularSnippets.length === 0 && (
             <div className="col-span-5 py-12 text-center text-[#adaaad] font-mono text-[10px] uppercase opacity-40 border border-dashed border-[var(--border)]">
                Establishing trend intelligence... Continue usage to populate velocity metrics.
             </div>
           )}
        </div>
      </div>

      {/* Snippet Performance Ledger */}
      <div className="mb-12">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-6 mb-8">
           <div className="flex items-center gap-4">
              <div className="w-8 h-[2px] bg-[var(--accent)]" />
              <h3 className="text-xl font-main font-bold text-white uppercase tracking-[1px]">Snippet Performance Ledger</h3>
           </div>
           <div className="flex gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#adaaad]" />
                 <input 
                    type="text" 
                    placeholder="search_index..."
                    className="bg-[var(--bg-primary)] border border-[var(--border)] pl-9 pr-4 py-2 text-[10px] font-mono text-white outline-none focus:border-[var(--accent)]"
                 />
              </div>
              <button className="px-6 py-2 bg-[#1c1b1b] border border-[var(--border)] text-[#adaaad] text-[10px] font-bold uppercase transition-all hover:text-white hover:border-[var(--accent)]">Export.CSV</button>
           </div>
        </div>

        <div className="w-full">
           <div className="grid grid-cols-12 px-6 py-4 text-[9px] font-mono text-[#adaaad] uppercase tracking-[2px] border-b border-[var(--border)]/50">
              <div className="col-span-4">Snippet Name</div>
              <div className="col-span-2">Language</div>
              <div className="col-span-2">Access Count</div>
              <div className="col-span-2">Last Called</div>
              <div className="col-span-2 text-right">Integrity</div>
           </div>
           
           <div className="flex flex-col">
              {summary?.ledger.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 px-6 py-5 border-b border-[var(--border)]/30 hover:bg-[var(--bg-primary)] transition-colors group">
                   <div className="col-span-4 flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.copy_count > 10 ? 'bg-[var(--accent)]' : 'bg-[#adaaad]'}`} />
                      <span className="text-[12px] font-main font-bold text-white uppercase">{s.title}</span>
                   </div>
                   <div className="col-span-2 flex items-center">
                      <span className={`px-2 py-0.5 text-[9px] font-mono uppercase bg-[#1c1b1b] border border-[var(--border)] text-[#adaaad]`}>
                         {s.language}
                      </span>
                   </div>
                   <div className="col-span-2 flex items-center font-mono text-[11px] text-white">
                      {s.copy_count}
                   </div>
                   <div className="col-span-2 flex items-center font-mono text-[10px] text-[var(--accent)]">
                      {s.last_used_at ? `${formatDate(s.last_used_at)} ago` : 'Never'}
                   </div>
                   <div className="col-span-2 flex items-center justify-end">
                      <div className="flex items-center gap-2">
                         <ShieldCheck size={12} className="text-[#00ff9d]" />
                         <span className="text-[8px] font-mono text-[#00ff9d] uppercase">SECURE</span>
                      </div>
                   </div>
                </div>
              ))}
              {summary?.ledger.length === 0 && (
                <div className="p-12 text-center text-[#adaaad] font-mono text-[11px] uppercase opacity-50">No ledger data present in current stratum.</div>
              )}
           </div>
        </div>
      </div>

      {/* Footer System Health and Storage */}
      <div className="grid grid-cols-2 gap-8 mt-12 pb-12">
         <div className="bg-[var(--bg-primary)] border border-[var(--border)] p-8 flex flex-col gap-6">
            <h4 className="text-[14px] font-main font-bold text-white uppercase tracking-[1px]">System Health</h4>
            <div className="flex flex-col gap-4">
               {[
                 { label: 'DB Query Latency', val: 'Low-Latency', progress: 5 },
                 { label: 'System Memory', val: summary?.resource_usage ? `${Math.round(summary.resource_usage.ram_mb)}MB` : 'N/A', progress: summary?.resource_usage ? Math.min(100, (summary.resource_usage.ram_mb / 1024) * 100) : 0 },
                 { label: 'CPU Utilization', val: summary?.resource_usage ? `${summary.resource_usage.global_cpu.toFixed(1)}%` : 'N/A', progress: summary?.resource_usage?.global_cpu || 0 }
               ].map((item, i) => (
                 <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#adaaad] uppercase">
                       <span>{item.label}</span>
                       <span className="text-white">{item.val}</span>
                    </div>
                    <div className="h-[2px] bg-[#19191c]">
                       <div className="h-full bg-[var(--accent)] transition-all duration-1000" style={{ width: `${item.progress}%` }} />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-[var(--bg-primary)] border border-[var(--border)] p-8 flex items-center gap-10">
            <div className="relative w-32 h-32 flex items-center justify-center">
               <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                  <circle className="text-[#19191c]" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle 
                    className="text-[var(--accent)] transition-all duration-1000" 
                    strokeWidth="8" 
                    strokeDasharray={251.2} 
                    strokeDashoffset={251.2 * (1 - (quotaPercent / 100))} 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" cx="50" cy="50" 
                  />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-main font-bold text-white">{quotaPercent}%</span>
                  <span className="text-[8px] font-mono text-[#adaaad] uppercase">QUOTA</span>
               </div>
            </div>
            <div className="flex-1 flex flex-col gap-4">
               <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-main font-bold text-white uppercase">Vault Cluster B</span>
                  <p className="text-[10px] text-[#adaaad] leading-relaxed uppercase">
                    Storage: {formatBytes(storageUsed)} / {formatBytes(quotaLimit)}
                    <br />
                    Encrypted database node localized in application data.
                  </p>
               </div>
               <button className="w-fit px-6 py-2 bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-[1px] hover:bg-[#ff0000] transition-colors shadow-[0_0_15px_var(--accent-glow)0.2)]">
                  Purge Cache
               </button>
            </div>
         </div>
      </div>

    </div>
  );
};
