import React, { useMemo, useState } from 'react';
import { useStore, Snippet } from '../../store/useStore';
import { SnippetCard } from './SnippetCard';
import { Flame, Clock, Archive, Activity, Folder, Copy, RefreshCw } from 'lucide-react';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';

export const IntelligenceDashboard: React.FC = () => {
  const { user, snippets, projects, setSelectedSnippetId, setSnippets, setActiveTab, setSelectedProjectId, setLoading } = useStore();
  const playSound = useSoundEffect();
  const [snippetToDelete, setSnippetToDelete] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSnippets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response: any = await invoke('list_snippets', {
        userId: user.id,
        includeArchived: false
      });
      if (response.success) {
        setSnippets(response.data || []);
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    playSound('click');
    
    const toastId = toast.loading('ANALYZING_VAULT_METRICS...', {
      style: { background: '#1a1a1a', color: '#fff', border: '1px solid var(--accent)', fontSize: '10px', fontFamily: 'var(--font-main)' }
    });

    try {
      await fetchSnippets();
      await invoke('run_vault_maintenance');
      toast.success('VAULT_ANALYSIS_COMPLETE', { id: toastId });
      playSound('success');
    } catch (e) {
      toast.error('ANALYSIS_FAILED', { id: toastId });
    } finally {
      setRefreshing(false);
    }
  };

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

  const confirmDelete = async () => {
    if (snippetToDelete === null) return;
    try {
      const response: any = await invoke('delete_snippet', { id: snippetToDelete, userId: user?.id });
      if (response.success) {
        setSnippets(snippets.filter(s => s.id !== snippetToDelete));
        toast.success('Snippet purged');
        playSound('error');
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setSnippetToDelete(null);
    }
  };

  const sections = useMemo(() => {
    const unarchived = snippets.filter(s => s && !s.is_archived);
    
    // Top Snippets (Elite Criteria: min 5 copies, stable edits, used in last 90 days)
    const topSnippets = [...unarchived]
      .filter(s => {
        const copies = s.copy_count || 0;
        const edits = s.edit_count || 0;
        // Normalize SQLite date string (space to T) for JS Date compatibility
        const lastUsedStr = s.last_used_at ? s.last_used_at.replace(' ', 'T') : null;
        const lastUsed = lastUsedStr ? new Date(lastUsedStr).getTime() : 0;
        const isRecent = !s.last_used_at || (new Date().getTime() - lastUsed) < 90 * 24 * 60 * 60 * 1000;
        
        return copies >= 5 && edits < (copies * 2) && isRecent;
      })
      .sort((a, b) => (b.copy_count || 0) - (a.copy_count || 0))
      .slice(0, 8);

    // Continue Working (by updated_at)
    const continueWorking = [...unarchived]
      .filter(s => s.updated_at)
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      .slice(0, 4);

    // active project mapping
    const projScores = (projects || []).map(p => {
       const pSnips = unarchived.filter(s => s.project_id === p.id);
       const activeBase = pSnips.length * 5;
       const totalCopies = pSnips.reduce((acc, curr) => acc + (curr.copy_count || 0), 0);
       const copiesBase = totalCopies * 2;
       return { ...p, score: activeBase + copiesBase, snippetCount: pSnips.length, totalCopies };
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
        <div className="p-2 bg-[var(--border)]/50 rounded text-[#adaaad]">{icon}</div>
        <h2 className="text-xl font-bold font-main uppercase text-white tracking-[-0.5px]">{title}</h2>
      </div>
      {list.length === 0 ? (
        <div className="p-8 border border-dashed border-[var(--border)] text-center text-[#adaaad] font-mono text-[11px] uppercase rounded-lg">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {list.map(s => s && (
            <div key={s.id} className="h-[200px]">
              <SnippetCard 
                snippet={s} 
                onEdit={() => { playSound('transition'); setSelectedSnippetId(s.id!); }}
                onDelete={() => { playSound('click'); setSnippetToDelete(s.id!); }}
                onArchive={() => handleArchive(s.id!)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-[#0a0a0a] selection:bg-[var(--accent)] selection:text-white">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8 md:mb-12">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[var(--accent)]" />
                <span className="text-[10px] font-mono text-[var(--accent)] tracking-premium uppercase">Central Intelligence // Library.root</span>
            </div>
            <h1 className="text-4xl md:text-[56px] font-main font-bold text-white tracking-header md:tracking-tighter uppercase leading-tight md:leading-none">Library</h1>
        </div>

        <button 
          onClick={handleManualRefresh}
          disabled={refreshing}
          onMouseEnter={() => playSound('hover')}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[#adaaad] hover:text-white transition-all group"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--accent)]' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="text-[10px] font-main font-bold tracking-premium uppercase">Refresh_Vault</span>
        </button>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-[var(--border)]/50 rounded text-[var(--accent)]"><Activity size={18} /></div>
          <h2 className="text-lg md:text-xl font-bold font-main uppercase text-white tracking-header">Active Projects</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sections.projScores.map(p => p && (
            <div 
              key={p.id} 
              onClick={() => {
                playSound('transition');
                setSelectedProjectId(p.id);
                setActiveTab('projects');
              }}
              onMouseEnter={() => playSound('hover')}
              className="bg-[#151515] border border-[var(--border)] p-5 hover:border-[var(--accent)]/50 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <Folder className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-[#adaaad] text-[9px] font-mono tracking-premium">{p.snippetCount} ITEMS</span>
              </div>
              <h3 className="text-sm font-bold font-main text-white uppercase line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{p.name || 'UNTITLED_PROJECT'}</h3>
              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] text-[#adaaad] font-mono">ACTIVITY SCORE: {p.score}</p>
                <div className="flex items-center gap-1">
                  <Copy size={10} className="text-[var(--accent)]" />
                  <span className="text-[10px] text-white font-mono font-bold">{p.totalCopies}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {renderSnippetRow('Continue Working', <Clock size={18} />, sections.continueWorking, 'No recent edits found')}
      {renderSnippetRow('Top Snippets', <Flame size={18} className="text-[var(--accent)]" />, sections.topSnippets, 'Use snippets to build analytics')}
      {renderSnippetRow('Needs Cleanup', <Archive size={18} />, sections.stale, 'Vault is entirely clean')}

      <ConfirmationModal
        isOpen={snippetToDelete !== null}
        title="DESTROY_SNIPPET"
        message="Are you sure you want to permanently delete this code snippet? This action will purge all metadata and version history from the local database."
        onConfirm={confirmDelete}
        onCancel={() => setSnippetToDelete(null)}
      />
    </div>
  );
};
