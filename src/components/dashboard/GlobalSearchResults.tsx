import React, { useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { filterSnippets } from '../../utils/searchEngine';
import { SnippetCard } from './SnippetCard';
import { Search, Info, AlertTriangle, RefreshCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';

class SearchErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('Search UI Crash:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#111111] p-10 text-center">
          <AlertTriangle className="w-12 h-12 text-[#e60000] mb-4" />
          <h2 className="text-xl font-main font-bold text-white uppercase mb-2">SEARCH_ENGINE_FAULT</h2>
          <p className="text-[#adaaad] font-mono text-[10px] uppercase mb-8">A fatal error occurred while rendering the results matrix.</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-[#e60000] text-white font-mono text-[11px] uppercase hover:bg-[#ff0000] transition-colors"
          >
            <RefreshCcw size={14} />
            <span>RESTART_CORE</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const GlobalSearchResults: React.FC = () => {
  const { snippets, projects, searchQuery, setSelectedSnippetId, setSnippets, user } = useStore();

  const results = useMemo(() => {
    try {
      if (!searchQuery) return [];
      const res = filterSnippets(snippets || [], projects || [], searchQuery);
      return res.filter(r => r && r.snippet); // Double defensive filter
    } catch (err) {
      console.error('Search logic crash:', err);
      return [];
    }
  }, [snippets, projects, searchQuery]);

  const handleArchive = async (id: number) => {
    try {
      const resp: any = await invoke('archive_snippet', { id, user_id: user?.id });
      if (resp.success) {
        setSnippets(snippets.map(s => s.id === id ? { ...s, is_archived: !s.is_archived } : s));
        toast.success(snippets.find(s => s.id === id)?.is_archived ? 'Restored' : 'Archived');
      }
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Destroy item?')) return;
    try {
      const resp: any = await invoke('delete_snippet', { id, user_id: user?.id });
      if (resp.success) {
        setSnippets(snippets.filter(s => s.id !== id));
        toast.success('Purged from vault');
      }
    } catch (err) {
      toast.error('Purge failed');
    }
  };

  if (results.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-[#222226] flex items-center justify-center rounded-full mb-8">
          <Search className="w-10 h-10 text-[#adaaad]" />
        </div>
        <h2 className="text-2xl font-main font-bold text-white uppercase mb-4">No results for "{searchQuery}"</h2>
        <p className="text-[#adaaad] font-mono text-xs max-w-md uppercase leading-relaxed">
          Try broad terms or check your specialized prefixes like <span className="text-[#e60000]">lang:</span>, <span className="text-[#e60000]">tag:</span>, or <span className="text-[#e60000]">is:archived</span>.
        </p>
      </div>
    );
  }

  return (
    <SearchErrorBoundary>
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#111111] animate-in fade-in duration-300">
        <div className="mb-12 flex justify-between items-end border-b border-[#222226] pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-main font-bold text-white tracking-[-1.5px] uppercase">
              Search Results
            </h1>
            <p className="text-[#adaaad] font-mono text-[11px] uppercase tracking-[1px]">
              Found {results.length} matches across total vault
            </p>
          </div>
          
          <div className="flex gap-4 items-center h-fit">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151515] border border-[#222226] rounded-sm text-[10px] font-mono text-[#adaaad]">
               <Info size={12} className="text-[#e60000]" />
               <span>RELEVANCE_SORT_ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {results.map(({ snippet }) => (
            <div key={snippet?.id || Math.random()} className="h-[200px]">
              {snippet && (
                <SnippetCard 
                  snippet={snippet}
                  onEdit={() => setSelectedSnippetId(snippet.id!)}
                  onDelete={() => handleDelete(snippet.id!)}
                  onArchive={() => handleArchive(snippet.id!)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </SearchErrorBoundary>
  );
};
