import React, { useMemo } from 'react';
import { useStore, Snippet } from '../../store/useStore';
import { SnippetCard } from './SnippetCard';
import { Flame, Clock, Archive, Activity, Folder } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';

export const IntelligenceDashboard: React.FC = () => {
  const { user, snippets, projects, setSelectedSnippetId, setSnippets } = useStore();

  const handleArchive = async (id: number) => {
    try {
      const response: any = await invoke('archive_snippet', { id, userId: user?.id });
      if (response.success) {
        setSnippets(snippets.map(s => s.id === id ? { ...s, is_archived: true } : s));
        toast.success('Snippet archived');
      }
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanent deletion?')) return;
    try {
      const response: any = await invoke('delete_snippet', { id, userId: user?.id });
      if (response.success) {
        setSnippets(snippets.filter(s => s.id !== id));
      }
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const sections = useMemo(() => {
    const unarchived = snippets.filter(s => s && !s.is_archived);
    
    // Top Snippets (by copies)
    const topSnippets = [...unarchived]
      .sort((a, b) => (b.copy_count || 0) - (a.copy_count || 0))
      .slice(0, 4);

    // Continue Working (by updated_at)
    const continueWorking = [...unarchived]
      .filter(s => s.updated_at)
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      .slice(0, 4);

    // active project mapping
    const projScores = (projects || []).map(p => {
       const pSnips = unarchived.filter(s => s.project_id === p.id);
       const activeBase = pSnips.length * 5;
       const copiesBase = pSnips.reduce((acc, curr) => acc + (curr.copy_count || 0), 0) * 2;
       return { ...p, score: activeBase + copiesBase, snippetCount: pSnips.length };
    }).sort((a, b) => b.score - a.score).slice(0, 4);

    // Needs Cleanup
    const stale = [...unarchived]
      .filter(s => {
         if (!s.last_used_at) return true;
         try {
           return (new Date().getTime() - new Date(s.last_used_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
         } catch(e) { return true; }
      })
      .slice(0, 4);

    return { topSnippets, continueWorking, projScores, stale };
  }, [snippets, projects]);

  const renderSnippetRow = (title: string, icon: React.ReactNode, list: Snippet[], emptyText: string) => (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-[#222226]/50 rounded text-[#adaaad]">{icon}</div>
        <h2 className="text-xl font-bold font-main uppercase text-white tracking-[-0.5px]">{title}</h2>
      </div>
      {list.length === 0 ? (
        <div className="p-8 border border-dashed border-[#222226] text-center text-[#adaaad] font-mono text-[11px] uppercase rounded-lg">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {list.map(s => s && (
            <div key={s.id} className="h-[200px]">
              <SnippetCard 
                snippet={s} 
                onEdit={() => setSelectedSnippetId(s.id!)}
                onDelete={() => handleDelete(s.id!)}
                onArchive={() => handleArchive(s.id!)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#111111]">
      <div className="mb-12 flex flex-col gap-2">
        <h1 className="text-3xl font-main font-bold text-white tracking-[-1.5px] uppercase">Library Intelligence</h1>
        <p className="text-[#adaaad] font-mono text-[11px] uppercase tracking-[1px]">Prioritization & Asset Discovery Layer</p>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-[#222226]/50 rounded text-[#e60000]"><Activity size={18} /></div>
          <h2 className="text-xl font-bold font-main uppercase text-white tracking-[-0.5px]">Active Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {sections.projScores.map(p => p && (
            <div key={p.id} className="bg-[#151515] border border-[#222226] p-5 hover:border-[#e60000]/50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <Folder className="w-5 h-5 text-[#e60000]" />
                <span className="text-[#adaaad] text-[9px] font-mono tracking-widest">{p.snippetCount} ITEMS</span>
              </div>
              <h3 className="text-sm font-bold font-main text-white uppercase line-clamp-1 group-hover:text-[#e60000] transition-colors">{p.name || 'UNTITLED_PROJECT'}</h3>
              <p className="text-[10px] text-[#adaaad] font-mono mt-2">ACTIVITY SCORE: {p.score}</p>
            </div>
          ))}
        </div>
      </div>

      {renderSnippetRow('Continue Working', <Clock size={18} />, sections.continueWorking, 'No recent edits found')}
      {renderSnippetRow('Top Snippets', <Flame size={18} className="text-[#e60000]" />, sections.topSnippets, 'Use snippets to build analytics')}
      {renderSnippetRow('Needs Cleanup', <Archive size={18} />, sections.stale, 'Vault is entirely clean')}
    </div>
  );
};
