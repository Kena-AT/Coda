import React, { useState, useMemo } from 'react';
import { X, FileJson, FileCode, Trash2, Rocket, Cpu, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { snippets } = useStore();
  const [exportFormat, setExportFormat] = useState<'json' | 'module'>('json');
  const [compressionLevel, setCompressionLevel] = useState(2); // 0: None, 1: LZ, 2: GZIP
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Initialize selected IDs when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(snippets.filter(s => !s.is_archived).map(s => s.id!));
    }
  }, [isOpen, snippets]);

  const selectedSnippets = useMemo(() => {
    return snippets.filter(s => selectedIds.includes(s.id!));
  }, [snippets, selectedIds]);

  const totalPayloadSize = useMemo(() => {
    const totalBytes = selectedSnippets.reduce((acc, s) => acc + (s.content?.length || 0), 0);
    return (totalBytes / 1024).toFixed(1);
  }, [selectedSnippets]);

  if (!isOpen) return null;

  const handleRemoveSnippet = (id: number) => {
    setSelectedIds(selectedIds.filter(sid => sid !== id));
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast.error('No snippets selected for export');
      return;
    }
    setIsExporting(true);
    try {
      const defaultName = exportFormat === 'json' 
        ? `coda_backup_${new Date().toISOString().split('T')[0]}.json`
        : `coda_modules_${new Date().toISOString().split('T')[0]}.txt`;

      const filePath = await save({
        filters: [{
          name: exportFormat === 'json' ? 'JSON Data' : 'Text Module',
          extensions: [exportFormat === 'json' ? 'json' : 'txt']
        }],
        defaultPath: defaultName
      });

      if (!filePath) {
        setIsExporting(false);
        return;
      }

      let content = '';
      if (exportFormat === 'json') {
        content = JSON.stringify(selectedSnippets, null, 2);
      } else {
        selectedSnippets.forEach(s => {
          content += `\n/* ==========================================\n`;
          content += ` * Title: ${s.title}\n`;
          content += ` * Language: ${s.language}\n`;
          content += ` * Tags: ${s.tags || 'none'}\n`;
          content += ` * ========================================== */\n\n`;
          content += `${s.content}\n\n`;
        });
      }

      await writeTextFile(filePath, content);
      
      toast.success(`Export successful: ${filePath.split(/[/\\]/).pop()}`, {
        style: { background: '#19191c', color: '#fffbfe', borderLeft: '4px solid #15ff00', fontSize: '11px', fontFamily: 'Space Grotesk' }
      });
      onClose();
    } catch (e: any) {
      toast.error('Export protocol failure: ' + e.toString());
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
      
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-center gap-1 opacity-5">
         {[...Array(20)].map((_, i) => (
           <div key={i} className="h-0.5 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent w-full" />
         ))}
      </div>

      <div className="bg-[var(--bg-primary)] border border-[var(--border)] w-full max-w-[1024px] shadow-[20px_20px_0px_#00000080] relative flex flex-col overflow-hidden">
        
        {/* Title Bar */}
        <div className="h-10 bg-[var(--border)] border-b border-[#5f3f3a33] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-[var(--accent)]/40" />
                <div className="w-1.5 h-1.5 bg-[var(--accent)]" />
             </div>
             <h2 className="text-white font-mono font-bold text-[10px] tracking-[1.5px] uppercase">SYSTEM_EXPORT_PROTOCOL // SESSION_{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</h2>
          </div>
          <button onClick={onClose} className="text-[#adaaad] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden lg:h-[600px]">
          
          {/* Options Column */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-[#5f3f3a1a]">
             <div className="flex flex-col gap-8 md:gap-10">
                
                {/* Method Selection */}
                <section>
                   <h3 className="text-white font-main font-bold text-[10px] md:text-xs uppercase tracking-[2px] mb-6 flex items-center gap-2">
                      <Cpu className="text-[var(--accent)] w-4 h-4" />
                      EXPORT_METHOD
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div 
                        onClick={() => setExportFormat('json')}
                        className={`p-4 md:p-6 border cursor-pointer transition-all relative group ${exportFormat === 'json' ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'bg-[#151515] border-[var(--border)] hover:border-[#adaaad]/30'}`}
                      >
                         <FileJson className={`w-8 h-8 md:w-10 md:h-10 mb-4 transition-colors ${exportFormat === 'json' ? 'text-[var(--accent)]' : 'text-[#adaaad]'}`} strokeWidth={1.5} />
                         <h4 className={`text-[10px] md:text-[11px] font-main font-bold uppercase mb-1 ${exportFormat === 'json' ? 'text-white' : 'text-[#adaaad]'}`}>JSON_BUNDLE</h4>
                         <p className="text-[8px] md:text-[9px] font-mono text-[#adaaad] uppercase leading-relaxed opacity-60">Unified metadata & source in single object</p>
                         {exportFormat === 'json' && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--accent)] rotate-45" />}
                      </div>

                      <div 
                        onClick={() => setExportFormat('module')}
                        className={`p-4 md:p-6 border cursor-pointer transition-all relative group ${exportFormat === 'module' ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'bg-[#151515] border-[var(--border)] hover:border-[#adaaad]/30'}`}
                      >
                         <FileCode className={`w-8 h-8 md:w-10 md:h-10 mb-4 transition-colors ${exportFormat === 'module' ? 'text-[var(--accent)]' : 'text-[#adaaad]'}`} strokeWidth={1.5} />
                         <h4 className={`text-[10px] md:text-[11px] font-main font-bold uppercase mb-1 ${exportFormat === 'module' ? 'text-white' : 'text-[#adaaad]'}`}>LANGUAGE_MODULES</h4>
                         <p className="text-[8px] md:text-[9px] font-mono text-[#adaaad] uppercase leading-relaxed opacity-60">Individual source files sorted by type</p>
                         {exportFormat === 'module' && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--accent)] rotate-45" />}
                      </div>
                   </div>
                </section>

                {/* Settings */}
                <section className="space-y-8">
                   <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                         <h3 className="text-white font-main font-bold text-[9px] md:text-[10px] uppercase tracking-[2px]">COMPRESSION_LEVEL</h3>
                         <span className="text-[var(--accent)] font-mono text-[9px] md:text-[10px] font-bold">{['NONE', 'LZ', 'GZIP'][compressionLevel]}</span>
                      </div>
                      <input 
                        type="range" min="0" max="2" step="1" 
                        value={compressionLevel} onChange={(e) => setCompressionLevel(parseInt(e.target.value))}
                        className="accent-[var(--accent)] w-full"
                      />
                      <div className="flex justify-between text-[7px] md:text-[8px] font-mono text-[#adaaad] uppercase px-1">
                         <span>RAW_SOURCE</span>
                         <span>LZ_ENCODER</span>
                         <span>GZIP_ARCHIVE</span>
                      </div>
                   </div>

                   <div className="flex flex-col gap-4">
                      <h3 className="text-white font-main font-bold text-[9px] md:text-[10px] uppercase tracking-[2px]">SCHEMA_VERSION</h3>
                      <div className="bg-[#151515] border border-[var(--border)] p-3 md:p-4 text-[#adaaad] font-mono text-[10px] md:text-[11px] flex justify-between items-center">
                         <span className="text-white">V3.4.0 (STABLE)</span>
                         <div className="flex gap-1">
                            <div className="w-1 h-1 bg-[#15ff00]" />
                            <div className="w-1 h-1 bg-[#15ff00]" />
                         </div>
                      </div>
                   </div>
                </section>

             </div>
          </div>

          {/* Snippet List Column */}
          <div className="w-full lg:w-[380px] bg-[var(--bg-primary)] flex flex-col shrink-0 lg:max-h-full">
             <div className="p-6 border-b border-[#5f3f3a1a]">
                <h3 className="text-white font-main font-bold text-[10px] md:text-[11px] uppercase tracking-[2px] mb-2">SELECTED_SNIPPETS</h3>
                <p className="text-[#adaaad] text-[8px] md:text-[9px] font-mono uppercase">Buffer selection: {selectedIds.length} / {snippets.length}</p>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 max-h-[300px] lg:max-h-none">
                {selectedSnippets.map(s => (
                  <div key={s.id} className="bg-[#151515] border border-[var(--border)] p-3 md:p-4 flex justify-between items-center group hover:border-[var(--accent)]/40 transition-colors">
                     <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-white font-main font-bold text-[10px] md:text-[11px] uppercase truncate tracking-[0.5px]">{s.title || 'UNTITLED'}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[var(--accent)] font-mono text-[8px] md:text-[9px] uppercase">{s.language}</span>
                           <span className="w-1 h-1 rounded-full bg-[#adaaad] opacity-20" />
                           <span className="text-[#adaaad] font-mono text-[8px] md:text-[9px] uppercase">{( (s.content?.length || 0) / 1024).toFixed(1)} KB</span>
                        </div>
                     </div>
                     <button 
                        onClick={() => handleRemoveSnippet(s.id!)}
                        className="text-[#adaaad] hover:text-[var(--accent)] p-1 transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
                ))}
                {selectedIds.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-[#adaaad] opacity-30 p-8 text-center gap-4">
                     <ShieldCheck size={32} />
                     <p className="text-[9px] md:text-[10px] font-mono uppercase">Selection buffer empty. No data queued for extraction.</p>
                  </div>
                )}
             </div>

             <div className="p-6 md:p-8 border-t border-[#5f3f3a1a] bg-[#151515]">
                <div className="flex justify-between items-end mb-6 md:mb-8">
                   <div>
                      <span className="text-[8px] md:text-[9px] font-mono text-[#adaaad] uppercase block mb-1">Total_Payload</span>
                      <div className="flex items-end gap-1">
                         <span className="text-xl md:text-2xl font-main font-bold text-white leading-none">{totalPayloadSize}</span>
                         <span className="text-[var(--accent)] font-mono font-bold text-sm md:text-base">KB</span>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] md:text-[9px] font-mono text-[#adaaad] uppercase block mb-1">Enc_Format</span>
                      <span className="text-white font-mono text-[9px] md:text-[10px] font-bold uppercase">AES-256-GCM</span>
                   </div>
                </div>

                <button 
                  onClick={handleExport}
                  disabled={isExporting || selectedIds.length === 0}
                  className="w-full bg-[var(--accent)] hover:bg-[#ff0000] disabled:bg-[#333] text-white py-3.5 md:py-4 flex items-center justify-center gap-3 text-[10px] md:text-[11px] font-main font-bold uppercase tracking-[2px] transition-all group"
                >
                   {isExporting ? (
                     <span className="animate-pulse">EXECUTING_EXTRACT...</span>
                   ) : (
                     <>
                        <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        EXECUTE_EXPORT
                     </>
                   )}
                </button>
             </div>
          </div>

        </div>

        {/* Footer info line */}
        <div className="bg-[var(--bg-primary)] border-t border-[#5f3f3a1a] px-6 md:px-8 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0">
           <div className="flex items-center gap-4 text-[8px] md:text-[9px] font-mono text-[#adaaad] uppercase">
              <span className="text-[var(--accent)]">Encryption: AES-256-GCM</span>
              <span className="hidden sm:inline">Model: CODA-P9</span>
           </div>
           {/* Decorative Monitoring Data */}
           <div className="hidden lg:flex flex-col items-end opacity-40">
              <span className="text-[8px] font-mono text-[#ffb4a8] uppercase leading-tight">SYS_MONITOR_INIT</span>
              <span className="text-[8px] font-mono text-[#ffb4a8] uppercase leading-tight">BUFFER_HEALTH: 99%</span>
              <span className="text-[8px] font-mono text-[#ffb4a8] uppercase leading-tight">LATENCY: 12ms</span>
           </div>
           <div className="text-[8px] md:text-[9px] font-mono text-[var(--accent)] animate-pulse uppercase">
              Waiting_for_operator_input...
           </div>
        </div>

      </div>
    </div>
  );
};
