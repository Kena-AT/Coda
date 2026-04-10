import React, { useState, useEffect } from 'react';
import { X, Settings2, ShieldAlert } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MaintenanceSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user } = useStore();
  const [autoArchiveDays, setAutoArchiveDays] = useState(30);
  const [excludeFavorites, setExcludeFavorites] = useState(true);
  const [minCopyThreshold, setMinCopyThreshold] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Standard initialization defaults, no get_maintenance_settings implemented yet.
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await invoke('update_maintenance_settings', {
        userId: user.id,
        autoArchiveDays: autoArchiveDays,
        excludeFavorites: excludeFavorites,
        minCopyThreshold: minCopyThreshold
      });
      toast.success('Maintenance settings updated', {
        style: { background: '#19191c', color: '#fffbfe', borderLeft: '4px solid #15ff00', fontSize: '12px', fontFamily: 'Space Grotesk' }
      });
      onClose();
    } catch (e: any) {
      toast.error('Failed to update settings: ' + e.toString());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#111111] border border-[#222226] w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="h-1 bg-[#e60000] w-full" />
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-3">
              <div className="bg-[#e60000]/10 p-2 text-[#e60000]">
                <Settings2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-white font-main font-bold tracking-[1px] uppercase">Vault Maintenance</h2>
                <p className="text-[#adaaad] text-[10px] font-mono">Configure Smart Archiver</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#adaaad] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8">
             <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono text-white uppercase font-bold tracking-[1px]">Auto-Archive Threshold (Days)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="0" max="180" step="15" 
                    value={autoArchiveDays} onChange={(e) => setAutoArchiveDays(Number(e.target.value))}
                    className="flex-1 accent-[#e60000]"
                  />
                  <span className="text-[#e60000] font-mono font-bold text-[14px] w-12">{autoArchiveDays === 0 ? 'NEVER' : autoArchiveDays}</span>
                </div>
                {autoArchiveDays === 0 && (
                  <span className="text-[10px] text-[#e60000] font-mono animate-pulse"><ShieldAlert className="w-3 h-3 inline mr-1" /> Background archiving is disabled</span>
                )}
             </div>

             <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono text-white uppercase font-bold tracking-[1px]">Minimum Copy Exemption</label>
                <input 
                  type="number" min="0" 
                  value={minCopyThreshold} onChange={(e) => setMinCopyThreshold(Number(e.target.value))}
                  className="bg-[#151515] border border-[#222226] p-3 text-white font-mono text-[14px] focus:outline-none focus:border-[#e60000] transition-colors"
                />
                <span className="text-[10px] text-[#adaaad] font-mono">Archive immunity for highly-used snippets</span>
             </div>

             <div className="flex items-center gap-4 bg-[#151515] p-4 border border-[#222226] cursor-pointer" onClick={() => setExcludeFavorites(!excludeFavorites)}>
               <div className={`w-4 h-4 border ${excludeFavorites ? 'bg-[#e60000] border-[#e60000]' : 'bg-transparent border-[#adaaad]'} flex items-center justify-center transition-colors`}>
                 {excludeFavorites && <div className="w-2 h-2 bg-white" />}
               </div>
               <span className="text-[11px] font-main uppercase tracking-[0.5px] text-white">Protect 'favorite' tag from cleanup</span>
             </div>
          </div>
        </div>

        <div className="border-t border-[#222226] bg-[#151515] p-5 flex justify-end gap-6">
          <button onClick={onClose} className="text-[11px] font-main font-bold text-[#adaaad] hover:text-white uppercase tracking-[1.5px] transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#e60000] text-white text-[11px] font-main font-bold uppercase tracking-[1.5px] px-8 py-3 hover:bg-[#ff0000] transition-all"
          >
            {isSaving ? 'APPLYING...' : 'APPLY CONFIG'}
          </button>
        </div>
      </div>
    </div>
  );
};
