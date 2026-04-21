import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../../store/useStore';
import { 
  Link, 
  ExternalLink, 
  Unlink, 
  Network,
  Zap,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { user, setSelectedSnippetId } = useStore();
  const [related, setRelated] = useState<RelatedSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Trigger background recomputation first (in real prod, this might be debounced or partial)
        await invoke('recompute_snippet_links', { snippetId: snippetId, userId: user.id });
        
        // Fetch the precomputed links
        const data = await invoke<RelatedSnippet[]>('get_related_snippets', { 
          snippetId: snippetId, 
          userId: user.id 
        });
        setRelated(data);
      } catch (error) {
        console.error('Failed to fetch related snippets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
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

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-800 rounded-lg"></div>
          <div className="h-32 bg-slate-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-950/50 border-t border-slate-800/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black tracking-[0.2em] text-red-500 flex items-center gap-2">
            <Network className="w-4 h-4" />
            CROSS-PROJECT LINKS
          </h2>
          <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-tighter">
            SYSTEM_INTEGRITY: COMPROMISED // DATA_NODES: ACTIVE
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                // Re-triggering effect by setting loading true and letting dependencies do the work
                // But we'll also manually trigger recompute here for instant gratification
                invoke('recompute_snippet_links', { snippetId: snippetId, userId: user!.id })
                  .then(() => invoke<RelatedSnippet[]>('get_related_snippets', { snippetId: snippetId, userId: user!.id }))
                  .then(data => {
                    setRelated(data);
                    setLoading(false);
                    toast.success('Relations recomputed', { style: { background: '#1a1a1a', color: '#fff', fontSize: '10px' } });
                  });
              }, 500);
            }}
            className="px-2 py-1 hover:bg-red-500/20 border border-slate-700/50 rounded text-[10px] font-mono text-slate-400 hover:text-red-400 transition-colors"
          >
            RE-SCAN
          </button>
          <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-mono text-red-400">
            {(related || []).length} NODES_FOUND
          </div>
        </div>
      </div>

      {(related || []).length === 0 ? (
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
