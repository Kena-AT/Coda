import React, { useState, useEffect } from 'react';
import { X, UploadCloud, CheckCircle2, Code2, Cpu } from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { useStore } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import toast from 'react-hot-toast';
import { metadataEngine } from '../../utils/metadataEngine';
import { updateTaskState } from '../../hooks/useTelemetry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'PASTE_CODE' | 'UPLOAD_FILES';

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user, projects } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('PASTE_CODE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [predictedLang, setPredictedLang] = useState('javascript');
  const [predictedTags, setPredictedTags] = useState<string[]>([]);
  const [predictedTitle, setPredictedTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      setActiveTab('PASTE_CODE');
      setPastedCode('');
      setPredictedLang('javascript');
      setPredictedTags([]);
      setPredictedTitle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateMetadata = () => {
    if (!pastedCode.trim()) {
      toast.error('Source buffer is empty');
      return;
    }
    const lang = metadataEngine.guessLanguage(pastedCode);
    const tags = metadataEngine.predictTags(pastedCode);
    const title = metadataEngine.extractTitle(pastedCode);
    
    setPredictedLang(lang);
    setPredictedTags(tags);
    setPredictedTitle(title);
    
    toast.success('Metadata generated from source');
  };

  const handleImport = async () => {
    if (!pastedCode.trim()) {
      toast.error('Nothing to import');
      return;
    }
    setIsProcessing(true);
    updateTaskState('import_processing', 'running');
    try {
      await invoke('create_snippet', {
        userId: user?.id,
        title: predictedTitle || 'Imported_Sequence',
        content: pastedCode,
        language: predictedLang,
        tags: predictedTags.join(','),
        projectId: selectedProjectId
      });

      toast.success('Sequence injected into matrix', {
        style: { background: '#19191c', color: '#fffbfe', borderLeft: '4px solid #15ff00', fontSize: '12px', fontFamily: 'Space Grotesk' }
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error('Uplink error: ' + e.toString());
    } finally {
      setIsProcessing(false);
      updateTaskState('import_processing', 'completed');
    }
  };

  const handleNativeOpen = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Source Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'rs', 'py', 'go', 'java', 'json', 'md', 'txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!selected) return;

      const filePaths = Array.isArray(selected) ? selected : [selected];
      
      // If single file, load it for review
      if (filePaths.length === 1) {
        setIsProcessing(true);
        updateTaskState('import_processing', 'running');
        try {
          const path = filePaths[0];
          const content = await readTextFile(path);
          const fileName = path.split(/[/\\]/).pop() || 'Untitled';

          // Optimization: If it's a JSON array, just bulk import it immediately
          if (fileName.endsWith('.json')) {
            try {
              const data = JSON.parse(content);
              if (Array.isArray(data)) {
                 await processBulkArray(data);
                 return;
              }
            } catch(e) {}
          }

          const lang = metadataEngine.guessLanguage(content, fileName);
          const tags = metadataEngine.predictTags(content);
          const title = metadataEngine.extractTitle(content) || fileName.split('.')[0];

          setPastedCode(content);
          setPredictedLang(lang);
          setPredictedTags(tags);
          setPredictedTitle(title);
          setActiveTab('PASTE_CODE');
          toast.success(`Module ${fileName} loaded for review`);
        } catch(err: any) {
          toast.error('Load failed: ' + err.toString());
        } finally {
          setIsProcessing(false);
          updateTaskState('import_processing', 'completed');
        }
        return;
      }

      // Multi-file bulk import
      setIsProcessing(true);
      updateTaskState('import_processing', 'running');
      let successCount = 0;
      for (const path of filePaths) {
        try {
          const content = await readTextFile(path);
          const fileName = path.split(/[/\\]/).pop() || 'Untitled';
          
          if (fileName.endsWith('.json')) {
            try {
              const data = JSON.parse(content);
              if (Array.isArray(data)) {
                for (const snip of data) {
                  await invoke('create_snippet', {
                    userId: user?.id,
                    title: snip.title || 'Imported_Snippet',
                    content: snip.content || '',
                    language: snip.language || 'plaintext',
                    tags: snip.tags || null,
                    projectId: selectedProjectId || snip.project_id || null
                  });
                  successCount++;
                }
                continue;
              }
            } catch(e) {}
          }

          const lang = metadataEngine.guessLanguage(content, fileName);
          const tags = metadataEngine.predictTags(content);
          const title = metadataEngine.extractTitle(content) || fileName.split('.')[0];

          await invoke('create_snippet', {
            userId: user?.id,
            title,
            content,
            language: lang,
            tags: tags.join(','),
            projectId: selectedProjectId
          });
          successCount++;
        } catch(e) {}
      }
      
      toast.success(`Injected ${successCount} assets into repository`);
      onSuccess();
      onClose();

    } catch (e: any) {
      toast.error('Native uplink failure: ' + e.toString());
    } finally {
      setIsProcessing(false);
      updateTaskState('import_processing', 'completed');
    }
  };

  const processBulkArray = async (data: any[]) => {
    let count = 0;
    for (const snip of data) {
      await invoke('create_snippet', {
        userId: user?.id,
        title: snip.title || 'Imported_Snippet',
        content: snip.content || '',
        language: snip.language || 'plaintext',
        tags: snip.tags || null,
        projectId: selectedProjectId || snip.project_id || null
      });
      count++;
    }
    toast.success(`Bulk ingestion of ${count} snippets complete`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
      
      {/* Background Decorative Grids */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="w-full h-full flex flex-wrap">
          {[...Array(64)].map((_, i) => (
            <div key={i} className="w-1/8 h-1/8 border border-[var(--accent)]/20" />
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-primary)] border border-[var(--border)] w-full max-w-[1024px] h-[720px] shadow-[20px_20px_0px_#00000080] relative flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="h-14 bg-[#1a1a1a] border-b border-[var(--border)]/50 flex items-center justify-between px-6 shrink-0 mr-1 mt-1">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[var(--accent)]" />
            <h2 className="text-white font-main font-bold text-[12px] tracking-[2px] uppercase">IMPORT_PROTOCOL_v2.0</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[#adaaad] hover:text-[var(--accent)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Sidebar Nav */}
          <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[var(--border)]/30 bg-[var(--bg-primary)] flex flex-row lg:flex-col justify-between shrink-0">
            <div className="flex lg:flex-col p-2 md:p-4 gap-1 flex-1">
              <div className="hidden lg:block px-2 mb-6">
                 <p className="text-[#adaaad] text-[9px] font-mono tracking-widest uppercase opacity-40">System_Access</p>
                 <h3 className="text-white text-[11px] font-main font-bold tracking-[1px] uppercase">OPERATOR_01</h3>
              </div>

              <button 
                onClick={() => setActiveTab('PASTE_CODE')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 text-[10px] font-main font-bold uppercase tracking-[1px] transition-all border-b-2 lg:border-b-0 lg:border-l-2 ${activeTab === 'PASTE_CODE' ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-white' : 'border-transparent text-[#adaaad] hover:text-white hover:bg-white/5'}`}
              >
                <Code2 size={14} className="shrink-0" />
                <span className="hidden sm:inline">PASTE_CODE</span>
                <span className="sm:hidden">PASTE</span>
              </button>
              <button 
                onClick={() => setActiveTab('UPLOAD_FILES')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 text-[10px] font-main font-bold uppercase tracking-[1px] transition-all border-b-2 lg:border-b-0 lg:border-l-2 ${activeTab === 'UPLOAD_FILES' ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-white' : 'border-transparent text-[#adaaad] hover:text-white hover:bg-white/5'}`}
              >
                <UploadCloud size={14} className="shrink-0" />
                <span className="hidden sm:inline">UPLOAD_FILES</span>
                <span className="sm:hidden">UPLOAD</span>
              </button>
            </div>

            <div className="hidden lg:block p-6 border-t border-[var(--border)]/20">
               <div className="flex items-center gap-2 text-[#15ff00] animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#15ff00]" />
                  <span className="text-[9px] font-mono uppercase tracking-[1px]">Uplink_Stable</span>
               </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
            {activeTab === 'PASTE_CODE' ? (
              <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-end mb-6">
                   <div>
                      <h3 className="text-white font-main font-bold text-base md:text-lg uppercase tracking-[-0.5px]">Source Input</h3>
                      <p className="text-[#adaaad] text-[9px] md:text-[10px] font-mono uppercase">Enter raw logic for indexing</p>
                   </div>
                   <div className="bg-[#1a1a1a] border border-[var(--border)] px-3 py-1 flex items-center gap-2">
                       <span className="text-[8px] md:text-[9px] font-mono text-[#adaaad] uppercase">LANG:</span>
                       <span className="text-[9px] md:text-[10px] font-mono text-[var(--accent)] font-bold uppercase">{predictedLang}</span>
                   </div>
                </div>

                <div className="h-[200px] md:h-[280px] border border-[var(--border)] relative bg-[#0a0a0a] shrink-0">
                   <Editor 
                     height="100%"
                     theme="vs-dark"
                     language={predictedLang}
                     value={pastedCode}
                     onChange={(val) => setPastedCode(val || '')}
                     options={{
                       minimap: { enabled: false },
                       fontFamily: "'JetBrains Mono', monospace",
                       fontSize: 12,
                       lineNumbers: "on",
                       scrollBeyondLastLine: false,
                       padding: { top: 16, bottom: 16 }
                     }}
                   />
                </div>

                <div className="mt-6 flex flex-col md:flex-row gap-6">
                   <div className="flex-1 flex flex-col gap-4">
                      <button 
                        onClick={handleGenerateMetadata}
                        className="w-full py-3.5 border border-[var(--border)] bg-[#1a1a1a] text-white text-[10px] font-main font-bold uppercase tracking-[1.5px] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center justify-center gap-2"
                      >
                        <Cpu size={14} />
                        GENERATE_METADATA
                      </button>

                      <div className="bg-[#151515] border border-[var(--border)] p-4 min-h-[100px]">
                         <span className="text-[9px] font-mono text-[#adaaad] uppercase block mb-3">Predicted_Context</span>
                         <div className="flex flex-wrap gap-2">
                            {predictedTags.length > 0 ? predictedTags.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-mono uppercase">#{tag}</span>
                            )) : (
                              <span className="text-[#adaaad]/30 text-[9px] font-mono italic">Awaiting source analysis...</span>
                            )}
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 bg-[#151515] border border-[var(--border)] p-4 flex flex-col relative overflow-hidden">
                      {/* Decorative Element */}
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 border border-[var(--accent)]/10 rounded-full" />
                      
                      <span className="text-[9px] font-mono text-[#adaaad] uppercase block mb-3">Project_Association</span>
                      <div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-[160px] custom-scrollbar relative z-10">
                         <button 
                           onClick={() => setSelectedProjectId(null)}
                           className={`w-full text-left p-2.5 text-[10px] font-mono uppercase tracking-[0.5px] transition-colors flex items-center justify-between ${selectedProjectId === null ? 'bg-[var(--accent)] text-white' : 'text-[#adaaad] hover:bg-white/5'}`}
                         >
                           <span>INBOX_UNSORTED</span>
                           {selectedProjectId === null && <CheckCircle2 size={12} />}
                         </button>
                         {projects.map(p => (
                           <button 
                             key={p.id}
                             onClick={() => setSelectedProjectId(p.id)}
                             className={`w-full text-left p-2.5 text-[10px] font-mono uppercase tracking-[0.5px] transition-colors flex items-center justify-between ${selectedProjectId === p.id ? 'bg-[var(--accent)] text-white' : 'text-[#adaaad] hover:bg-white/5'}`}
                           >
                             <span className="truncate">{p.name || 'UNKNOWN'}</span>
                             {selectedProjectId === p.id && <CheckCircle2 size={12} />}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 bg-[#0a0a0a]">
                 <div 
                   onClick={handleNativeOpen}
                   className="w-full max-w-lg aspect-square border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg-primary)]/50 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all group"
                 >
                    <UploadCloud size={48} className="text-[#adaaad] group-hover:text-[var(--accent)] transition-colors" />
                    <div className="text-center px-4">
                       <p className="text-white font-main font-bold text-base md:text-lg uppercase tracking-[1px] mb-2">Uplink System Module</p>
                       <p className="text-[#adaaad] text-[10px] md:text-[11px] font-mono uppercase">Click to browse native filesystem</p>
                       <p className="text-[var(--accent)] text-[8px] md:text-[9px] font-mono uppercase mt-2 opacity-50">Supports multi-file selection &amp; batch ingestion</p>
                    </div>
                 </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="h-24 md:h-20 border-t border-[var(--border)]/30 bg-[#161616] flex flex-col md:flex-row items-center justify-center md:justify-between px-6 md:px-8 gap-4 py-4 md:py-0 shrink-0">
               <div className="hidden sm:flex flex-col">
                  <p className="text-[#adaaad] text-[9px] font-mono uppercase tracking-[1px]">Coda Platforms // Copyright 2026</p>
                  <p className="text-[var(--accent)] text-[8px] font-mono uppercase opacity-60 mt-1">Authorized personnel only</p>
               </div>
               <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                 <button onClick={onClose} className="flex-1 md:flex-none text-[11px] font-main font-bold text-[#adaaad] hover:text-white uppercase tracking-[1.5px] transition-colors">
                   Cancel
                 </button>
                 <button 
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex-1 md:flex-none bg-[var(--accent)] text-white text-[11px] font-main font-bold uppercase tracking-[2px] px-6 md:px-10 py-3.5 hover:bg-[#ff0000] transition-all"
                 >
                   {isProcessing ? 'INIT...' : 'IMPORT_SNIPPET'}
                 </button>
               </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
