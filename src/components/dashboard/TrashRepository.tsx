import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Trash2, RotateCcw, Search, Trash, AlertTriangle } from 'lucide-react';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const TrashRepository: React.FC = () => {
  const { user, snippets, setSnippets } = useStore();
  const playSound = useSoundEffect();
  const [localSearch, setLocalSearch] = useState('');
  const [snippetToRestore, setSnippetToRestore] = useState<number | null>(null);
  const [snippetToPurge, setSnippetToPurge] = useState<number | null>(null);

  const trashedSnippets = useMemo(() => {
    return snippets.filter(s => s && s.deleted_at && 
      (s.title.toLowerCase().includes(localSearch.toLowerCase()) || 
       s.language.toLowerCase().includes(localSearch.toLowerCase()))
    );
  }, [snippets, localSearch]);

  const handleRestore = async (id: number) => {
    try {
      const resp: any = await invoke('restore_snippet', { id, userId: user?.id });
      if (resp.success) {
        setSnippets(snippets.map(s => s.id === id ? { ...s, deleted_at: null } : s));
        toast.success('DATA_RESTORED: Snippet returned to active memory');
        playSound('success');
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setSnippetToRestore(null);
    }
  };

  const handlePurge = async (id: number) => {
    try {
      const resp: any = await invoke('permanently_delete_snippet', { id, userId: user?.id });
      if (resp.success) {
        setSnippets(snippets.filter(s => s.id !== id));
        toast.success('DATA_PURGED: Snippet erased permanently');
        playSound('error');
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setSnippetToPurge(null);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#131313] flex flex-col overflow-hidden font-main relative">
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#e60000 1px, transparent 1px), linear-gradient(90deg, #e60000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12 border-b border-[#5f3f3a] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#e60000]" />
              <span className="text-[10px] font-mono text-[#adaaad] tracking-[2px] uppercase">Node_ID: 0x8842_RED_TRASH</span>
            </div>
            <h1 className="text-4xl md:text-[56px] font-bold text-white tracking-[-2px] uppercase leading-tight">Trash Repository</h1>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaad] group-focus-within:text-[#e60000] transition-colors" />
            <input 
              type="text" 
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="FILTER_TRASH_NODES..."
              className="w-full bg-[#0e0e0e] border border-[#353534] pl-10 pr-4 py-3 text-white text-[11px] uppercase font-mono outline-none focus:border-[#e60000] transition-all"
            />
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#93000a] border-l-8 border-[#e60000] p-6 mb-8 flex items-center gap-4">
          <AlertTriangle className="text-white shrink-0" size={32} />
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Critical Warning: Volatile Storage</h3>
            <p className="text-[#ff9999] font-mono text-[10px] uppercase">Nodes in this repository are queued for total deletion. Memory recovery is only possible before terminal purge.</p>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-[#0e0e0e] border border-[#353534] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#353534] bg-[#1a1a1a]">
                <th className="px-6 py-4 text-[10px] font-mono text-[#adaaad] uppercase tracking-wider">Node_ID</th>
                <th className="px-6 py-4 text-[10px] font-mono text-[#adaaad] uppercase tracking-wider">Title / Language</th>
                <th className="px-6 py-4 text-[10px] font-mono text-[#adaaad] uppercase tracking-wider">Deleted_At</th>
                <th className="px-6 py-4 text-[10px] font-mono text-[#adaaad] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashedSnippets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Trash2 size={48} className="text-[#adaaad]" />
                      <span className="text-[11px] font-mono text-[#adaaad] uppercase tracking-widest">Repository_Clean: No_Deleted_Nodes_Found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                trashedSnippets.map((snippet) => (
                  <tr key={snippet.id} className="border-b border-[#353534]/50 hover:bg-[#e60000]/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-[10px] text-[#5f3f3a]">
                      0x{snippet.id?.toString(16).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-bold text-xs uppercase">{snippet.title}</span>
                        <span className="text-[#adaaad] font-mono text-[9px] uppercase">{snippet.language}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-[#adaaad]">
                      {snippet.deleted_at ? new Date(snippet.deleted_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => setSnippetToRestore(snippet.id!)}
                          className="flex items-center gap-2 px-3 py-1.5 border border-[#353534] hover:border-[#15ff00] hover:text-[#15ff00] transition-all text-[#adaaad] font-mono text-[9px] uppercase"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        <button 
                          onClick={() => setSnippetToPurge(snippet.id!)}
                          className="flex items-center gap-2 px-3 py-1.5 border border-[#353534] hover:border-[#e60000] hover:text-[#e60000] transition-all text-[#adaaad] font-mono text-[9px] uppercase"
                        >
                          <Trash size={12} />
                          <span>Purge</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bento Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mt-12 border border-[#353534] bg-[#353534]">
          <div className="bg-[#201f1f] p-6 border-l-2 border-[#e60000]">
            <h4 className="text-[#e60000] font-bold text-[10px] uppercase mb-2">Trash_Statistics</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-white font-bold">{trashedSnippets.length}</span>
              <span className="text-[9px] text-[#adaaad] uppercase font-mono">Nodes_Queued</span>
            </div>
          </div>
          <div className="bg-[#201f1f] p-6">
            <h4 className="text-[#adaaad] font-bold text-[10px] uppercase mb-2">Memory_Leakage</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-white font-bold">0.00%</span>
              <span className="text-[9px] text-[#adaaad] uppercase font-mono">No_Data_Loss</span>
            </div>
          </div>
          <div className="bg-[#201f1f] p-6">
            <h4 className="text-[#adaaad] font-bold text-[10px] uppercase mb-2">Buffer_Status</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-white font-bold">STABLE</span>
              <span className="text-[9px] text-[#adaaad] uppercase font-mono">98%_Efficiency</span>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Coordinates */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1 opacity-40 font-mono text-[8px] text-[#353534]">
        <span>LOC: 37.7749° N, 122.4194° W</span>
        <span>BUFFER_STATUS: STABLE_98%</span>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {snippetToRestore !== null && (
          <RestoreModal 
            id={snippetToRestore} 
            onConfirm={() => handleRestore(snippetToRestore)} 
            onCancel={() => setSnippetToRestore(null)} 
          />
        )}
        {snippetToPurge !== null && (
          <PurgeModal 
            id={snippetToPurge} 
            onConfirm={() => handlePurge(snippetToPurge)} 
            onCancel={() => setSnippetToPurge(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const RestoreModal: React.FC<{ id: number; onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#131313cc] backdrop-blur-sm p-4"
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#0e0e0e] border-l-4 border-[#e60000] shadow-[0_0_43px_#e6000033] w-full max-w-lg overflow-hidden"
    >
      <div className="bg-[#353534] px-4 py-2 flex justify-between items-center">
        <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">PROTOCOL: RESTORE_CONFIRMATION</span>
        <div className="w-2 h-2 bg-[#e60000] animate-pulse" />
      </div>
      <div className="p-10 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#e60000]/10 text-[#e60000]">
            <RotateCcw size={24} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-xl uppercase tracking-tighter">Initiate Recovery?</h2>
            <p className="text-[#adaaad] font-mono text-[11px] uppercase leading-relaxed">
              System will attempt to reintegrate the selected node into the active library. 
              All associated metadata and version history will be restored to the primary vault.
            </p>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#5f3f3a33] p-4 font-mono text-[9px] text-[#5f3f3a]">
          <div className="flex gap-2 mb-1">
            <span className="text-[#e60000] font-bold">{">"}</span>
            <span>RESTORE --NODE_ID 0x4821</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#e60000] font-bold">{">"}</span>
            <span>VERIFYING_INTEGRITY... OK</span>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button 
            onClick={onCancel}
            className="px-6 py-2 border border-[#353534] text-[#adaaad] font-mono text-[10px] uppercase hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-8 py-2 bg-[#e60000] text-white font-bold font-main text-[10px] uppercase hover:bg-[#ff0000] transition-all shadow-[0_0_20px_#e6000066]"
          >
            Confirm Restore
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

const PurgeModal: React.FC<{ id: number; onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#131313cc] backdrop-blur-sm p-4"
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#0e0e0e] border-l-4 border-[#e60000] shadow-[0_0_43px_#e6000033] w-full max-w-lg overflow-hidden"
    >
      <div className="bg-[#353534] px-4 py-2 flex justify-between items-center">
        <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">PROTOCOL: TERMINAL_PURGE</span>
        <div className="w-2 h-2 bg-[#e60000] animate-pulse" />
      </div>
      <div className="p-10 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#e60000]/10 text-[#e60000]">
            <Trash2 size={24} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-xl uppercase tracking-tighter">Terminal Deletion?</h2>
            <p className="text-[#adaaad] font-mono text-[11px] uppercase leading-relaxed">
              Warning: This action is irreversible. The data node and all related telemetry will be erased from the physical storage layer.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button 
            onClick={onCancel}
            className="px-6 py-2 border border-[#353534] text-[#adaaad] font-mono text-[10px] uppercase hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-8 py-2 bg-[#e60000] text-white font-bold font-main text-[10px] uppercase hover:bg-[#ff0000] transition-all shadow-[0_0_20px_#e6000066]"
          >
            Purge Permanently
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);
