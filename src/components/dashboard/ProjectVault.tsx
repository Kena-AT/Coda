import React, { useEffect, useState, useMemo } from 'react';
import { useStore, Project } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { 
  FolderGit2, 
  Activity, 
  PieChart, 
  Code2, 
  AlertTriangle, 
  ChevronRight, 
  Plus, 
  Search, 
  Inbox,
  Trash2, 
  Edit2, 
  Check, 
  X
} from 'lucide-react';
import { SnippetCard } from './SnippetCard';
import toast from 'react-hot-toast';
import { filterSnippets } from '../../utils/searchEngine';

export const ProjectVault: React.FC = () => {
  const { 
    user, 
    projects, 
    snippets, 
    setProjects,
    setSnippets,
    setSelectedSnippetId, 
    selectedProjectId,
    setSelectedProjectId,
    searchQuery
  } = useStore();

  const [stats, setStats] = useState<Record<number, any>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Edit State for detail view
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Inline edit state for overview grid
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [inlineEditName, setInlineEditName] = useState('');
  const [inlineEditDesc, setInlineEditDesc] = useState('');

  // Virtual Project: Inbox (ID: -1)
  const inboxProject: Project = {
    id: -1,
    user_id: user?.id || 0,
    name: 'INBOX / UNSORTED',
    description: 'Snippets not yet assigned to a project',
    color: '#8b5cf6',
    created_at: new Date().toISOString()
  };

  const allProjects = [inboxProject, ...projects];

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const response: any = await invoke('list_projects', { user_id: user.id });
      if (response.success) setProjects(response.data || []);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const fetchSnippets = async () => {
    if (!user) return;
    try {
      const response: any = await invoke('list_snippets', { user_id: user.id, include_archived: false });
      if (response.success) setSnippets(response.data || []);
    } catch (e) {
      console.error('Failed to fetch snippets', e);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setLoadingStats(true);
      const newStats: Record<number, any> = {};
      
      for (const p of allProjects) {
        try {
          if (p.id === -1) {
            const inboxSnips = snippets.filter(s => s.project_id === null && !s.is_archived);
            newStats[-1] = {
              active_snippets: inboxSnips.length,
              stale_snippets: 0,
              total_copies: inboxSnips.reduce((acc, curr) => acc + curr.copy_count, 0),
              main_language: 'Varies'
            };
          } else {
            const s = await invoke('get_project_stats', { project_id: p.id, user_id: user.id });
            newStats[p.id!] = s;
          }
        } catch (e) {
          console.error(`Stats err for ${p.id}:`, e);
        }
      }
      setStats(newStats);
      setLoadingStats(false);
    };
    
    fetchStats();
  }, [projects, user, snippets]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const resp = await invoke<any>('create_project', { 
        user_id: user.id, 
        name: newProjectName,
        description: newProjectDesc || null,
        color: null
      });
      if (resp.success) {
        await fetchProjects();
        setNewProjectName('');
        setNewProjectDesc('');
        setShowCreateModal(false);
        toast.success('Sector initialized and indexed');
      }
    } catch(err) {
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (projectId === -1) return;
    if (!confirm('Destroy this project sector? Snippets will be moved to INBOX.')) return;
    try {
      const resp = await invoke<any>('delete_project', { project_id: projectId, user_id: user?.id });
      if (resp.success) {
        toast.success('Project sector purged');
        if (selectedProjectId === projectId) setSelectedProjectId(null);
        await fetchProjects();
        await fetchSnippets();
      }
    } catch (err) {
      toast.error('Purge failed');
    }
  };

  const handleUpdateActiveProject = async () => {
    const p = allProjects.find(p => p.id === selectedProjectId);
    if (!p || p.id === -1 || !user) return;
    
    try {
      const resp = await invoke<any>('update_project', {
        id: p.id,
        user_id: user.id,
        name: editName,
        description: editDesc,
        color: p.color
      });
      
      if (resp.success) {
        toast.success('Metadata updated');
        setIsEditing(false);
        await fetchProjects();
      }
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const startInlineEdit = (p: Project) => {
    setEditingProjectId(p.id!);
    setInlineEditName(p.name);
    setInlineEditDesc(p.description || '');
  };

  const cancelInlineEdit = () => {
    setEditingProjectId(null);
    setInlineEditName('');
    setInlineEditDesc('');
  };

  const saveInlineEdit = async (projectId: number) => {
    if (!user || projectId === -1) return;
    
    try {
      const p = allProjects.find(proj => proj.id === projectId);
      if (!p) return;

      const resp = await invoke<any>('update_project', {
        id: projectId,
        user_id: user.id,
        name: inlineEditName,
        description: inlineEditDesc,
        color: p.color
      });
      
      if (resp.success) {
        toast.success('Project updated');
        setEditingProjectId(null);
        await fetchProjects();
      }
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const activeProject = useMemo(() => 
    allProjects.find(p => p.id === selectedProjectId), 
    [selectedProjectId, allProjects]
  );

  useEffect(() => {
    if (activeProject && activeProject.id !== -1) {
      setEditName(activeProject.name);
      setEditDesc(activeProject.description || '');
    }
  }, [activeProject]);

  const scopedSnippets = useMemo(() => {
    if (selectedProjectId === null) return [];
    
    let result = snippets.filter(s => {
      if (selectedProjectId === -1) return s.project_id === null;
      return s.project_id === selectedProjectId;
    });

    // If searching, show archived snippets in results
    if (!searchQuery && !localSearch) {
      result = result.filter(s => !s.is_archived);
    }

    if (searchQuery || localSearch) {
      const combinedQuery = `${searchQuery} ${localSearch}`.trim();
      const filtered = filterSnippets(result, projects, combinedQuery);
      return filtered.map(r => r.snippet);
    }

    return result;
  }, [snippets, selectedProjectId, localSearch, searchQuery, projects]);

  const calculateHealth = (stat: any) => {
    if (!stat || stat.active_snippets === 0) return { label: 'EMPTY', color: 'text-slate-500' };
    const score = (stat.active_snippets / (stat.active_snippets + stat.stale_snippets)) * 100;
    if (score > 80) return { label: 'HEALTHY', color: 'text-[#15ff00]' };
    if (score > 50) return { label: 'ACTIVE', color: 'text-[#3b82f6]' };
    return { label: 'STALE', color: 'text-[#e60000]' };
  };

  if (selectedProjectId !== null && activeProject) {
    return (
      <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden">
        {/* Scoped Header */}
        <div className="p-8 border-b border-[#222226] bg-[#0e0e0e]">
          <div className="flex items-center gap-2 text-[#adaaad] text-[10px] font-mono tracking-widest uppercase mb-4">
            <button 
              onClick={() => setSelectedProjectId(null)}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              PROJECTS
            </button>
            <ChevronRight size={12} className="opacity-50" />
            <span className="text-[#e60000]">{activeProject.name}</span>
          </div>
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2 flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-4 animate-in slide-in-from-top-2 duration-300">
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-3xl font-main font-bold bg-[#151515] border border-[#222226] text-white px-3 py-1 outline-none uppercase tracking-[-1.5px]"
                  />
                  <input 
                    type="text" 
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="ENTER_DESCRIPTION..."
                    className="text-[#adaaad] font-mono text-[11px] bg-[#151515] border border-[#222226] px-3 py-1 outline-none uppercase"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleUpdateActiveProject} className="flex items-center gap-2 px-4 py-1.5 bg-[#e60000] text-white text-[10px] font-bold uppercase transition-colors hover:bg-[#ff0000]">
                      <Check size={14} /> SAVE_METADATA
                    </button>
                    <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 border border-[#222226] text-[#adaaad] text-[10px] font-bold uppercase hover:text-white transition-colors">
                      <X size={14} /> CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-main font-bold text-white tracking-[-2px] uppercase">
                    {activeProject.name}
                  </h1>
                  <p className="text-[#adaaad] font-mono text-[11px] uppercase max-w-xl">
                     {activeProject.description || 'REPOSITORY_VIEW__MODAL_ACTIVE'}
                  </p>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#adaaad] group-focus-within:text-[#e60000] transition-colors" />
                <input 
                  type="text" 
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="FILTER_SCOPED_VAULT..."
                  className="w-full bg-[#151515] border border-[#222226] pl-9 pr-4 py-2 text-[#adaaad] text-[10px] uppercase font-mono outline-none focus:border-[#e60000] transition-colors"
                />
              </div>
              {activeProject.id !== -1 && (
                <>
                   <button onClick={() => setIsEditing(true)} className="p-2 border border-[#222226] text-[#adaaad] hover:text-white transition-colors" title="Edit Metadata">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteProject(activeProject.id!)} className="p-2 border border-[#222226] text-[#adaaad] hover:text-[#e60000] transition-colors" title="Purge Project">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {scopedSnippets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-[#222226] rounded-xl text-[#adaaad] uppercase font-mono text-[11px]">
              {localSearch || searchQuery ? 'NO_MATCHING_CODE_ENTRIES' : 'PROJECT_VAULT_EMPTY'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {scopedSnippets.map(snippet => (
                <div key={snippet.id} className="h-[220px]">
                   <SnippetCard 
                      snippet={snippet}
                      onEdit={() => setSelectedSnippetId(snippet.id!)}
                      onDelete={() => {
                        if(confirm('Delete?')) invoke('delete_snippet', { id: snippet.id, user_id: user?.id }).then(() => fetchSnippets());
                      }}
                      onArchive={() => {
                        invoke('archive_snippet', { id: snippet.id, user_id: user?.id }).then(() => fetchSnippets());
                      }}
                   />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Overview Tier
  return (
    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#111111]">
      <div className="mb-10 flex justify-between items-end gap-2 border-b border-[#222226] pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-main font-bold text-white tracking-[-1.5px] uppercase">Project Vault</h1>
          <p className="text-[#adaaad] font-mono text-[11px] uppercase tracking-[1px]">Organizational & Contextual Scoping Layer</p>
        </div>
        <form onSubmit={handleCreateProject} className="flex items-center gap-2">
          <input 
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="GENERATE_PROJECT_SECTOR..."
            className="bg-[#0e0e0e] border border-[#222226] text-white text-[10px] font-mono px-4 py-2 uppercase tracking-[1px] outline-none focus:border-[#e60000] w-64"
          />
          <button 
            type="submit"
            disabled={isCreating || !newProjectName.trim()}
            className="bg-[#e60000] text-white p-2 hover:bg-[#ff0000] disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </div>
      
      {loadingStats ? (
        <div className="h-64 flex items-center justify-center text-[#adaaad] font-mono text-[11px] uppercase">
          <div className="w-4 h-4 border-2 border-[#e60000] border-t-transparent rounded-full animate-spin mr-3" />
          MAPPING_VAULT_TOPOLOGY...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 pb-20">
          {allProjects.map(p => {
            const s = stats[p.id!];
            const health = calculateHealth(s);
            return (
              <div 
                key={p.id} 
                className="bg-[#151515] border border-[#222226] p-6 hover:border-[#e60000]/50 transition-all group cursor-pointer relative flex flex-col h-full"
                onClick={() => setSelectedProjectId(p.id)}
              >
                <div className="flex justify-between items-start mb-6">
                  {editingProjectId === p.id ? (
                    <div className="flex flex-col gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={inlineEditName}
                        onChange={(e) => setInlineEditName(e.target.value)}
                        className="font-main font-bold text-white bg-[#0e0e0e] border border-[#222226] px-2 py-1 text-sm outline-none focus:border-[#e60000] uppercase tracking-[0.5px] w-full"
                        placeholder="PROJECT_NAME..."
                        autoFocus
                      />
                      <input
                        type="text"
                        value={inlineEditDesc}
                        onChange={(e) => setInlineEditDesc(e.target.value)}
                        className="text-[#adaaad] font-mono text-[9px] bg-[#0e0e0e] border border-[#222226] px-2 py-1 outline-none focus:border-[#e60000] w-full"
                        placeholder="Description..."
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); saveInlineEdit(p.id!); }}
                          className="px-2 py-1 bg-[#e60000] text-white text-[9px] font-bold uppercase"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelInlineEdit(); }}
                          className="px-2 py-1 border border-[#222226] text-[#adaaad] text-[9px] font-bold uppercase"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#e60000]/10 text-[#e60000] border border-[#e60000]/20 group-hover:bg-[#e60000] group-hover:text-white transition-all">
                          {p.id === -1 ? <Inbox className="w-5 h-5" /> : <FolderGit2 className="w-5 h-5" />}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-main font-bold text-white tracking-[0.5px] uppercase">{p.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-black uppercase font-mono tracking-widest ${health.color}`}>
                              {health.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.id !== -1 && (
                          <div className="flex items-center gap-2 mr-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); startInlineEdit(p); }}
                              className="p-2 bg-[#1a1a1a] border border-[#333] text-[#adaaad] hover:text-[#e60000] hover:border-[#e60000] hover:bg-[#e60000]/10 transition-all"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id!); }}
                              className="p-2 bg-[#1a1a1a] border border-[#333] text-[#adaaad] hover:text-[#e60000] hover:border-[#e60000] hover:bg-[#e60000]/10 transition-all"
                              title="Purge"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-[#adaaad] group-hover:text-[#e60000] transform transition-transform group-hover:translate-x-1" />
                      </div>
                    </>
                  )}
                </div>
                
                {s ? (
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4 pb-6 border-b border-[#222226] flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/40 rounded text-[#3b82f6]"><PieChart size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-mono font-bold text-white">{s.active_snippets}</span>
                        <span className="text-[8px] text-[#adaaad] uppercase font-mono tracking-tighter">Active_Nodes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/40 rounded text-[#ff0000]"><AlertTriangle size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-mono font-bold text-white">{s.stale_snippets}</span>
                        <span className="text-[8px] text-[#adaaad] uppercase font-mono tracking-tighter">Stale_Detect</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/40 rounded text-white"><Activity size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-mono font-bold text-white">{s.total_copies}</span>
                        <span className="text-[8px] text-[#adaaad] uppercase font-mono tracking-tighter">Usage_Metric</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/40 rounded text-[#facc15]"><Code2 size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-mono font-bold text-white truncate max-w-[80px]">{s.main_language || 'Mixed'}</span>
                        <span className="text-[8px] text-[#adaaad] uppercase font-mono tracking-tighter">Dominant_Lang</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 animate-pulse bg-[#19191c] mb-4 h-[120px]" />
                )}
                
                <div className="pt-4 flex justify-between items-center text-[9px] font-mono text-[#adaaad] uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                   PROJECT_RECON_DATA // ID_{p.id === -1 ? '000' : p.id}
                   {p.description && <span className="italic normal-case truncate max-w-[150px]">— {p.description}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button for Creating Projects */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#e60000] flex items-center justify-center hover:bg-[#ff0000] hover:scale-105 transition-all shadow-[0_0_20px_rgba(230,0,0,0.3)] z-50"
        title="Create New Project"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[#111111] border border-[#222226] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6 border-b border-[#222226] pb-4">
              <div className="w-2 h-2 bg-[#e60000]" />
              <h2 className="text-lg font-main font-bold text-white tracking-[1px] uppercase">
                INITIALIZE_NEW_SECTOR
              </h2>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-mono text-[#adaaad] uppercase tracking-[1px]">
                  PROJECT_DESIGNATION *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="ENTER_SECTOR_NAME..."
                  className="bg-[#0e0e0e] border border-[#222226] text-white px-4 py-3 text-sm font-mono outline-none focus:border-[#e60000] transition-colors uppercase"
                  autoFocus
                  required
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-mono text-[#adaaad] uppercase tracking-[1px]">
                  SECTOR_BRIEFING
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="OPTIONAL_CONTEXT..."
                  className="bg-[#0e0e0e] border border-[#222226] text-white px-4 py-3 text-sm font-mono outline-none focus:border-[#e60000] transition-colors resize-none h-24"
                />
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-[#222226]">
                <button
                  type="submit"
                  disabled={isCreating || !newProjectName.trim()}
                  className="flex-1 bg-[#e60000] text-white py-3 text-[11px] font-bold uppercase tracking-[1px] hover:bg-[#ff0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'INITIALIZING...' : 'COMMIT_SECTOR'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName('');
                    setNewProjectDesc('');
                  }}
                  className="px-6 py-3 border border-[#222226] text-[#adaaad] text-[11px] font-bold uppercase tracking-[1px] hover:text-white hover:border-[#adaaad] transition-colors"
                >
                  ABORT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
