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
  Zap
} from 'lucide-react';
import { RollbackConfirmModal } from './RollbackConfirmModal';

interface Version {
  id: number;
  snippet_id: number;
  content: string;
  created_at: string;
}

export const SnippetEditor: React.FC = () => {
  const { user, snippets, selectedSnippetId, setSelectedSnippetId, updateSnippetInStore } = useStore();
  const [snippet, setSnippet] = useState<Partial<Snippet>>({ title: '', content: '', language: 'javascript' });
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'history' | 'recs'>('recs'); // Default to recs for new sprint
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  // Load existing snippet
  useEffect(() => {
    if (selectedSnippetId !== -1 && selectedSnippetId !== null) {
      const existing = snippets.find(s => s.id === selectedSnippetId);
      if (existing) {
        setSnippet(existing);
        loadVersions(existing.id!);
      }
    } else {
      setSnippet({ title: '', content: '', language: 'javascript' });
      setVersions([]);
    }
  }, [selectedSnippetId, snippets]);

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
    setSaving(true);
    try {
      if (selectedSnippetId === -1) {
        // Create new
        const response: any = await invoke('create_snippet', {
          userId: user?.id,
          title: snippet.title,
          content: snippet.content,
          language: snippet.language,
          tags: snippet.tags || ''
        });
        if (response.success) {
          toast.success('System buffer recorded');
          // For a real app we'd fetch the created snippet string, but we'll just go back to library
          setSelectedSnippetId(null);
        } else {
          toast.error(response.message);
        }
      } else {
        // Update
        const response: any = await invoke('update_snippet', {
          userId: user?.id,
          id: selectedSnippetId,
          title: snippet.title,
          content: snippet.content,
          language: snippet.language,
          tags: snippet.tags || ''
        });
        if (response.success) {
          toast.success('Matrix updated and versioned');
          updateSnippetInStore(selectedSnippetId!, snippet as Snippet);
          loadVersions(selectedSnippetId!); // refresh versions
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
            <h2 className="text-[14px] font-main font-bold text-white tracking-[2px] uppercase flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#e60000]" />
              {selectedSnippetId === -1 ? 'NEW_SEQUENCE' : 'EDIT_MATRIX'}
            </h2>
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
                className="px-6 py-2 bg-[#e60000] text-white flex items-center gap-2 text-[10px] font-main font-bold tracking-[1.5px] uppercase hover:bg-[#ff0000] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'COMMITTING...' : 'SAVE REVISION'}
              </button>
              <button 
                onClick={() => setSelectedSnippetId(null)}
                className="p-2 border border-[#353534]/50 text-[#adaaad] hover:text-white hover:border-[#e60000] transition-colors"
                title="Close Editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <input 
               type="text" 
               value={snippet.title}
               onChange={e => setSnippet({...snippet, title: e.target.value})}
               className="flex-1 bg-transparent border-b border-[#353534]/50 text-2xl font-main font-bold text-white px-0 py-2 outline-none focus:border-[#e60000] transition-colors"
               placeholder="SYS_ENTRY_TITLE..."
             />
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

        {/* The Monaco Editor */}
        <div className="flex-1 relative">
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
               onChange={val => setSnippet({...snippet, content: val || ''})}
               options={{
                 minimap: { enabled: false },
                 fontFamily: "'Space Grotesk', monospace",
                 fontSize: 13,
                 wordWrap: "on",
                 formatOnPaste: true,
               }}
             />
           )}
        </div>

      </div>

      {/* Right Sidebar */}
      <aside className="w-[320px] bg-[#0e0e0e] border-l border-[#353534]/20 flex flex-col pt-14">
        
        {/* Tab Switcher */}
        <div className="flex border-b border-[#353534]/20">
          <button 
            onClick={() => setRightSidebarTab('recs')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'recs' ? 'text-[#e60000] border-b-2 border-[#e60000] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <Zap size={14} />
            SMART_RECS
          </button>
          <button 
            onClick={() => setRightSidebarTab('history')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[1px] uppercase transition-all ${rightSidebarTab === 'history' ? 'text-[#e60000] border-b-2 border-[#e60000] bg-[#131313]' : 'text-[#adaaad] hover:text-white'}`}
          >
            <History size={14} />
            HISTORY
          </button>
        </div>

        {rightSidebarTab === 'recs' ? (
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
