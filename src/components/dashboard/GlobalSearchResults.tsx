import React, { useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { filterSnippets, filterProjects } from '../../utils/searchEngine';
import { SnippetCard } from './SnippetCard';
import { Search, Info, AlertTriangle, RefreshCcw, FolderGit2, ChevronRight, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';

class SearchErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('Search UI Crash:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-10 text-center">
          <AlertTriangle className="w-12 h-12 text-[var(--accent)] mb-4" />
          <h2 className="text-xl font-main font-bold text-white uppercase mb-2">SEARCH_ENGINE_FAULT</h2>
          <p className="text-[#adaaad] font-mono text-[10px] uppercase mb-8">A fatal error occurred while rendering the results matrix.</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white font-mono text-[11px] uppercase hover:bg-[#ff0000] transition-colors"
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
  const { 
    snippets, 
    projects, 
    searchQuery, 
    setSelectedSnippetId, 
    setSelectedProjectId,
    setActiveTab,
    setSearchQuery,
    setSnippets, 
    user 
  } = useStore();

  const { snippetResults, projectResults } = useMemo(() => {
    try {
      if (!searchQuery) return { snippetResults: [], projectResults: [] };
      const snips = filterSnippets(snippets || [], projects || [], searchQuery);
      const projs = filterProjects(projects || [], searchQuery);
      
      return {
        snippetResults: snips.filter(r => r && r.snippet),
        projectResults: projs
      };
    } catch (err) {
      console.error('Search logic crash:', err);
      return { snippetResults: [], projectResults: [] };
    }
  }, [snippets, projects, searchQuery]);

  const handleArchive = async (id: number) => {
    try {
      const resp: any = await invoke('archive_snippet', { id, userId: user?.id });
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
      const resp: any = await invoke('delete_snippet', { id, userId: user?.id });
      if (resp.success) {
        setSnippets(snippets.filter(s => s.id !== id));
        toast.success('Purged from vault');
      }
    } catch (err) {
      toast.error('Purge failed');
    }
  };

  if (snippetResults.length === 0 && projectResults.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-[var(--border)] flex items-center justify-center rounded-full mb-8">
          <Search className="w-10 h-10 text-[#adaaad]" />
        </div>
        <h2 className="text-2xl font-main font-bold text-white uppercase mb-4">No results for "{searchQuery}"</h2>
        <p className="text-[#adaaad] font-mono text-xs max-w-md uppercase leading-relaxed">
          Try broad terms or check your specialized prefixes like <span className="text-[var(--accent)]">lang:</span>, <span className="text-[var(--accent)]">tag:</span>, or <span className="text-[var(--accent)]">is:archived</span>.
        </p>
      </div>
    );
  }

  return (
    <SearchErrorBoundary>
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)] animate-in fade-in duration-300">
        <div className="mb-12 flex justify-between items-end border-b border-[var(--border)] pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-main font-bold text-white tracking-[-1.5px] uppercase">
              Search Results
            </h1>
            <p className="text-[#adaaad] font-mono text-[11px] uppercase tracking-[1px]">
              Found {projectResults.length + snippetResults.length} matches across total vault
            </p>
          </div>
          
          <div className="flex gap-4 items-center h-fit">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151515] border border-[var(--border)] rounded-sm text-[10px] font-mono text-[#adaaad]">
               <Info size={12} className="text-[var(--accent)]" />
               <span>RELEVANCE_SORT_ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Project Results Section */}
        {projectResults.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-[var(--accent)]/10 rounded text-[var(--accent)]">
                <FolderGit2 size={18} />
              </div>
              <h2 className="text-xl font-bold font-main uppercase text-white tracking-[-0.5px]">Project Sectors</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {projectResults.map(({ project }) => (
                <div 
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setActiveTab('projects');
                    setSearchQuery('');
                  }}
                  className="bg-[#151515] border border-[var(--border)] p-6 hover:border-[var(--accent)] transition-all cursor-pointer group animate-in zoom-in-95 duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[var(--border)] text-[#adaaad] group-hover:text-[var(--accent)] transition-colors">
                      <FolderGit2 size={16} />
                    </div>
                    <ChevronRight size={14} className="text-[#333] group-hover:text-[var(--accent)] transition-all transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="text-sm font-bold font-main text-white uppercase mb-2 group-hover:text-[var(--accent)] transition-colors">{project.name}</h3>
                  <p className="text-[10px] text-[#adaaad] font-mono uppercase line-clamp-1">{project.description || 'NO_DESCRIPTION_PROVIDED'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Snippet Results Section */}
        {snippetResults.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-[var(--border)]/50 rounded text-[#adaaad]">
                <Activity size={18} />
              </div>
              <h2 className="text-xl font-bold font-main uppercase text-white tracking-[-0.5px]">Snippet Fragments</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {snippetResults.map(({ snippet }) => (
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
        )}
      </div>
    </SearchErrorBoundary>
  );
};
