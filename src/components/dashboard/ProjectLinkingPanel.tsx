import React, { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../../store/useStore';
import { 
  Link, 
  ExternalLink, 
  Unlink, 
  Network,
  Zap,
  Tag,
  Shield,
  Activity,
  Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTelemetry } from '../../hooks/useTelemetry';

interface RelatedSnippet {
  id: number;
  title: string;
  project_name: string | null;
  strength: number;
  link_type: 'workflow' | 'tag' | 'manual' | 'algorithmic';
}

interface ProjectLinkingPanelProps {
  snippetId: number;
}

export const ProjectLinkingPanel: React.FC<ProjectLinkingPanelProps> = ({ snippetId }) => {
  const { user, setSelectedSnippetId, snippets } = useStore();
  const { snapshot } = useTelemetry(3000);
  const [related, setRelated] = useState<RelatedSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasLoadedOnce = useRef(false);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const currentSnippet = snippets.find(s => s.id === snippetId);

  const getIntegrityStatus = () => {
    if (!snapshot) return { status: 'INITIALIZING', color: 'text-slate-500', icon: Activity };
    
    // Logic: Integrity is COMPROMISED if DB latency is too high or error detected
    const dbLatency = snapshot.db_query_ms || 0;
    const isHealthy = dbLatency < 500;
    const hasProject = currentSnippet?.project_id !== null && currentSnippet?.project_id !== undefined;
    
    if (!isHealthy) return { status: 'COMPROMISED', color: 'text-red-500', icon: Shield };
    if (!hasProject) return { status: 'ORPHANED', color: 'text-orange-500', icon: Unlink };
    if (snapshot.global_cpu === 0) return { status: 'DEGRADED', color: 'text-yellow-500', icon: Cpu };
    
    return { status: 'STABLE', color: 'text-green-400', icon: Shield };
  };

  const integrity = getIntegrityStatus();
  const nodeCount = related.length;
  const nodesStatus = nodeCount > 0 ? 'ACTIVE' : 'ISOLATED';

  const fetchAiAnalysis = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || !currentSnippet || related.length === 0) return;
    
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const relatedContext = related.map(r => `- ${r.title} (Project: ${r.project_name || 'Root'}, Type: ${r.link_type}, Strength: ${r.strength}%)`).join('\n');
      const prompt = `Analyze this code snippet titled "${currentSnippet.title}":
${(currentSnippet.content || '').substring(0, 1000)}

It has behavioral cross-project links to these other snippets:
${relatedContext}

Analyze the cross-project synergy. Explain how these nodes fit together in a broader architectural workflow. Be concise, objective, and maintain a highly technical, dark terminal-inspired aesthetic. Max 3 sentences.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setAiAnalysis(text);
      } else {
        setAiAnalysis("ANALYSIS_FAILED: Unable to decode synergy vectors.");
      }
    } catch (e) {
      setAiAnalysis("CONNECTION_FAILED: Neural link to Gemini interrupted.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchRelated = async () => {
      if (!user) return;
      
      // Only show full loading state if we have no data yet
      if (!hasLoadedOnce.current) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }
      
      try {
        await invoke('recompute_snippet_links', { snippetId: snippetId, userId: user.id }).catch(() => {});
        
        const data = await invoke<RelatedSnippet[]>('get_related_snippets', { 
          snippetId: snippetId, 
          userId: user.id 
        });
        
        if (!cancelled) {
          setRelated(Array.isArray(data) ? data : []);
          hasLoadedOnce.current = true;
          // Reset AI state when dependencies change
          setAiAnalysis(null);
          setShowAiPanel(false);
        }
      } catch (error) {
        console.error('Failed to fetch related snippets:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsSyncing(false);
        }
      }
    };

    fetchRelated();
    return () => { cancelled = true; };
  }, [snippetId, user]);

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'workflow': return <Zap className="w-3 h-3 text-yellow-400" />;
      case 'tag': return <Tag className="w-3 h-3 text-blue-400" />;
      case 'manual': return <Link className="w-3 h-3 text-green-400" />;
      default: return <Network className="w-3 h-3 text-slate-400" />;
    }
  };

  const renderStrengthBars = (strength: number) => {
    const barCount = 5;
    const filledBars = Math.ceil((strength / 100) * barCount);
    
    return (
      <div className="flex gap-0.5 items-end h-3">
        {[...Array(barCount)].map((_, i) => (
          <div 
            key={i}
            className={`w-1 rounded-t-sm transition-all duration-300 ${
              i < filledBars 
                ? 'bg-red-500 h-full shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                : 'bg-slate-700 h-1'
            }`}
          />
        ))}
      </div>
    );
  };


  return (
    <div className={`p-6 bg-slate-950/50 border-t border-slate-800/50 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black tracking-[0.2em] text-red-500 flex items-center gap-2">
              <Network className={`w-4 h-4 ${(loading || isSyncing) ? 'animate-spin' : ''}`} />
              CROSS-PROJECT LINKS
              {(loading || isSyncing) && <span className="text-[8px] bg-red-500 text-white px-1 rounded animate-pulse ml-2">SYNCING</span>}
            </h2>
            <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
              <div className={`w-1 h-1 rounded-full ${nodeCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
              <span className="text-[8px] font-mono text-slate-400 tracking-widest uppercase">
                Density: {(nodeCount * 0.15).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">SYSTEM_INTEGRITY:</span>
              <div className={`flex items-center gap-1 ${integrity.color}`}>
                <integrity.icon size={10} className={integrity.status === 'COMPROMISED' ? 'animate-pulse' : ''} />
                <span className="text-[9px] font-mono font-bold tracking-tight">{integrity.status}</span>
              </div>
            </div>
            <div className="w-[1px] h-2 bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">DATA_NODES:</span>
              <span className={`text-[9px] font-mono font-bold ${nodeCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                {nodesStatus} ({nodeCount.toString().padStart(2, '0')})
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {import.meta.env.VITE_GEMINI_API_KEY && related.length > 0 && (
            <button
              onClick={fetchAiAnalysis}
              disabled={aiLoading}
              className={`px-3 py-1 border rounded text-[10px] font-mono transition-all uppercase tracking-widest ${
                aiLoading ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 animate-pulse' :
                'bg-[var(--accent)]/5 hover:bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30'
              }`}
            >
              {aiLoading ? 'ANALYZING...' : 'AI_SYNERGY_ANALYSIS'}
            </button>
          )}
          <button 
            onClick={async () => {
              if (loading || isSyncing || !user) return;
              setIsSyncing(true);
              try {
                await invoke('recompute_snippet_links', { snippetId: snippetId, userId: user.id });
                const data = await invoke<RelatedSnippet[]>('get_related_snippets', { snippetId: snippetId, userId: user.id });
                setRelated(Array.isArray(data) ? data : []);
                toast.success('Relations recomputed', { style: { background: '#1a1a1a', color: '#fff', fontSize: '10px' } });
                setAiAnalysis(null);
                setShowAiPanel(false);
              } catch (e) {
                console.error(e);
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={loading || isSyncing}
            className={`px-2 py-1 border rounded text-[10px] font-mono transition-colors ${(loading || isSyncing) ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' : 'hover:bg-red-500/20 border-slate-700/50 text-slate-400 hover:text-red-400'}`}
          >
            {(loading || isSyncing) ? 'SCANNING...' : 'RE-SCAN'}
          </button>
          <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-mono text-red-400 flex items-center justify-center">
            {(related || []).length} NODES_FOUND
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      {showAiPanel && (
        <div className="mb-6 p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-[var(--accent)]" />
            <span className="text-[9px] font-black tracking-widest text-[var(--accent)] uppercase">GEMINI_TOPOLOGY_REPORT</span>
          </div>
          {aiLoading ? (
            <div className="flex flex-col gap-2">
              <div className="h-2 bg-[var(--accent)]/20 rounded w-3/4 animate-pulse" />
              <div className="h-2 bg-[var(--accent)]/20 rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            <p className="text-[11px] font-main text-slate-300 leading-relaxed italic">{aiAnalysis}</p>
          )}
        </div>
      )}

      {loading && related.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          <div className="h-32 bg-slate-900/40 border border-slate-800 rounded-lg"></div>
          <div className="h-32 bg-slate-900/40 border border-slate-800 rounded-lg"></div>
          <div className="h-32 bg-slate-900/40 border border-slate-800 rounded-lg"></div>
        </div>
      ) : related.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
          <Unlink className="w-8 h-8 text-slate-700 mb-3" />
          <p className="text-xs text-slate-500 font-mono">NO BEHAVIORAL CORRELATIONS DETECTED</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(related || []).map((link) => (
            <div 
              key={link.id}
              className="group relative bg-slate-900/40 border border-slate-800 rounded-lg p-4 hover:border-red-500/50 transition-all duration-300"
            >
              {/* Background glow effect on hover */}
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase truncate max-w-[120px]">
                      PROJECT: {link.project_name || 'ROOT_VAULT'}
                    </span>
                    <span className="text-[8px] font-mono text-red-500/60 mt-0.5">
                      NODE_ID: CP-{link.id.toString().padStart(4, '0')}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedSnippetId(link.id)}
                    className="p-1 hover:text-red-400 text-slate-600 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-medium text-slate-200 mb-4 group-hover:text-red-400 transition-colors truncate">
                  {link.title}
                </h3>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-slate-800 rounded">
                      {getLinkIcon(link.link_type)}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 capitalize">
                      {link.link_type}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
                      Link Strength
                    </span>
                    {renderStrengthBars(link.strength)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
