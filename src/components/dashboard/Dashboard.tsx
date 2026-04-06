import React, { useEffect, useState } from 'react';
import { 
  Search, 
  TerminalSquare,
  Settings,
  Power,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Shield,
  Activity,
  Database
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Sidebar } from '../layout/Sidebar';
import { HardwareVisualization } from './HardwareVisualization';
import { recordClientMetric } from '../../hooks/useTelemetry';
import { SnippetEditor } from './SnippetEditor';
import { AnalyticsPage } from './AnalyticsPage';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { HighlightText } from './HighlightText';
import { ArchiveModal } from './ArchiveModal';
import { ProjectVault } from './ProjectVault';
import { MaintenanceSettingsModal } from './MaintenanceSettingsModal';

export const Dashboard: React.FC = () => {
  const { user, setUser, snippets, setSnippets, projects, setProjects, loading, setLoading, incrementCopy, selectedSnippetId, setSelectedSnippetId } = useStore();
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'modified_desc' | 'modified_asc' | 'alpha'>('modified_desc');
  const [projectFilter, setProjectFilter] = useState<number | 'all'>('all');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke('get_system_status');
        setSystemStatus(status);
      } catch (e) {
        console.error('System status check failed:', e);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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
    // Check for archive candidates on mount
    const checkArchivable = async () => {
      if (!user) return;
      try {
        const candidates = await invoke<any[]>('get_archive_candidates', { userId: user.id });
        if (candidates.length > 0) {
          setIsArchiveModalOpen(true);
        }
      } catch (e) {
        console.error('Archiver check failed:', e);
      }
    };
    checkArchivable();

    // Fetch projects
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const response: any = await invoke('get_projects', { userId: user.id });
        if (response.success) {
          setProjects(response.data || []);
        }
      } catch (e) {
        console.error('Failed to fetch projects', e);
      }
    };
    fetchProjects();
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
    const t0 = performance.now();
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

    // 4. Project Filter
    if (projectFilter !== 'all') {
      result = result.filter(s => s.project_id === projectFilter);
    }

    // 5. Sorting
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

    const duration = performance.now() - t0;
    if (searchQuery.trim()) {
      recordClientMetric('search', duration);
    }

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

  const copyToClipboard = async (id: number, content: string) => {
    const t0 = performance.now();
    navigator.clipboard.writeText(content);
    const duration = performance.now() - t0;
    
    incrementCopy(id);
    recordClientMetric('copy', duration);

    // Record usage in DB
    try {
      await invoke('record_snippet_usage', { snippetId: id });
    } catch (err) {
      console.error('Failed to record snippet usage:', err);
    }

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
        ) : activeTab === 'analytics' ? (
          <AnalyticsPage />
        ) : activeTab === 'projects' ? (
          <ProjectVault />
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
                <div className="flex gap-4">
                  {/* Database Status */}
                  <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                    systemStatus?.db_healthy ? 'bg-[#15ff00]/10 border-[#15ff00]/30 text-[#15ff00]' : 'bg-[#e60000]/10 border-[#e60000]/30 text-[#e60000]'
                  }`}>
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  
                  {/* Telemetry Status */}
                  <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                    systemStatus?.telemetry_active ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]' : 'bg-[#adaaad]/10 border-[#adaaad]/30 text-[#adaaad]'
                  }`}>
                    <Activity className={`w-3.5 h-3.5 ${systemStatus?.telemetry_active ? 'animate-pulse' : ''}`} />
                  </div>
                  
                  {/* Auth Session */}
                  <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                    systemStatus?.session_valid ? 'bg-[#facc15]/10 border-[#facc15]/30 text-[#facc15]' : 'bg-[#adaaad]/10 border-[#adaaad]/30 text-[#adaaad]'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex items-center gap-6 border-l border-[#222226] pl-8">
                  <button className="text-[#adaaad] hover:text-[#e60000] transition-colors">
                    <TerminalSquare className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsMaintenanceModalOpen(true)} className="text-[#adaaad] hover:text-[#e60000] transition-colors">
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
                  <button 
                    onClick={async () => {
                      const name = window.prompt('Enter Project Name:');
                      if (name && user) {
                        try {
                          await invoke('create_project', { userId: user.id, name });
                          const response: any = await invoke('list_projects', { userId: user.id });
                          if (response.success) {
                            useStore.getState().setProjects(response.data || []);
                            toast.success('Project sector initialized');
                          }
                        } catch (e) {
                          toast.error('Failed to create project');
                        }
                      }
                    }}
                    className="mt-6 px-6 py-2 border border-[#353534]/50 text-[#adaaad] hover:text-[#e60000] hover:border-[#e60000] text-[10px] font-main font-bold tracking-[2px] uppercase transition-all"
                  >
                    CREATE_PROJECT
                  </button>
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
                      <div className="flex items-center gap-3">
                        <span className="text-[#adaaad] text-[10px] uppercase tracking-[1px]">Project</span>
                        <div className="flex items-center bg-[#0e0e0e] border border-[#222226] pl-2 h-[26px]">
                            <div className="w-0.5 h-4 bg-[#e60000] mr-2" />
                            <select 
                              value={projectFilter === 'all' ? '' : projectFilter}
                              onChange={(e) => setProjectFilter(e.target.value ? parseInt(e.target.value) : 'all')}
                              className="bg-[#0e0e0e] text-[10px] font-main font-bold text-white outline-none uppercase tracking-[1px] appearance-none pr-3 cursor-pointer"
                              style={{ colorScheme: 'dark' }}
                            >
                              <option value="all">ALL_PRJ</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                              ))}
                            </select>
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
                        const copies = snippet.copy_count || 0;
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
                        <span className={systemStatus?.session_valid ? "text-[#15ff00]" : "text-[#e60000]"}>
                          {systemStatus?.session_valid ? 'SECURE_ACTIVE' : 'DEGRADED_STATE'}
                        </span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">SYNC:</span>
                        <span className={systemStatus?.telemetry_active ? "text-[#3b82f6]" : "text-[#adaaad]"}>
                          {systemStatus?.telemetry_active ? 'SYNCHRONIZING' : 'IDLE'}
                        </span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">DATABASE:</span>
                        <span className={systemStatus?.db_healthy ? "text-white" : "text-[#e60000]"}>
                          {systemStatus?.db_healthy ? 'SQLite V3_OK' : 'CONNECTION_ERR'}
                        </span>
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
                    <HardwareVisualization />
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

            <ArchiveModal 
              isOpen={isArchiveModalOpen} 
              onClose={() => setIsArchiveModalOpen(false)} 
              onRefresh={fetchSnippets} 
            />
          </>
        )}

      </main>

      <MaintenanceSettingsModal 
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
      />
    </div>
  );
};
