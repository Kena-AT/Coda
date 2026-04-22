import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { SnippetCard } from './SnippetCard';
import { Archive, RotateCcw, Search } from 'lucide-react';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';

export const ArchiveView: React.FC = () => {
  const { user, snippets, setSnippets, setSelectedSnippetId } = useStore();
  const playSound = useSoundEffect();
  const [localSearch, setLocalSearch] = useState('');
  const [snippetToDelete, setSnippetToDelete] = useState<number | null>(null);

  const archivedSnippets = useMemo(() => {
    return snippets.filter(s => s && s.is_archived && 
      (s.title.toLowerCase().includes(localSearch.toLowerCase()) || 
       s.language.toLowerCase().includes(localSearch.toLowerCase()))
    );
  }, [snippets, localSearch]);

  const handleUnarchive = async (id: number) => {
    try {
      const resp: any = await invoke('toggle_archive', { id, userId: user?.id, archive: false });
      if (resp.success) {
        setSnippets(snippets.map(s => s.id === id ? { ...s, is_archived: false } : s));
        toast.success('Snippet restored to active vault');
        playSound('success');
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
        toast.success('Snippet purged from existence');
        playSound('error');
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setSnippetToDelete(null);
    }
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#adaaad]" />
                <span className="text-[10px] font-mono text-[#adaaad] tracking-[2px] uppercase">Archive Layer // Cold Storage</span>
            </div>
            <h1 className="text-[56px] font-main font-bold text-white tracking-[-3px] uppercase leading-none">Archive</h1>
        </div>

        <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#adaaad] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
                type="text" 
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="SEARCH_ARCHIVE..."
                className="w-full bg-[#151515] border border-[var(--border)] pl-9 pr-4 py-2 text-[#adaaad] text-[10px] uppercase font-mono outline-none focus:border-[var(--accent)] transition-colors"
            />
        </div>
      </div>

      {archivedSnippets.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl text-[#adaaad] uppercase font-mono text-[11px] gap-4">
          <Archive size={48} className="opacity-20" />
          {localSearch ? 'NO_ARCHIVED_NODES_MATCH_QUERY' : 'COLD_STORAGE_EMPTY'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {archivedSnippets.map(s => (
            <div key={s.id} className="h-[220px] group relative">
              <SnippetCard 
                snippet={s} 
                onEdit={() => { playSound('transition'); setSelectedSnippetId(s.id!); }}
                onDelete={() => { playSound('click'); setSnippetToDelete(s.id!); }}
                onArchive={() => handleUnarchive(s.id!)}
              />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleUnarchive(s.id!)}
                  className="p-2 bg-black/80 border border-[var(--border)] text-[#adaaad] hover:text-[#15ff00] hover:border-[#15ff00]/50 transition-all rounded shadow-lg"
                  title="Restore to Active Vault"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning Footer */}
      <div className="mt-12 p-6 border border-red-500/20 bg-red-500/5 rounded-lg flex items-start gap-4">
        <div className="p-2 bg-red-500/20 rounded text-red-500">
          <Archive size={20} />
        </div>
        <div>
          <h4 className="text-red-500 font-main font-bold text-xs uppercase tracking-wider mb-1">Archival Protocol Information</h4>
          <p className="text-[#adaaad] font-mono text-[10px] uppercase leading-relaxed max-w-2xl">
            Snippets in cold storage are excluded from global intelligence reports and synergy analysis. 
            Purging a node from the archive is irreversible and will permanently delete the associated metadata and usage logs.
          </p>
        </div>
      </div>
      <ConfirmationModal
        isOpen={snippetToDelete !== null}
        title="PURGE_COLD_STORAGE"
        message="This operation will permanently erase this data node from cold storage. This action is terminal and cannot be reversed."
        onConfirm={confirmDelete}
        onCancel={() => setSnippetToDelete(null)}
      />
    </div>
  );
};
