import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor, DiffEditor } from '@monaco-editor/react';
import { useStore, Snippet, Tag } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { BoilerplateSelector } from './BoilerplateSelector';
import { SmartRecommendations } from './SmartRecommendations';
import { 
  X, 
  Save, 
  RotateCcw, 
  Terminal, 
  History,
  LayoutTemplate,
  Zap,
  ArrowLeft,
  Network,
  AlertTriangle,
  Activity,
  ShieldAlert
} from 'lucide-react';
import { RollbackConfirmModal } from './RollbackConfirmModal';
import { ProjectLinkingPanel } from './ProjectLinkingPanel';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
import { Tags, ChevronDown, RefreshCw } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Version {
  id: number;
  snippet_id: number;
  content: string;
  created_at: string;
}

export const SnippetEditor: React.FC = () => {
  const { 
    user, 
    snippets, 
    projects, 
    setProjects, 
    selectedSnippetId, 
    setSelectedSnippetId, 
    selectedProjectId,
    setPreSelectedProjectId,
    updateSnippetInStore 
  } = useStore();
  const [snippet, setSnippet] = useState<Partial<Snippet>>({ title: '', content: '', language: 'javascript' });
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'history' | 'recs' | 'validation'>('validation');
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{ line: number; message: string; severity: 'error' | 'warning' }[]>([]);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const [savedTags, setSavedTags] = useState<Tag[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const { setGlobalError } = useStore();
  const playSound = useSoundEffect();
  const saveRef = useRef<(() => void) | null>(null);

  // Handle global save shortcut event
  useEffect(() => {
    const handleSaveShortcut = () => {
      if (selectedSnippetId !== null && saveRef.current) {
        saveRef.current();
      }
    };
    window.addEventListener('save-snippet', handleSaveShortcut);
    return () => window.removeEventListener('save-snippet', handleSaveShortcut);
  }, [selectedSnippetId]);

  // Load saved tags from the Tags page
  const fetchTags = useCallback(async () => {
    if (!user) return;
    try {
      // Try to sync, but don't block if it fails
      try {
        await invoke('sync_all_metadata', { userId: user.id });
      } catch (e) {
        console.warn('Metadata sync failed, proceeding to fetch tags anyway');
      }
      
      const response: any = await invoke('list_tags', { userId: user.id });
      if (response && response.success) {
        const tags = response.data || [];
        setSavedTags(tags);

      } else {
        console.warn('[SnippetEditor] list_tags returned failure:', response?.message);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Re-fetch when dropdown opens to ensure we have the latest tags
  useEffect(() => {
    if (tagDropdownOpen) {
      fetchTags();
    }
  }, [tagDropdownOpen, fetchTags]);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tag helpers
  const getActiveTags = (): string[] => {
    const raw = snippet.tags || '';
    return raw.split(',').map(t => t.trim()).filter(Boolean);
  };

  const toggleTag = (tagName: string) => {
    const current = getActiveTags();
    const normalized = tagName.trim().toLowerCase();
    const exists = current.some(t => t.toLowerCase() === normalized);
    const updated = exists
      ? current.filter(t => t.toLowerCase() !== normalized)
      : [...current, tagName.trim()];
    setSnippet({ ...snippet, tags: updated.join(', ') });
  };

  const removeTag = (tagName: string) => {
    const updated = getActiveTags().filter(t => t.toLowerCase() !== tagName.toLowerCase());
    setSnippet({ ...snippet, tags: updated.join(', ') });
  };

  const addFreeTextTag = () => {
    const trimmed = tagSearchInput.trim();
    if (!trimmed) return;
    const current = getActiveTags();
    if (!current.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setSnippet({ ...snippet, tags: [...current, trimmed].join(', ') });
    }
    setTagSearchInput('');
  };

  // Debounced title check
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!snippet.title?.trim() || !user) {
        setTitleError(null);
        return;
      }
      try {
        const exists = await invoke<boolean>('validate_snippet_title', {
          userId: user.id,
          title: snippet.title.trim(),
          excludeId: selectedSnippetId === -1 ? null : selectedSnippetId
        });
        if (exists) {
          playSound('error');
          setTitleError('TITLE_ALREADY_EXISTS');
        } else {
          setTitleError(null);
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [snippet.title, user, selectedSnippetId]);

  // Syntax monitoring (TODOs, Size)
  useEffect(() => {
    const issues: { line: number; message: string; severity: 'error' | 'warning' }[] = [];
    
    // Size check
    if (snippet.content && snippet.content.length > 512 * 1024) {
      issues.push({ line: 0, message: 'Snippet exceeds 512KB payload limit', severity: 'error' });
    }

    // Scan for TODOs
    if (snippet.content) {
      const lines = snippet.content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('TODO:') || line.includes('FIXME:')) {
          issues.push({ line: i + 1, message: `Pending Action: ${line.trim()}`, severity: 'warning' });
        }
      });
    }

    // Play feedback if new issues found (debounced probably better, but let's keep it simple)
    if (issues.length > validationIssues.length) {
       const errors = issues.filter(i => i.severity === 'error');
       if (errors.length > 0) playSound('error');
    }

    setValidationIssues(issues);

    // Apply decorations if editor is ready
    if (editorInstance && monacoInstance) {
      const decorations = issues
        .filter(iss => iss.line > 0)
        .map(iss => ({
          range: new monacoInstance.Range(iss.line, 1, iss.line, 1),
          options: {
            isWholeLine: true,
            className: iss.severity === 'error' ? 'bg-red-500/10' : 'bg-yellow-500/10',
            glyphMarginClassName: iss.severity === 'error' ? 'monaco-error-glyph' : 'monaco-warning-glyph',
            hoverMessage: { value: iss.message }
          }
        }));
      
      if (editorInstance.deltaDecorations) {
        editorInstance.decorationsIds = editorInstance.deltaDecorations(editorInstance.decorationsIds || [], decorations);
      } else if (editorInstance.createDecorationsCollection) {
        if (!editorInstance.decorationsCollection) {
          editorInstance.decorationsCollection = editorInstance.createDecorationsCollection(decorations);
        } else {
          editorInstance.decorationsCollection.set(decorations);
        }
      }
    }
  }, [snippet.content, editorInstance, monacoInstance]);

  // Handle creating new project from dropdown
  const handleCreateProjectFromDropdown = async () => {
    const name = prompt('Enter new project designation:');
    if (!name?.trim() || !user) return;
    
    try {
      const response: any = await invoke('create_project', {
        userId: user.id,
        name: name.trim(),
        description: null,
        color: null
      });
      if (response.success) {
        playSound('success');
        const newProject = response.data?.[0];
        if (newProject) {
          setProjects([...projects, newProject]);
          setSnippet({ ...snippet, project_id: newProject.id });
          toast.success(`Project Sector "${name}" Initialized`);
        }
      } else {
        playSound('error');
        toast.error(response.message || 'Sector initialization protocol failed');
      }
    } catch (err: any) {
      playSound('error');
      toast.error(`Infrastructure Error: ${err.toString()}`);
    }
  };

  // Load existing snippet
  useEffect(() => {
    if (selectedSnippetId !== -1 && selectedSnippetId !== null) {
      const existing = snippets.find(s => s.id === selectedSnippetId);
      if (existing) {
        setSnippet(existing);
        loadVersions(existing.id!);
      }
    } else {
      // Set default project from store if we're in a project view
      const defaultProjectId = selectedProjectId && selectedProjectId !== -1 ? selectedProjectId : null;
      setSnippet({ title: '', content: '', language: 'javascript', project_id: defaultProjectId });
      setVersions([]);
    }
  }, [selectedSnippetId, snippets]);

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const response: any = await invoke('list_projects', { userId: user.id });
        if (response.success) {
          setProjects(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
  }, [user]);

  const loadVersions = async (id: number) => {
    try {
      const response: any = await invoke('get_snippet_versions', { snippetId: id });
      if (response.success && response.data) {
        setVersions(response.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSave = useCallback(async () => {
    if (!snippet.title || !snippet.content) {
      playSound('error');
      toast.error('Title and content are required');
      return;
    }
    if (titleError) {
      playSound('error');
      toast.error('Cannot commit: Title collision detected');
      return;
    }
    setSaving(true);
    try {
      const params = {
        userId: user?.id,
        title: snippet.title,
        content: snippet.content,
        language: snippet.language,
        tags: snippet.tags || '',
        projectId: snippet.project_id || null
      };

      const response: any = await invoke(selectedSnippetId === -1 ? 'create_snippet' : 'update_snippet', 
        selectedSnippetId === -1 ? params : { ...params, id: selectedSnippetId }
      );

      if (response.success) {
        playSound('success');
        toast.success(selectedSnippetId === -1 ? 'System buffer recorded' : 'Matrix updated and versioned');
        if (selectedSnippetId === -1) {
          setSelectedSnippetId(null);
          setPreSelectedProjectId(null);
        } else {
          updateSnippetInStore(selectedSnippetId!, snippet as Snippet);
          loadVersions(selectedSnippetId!);
        }
      } else {
        playSound('error');
        if (response.message.startsWith('INTERNAL_ERROR') || response.message.startsWith('CRITICAL_ERROR')) {
          setGlobalError({
            title: 'SYSTEM FAILURE',
            message: response.message,
            logs: [
              { timestamp: new Date().toLocaleTimeString([], { hour12: false }), level: 'CRITICAL', message: 'Crimson Protocol Violation' },
              { timestamp: new Date().toLocaleTimeString([], { hour12: false }), level: 'STACK_TRACE', message: `Target: ${selectedSnippetId === -1 ? 'NEW_SEQUENCE' : 'EDIT_MATRIX'}` },
              { timestamp: new Date().toLocaleTimeString([], { hour12: false }), level: 'ERROR', message: response.message }
            ],
            onRetry: handleSave
          });
        } else {
          toast.error(response.message);
        }
      }
    } catch (err: any) {
      playSound('error');
      toast.error(err.toString());
    } finally {
      setSaving(false);
    }
  }, [snippet, titleError, selectedSnippetId, user, playSound]);

  // Keep saveRef in sync so the keyboard shortcut always calls the latest handleSave
  useEffect(() => {
    saveRef.current = handleSave;
  }, [handleSave]);

  const handleRollback = async () => {
    if (!selectedVersion) return;
    setShowRollbackModal(true);
  };

  const executeRollback = async () => {
    if (!selectedVersion) return;
    
    try {
      const response: any = await invoke('rollback_snippet', {
        userId: user?.id,
        snippetId: selectedSnippetId,
        versionId: selectedVersion.id
      });
      
      if (response.success) {
        toast.success('Rollback execution complete');
        setSnippet({ ...snippet, content: selectedVersion.content });
        updateSnippetInStore(selectedSnippetId!, { content: selectedVersion.content });
        setIsDiffMode(false);
        setSelectedVersion(null);
        setShowRollbackModal(false);
        loadVersions(selectedSnippetId!);
      } else {
        toast.error(response.message);
      }
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace('T', ' ').substring(0, 19);
  };

  const [showRightSidebar, setShowRightSidebar] = useState(false);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 w-full relative">
      
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {showRightSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRightSidebar(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[47] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Center Code Workspace */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border)] relative min-h-0">
        
        {/* Editor Settings Header */}
        <div className="h-auto bg-[#131313]/80 backdrop-blur-md border-b border-[var(--border)]/20 p-4 md:p-8 flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { playSound('transition'); setSelectedSnippetId(null); }}
                onMouseEnter={() => playSound('hover')}
                className="p-2 border border-[var(--border)] text-[#adaaad] hover:text-white hover:border-[var(--accent)] transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-[12px] md:text-[14px] font-main font-bold text-white tracking-tight uppercase flex items-center gap-2">
                <Terminal className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent)]" />
                <span className="truncate">{selectedSnippetId === -1 ? 'NEW_SEQUENCE' : 'EDIT_MATRIX'}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <button 
                onClick={() => { playSound('click'); setShowTemplates(true); }}
                onMouseEnter={() => playSound('hover')}
                className="px-3 md:px-6 py-2 border border-[var(--accent)] text-[var(--accent)] flex items-center gap-2 text-[9px] md:text-[10px] font-main font-bold tracking-premium uppercase hover:bg-[var(--accent)] hover:text-white transition-all group shrink-0"
                title="Protocol Template Override"
              >
                <LayoutTemplate className="w-3 md:w-4 h-3 md:h-4 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">TEMPLATE_OVERRIDE</span>
                <span className="sm:hidden">TEMPLATES</span>
              </button>
              <button 
                onClick={() => { playSound('click'); handleSave(); }}
                onMouseEnter={() => playSound('hover')}
                disabled={saving}
                className={`px-3 md:px-6 py-2 flex items-center gap-2 text-[9px] md:text-[10px] font-main font-bold tracking-premium uppercase transition-all disabled:opacity-50 shrink-0 ${titleError ? 'bg-[var(--border)] text-slate-500 cursor-not-allowed' : 'bg-[var(--accent)] text-white hover:bg-[#ff0000]'}`}
              >
                <Save className="w-3 md:w-4 h-3 md:h-4" />
                {saving ? 'SAVING...' : 'SAVE'}
              </button>
              <button 
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className={cn(
                  "lg:hidden p-2 border transition-colors shrink-0",
                  showRightSidebar ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[#adaaad]"
                )}
              >
                <Zap size={16} />
              </button>
              <button 
                onClick={() => {
                  playSound('transition');
                  setSelectedSnippetId(null);
                  setPreSelectedProjectId(null);
                }}
                onMouseEnter={() => playSound('hover')}
                className="p-2 border border-[var(--border)]/50 text-[#adaaad] hover:text-white hover:border-[var(--accent)] transition-colors shrink-0"
                title="Close Editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4">
             <div className="flex-1 relative">
               <div className="flex items-center justify-between mb-1">
                 <span className="text-[9px] font-mono text-[#adaaad] uppercase">INPUT_ENTITY_TITLE</span>
                 {titleError && (
                   <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 animate-pulse rounded-sm">
                     {titleError}
                   </span>
                 )}
               </div>
               <input 
                 type="text" 
                 value={snippet.title}
                 onChange={e => setSnippet({...snippet, title: e.target.value})}
                 className={`w-full bg-transparent border-b text-xl md:text-2xl font-main font-bold text-white px-0 py-2 outline-none transition-colors ${titleError ? 'border-red-600' : 'border-[var(--border)]/50 focus:border-[var(--accent)]'}`}
                 placeholder="PROXIMA_VOYAGER_01"
               />
             </div>
             
             <div className="flex gap-3">
               <div className="flex flex-col gap-1 flex-1 md:w-48">
                 <span className="text-[9px] font-mono text-[#adaaad] uppercase">PROJECT_REPOSITORY</span>
                 <select 
                   value={snippet.project_id || ''}
                   onChange={e => {
                     const value = e.target.value;
                     if (value === 'create_new') {
                       handleCreateProjectFromDropdown();
                     } else {
                       setSnippet({...snippet, project_id: value ? parseInt(value) : null});
                     }
                   }}
                   className="bg-[#1c1b1b] border border-[var(--border)]/50 text-white text-[10px] font-mono p-2 outline-none focus:border-[var(--accent)] transition-colors cursor-pointer w-full"
                 >
                   <option value="">INBOX / UNSORTED</option>
                   {projects.map(p => (
                     <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                   ))}
                   <option value="create_new" className="text-[var(--accent)]">+ CREATE NEW PROJECT</option>
                 </select>
               </div>

               <div className="flex flex-col gap-1 flex-1 md:w-48">
                 <span className="text-[9px] font-mono text-[#adaaad] uppercase">Language</span>
                 <select 
                   value={snippet.language}
                   onChange={e => setSnippet({...snippet, language: e.target.value})}
                   className="bg-[#1c1b1b] border border-[var(--border)]/50 text-white text-[10px] font-mono p-2 outline-none w-full"
                 >
                   <option value="javascript">JavaScript</option>
                   <option value="typescript">TypeScript</option>
                   <option value="rust">Rust</option>
                   <option value="python">Python</option>
                   <option value="go">GoLang</option>
                   <option value="sql">SQL</option>
                   <option value="json">JSON</option>
                 </select>
               </div>

               {/* Tags multi-select dropdown */}
               <div className="flex flex-col gap-1 flex-1 md:w-56 relative" ref={tagDropdownRef}>
                 <span className="text-[9px] font-mono text-[#adaaad] uppercase flex items-center gap-1">
                   <Tags size={9} /> TAG_ASSIGNMENT {savedTags.length > 0 && `(${savedTags.length})`}
                 </span>

                 {/* Selected tag pills */}
                 <div
                   onClick={() => setTagDropdownOpen(v => !v)}
                   className="min-h-[34px] bg-[#1c1b1b] border border-[var(--border)]/50 focus-within:border-[var(--accent)] transition-colors p-1.5 flex flex-wrap gap-1 cursor-pointer relative"
                 >
                   {getActiveTags().length === 0 && (
                     <span className="text-[#adaaad]/40 text-[10px] font-mono px-1 self-center">Select or type tags...</span>
                   )}
                   {getActiveTags().map(tag => (
                     <span
                       key={tag}
                       className="flex items-center gap-1 bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-[9px] font-mono px-1.5 py-0.5 uppercase"
                     >
                       {tag}
                       <button
                         onClick={e => { e.stopPropagation(); removeTag(tag); }}
                         className="text-[var(--accent)]/60 hover:text-[var(--accent)] leading-none"
                       >
                         ×
                       </button>
                     </span>
                   ))}
                   <ChevronDown
                     size={12}
                     className={`absolute right-2 top-1/2 -translate-y-1/2 text-[#adaaad] transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`}
                   />
                 </div>

                 {/* Dropdown panel */}
                 {tagDropdownOpen && (
                   <div className="absolute top-full left-0 w-full mt-1 bg-[#151515] border border-[var(--border)] z-[100] shadow-xl flex flex-col" style={{ minWidth: '220px' }}>
                     {/* Free-text input */}
                     <div className="flex border-b border-[var(--border)]/30 items-center">
                       <input
                         autoFocus
                         type="text"
                         value={tagSearchInput}
                         onChange={e => setTagSearchInput(e.target.value)}
                         onKeyDown={e => {
                           if (e.key === 'Enter') { e.preventDefault(); addFreeTextTag(); }
                           if (e.key === 'Escape') setTagDropdownOpen(false);
                         }}
                         placeholder="Type & press Enter to add..."
                         className="flex-1 bg-transparent text-white text-[10px] font-mono px-3 py-2 outline-none placeholder-[#adaaad]/30"
                         onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); fetchTags(); }}
                          className="px-2 text-[#adaaad] hover:text-[var(--accent)] transition-colors"
                          title="Refresh Registry"
                        >
                          <RefreshCw size={12} />
                        </button>
                       {tagSearchInput && (
                         <button
                           onClick={e => { e.stopPropagation(); addFreeTextTag(); }}
                           className="px-3 text-[var(--accent)] text-[9px] font-mono uppercase border-l border-[var(--border)]/30 hover:bg-[var(--accent)]/10"
                         >
                           Add
                         </button>
                       )}
                     </div>

                      {/* Saved tags list */}
                      <div className="flex-1 min-h-[50px] max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col bg-[#1a1a1a]">
                        <div className="px-3 py-2 text-[8px] font-mono text-[#adaaad]/40 border-b border-white/[0.05] flex justify-between items-center sticky top-0 bg-[#1a1a1a] z-10">
                          <span className="flex items-center gap-1"><Activity size={8} /> REGISTRY_DATA</span>
                          <span>{savedTags.length} NODES</span>
                        </div>
                        
                        {savedTags.length > 0 ? (
                          <div className="flex flex-col">
                            {savedTags
                              .filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase())))
                              .map((t, idx) => {
                                const active = getActiveTags().some(a => a.toLowerCase() === (t.name || "").toLowerCase());
                                return (
                                  <button
                                    key={t.id || `tag-${idx}`}
                                    onClick={e => { e.stopPropagation(); toggleTag(t.name); }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.5px] transition-all border-b border-white/[0.02] ${
                                      active ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[#adaaad] hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: t.color || 'var(--accent)' }} />
                                      {t.name || "UNKNOWN_TAG"}
                                    </span>
                                    {active && <span className="text-[var(--accent)] text-[10px] font-bold">SELECTED</span>}
                                  </button>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="px-3 py-10 text-center flex flex-col items-center gap-2">
                            <Zap size={16} className="text-[#adaaad]/10" />
                            <div className="text-[9px] font-mono text-[#adaaad]/20 tracking-widest uppercase">Registry_Empty</div>
                          </div>
                        )}
                        
                        {savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && (
                          <div className="px-3 py-6 text-[9px] font-mono text-[#adaaad]/40 text-center uppercase italic">
                            No matches for "{tagSearchInput}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
           </div>
         </div>

        {/* Scrollable Content Area: Editor + Linking Panel */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
          {/* The Monaco Editor - flexible height so it fills the screen, min-height to keep linking panel reachable */}
          <div className="flex-1 min-h-[400px] relative">
            {isDiffMode && selectedVersion ? (
             <DiffEditor
               height="100%"
               language={snippet.language?.toLowerCase()}
               theme="vs-dark"
               original={selectedVersion.content}
               modified={snippet.content}
               options={{
                 renderSideBySide: true,
                 minimap: { enabled: false },
                 fontFamily: "'Space Grotesk', monospace",
                 fontSize: 13,
                 readOnly: false,
               }}
             />
           ) : (
             <Editor
               height="100%"
               language={snippet.language?.toLowerCase()}
               theme="vs-dark"
               value={snippet.content}
                loading={
                  <div className="flex flex-col items-center justify-center h-full bg-[#0e0e10] gap-4">
                    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                     <span className="text-[#adaaad] font-mono text-[10px] uppercase tracking-premium">Initialising_Editor_Engine...</span>
                  </div>
                }
               onMount={(editor, monaco) => {
                 setEditorInstance(editor);
                 setMonacoInstance(monaco);
               }}
               onChange={val => setSnippet({...snippet, content: val || ''})}
               options={{
                 minimap: { enabled: false },
                 fontFamily: "'Space Grotesk', monospace",
                 fontSize: 13,
                 wordWrap: "on",
                 formatOnPaste: true,
                 glyphMargin: true,
                 lineNumbersMinChars: 3,
               }}
             />
           )}
          </div>

          {/* Cross-Project Links (Default Visibility) */}
          {selectedSnippetId !== -1 && (
            <div className="mt-8 border-t border-[var(--border)]/20 p-8 bg-[var(--bg-primary)]/30">
              <div className="flex items-center gap-3 mb-6">
                <Network size={18} className="text-[var(--accent)]" />
                <h4 className="text-[12px] font-bold text-white tracking-premium uppercase">Behavioral Correlations</h4>
              </div>
              <ProjectLinkingPanel snippetId={selectedSnippetId!} />
            </div>
          )}
        </div>

      </div>

      {/* Right Sidebar */}
      <aside className={cn(
        "bg-[var(--bg-primary)] border-l border-[var(--border)]/20 flex flex-col pt-14 lg:pt-0 min-h-0 overflow-hidden transition-all duration-300 z-[48]",
        "fixed inset-y-0 right-0 w-[300px] lg:relative lg:w-[320px] lg:translate-x-0",
        showRightSidebar ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Mobile Close Button for Sidebar */}
        <button 
          onClick={() => setShowRightSidebar(false)}
          className="lg:hidden absolute top-4 left-4 p-2 text-[#adaaad] hover:text-white"
        >
          <X size={20} />
        </button>
        
        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--border)]/20">
          <button 
            onClick={() => { playSound('click'); setRightSidebarTab('validation'); }}
            onMouseEnter={() => playSound('hover')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-premium uppercase transition-all ${rightSidebarTab === 'validation' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <ShieldAlert size={14} />
            SCAN
          </button>
          <button 
            onClick={() => { playSound('click'); setRightSidebarTab('recs'); }}
            onMouseEnter={() => playSound('hover')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'recs' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <Zap size={14} />
            RECS
          </button>
          <button 
            onClick={() => { playSound('click'); setRightSidebarTab('history'); }}
            onMouseEnter={() => playSound('hover')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'history' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <History size={14} />
            LOG
          </button>

        </div>

        {rightSidebarTab === 'validation' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]/20 bg-[#131313]">
               <h3 className="text-white text-[12px] font-main font-bold tracking-premium uppercase flex items-center gap-2">
                 <Activity className="w-4 h-4 text-[var(--accent)]" />
                 CORE_VALIDATION_ENGINE
               </h3>
               <p className="text-[#adaaad] text-[9px] font-mono mt-1">Real-time syntax diagnostic active</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Properties Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-premium">METRICS_SNAPSHOT</span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-red-500">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    LIVE
                  </div>
                </div>
                
                <div className="bg-[#131313] border border-slate-800/50 p-4 rounded-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-[#adaaad] uppercase">BUFFER_SIZE</span>
                    <span className={`text-[10px] font-mono ${snippet.content && snippet.content.length > 512 * 1024 ? 'text-red-500' : 'text-green-500'}`}>
                      {((snippet.content?.length || 0) / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${snippet.content && snippet.content.length > 512 * 1024 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(((snippet.content?.length || 0) / (512 * 1024)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Issues Section */}
              <div className="space-y-4">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-premium">DIAGNOSTIC_ISSUES ({validationIssues.length})</span>
                
                <div className="space-y-3">
                  {validationIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30 grayscale">
                      <ShieldAlert className="w-8 h-8 mb-2" />
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#adaaad]">All protocols stable</span>
                    </div>
                  ) : (
                    validationIssues.map((issue, idx) => (
                      <div key={idx} className={`p-3 border-l-2 bg-[#131313] ${issue.severity === 'error' ? 'border-red-600' : 'border-yellow-600'}`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
                          <div className="flex-1">
                            <p className="text-[10px] text-white font-mono leading-relaxed">{issue.message}</p>
                            <span className="text-[8px] text-slate-500 font-mono uppercase mt-1 block">
                              {issue.line > 0 ? `LOC: LINE_${issue.line}` : 'GLOBAL_SCOPE'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* System Notice Decoration */}
              <div className="p-4 bg-red-600/5 border border-red-600/20 rounded-sm">
                 <div className="flex items-center gap-2 mb-2 text-red-500 font-mono text-[9px] font-bold">
                    <ShieldAlert size={12} />
                    SYSTEM NOTICE
                 </div>
                 <p className="text-[9px] text-slate-400 font-mono leading-relaxed">
                   Unauthorized syntax patterns are logged and reported to the system administrator. 
                   Ensure snippet size remains below 512KB for cluster-level replication.
                 </p>
              </div>
            </div>

            <div className="p-6 bg-[#131313] border-t border-[var(--border)]/20">
               <button 
                 onClick={handleSave}
                 disabled={saving || titleError !== null}
                 className={`w-full py-4 flex items-center justify-center gap-2 text-[11px] font-bold tracking-tight uppercase transition-all active:scale-95 ${titleError ? 'bg-[#252525] text-slate-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.2)]'}`}
               >
                 <Zap className="w-4 h-4" />
                 SYNC_TO_MAINFRAME
               </button>
            </div>
          </div>
        ) : rightSidebarTab === 'recs' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
             <SmartRecommendations 
               currentLanguage={snippet.language || 'javascript'} 
               currentTags={snippet.tags || ''}
               onPreview={(content) => {
                 setSnippet({ ...snippet, content });
                 toast.success('Sequence preview injected');
               }}
             />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]/20 flex flex-col gap-1">
              <h3 className="text-white text-[12px] font-main font-bold tracking-[1.5px] uppercase">
                REVISION_LOG
              </h3>
              <p className="text-[#adaaad] text-[9px] font-mono">Immutable cryptographic history</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              
              <div className="text-[10px] text-[var(--accent)] font-main tracking-[1px] uppercase ml-2 mb-2">Active Working Set</div>
              
              <button 
                onClick={() => { setIsDiffMode(false); setSelectedVersion(null); }}
                className={`w-full text-left p-4 bg-[#1c1b1b] border-l-2 transition-all ${!isDiffMode ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--accent)]/50'}`}
              >
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase font-main">CURRENT</span>
                    <span className="text-[9px] text-[#adaaad] font-mono">Unsaved changes</span>
                </div>
              </button>

              {versions.length > 0 && (
                <>
                  <div className="text-[10px] text-[#adaaad] font-main tracking-[1px] uppercase ml-2 mt-4 mb-2">Commits</div>
                  {versions.map(v => (
                  <button 
                    onClick={() => { playSound('transition'); setSelectedVersion(v); setIsDiffMode(true); }}
                    onMouseEnter={() => playSound('hover')}
                    className={`w-full text-left p-4 bg-[#1c1b1b] opacity-70 border transition-all ${selectedVersion?.id === v.id ? 'border-[var(--accent)] opacity-100' : 'border-transparent hover:border-[var(--border)]'}`}
                  >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                              <History className="w-3.5 h-3.5 text-[#adaaad]" />
                              <span className="text-[10px] text-white font-mono">ID: {v.id.toString().padStart(6, '0')}</span>
                          </div>
                          <span className="text-[9px] text-[var(--accent)] font-mono">{formatDate(v.created_at)}</span>
                        </div>
                  </button>
                ))}
              </>
            )}

            {selectedSnippetId === -1 && (
              <div className="text-[10px] text-[#adaaad] p-4 font-mono">Save initial snippet to begin version tracking.</div>
            )}
          </div>

          {isDiffMode && (
            <div className="p-6 bg-[#131313] border-t border-[var(--border)]/20 flex flex-col gap-4 sticky bottom-0">
              <div className="text-[9px] text-[#adaaad] font-mono uppercase text-center mb-2">
                Warning: Reverting destroys current unsaved changes.
              </div>
              <button 
                onClick={() => { playSound('click'); handleRollback(); }}
                onMouseEnter={() => playSound('hover')}
                className="w-full bg-[var(--border)] hover:bg-[var(--accent)] text-white py-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Rollback to this state
              </button>
            </div>
          )}
        </div>
      )}

    </aside>

    {showTemplates && (
      <BoilerplateSelector 
        onClose={() => { playSound('click'); setShowTemplates(false); }}
        onSelect={(content: string) => {
           playSound('success');
           setSnippet({ ...snippet, content });
           toast.success('Matrix template merged successfully');
        }}
        currentContent={snippet.content || ''}
      />
    )}

    <RollbackConfirmModal
      isOpen={showRollbackModal}
      onConfirm={() => { playSound('click'); executeRollback(); }}
      onCancel={() => { playSound('click'); setShowRollbackModal(false); }}
      versionDate={selectedVersion?.created_at ? formatDate(selectedVersion.created_at) : undefined}
      versionId={selectedVersion?.id}
    />
    </div>
  );
};
