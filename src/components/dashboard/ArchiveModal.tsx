import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../../store/useStore';
import { 
  ShieldAlert, 
  Archive, 
  Clock, 
  X, 
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface ArchiveCandidate {
  snippet_id: number;
  title: string;
  project_name: string | null;
  days_unused: number;
  copy_count: number;
  archive_score: number;
  reason: string;
}

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const { user } = useStore();
  const [candidates, setCandidates] = useState<ArchiveCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchCandidates();
    }
  }, [isOpen, user]);

  const fetchCandidates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await invoke<ArchiveCandidate[]>('get_archive_candidates', { user_id: user.id });
      setCandidates(data);
      setSelectedIds(new Set(data.map(c => c.snippet_id))); // Select all by default
    } catch (error) {
      console.error('Failed to fetch archive candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleArchive = async () => {
    if (!user || selectedIds.size === 0) return;
    setLoading(true);
    try {
      await invoke('archive_snippets', { 
        snippet_ids: Array.from(selectedIds), 
        user_id: user.id 
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Failed to archive snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async () => {
    if (!user || selectedIds.size === 0) return;
    setLoading(true);
    try {
      await invoke('snooze_archive', { 
        snippet_ids: Array.from(selectedIds), 
        user_id: user.id,
        days: 7
      });
      fetchCandidates();
    } catch (error) {
      console.error('Failed to snooze archive:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-red-500/30 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
        {/* Header (CYBERPUNK STYLE) */}
        <div className="bg-red-500/10 border-b border-red-500/20 p-6 flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-lg animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-red-500 tracking-[0.2em] uppercase">
              SYSTEM_MAINTENANCE // STATUS: CRITICAL
            </h2>
            <p className="text-xs font-mono text-red-400/60 mt-1 uppercase tracking-tighter">
              HEURISTIC DETECTED: {candidates.length} SNIPPETS INACTIVE FOR 720H+
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-500/10 rounded-full transition-colors text-red-500/40 hover:text-red-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-gradient-to-b from-slate-900/50 to-slate-950/50">
          <div className="mb-6 flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-400" />
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">
              TRANSFORMING UNUSED DATA NODES TO ARCHIVAL STATE
            </p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <Zap className="w-8 h-8 text-slate-800 animate-spin" />
                <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Scanning Repository Health...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4 border border-dashed border-slate-800 rounded-xl">
                <ShieldCheck className="w-12 h-12 text-slate-800" />
                <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">VAULT CORE OPTIMIZED // NO STALE NODES</p>
              </div>
            ) : (
              candidates.map((candidate) => (
                <div 
                  key={candidate.snippet_id}
                  onClick={() => handleToggle(candidate.snippet_id)}
                  className={`group relative flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 cursor-pointer ${
                    selectedIds.has(candidate.snippet_id)
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded border transition-colors ${
                    selectedIds.has(candidate.snippet_id)
                      ? 'bg-red-500 text-white border-red-400'
                      : 'bg-slate-800 text-slate-600 border-slate-700'
                  }`}>
                    {selectedIds.has(candidate.snippet_id) ? <Archive className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-200 truncate">{candidate.title}</h3>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded">
                        {candidate.project_name || 'ROOT'}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-red-500/50" />
                      {candidate.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 px-3 border-l border-slate-800/50">
                    <span className="text-[9px] font-black text-red-500 tracking-widest uppercase">Score</span>
                    <span className="text-lg font-black text-red-500/80 leading-none">{candidate.archive_score}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-900/50 border-t border-slate-800/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-slate-200 uppercase tracking-widest transition-colors"
            >
              CANCEL_OPERATION
            </button>
            <button 
              onClick={handleSnooze}
              disabled={selectedIds.size === 0 || loading}
              className="px-4 py-2 border border-blue-500/30 bg-blue-500/5 rounded text-[10px] font-black text-blue-400 hover:bg-blue-500/10 uppercase tracking-widest transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <Clock className="w-3.5 h-3.5" />
              QUARANTINE_SNOOZE
            </button>
          </div>
          
          <button 
            onClick={handleArchive}
            disabled={selectedIds.size === 0 || loading}
            className="flex-1 md:flex-none px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-3"
          >
            <Archive className="w-4 h-4" />
            EXECUTE_PURGE_ARCHIVE ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
};
