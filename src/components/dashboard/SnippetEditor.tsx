import React, { useState, useEffect } from 'react';
import { Editor, DiffEditor } from '@monaco-editor/react';
import { useStore, Snippet } from '../../store/useStore';
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
  const [rightSidebarTab, setRightSidebarTab] = useState<'history' | 'recs' | 'links' | 'validation'>('validation');
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{ line: number; message: string; severity: 'error' | 'warning' }[]>([]);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const { setGlobalError } = useStore();

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
      
      editorInstance.decorationsIds = editorInstance.deltaDecorations(editorInstance.decorationsIds || [], decorations);
    }
  }, [snippet.content, editorInstance, monacoInstance]);

  // Handle creating new project from dropdown
  const handleCreateProjectFromDropdown = async () => {
    // We'll replace the prompt with a triggered flag that ProjectVault can handle or a local modal
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
        const newProject = response.data?.[0];
        if (newProject) {
          setProjects([...projects, newProject]);
          setSnippet({ ...snippet, project_id: newProject.id });
          toast.success(`Project Sector "${name}" Initialized`);
        }
      } else {
        toast.error(response.message || 'Sector initialization protocol failed');
      }
    } catch (err: any) {
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

  const handleSave = async () => {
    if (!snippet.title || !snippet.content) {
      toast.error('Title and content are required');
      return;
    }
    if (titleError) {
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
        toast.success(selectedSnippetId === -1 ? 'System buffer recorded' : 'Matrix updated and versioned');
        if (selectedSnippetId === -1) {
          setSelectedSnippetId(null);
          setPreSelectedProjectId(null);
        } else {
          updateSnippetInStore(selectedSnippetId!, snippet as Snippet);
          loadVersions(selectedSnippetId!);
        }
      } else {
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
      toast.error(err.toString());
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="flex-1 flex overflow-hidden">
      
      {/* Center Code Workspace */}
      <div className="flex-1 flex flex-col bg-[#0e0e0e] border-r border-[#222226] relative">
        
        {/* Editor Settings Header */}
        <div className="h-auto bg-[#131313]/80 backdrop-blur-md border-b border-[#353534]/20 p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedSnippetId(null)}
                className="p-2 border border-[#222226] text-[#adaaad] hover:text-white hover:border-[#e60000] transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-[14px] font-main font-bold text-white tracking-[2px] uppercase flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#e60000]" />
                {selectedSnippetId === -1 ? 'NEW_SEQUENCE' : 'EDIT_MATRIX'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowTemplates(true)}
                className="px-6 py-2 border border-[#e60000] text-[#e60000] flex items-center gap-2 text-[10px] font-main font-bold tracking-[1.5px] uppercase hover:bg-[#e60000] hover:text-white transition-all group"
                title="Protocol Template Override"
              >
                <LayoutTemplate className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                TEMPLATE_OVERRIDE
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 flex items-center gap-2 text-[10px] font-main font-bold tracking-[1.5px] uppercase transition-all disabled:opacity-50 ${titleError ? 'bg-[#353534] text-slate-500 cursor-not-allowed' : 'bg-[#e60000] text-white hover:bg-[#ff0000]'}`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'COMMITTING...' : 'SAVE REVISION'}
              </button>
              <button 
                onClick={() => {
                  setSelectedSnippetId(null);
                  setPreSelectedProjectId(null);
                }}
                className="p-2 border border-[#353534]/50 text-[#adaaad] hover:text-white hover:border-[#e60000] transition-colors"
                title="Close Editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
                 className={`w-full bg-transparent border-b text-2xl font-main font-bold text-white px-0 py-2 outline-none transition-colors ${titleError ? 'border-red-600' : 'border-[#353534]/50 focus:border-[#e60000]'}`}
                 placeholder="PROXIMA_VOYAGER_01"
               />
               {titleError && (
                 <p className="absolute -bottom-5 left-0 text-red-400/70 text-[9px] font-mono italic">
                   {">"} ERROR: Registry node indicates title collision in cluster-A
                 </p>
               )}
             </div>
             <div className="flex flex-col gap-1 w-48">
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
                 className="bg-[#1c1b1b] border border-[#353534]/50 text-white text-[10px] font-mono p-2 outline-none focus:border-[#e60000] transition-colors cursor-pointer"
               >
                 <option value="">INBOX / UNSORTED</option>
                 {projects.map(p => (
                   <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                 ))}
                 <option value="create_new" className="text-[#e60000]">+ CREATE NEW PROJECT</option>
               </select>
             </div>

             <div className="flex flex-col gap-1 w-48">
               <span className="text-[9px] font-mono text-[#adaaad] uppercase">Language</span>
               <select 
                 value={snippet.language}
                 onChange={e => setSnippet({...snippet, language: e.target.value})}
                 className="bg-[#1c1b1b] border border-[#353534]/50 text-white text-[10px] font-mono p-2 outline-none"
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
          </div>
        </div>

        {/* Scrollable Content Area: Editor + Linking Panel */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
          {/* The Monaco Editor - fixed height so linking panel is always reachable */}
          <div className="h-[500px] shrink-0 relative">
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
            <div className="mt-8 border-t border-[#353534]/20 p-8 bg-[#0e0e0e]/30">
              <div className="flex items-center gap-3 mb-6">
                <Network size={18} className="text-[#e60000]" />
                <h4 className="text-[12px] font-bold text-white tracking-[2px] uppercase">Behavioral Correlations</h4>
              </div>
              <ProjectLinkingPanel snippetId={selectedSnippetId!} />
            </div>
          )}
        </div>

      </div>

      {/* Right Sidebar */}
      <aside className="w-[320px] bg-[#0e0e0e] border-l border-[#353534]/20 flex flex-col pt-14">
        
        {/* Tab Switcher */}
        <div className="flex border-b border-[#353534]/20">
          <button 
            onClick={() => setRightSidebarTab('validation')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'validation' ? 'text-[#e60000] border-b-2 border-[#e60000] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <ShieldAlert size={14} />
            SCAN
          </button>
          <button 
            onClick={() => setRightSidebarTab('recs')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'recs' ? 'text-[#e60000] border-b-2 border-[#e60000] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <Zap size={14} />
            RECS
          </button>
          <button 
            onClick={() => setRightSidebarTab('history')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'history' ? 'text-[#e60000] border-b-2 border-[#e60000] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <History size={14} />
            LOG
          </button>
          {selectedSnippetId !== -1 && (
            <button 
              onClick={() => setRightSidebarTab('links')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'links' ? 'text-[#e60000] border-b-2 border-[#e60000] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
            >
              <Network size={14} />
              LINKS
            </button>
          )}
        </div>

        {rightSidebarTab === 'validation' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#353534]/20 bg-[#131313]">
               <h3 className="text-white text-[12px] font-main font-bold tracking-[1.5px] uppercase flex items-center gap-2">
                 <Activity className="w-4 h-4 text-[#e60000]" />
                 CORE_VALIDATION_ENGINE
               </h3>
               <p className="text-[#adaaad] text-[9px] font-mono mt-1">Real-time syntax diagnostic active</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Properties Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">METRICS_SNAPSHOT</span>
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
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">DIAGNOSTIC_ISSUES ({validationIssues.length})</span>
                
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

            <div className="p-6 bg-[#131313] border-t border-[#353534]/20">
               <button 
                 onClick={handleSave}
                 disabled={saving || titleError !== null}
                 className={`w-full py-4 flex items-center justify-center gap-2 text-[11px] font-bold tracking-[2px] uppercase transition-all active:scale-95 ${titleError ? 'bg-[#252525] text-slate-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.2)]'}`}
               >
                 <Zap className="w-4 h-4" />
                 SYNC_TO_MAINFRAME
               </button>
            </div>
          </div>
        ) : rightSidebarTab === 'links' && selectedSnippetId !== -1 ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ProjectLinkingPanel snippetId={selectedSnippetId!} />
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
            <div className="p-6 border-b border-[#353534]/20 flex flex-col gap-1">
              <h3 className="text-white text-[12px] font-main font-bold tracking-[1.5px] uppercase">
                REVISION_LOG
              </h3>
              <p className="text-[#adaaad] text-[9px] font-mono">Immutable cryptographic history</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              
              <div className="text-[10px] text-[#e60000] font-main tracking-[1px] uppercase ml-2 mb-2">Active Working Set</div>
              
              <button 
                onClick={() => { setIsDiffMode(false); setSelectedVersion(null); }}
                className={`w-full text-left p-4 bg-[#1c1b1b] border-l-2 transition-all ${!isDiffMode ? 'border-[#e60000]' : 'border-transparent hover:border-[#e60000]/50'}`}
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
                      key={v.id}
                      onClick={() => { setSelectedVersion(v); setIsDiffMode(true); }}
                      className={`w-full text-left p-4 bg-[#1c1b1b] opacity-70 border transition-all ${selectedVersion?.id === v.id ? 'border-[#e60000] opacity-100' : 'border-transparent hover:border-[#353534]'}`}
                    >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                              <History className="w-3.5 h-3.5 text-[#adaaad]" />
                              <span className="text-[10px] text-white font-mono">ID: {v.id.toString().padStart(6, '0')}</span>
                          </div>
                          <span className="text-[9px] text-[#e60000] font-mono">{formatDate(v.created_at)}</span>
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
              <div className="p-6 bg-[#131313] border-t border-[#353534]/20 flex flex-col gap-4 sticky bottom-0">
                <div className="text-[9px] text-[#adaaad] font-mono uppercase text-center mb-2">
                  Warning: Reverting destroys current unsaved changes.
                </div>
                <button 
                  onClick={handleRollback}
                  className="w-full bg-[#353534] hover:bg-[#e60000] text-white py-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase transition-colors"
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
          onClose={() => setShowTemplates(false)}
          onSelect={(content: string) => {
             setSnippet({ ...snippet, content });
             toast.success('Matrix template merged successfully');
          }}
          currentContent={snippet.content || ''}
        />
      )}

      <RollbackConfirmModal
        isOpen={showRollbackModal}
        onConfirm={executeRollback}
        onCancel={() => setShowRollbackModal(false)}
        versionDate={selectedVersion?.created_at ? formatDate(selectedVersion.created_at) : undefined}
        versionId={selectedVersion?.id}
      />
    </div>
  );
};
