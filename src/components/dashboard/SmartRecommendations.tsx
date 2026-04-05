import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Zap, ChevronRight, Hash, Code2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Recommendation {
  id: number;
  title: string;
  content: string;
  category: string;
  match_score: number;
  reason: string;
}

interface RecommendationMetadata {
  total_snippets: number;
  db_size_formatted: string;
  heuristics_engine: string;
}

interface SmartRecommendationsProps {
  currentLanguage: string;
  currentTags: string;
  onPreview: (content: string) => void;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ currentLanguage, currentTags, onPreview }) => {
  const { user } = useStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [metadata, setMetadata] = useState<RecommendationMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [recs, meta] = await Promise.all([
        invoke<Recommendation[]>('get_contextual_recommendations', {
          userId: user.id,
          currentLanguage,
          currentTags
        }),
        invoke<RecommendationMetadata>('get_recommendations_metadata', { userId: user.id })
      ]);
      setRecommendations(recs);
      setMetadata(meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentLanguage, currentTags]);

  return (
    <aside className="w-[300px] bg-[#0e0e0e] border-l border-[#222226] flex flex-col pt-10">
      
      {/* Sidebar Header */}
      <div className="px-6 pb-6 border-b border-[#222226] flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#e60000]" />
            <h3 className="text-[12px] font-main font-bold text-white tracking-[1px] uppercase">Smart Recs</h3>
         </div>
         <span className="px-1.5 py-0.5 bg-[#e60000] text-white text-[8px] font-bold uppercase tracking-[1px] animate-pulse">LIVE</span>
      </div>

      {/* Recs List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
         
         {loading ? (
            <div className="p-10 text-center text-[10px] font-mono text-[#adaaad] animate-pulse">HEURISTICS_SCAN...</div>
         ) : recommendations.length > 0 ? (
            recommendations.map((rec, i) => (
              <div key={i} className="flex flex-col gap-4 group">
                 <div className="flex justify-between items-center text-[9px] font-mono">
                    <div className="flex items-center gap-2 text-[#adaaad]">
                       {rec.category === "Language Match" ? <Code2 size={12} /> : <Hash size={12} />}
                       <span># {rec.category}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#1c1b1b] text-[#adaaad] text-[8px] uppercase group-hover:bg-[#e60000] group-hover:text-white transition-colors">
                      {rec.reason}
                    </span>
                 </div>
                 
                 <div className="bg-[#131313] border border-[#222226] p-4 flex flex-col gap-3 group-hover:border-[#e60000]/50 transition-all cursor-pointer" onClick={() => onPreview(rec.content)}>
                    <h4 className="text-[11px] font-main font-bold text-white uppercase tracking-[0.5px] truncate">{rec.title}</h4>
                    <div className="bg-[#0a0a0a] p-3 text-[10px] font-mono text-[#adaaad]/60 overflow-hidden text-ellipsis whitespace-nowrap border border-[#222226]/50">
                       {rec.content}
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[#222226]/50">
                       <span className="text-[10px] text-[#e60000] font-bold">{rec.match_score}% Match</span>
                       <div className="flex items-center gap-1 text-[9px] text-[#adaaad] group-hover:text-white transition-colors">
                          <span>Click to Preview</span>
                          <ChevronRight size={10} />
                       </div>
                    </div>
                 </div>
              </div>
            ))
         ) : (
            <div className="mt-10 px-4 text-center">
               <p className="text-[10px] font-mono text-[#adaaad] uppercase leading-relaxed opacity-50">Continue developing to generate contextual matrix suggestions.</p>
            </div>
         )}
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-[#0a0a0a] border-t border-[#222226] flex flex-col gap-3">
         {[
           { label: 'HEURISTICS_ENGINE', val: metadata?.heuristics_engine || 'STABLE' },
           { label: 'LIBRARY_SIZE', val: `${metadata?.total_snippets || 0} NODES` },
           { label: 'DB_PAYLOAD', val: metadata?.db_size_formatted || 'N/A' },
           { label: 'USER_SESSION_ID', val: user?.username.slice(0, 8).toUpperCase() || 'RED_ACT_001' }
         ].map((item, i) => (
           <div key={i} className="flex justify-between text-[8px] font-mono text-[#adaaad] uppercase tracking-[1px]">
              <span>{item.label}</span>
              <span className="text-white">{item.val}</span>
           </div>
         ))}
         
         <button 
           onClick={fetchData}
           className="mt-4 w-full bg-[#1c1b1b] border border-[#222226] text-[#adaaad] py-2.5 text-[9px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 hover:bg-[#222226] hover:text-white transition-all shadow-inner"
         >
           Analyze Current Buffer
           <RefreshCcw size={10} className={loading ? 'animate-spin' : ''} />
         </button>
      </div>

    </aside>
  );
};

const RefreshCcw = ({ size, className }: { size: number, className: string }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);
