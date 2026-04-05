import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface RollbackConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  versionDate?: string;
  versionId?: number;
}

export const RollbackConfirmModal: React.FC<RollbackConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  versionDate,
  versionId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[420px] bg-[#0e0e0e] border border-[#e60000]/50 shadow-2xl shadow-[#e60000]/20">
        {/* Header */}
        <div className="bg-[#e60000] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span className="text-[12px] font-main font-bold text-white tracking-[1.5px] uppercase">
              SYSTEM_ALERT
            </span>
          </div>
          <button 
            onClick={onCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          <div className="text-center">
            <h3 className="text-[14px] font-main font-bold text-white tracking-[1px] uppercase mb-3">
              Revert matrix to this specific sequence?
            </h3>
            <p className="text-[10px] font-mono text-[#adaaad] leading-relaxed">
              This operation will overwrite the current working set with the selected historical state. 
              Unsaved changes will be permanently destroyed.
            </p>
          </div>

          {versionDate && (
            <div className="bg-[#1c1b1b] border border-[#353534] p-4">
              <div className="text-[9px] font-mono text-[#adaaad] uppercase tracking-[1px] mb-2">
                Target Sequence
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#e60000]">
                  ID: {versionId?.toString().padStart(6, '0') || 'UNKNOWN'}
                </span>
                <span className="text-[10px] font-mono text-white">
                  {versionDate}
                </span>
              </div>
            </div>
          )}

          <div className="bg-[#e60000]/10 border border-[#e60000]/30 p-3">
            <p className="text-[9px] font-mono text-[#e60000] uppercase tracking-[1px] text-center">
              Warning: This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-[#353534] text-[#adaaad] text-[10px] font-bold tracking-[1.5px] uppercase hover:border-[#adaaad] hover:text-white transition-all"
          >
            ABORT
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-[#e60000] text-white text-[10px] font-bold tracking-[1.5px] uppercase hover:bg-[#ff0000] transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            EXECUTE
          </button>
        </div>
      </div>
    </div>
  );
};
