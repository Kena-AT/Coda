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
  const { user, selectedSnippetId, settings, snippets } = useStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'syncing' | 'online' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<RecommendationMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'smart' | 'stale'>('smart');

  const FALLBACK_KEY = 'AIzaSyD-eW4TcBJUoxF1DerjG1bLS-ee3xUMqVY';
  const apiKey = settings.geminiApiKey || FALLBACK_KEY;

  const fetchGeminiInsight = async (currentSnippet: any) => {
    if (!currentSnippet?.content) return;
    
    setAiStatus('syncing');
    setLastError(null);

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze this ${currentSnippet.language} code and provide one brief (max 15 words) architectural improvement or security tip. Code: ${currentSnippet.content.substring(0, 1000)}`
              }]
            }]
          })
        });
      
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || '';
          // If model not found, try next model
          if (response.status === 404 || errMsg.includes('not found')) continue;
          throw new Error(errMsg || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const insight = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (insight) {
          setAiInsight(insight);
          setAiStatus('online');
          return; // Success — stop trying
        } else {
          throw new Error('EMPTY_AI_RESPONSE');
        }
      } catch (e: any) {
        // If this is the last model, report the error
        if (model === models[models.length - 1]) {
          console.error("Gemini failed:", e);
          setAiStatus('error');
          setLastError(e.message || 'CONNECTION_FAILURE');
        }
        // Otherwise continue to next model
      }
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeSubTab === 'smart') {
        const recs = await invoke<Recommendation[]>('get_contextual_recommendations', {
          userId: user.id,
          currentLanguage: currentLanguage,
          currentTags: currentTags,
          currentSnippetId: selectedSnippetId
        });
        setRecommendations(recs);
      } else {
        const recs = await invoke<Recommendation[]>('get_stale_snippets', {
          userId: user.id
        });
        setRecommendations(recs);
      }

      const meta = await invoke<RecommendationMetadata>('get_recommendations_metadata', { userId: user.id });
      setMetadata(meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (selectedSnippetId && selectedSnippetId !== -1) {
      const snip = snippets.find(s => s.id === selectedSnippetId);
      fetchGeminiInsight(snip);
    }
  }, [currentLanguage, currentTags, selectedSnippetId, activeSubTab]);

  return (
    <aside className="w-[300px] bg-[var(--bg-primary)] border-l border-[var(--border)] flex flex-col pt-10">
      
      {/* Sidebar Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="font-main font-bold text-[10px] text-white tracking-[2px] uppercase">
            {settings.geminiApiKey ? 'GEMINI_CO-PILOT' : 'Smart_Intelligence'}
          </h3>
          <span className="text-[9px] text-[var(--accent)] font-mono mt-1">
            {settings.geminiApiKey ? 'GENERATIVE_V3.0' : 'Rule-Based v1.1.0'}
          </span>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-1 h-1 rounded-full ${
              aiStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
              aiStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 
              aiStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 
              'bg-slate-700'
            }`} />
            <span className={`text-[8px] font-mono uppercase tracking-widest ${
              aiStatus === 'online' ? 'text-green-500' : 
              aiStatus === 'error' ? 'text-red-500' : 
              'text-[#adaaad]'
            }`}>
              {aiStatus === 'online' ? 'Service: Operational' : 
               aiStatus === 'syncing' ? 'Service: Syncing' : 
               aiStatus === 'error' ? 'Service: Failed' : 
               'Service: Offline'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveSubTab('smart')}
            className={cn(
              "px-2 py-0.5 text-[8px] font-bold tracking-[1px] uppercase border",
              activeSubTab === 'smart' ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border)] text-[#adaaad]"
            )}
          >
            SMART
          </button>
          <button 
            onClick={() => setActiveSubTab('stale')}
            className={cn(
              "px-2 py-0.5 text-[8px] font-bold tracking-[1px] uppercase border",
              activeSubTab === 'stale' ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border)] text-[#adaaad]"
            )}
          >
            STALE
          </button>
        </div>
      </div>

      {/* AI Insight Section */}
      {settings.geminiApiKey && activeSubTab === 'smart' && (
        <div className={`mx-4 mb-4 p-4 border rounded relative group overflow-hidden transition-all duration-500 ${
          aiStatus === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-[var(--accent)]/5 border-[var(--accent)]/20'
        }`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${aiStatus === 'error' ? 'bg-red-500' : 'bg-[var(--accent)]'}`} />
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${
                 aiStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 
                 aiStatus === 'error' ? 'bg-red-500' : 
                 'bg-[var(--accent)]'
               }`} />
               <span className={`text-[8px] font-mono uppercase font-bold tracking-widest ${aiStatus === 'error' ? 'text-red-500' : 'text-[var(--accent)]'}`}>
                 {aiStatus === 'error' ? 'ENGINE_FAILURE' : 'AI_CONTEXT_INSIGHT'}
               </span>
            </div>
            {aiStatus === 'syncing' && <span className="text-[7px] text-blue-400 font-mono animate-pulse">ANALYZING...</span>}
          </div>

          {aiStatus === 'error' ? (
            <p className="text-[9px] text-red-400 font-mono leading-tight">
              CRITICAL: {lastError?.toUpperCase() || 'UNKNOWN_BACKEND_FAULT'}
            </p>
          ) : aiInsight ? (
            <p className="text-[10px] text-white leading-relaxed font-main italic">"{aiInsight}"</p>
          ) : (
            <p className="text-[10px] text-[#adaaad] font-mono animate-pulse">Awaiting neural input...</p>
          )}
        </div>
      )}

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
                    <span className="px-2 py-0.5 bg-[#1c1b1b] text-[#adaaad] text-[8px] uppercase group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                      {rec.reason}
                    </span>
                 </div>
                 
                 <div 
                    className="bg-[#131313] border border-[var(--border)] p-4 flex flex-col gap-3 group-hover:border-[var(--accent)]/50 transition-all cursor-pointer" 
                    onClick={async () => {
                      onPreview(rec.content);
                      try {
                        await invoke('record_recommendation_click', { snippetId: rec.id });
                      } catch (err) {
                        console.error("CTR tracking failed:", err);
                      }
                    }}
                  >
                    <h4 className="text-[11px] font-main font-bold text-white uppercase tracking-[0.5px] truncate">{rec.title}</h4>
                    <div className="bg-[#0a0a0a] p-3 text-[10px] font-mono text-[#adaaad]/60 overflow-hidden text-ellipsis whitespace-nowrap border border-[var(--border)]/50">
                       {rec.content}
                    </div>

                    {/* Score Breakdown Tooltip-style info */}
                    <div className="flex flex-wrap gap-2 pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        {rec.breakdown.workflow > 0 && <span className="text-[7px] font-mono text-[#00ff00]">WORKFLOW+{Math.round(rec.breakdown.workflow)}</span>}
                        {rec.breakdown.context > 0 && <span className="text-[7px] font-mono text-[#0088ff]">CONTEXT+{Math.round(rec.breakdown.context)}</span>}
                        {rec.breakdown.patterns > 0 && <span className="text-[7px] font-mono text-[#ffaa00]">PATTERN+{Math.round(rec.breakdown.patterns)}</span>}
                        {rec.breakdown.popularity > 0 && <span className="text-[7px] font-mono text-[#ff00ff]">VELOCITY+{Math.round(rec.breakdown.popularity)}</span>}
                        {rec.breakdown.ctr_penalty > 0 && <span className="text-[7px] font-mono text-[var(--accent)]">CTR_ADJ-{Math.round(rec.breakdown.ctr_penalty)}</span>}
                    </div>

                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--border)]/50">
                       <span className="text-[10px] text-[var(--accent)] font-bold">{rec.match_score}% Match</span>
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
      <div className="p-6 bg-[#0a0a0a] border-t border-[var(--border)] flex flex-col gap-3 text-[8px] font-mono text-[#adaaad] uppercase tracking-[1px]">
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
           className="mt-4 w-full bg-[#1c1b1b] border border-[var(--border)] text-[#adaaad] py-2.5 text-[9px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 hover:bg-[var(--border)] hover:text-white transition-all shadow-inner"
         >
           Analyze Current Buffer
           <RefreshCcw size={10} className={loading ? 'animate-spin' : ''} />
         </button>
      </div>

    </aside>
  );
};

