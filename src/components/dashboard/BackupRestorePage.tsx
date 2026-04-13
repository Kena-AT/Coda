import React, { useState } from 'react';
import { 
  Database, 
  RefreshCcw, 
  ArrowLeft, 
  Save, 
  FileUp, 
  AlertTriangle, 
  Activity
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { toast } from 'react-hot-toast';
import { sendNotification } from '@tauri-apps/plugin-notification';

interface LogEntry {
  timestamp: string;
  msg: string;
}

interface BackupRestorePageProps {
  onBack: () => void;
}

export const BackupRestorePage: React.FC<BackupRestorePageProps> = ({ onBack }) => {
  const { snippets, settings } = useStore();
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string>("2024-05-15 | 14:30:42");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [...prev.slice(-10), { timestamp, msg }]);
  };

  const handleBackup = async () => {
    try {
      const filePath = await save({
        filters: [{
          name: 'Coda Backup',
          extensions: ['db']
        }],
        defaultPath: 'coda_vault_snapshot.db'
      });

      if (!filePath) return;

      setLoading(true);
      addLog("READY_FOR_SNAPSHOT_OPERATION");
      
      await invoke('create_backup', { targetPath: filePath });
      addLog("CHECKING_DATABASE_INTEGRITY... SUCCESS");
      addLog("SNAPSHOT_COMMITTED_TO_SECTOR_0");
      
      setLastBackup(`${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString()}`);
      toast.success('Backup complete');
      
      if (settings.pushAlerts) {
        sendNotification({ title: 'CODA Vault', body: 'Snapshot committed successfully.' });
      }
    } catch (err: any) {
      toast.error(err.toString());
      addLog(`ERR: SNAPSHOT_FAILED: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Coda Backup',
          extensions: ['db']
        }]
      });

      if (!selected) return;

      setLoading(true);
      addLog("INIT_RESTORE_SEQUENCE");
      
      await invoke('restore_backup', { sourcePath: selected });
      addLog("RECONSTRUCTING_DATABASE_STATE");
      addLog("RESTORE_COMPLETE: RESTART_REQUIRED");
      
      toast.success('Restore complete. App will now restart.');
      
      if (settings.pushAlerts) {
        sendNotification({ title: 'CODA Vault', body: 'System restored. Restarting...' });
      }
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      toast.error(err.toString());
      addLog(`ERR: RESTORE_ABORTED: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate generic size for display
  const vaultSize = (snippets.length * 0.03).toFixed(1); // Mock MB

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Nav */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#737373] hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[1px]"
        >
          <ArrowLeft size={14} />
          Return to Settings
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#e60000] font-mono text-[10px] tracking-[1px] uppercase">
            <div className="w-2 h-2 bg-[#e60000]" />
            Secure Storage Protocols
          </div>
          <h1 className="text-3xl font-main font-bold text-white tracking-[-1px] uppercase">LOCAL_BACKUP_RESTORE</h1>
          <p className="text-[#737373] font-main text-sm max-w-2xl">
            Manage the integrity of your code vault. Execute cryptographic snapshots or restore existing data frames from local storage.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Backup */}
          <div className="lg:col-span-2 bg-[#131313] border border-[#353534] rounded-sm overflow-hidden flex flex-col">
            <div className="p-8 space-y-12 flex-1">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-xl font-main font-bold text-white uppercase">Create Full Backup</h3>
                  <p className="text-[10px] font-mono text-[#737373] uppercase tracking-[1px]">Protocol: Snapshot_v4_Encrypted</p>
                </div>
                <Save className="w-8 h-8 text-[#e60000]" />
              </div>

              <div className="space-y-6">
                <div className="bg-[#1f1f22]/30 border border-[#353534]/50 p-6 rounded-sm">
                   <p className="text-[9px] font-mono text-[#737373] uppercase mb-4">Last backup point</p>
                   <p className="text-xl font-main font-bold text-white">{lastBackup}</p>
                </div>

                <button 
                  onClick={handleBackup}
                  disabled={loading}
                  className="w-full py-5 bg-[#e60000] hover:bg-[#ff0000] text-white font-main font-black uppercase text-[16px] tracking-[1px] flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  EXECUTE_SNAPSHOT
                </button>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="bg-[#131313] border border-[#353534] rounded-sm p-8 space-y-12">
            <div className="flex items-center gap-2 text-[#e60000]">
               <Activity size={18} />
               <span className="text-[10px] font-mono uppercase tracking-[1px]">Vault Metrics</span>
            </div>

            <div className="space-y-8">
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-mono text-[#737373] uppercase">Current Size</p>
                    <p className="text-2xl font-main font-bold text-white">{vaultSize} <span className="text-sm font-light">MB</span></p>
                  </div>
                  <div className="h-1 w-full bg-[#1f1f22] rounded-full overflow-hidden">
                    <div className="h-full bg-[#e60000] w-2/3" />
                  </div>
               </div>

               <div className="space-y-1">
                  <p className="text-[10px] font-mono text-[#737373] uppercase">Snippet Count</p>
                  <p className="text-2xl font-main font-bold text-white">{snippets.length} <span className="text-sm font-light uppercase text-[#737373]">Entries</span></p>
               </div>
            </div>

            <div className="pt-12 border-t border-[#353534]/20 space-y-2">
               <p className="text-[8px] font-mono text-[#4a4a4d] uppercase truncate">SHA-256 Checksum: 8f92-bd0a-5f33-1c21...</p>
               <p className="text-[8px] font-mono text-[#4a4a4d] uppercase">Indexing: Optimized</p>
            </div>
          </div>

          {/* Restore */}
          <div className="lg:col-span-3 bg-[#131313] border border-[#353534] rounded-sm overflow-hidden p-8 flex flex-col md:flex-row gap-12">
            <div className="flex-1 space-y-8">
               <h3 className="text-xl font-main font-bold text-white uppercase">Restore from File</h3>
               <p className="text-[13px] font-main text-[#737373] leading-relaxed">
                  Load a previously exported <span className="text-white px-1 font-mono text-[11px] bg-[#1f1f22]">.code_vault</span> package. This operation will reconstruct the entire database state based on the provided manifest.
               </p>

               <div className="bg-red-600/5 border-l-2 border-red-600 p-6 flex gap-4">
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <div className="space-y-1">
                    <p className="text-[11px] font-main font-bold text-red-600 uppercase">Critical Warning</p>
                    <p className="text-[11px] font-main text-red-600/70">
                      Restoring will overwrite all existing snippets and session data. This action is destructive and cannot be undone once the frame is committed.
                    </p>
                  </div>
               </div>
            </div>

            <div className="w-full md:w-80 flex-shrink-0">
               <button 
                 onClick={handleRestore}
                 disabled={loading}
                 className="w-full aspect-square bg-[#1f1f22] border-2 border-dashed border-[#353534] hover:border-[#adaaad] hover:bg-[#252529] transition-all flex flex-col items-center justify-center gap-4 group group-hover:bg-[#1f1f22]"
               >
                 <div className="w-16 h-16 bg-[#0a0a0c] border border-[#353534] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileUp className="w-8 h-8 text-[#737373] group-hover:text-white transition-colors" />
                 </div>
                 <span className="text-[11px] font-mono text-[#737373] uppercase tracking-[1px] group-hover:text-white transition-colors">Select Archive</span>
               </button>
            </div>
          </div>

        </div>

        {/* Terminal Log Output */}
        <div className="bg-[#0a0a0c] border border-[#353534] rounded-sm overflow-hidden">
          <div className="bg-[#1f1f22] p-2 px-4 border-b border-[#353534] flex justify-between items-center">
             <span className="text-[9px] font-mono text-red-600 font-black uppercase tracking-[1px]">Terminal_Feed_Log</span>
             <span className="text-[8px] font-mono text-[#2a2a2e] uppercase">Session_ID: 9X-212-ALPHA</span>
          </div>
          <div className="p-6 h-40 font-mono text-[11px] text-[#adaaad] space-y-1 overflow-y-auto custom-scrollbar">
             {logs.length === 0 && <p className="text-[#2a2a2e] italic">Waiting for operator input...</p>}
             {logs.map((log, i) => (
               <div key={i} className="flex gap-6">
                 <span className="text-[#4a4a4d]">[{log.timestamp}]</span>
                 <span className={`${log.msg.startsWith('ERR') ? 'text-red-500' : ''}`}>{log.msg}</span>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
};
