import React, { useEffect, useState } from 'react';
import { 
  Search, 
  TerminalSquare,
  Settings,
  Power,
  Plus,
  Trash2,
  Copy,
  Edit3
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Sidebar } from '../layout/Sidebar';
import { SnippetEditor } from './SnippetEditor';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { HighlightText } from './HighlightText';

export const Dashboard: React.FC = () => {
  const { user, setUser, snippets, setSnippets, loading, setLoading, sessionCopies, incrementCopy, selectedSnippetId, setSelectedSnippetId } = useStore();
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'modified_desc' | 'modified_asc' | 'alpha'>('modified_desc');

  const fetchSnippets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const includeArchived = activeTab === 'archive';
      const response: any = await invoke('list_snippets', {
        userId: user.id,
        includeArchived
      });
      if (response.success) {
        setSnippets(response.data || []);
      } else {
        toast.error(response.message);
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [user, activeTab]);

  // When selected tab changes, clear snippet editor
  useEffect(() => {
    if (selectedSnippetId !== null) {
      setSelectedSnippetId(null);
    }
  }, [activeTab]);

  // Refresh list when editor closes just in case we created one
  useEffect(() => {
    if (selectedSnippetId === null && user) {
      fetchSnippets();
    }
  }, [selectedSnippetId]);

  const processedSnippets = React.useMemo(() => {
    let result = snippets;

    // 1. Fuzzy Search
    if (searchQuery.trim()) {
      const fuse = new Fuse(snippets, {
        keys: ['title', 'content', 'tags'],
        includeMatches: true,
        threshold: 0.3, // 0.0 is perfect match, 1.0 is anything
        ignoreLocation: true
      });
      result = fuse.search(searchQuery).map(res => res.item);
    }

    // 2. Language Filter
    if (languageFilter !== 'all') {
      result = result.filter(s => s.language.toLowerCase() === languageFilter.toLowerCase());
    }

    // 3. Tag Filter
    if (tagFilter !== 'all') {
      result = result.filter(s => {
        if (!s.tags) return false;
        return s.tags.toLowerCase().includes(tagFilter.toLowerCase());
      });
    }

    // 4. Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'modified_desc') {
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
      if (sortBy === 'modified_asc') {
        return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
      }
      if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [snippets, searchQuery, languageFilter, tagFilter, sortBy]);


  const handleDelete = async (id: number) => {
    if (!confirm('Permanent deletion for object ID: ' + id + '?')) return;
    try {
      const response: any = await invoke('delete_snippet', { id, userId: user?.id });
      if (response.success) fetchSnippets();
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const copyToClipboard = (id: number, content: string) => {
    navigator.clipboard.writeText(content);
    incrementCopy(id);
    toast.success('Snippet copied to terminal buffer', {
      style: { background: '#19191c', color: '#fffbfe', borderLeft: '4px solid #e60000', fontSize: '12px', fontFamily: 'Space Grotesk' }
    });
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'UNKNOWN';
    const date = new Date(dateStr);
    return date.toISOString().replace('T', ' ').substring(0, 16);
  };

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onNewSnippet={() => setSelectedSnippetId(-1)} />

      <main className="flex-1 ml-[256px] flex flex-col relative overflow-hidden">
        
        {selectedSnippetId !== null ? (
          <SnippetEditor />
        ) : (
          <>
            {/* Top Header */}
            <header className="h-[64px] bg-[#111111] border-b border-[#222226] px-8 flex items-center justify-between z-40 sticky top-0">
              <div className="flex items-center gap-8">
                <h2 className="text-lg font-main font-bold text-[#e60000] tracking-[-1px] uppercase">
                  CODA
                </h2>
                <div className="relative w-[300px] flex items-center">
                  <Search className="absolute left-3 w-[14px] h-[14px] text-[#e60000] z-10" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="FUZZY_SEARCH_CMD..."
                    className="w-full bg-[#0e0e0e] border border-[#222226] pl-10 pr-4 py-2 text-[#adaaad] placeholder-[#adaaad]/50 outline-none focus:border-[#e60000] transition-colors font-main text-[11px] tracking-[1px]"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full border border-[#adaaad]" />
                  <div className="w-2.5 h-2.5 rounded-full border border-[#adaaad]" />
                  <div className="w-2.5 h-2.5 rounded-full border border-[#adaaad]" />
                </div>
                <div className="flex items-center gap-6 border-l border-[#222226] pl-8">
                  <button className="text-[#adaaad] hover:text-[#e60000] transition-colors">
                    <TerminalSquare className="w-5 h-5" />
                  </button>
                  <button className="text-[#adaaad] hover:text-[#e60000] transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                  <button onClick={() => setUser(null)} className="text-[#adaaad] hover:text-[#e60000] transition-colors">
                    <Power className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              
              {/* Main Content Area */}
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col">
                
                {/* Header Area */}
                <div className="mb-10">
                  <div className="flex flex-col gap-2">
                    <div className="text-[#adaaad] text-[10px] font-mono tracking-[2px] uppercase opacity-60">
                      {activeTab === 'library' ? 'ROOT' : activeTab.toUpperCase()} {'>'} VAULT
                    </div>
                    <h1 className="text-[42px] font-main font-bold text-white tracking-[-2px] uppercase leading-none">
                      ROOT_VAULT
                    </h1>
                  </div>
                </div>

                {/* Filters & View Toggles */}
                <div className="flex items-center justify-between mb-8 border-y border-[#222226] py-4">
                  <div className="flex gap-8">
                      <div className="flex items-center gap-3">
                        <span className="text-[#adaaad] text-[10px] uppercase tracking-[1px]">Language</span>
                        <div className="flex items-center bg-[#0e0e0e] border border-[#222226] pl-2 h-[26px]">
                            <div className="w-0.5 h-4 bg-[#e60000] mr-2" />
                            <select 
                              value={languageFilter}
                              onChange={(e) => setLanguageFilter(e.target.value)}
                              className="bg-[#0e0e0e] text-[10px] font-main font-bold text-white outline-none uppercase tracking-[1px] appearance-none pr-3 cursor-pointer"
                              style={{ colorScheme: 'dark' }}
                            >
                              <option value="all" style={{ background: '#0e0e0e', color: '#fff' }}>ALL_EXT</option>
                              <option value="javascript" style={{ background: '#0e0e0e', color: '#fff' }}>JS</option>
                              <option value="typescript" style={{ background: '#0e0e0e', color: '#fff' }}>TS</option>
                              <option value="rust" style={{ background: '#0e0e0e', color: '#fff' }}>RS</option>
                              <option value="python" style={{ background: '#0e0e0e', color: '#fff' }}>PY</option>
                              <option value="go" style={{ background: '#0e0e0e', color: '#fff' }}>GO</option>
                              <option value="sql" style={{ background: '#0e0e0e', color: '#fff' }}>SQL</option>
                            </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#adaaad] text-[10px] uppercase tracking-[1px]">Sort</span>
                        <div className="flex items-center bg-[#0e0e0e] border border-[#222226] pl-2 h-[26px]">
                            <div className="w-0.5 h-4 bg-[#e60000] mr-2" />
                            <select 
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as 'modified_desc' | 'modified_asc' | 'alpha')}
                              className="bg-[#0e0e0e] text-[10px] font-main font-bold text-white outline-none uppercase tracking-[1px] appearance-none pr-3 cursor-pointer"
                              style={{ colorScheme: 'dark' }}
                            >
                              <option value="modified_desc" style={{ background: '#0e0e0e', color: '#fff' }}>LATEST</option>
                              <option value="modified_asc" style={{ background: '#0e0e0e', color: '#fff' }}>OLDEST</option>
                              <option value="alpha" style={{ background: '#0e0e0e', color: '#fff' }}>A-Z</option>
                            </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#adaaad] text-[10px] uppercase tracking-[1px]">Tag</span>
                        <div className="flex items-center bg-[#0e0e0e] border border-[#222226] pl-2 h-[26px]">
                            <div className="w-0.5 h-4 bg-[#e60000] mr-2" />
                            <input
                              type="text"
                              value={tagFilter === 'all' ? '' : tagFilter}
                              onChange={(e) => setTagFilter(e.target.value.trim() || 'all')}
                              placeholder="NO_FILTER"
                              className="w-[90px] bg-transparent text-[10px] font-main font-bold text-white outline-none uppercase tracking-[1px] placeholder:text-[#adaaad]/40"
                            />
                        </div>
                      </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 bg-[#222226]/50 text-[#adaaad] hover:text-white font-main text-[10px] font-bold tracking-[1px] uppercase transition-colors">
                      VIEW_GRID
                    </button>
                    <button className="px-4 py-1.5 bg-[#e60000] text-white font-main text-[10px] font-bold tracking-[1px] uppercase">
                      VIEW_LIST
                    </button>
                  </div>
                </div>

                {/* List Table */}
                <div className="flex-1 flex flex-col">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 pb-4 border-b border-[#222226]/50 mb-4 px-4 text-[#adaaad] text-[10px] uppercase tracking-[1px] font-main">
                      <div className="col-span-5">Snippet_ID</div>
                      <div className="col-span-3">Language</div>
                      <div className="col-span-3">Last_Modified</div>
                      <div className="col-span-1 text-right">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="flex flex-col gap-2">
                    {loading ? (
                        <div className="p-8 text-center text-[#adaaad] text-xs font-mono uppercase">Querying...</div>
                    ) : processedSnippets.length > 0 ? (
                        processedSnippets.map((snippet) => (
                          <div key={snippet.id} className="grid grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-[#19191c]/40 border border-transparent hover:border-[#222226] transition-colors group">
                            <div className="col-span-5 flex items-center overflow-hidden">
                                <HighlightText
                                  text={snippet.title}
                                  query={searchQuery}
                                  className="text-[#e60000] font-bold font-main text-sm truncate tracking-[0.5px]"
                                />
                            </div>
                            <div className="col-span-3 flex items-center">
                                <div className="px-3 py-1 bg-[#19191c] border border-[#222226] text-[#adaaad] text-[10px] font-main uppercase tracking-[1px]">
                                  {snippet.language}
                                </div>
                            </div>
                            <div className="col-span-3 flex items-center text-[#adaaad] font-mono text-[10px]">
                                {formatDate(snippet.updated_at)}
                            </div>
                            <div className="col-span-1 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => copyToClipboard(snippet.id!, snippet.content)} className="text-[#adaaad] hover:text-white transition-colors" title="Copy">
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button onClick={() => setSelectedSnippetId(snippet.id!)} className="text-[#adaaad] hover:text-white transition-colors" title="Edit">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(snippet.id!)} className="text-[#adaaad] hover:text-[#e60000] transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                          </div>
                        ))
                    ) : (
                        <div className="p-12 text-center flex flex-col gap-3 items-center">
                          <div className="text-[#e60000] text-[10px] font-mono tracking-[2px] uppercase opacity-60">
                            {searchQuery ? `NO_MATCH :: "${searchQuery}"` : 'ROOT_VAULT :: EMPTY'}
                          </div>
                          <div className="text-[#adaaad] text-[11px] font-main uppercase tracking-[2px]">
                            {searchQuery ? 'No snippets match your query' : 'No snippets found in ROOT_VAULT'}
                          </div>
                        </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Panel: Analytics */}
              <aside className="w-[360px] bg-[#111111] border-l border-[#222226] p-8 flex-col gap-12 hidden xl:flex overflow-y-auto custom-scrollbar relative">
                
                {/* Section: Usage Analytics */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
                      <div className="w-2 h-2 bg-[#e60000]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          USAGE_ANALYTICS
                      </h3>
                    </div>
                    <div className="space-y-6">
                      {processedSnippets.slice(0, 3).map((snippet, idx) => {
                        const copies = sessionCopies[snippet.id!] || 0;
                        const visualWidth = Math.min(100, Math.max(15, (copies * 10) + (snippet.content.length % 20)));
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-[#adaaad] truncate w-3/4">{snippet.title}</span>
                                <span className="text-[#adaaad]">{copies} copies</span>
                              </div>
                              <div className="h-[2px] bg-[#19191c] relative">
                                <div 
                                  className="absolute top-0 left-0 h-full bg-[#e60000] transition-all duration-500" 
                                  style={{ width: `${visualWidth}%` }}
                                />
                              </div>
                          </div>
                        );
                      })}
                      {processedSnippets.length === 0 && (
                        <div className="text-[10px] text-[#adaaad] font-mono">No analytics data available.</div>
                      )}
                    </div>
                </div>

                {/* Section: System Status */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
                      <div className="w-2 h-2 bg-[#e60000]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          SYSTEM_STATUS
                      </h3>
                    </div>
                    <div className="bg-[#151515] p-6 border border-[#222226] relative overflow-hidden flex flex-col font-mono text-[10px] text-[#adaaad] leading-loose">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#e60000]" />
                      <div className="grid grid-cols-[100px_1fr] gap-x-2">
                        <span className="uppercase tracking-[1px] opacity-70">ENCRYPTION:</span>
                        <span className="text-white">AES_256_ACTIVE</span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">SYNC:</span>
                        <span className="text-white">SYNCHRONIZED</span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">UPLINK:</span>
                        <span className="text-white">842.1 MB/S</span>
                      </div>
                    </div>
                </div>

                {/* Section: Hardware Visualization */}
                <div className="flex flex-col gap-6 mt-auto">
                    <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
                      <div className="w-2 h-2 bg-[#e60000]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          HARDWARE_VISUALIZATION
                      </h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="w-full aspect-square bg-transparent border border-[#e60000] relative grid grid-cols-2 grid-rows-2 group">
                          {/* Grid Lines */}
                          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#e60000]/30" />
                          <div className="absolute top-0 left-1/2 w-[1px] h-full bg-[#e60000]/30" />
                          
                          {/* Graphics Node 1 (Top Left) */}
                          <div className="absolute top-6 left-6 w-12 h-12 bg-[#8b0000] border border-[#e60000]" />
                          
                          {/* Graphics Node 2 (Center Right) */}
                          <div className="absolute top-[48%] right-10 w-4 h-4 rounded-full bg-[#e60000] -translate-y-1/2" />
                          
                          {/* Connecting Line */}
                          <div className="absolute top-[48%] left-18 w-[calc(100%-80px)] h-[1px] bg-[#e60000] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 delay-300" />
                          
                          {/* Graphics Node 3 (Bottom Right Box) */}
                          <div className="absolute bottom-6 right-8 w-10 h-[30px] border border-[#e60000]" />
                          
                          {/* Vertical line from node 2 to node 3 */}
                          <div className="absolute top-[48%] right-11 w-[1px] h-[35%] bg-[#e60000] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-1000 delay-500" />
                          
                          {/* Radar Sweep Effect */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#e60000]/10 to-transparent origin-top animate-scanline opacity-50" />
                      </div>
                      <div className="text-[9px] font-main text-[#adaaad] uppercase tracking-[1px]">
                        CORE_TEMP: 34.2°C
                      </div>
                    </div>
                </div>

              </aside>
            </div>

            {/* Floating Action Button */}
            <button 
              onClick={() => setSelectedSnippetId(-1)}
              className="absolute bottom-8 right-8 w-14 h-14 bg-[#e60000] flex items-center justify-center hover:bg-[#ff0000] hover:scale-105 transition-all shadow-[0_0_20px_rgba(230,0,0,0.3)] z-50"
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </button>
          </>
        )}

      </main>
    </div>
  );
};;
