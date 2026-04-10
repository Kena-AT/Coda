import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronRight, Hash, Code2, RefreshCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Recommendation {
  id: number;
  title: string;
  content: string;
  category: string;
  match_score: number;
  reason: string;
  breakdown: {
    workflow: number;
    context: number;
    patterns: number;
    popularity: number;
    ctr_penalty: number;
  };
}

interface RecommendationMetadata {
  total_snippets: number;
  db_size_formatted: string;
  heuristics_engine: string;
  last_workflow_sync: string;
}

interface SmartRecommendationsProps {
  currentLanguage: string;
  currentTags: string;
  onPreview: (content: string) => void;
}

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ currentLanguage, currentTags, onPreview }) => {
  const { user, selectedSnippetId } = useStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [metadata, setMetadata] = useState<RecommendationMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'smart' | 'stale'>('smart');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeSubTab === 'smart') {
        const recs = await invoke<Recommendation[]>('get_contextual_recommendations', {
          user_id: user.id,
          current_language: currentLanguage,
          current_tags: currentTags,
          current_snippet_id: selectedSnippetId
        });
        setRecommendations(recs);
      } else {
        const recs = await invoke<Recommendation[]>('get_stale_snippets', {
          user_id: user.id
        });
        setRecommendations(recs);
      }

      const meta = await invoke<RecommendationMetadata>('get_recommendations_metadata', { user_id: user.id });
      setMetadata(meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentLanguage, currentTags, selectedSnippetId, activeSubTab]);

  return (
    <aside className="w-[300px] bg-[#0e0e0e] border-l border-[#222226] flex flex-col pt-10">
      
      {/* Sidebar Header */}
      <div className="px-6 py-4 border-b border-[#222226] flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="font-main font-bold text-[10px] text-white tracking-[2px] uppercase">Smart_Intelligence</h3>
          <span className="text-[9px] text-[#e60000] font-mono mt-1">Rule-Based v1.1.0</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveSubTab('smart')}
            className={cn(
              "px-2 py-0.5 text-[8px] font-bold tracking-[1px] uppercase border",
              activeSubTab === 'smart' ? "bg-[#e60000] border-[#e60000] text-white" : "border-[#222226] text-[#adaaad]"
            )}
          >
            SMART
          </button>
          <button 
            onClick={() => setActiveSubTab('stale')}
            className={cn(
              "px-2 py-0.5 text-[8px] font-bold tracking-[1px] uppercase border",
              activeSubTab === 'stale' ? "bg-[#e60000] border-[#e60000] text-white" : "border-[#222226] text-[#adaaad]"
            )}
          >
            STALE
          </button>
        </div>
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
                 
                 <div 
                    className="bg-[#131313] border border-[#222226] p-4 flex flex-col gap-3 group-hover:border-[#e60000]/50 transition-all cursor-pointer" 
                    onClick={async () => {
                      onPreview(rec.content);
                      try {
                        await invoke('record_recommendation_click', { snippet_id: rec.id });
                      } catch (err) {
                        console.error("CTR tracking failed:", err);
                      }
                    }}
                  >
                    <h4 className="text-[11px] font-main font-bold text-white uppercase tracking-[0.5px] truncate">{rec.title}</h4>
                    <div className="bg-[#0a0a0a] p-3 text-[10px] font-mono text-[#adaaad]/60 overflow-hidden text-ellipsis whitespace-nowrap border border-[#222226]/50">
                       {rec.content}
                    </div>

                    {/* Score Breakdown Tooltip-style info */}
                    <div className="flex flex-wrap gap-2 pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        {rec.breakdown.workflow > 0 && <span className="text-[7px] font-mono text-[#00ff00]">WORKFLOW+{Math.round(rec.breakdown.workflow)}</span>}
                        {rec.breakdown.context > 0 && <span className="text-[7px] font-mono text-[#0088ff]">CONTEXT+{Math.round(rec.breakdown.context)}</span>}
                        {rec.breakdown.patterns > 0 && <span className="text-[7px] font-mono text-[#ffaa00]">PATTERN+{Math.round(rec.breakdown.patterns)}</span>}
                        {rec.breakdown.popularity > 0 && <span className="text-[7px] font-mono text-[#ff00ff]">VELOCITY+{Math.round(rec.breakdown.popularity)}</span>}
                        {rec.breakdown.ctr_penalty > 0 && <span className="text-[7px] font-mono text-[#e60000]">CTR_ADJ-{Math.round(rec.breakdown.ctr_penalty)}</span>}
                    </div>

                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[#222226]/50">
                       <span className="text-[10px] text-[#e60000] font-bold">{rec.match_score}% Match</span>
                       <div className="flex items-center gap-1 text-[9px] text-[#adaaad] group-hover:text-white transition-colors">
                          <span>Preview & Sync</span>
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
      <div className="p-6 bg-[#0a0a0a] border-t border-[#222226] flex flex-col gap-3 text-[8px] font-mono text-[#adaaad] uppercase tracking-[1px]">
          <div className="flex justify-between">
            <span>ENGINE:</span>
            <span className="text-white">{metadata?.heuristics_engine || 'STABLE'}</span>
          </div>
          <div className="flex justify-between">
            <span>SYNCED:</span>
            <span className="text-white">{metadata?.last_workflow_sync || 'N/A'}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-white/5 mt-1">
            <span>STATUS:</span>
            <span className="text-[#00ff00]">ACTIVE_STABLE</span>
          </div>
         
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

