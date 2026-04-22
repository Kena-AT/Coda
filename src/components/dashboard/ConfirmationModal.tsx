import React from 'react';
import { Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { useSoundEffect } from '../../hooks/useSoundEffect';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'CONFIRM_PURGE',
  cancelLabel = 'ABORT_OPERATION',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  const playSound = useSoundEffect();

  if (!isOpen) return null;

  const colors = {
    danger: {
      text: 'text-[var(--accent)]',
      border: 'border-[var(--accent)]/30',
      bg: 'bg-[var(--accent)]',
      hover: 'hover:bg-[#ff0000]',
      glow: 'shadow-[0_0_30px_var(--accent-glow)]',
      accent: 'bg-[var(--accent)]'
    },
    warning: {
      text: 'text-yellow-500',
      border: 'border-yellow-500/30',
      bg: 'bg-yellow-600',
      hover: 'hover:bg-yellow-500',
      glow: 'shadow-[0_0_30px_rgba(234,179,8,0.2)]',
      accent: 'bg-yellow-500'
    },
    info: {
      text: 'text-blue-500',
      border: 'border-blue-500/30',
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-500',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
      accent: 'bg-blue-500'
    }
  };

  const style = colors[variant];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className={`bg-[var(--bg-primary)] border ${style.border} ${style.glow} w-full max-w-md overflow-hidden relative`}>
        
        {/* Top Header Decor */}
        <div className="h-1 w-full bg-[#1a1a1a]">
          <div className={`h-full ${style.accent} w-1/3 animate-pulse`} />
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 ${style.accent} animate-pulse`} />
              <h2 className={`text-lg font-main font-bold ${style.text} tracking-[1px] uppercase`}>
                {title}
              </h2>
            </div>
            <button
              onClick={() => { playSound('click'); onCancel(); }}
              className="p-1.5 text-[#adaaad] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-lg bg-black/40 border border-[#333] ${style.text}`}>
                {variant === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-white font-mono text-sm leading-relaxed">
                  {message}
                </p>
                <div className="flex items-center gap-2 text-[9px] font-mono text-[#adaaad] uppercase tracking-widest opacity-50">
                   <div className="w-1 h-1 bg-current" />
                   Security_Level: Red_Clearance
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4 pt-6 border-t border-[var(--border)]">
              <button
                onClick={() => { playSound('success'); onConfirm(); }}
                className={`flex-1 ${style.bg} text-white py-4 text-[11px] font-bold uppercase tracking-[1px] ${style.hover} transition-all flex items-center justify-center gap-2 group shadow-lg`}
              >
                <Check size={14} className="group-hover:scale-125 transition-transform" />
                {confirmLabel}
              </button>
              <button
                onClick={() => { playSound('click'); onCancel(); }}
                className="px-6 py-4 border border-[var(--border)] text-[#adaaad] text-[11px] font-bold uppercase tracking-[1px] hover:text-white hover:border-[#adaaad] transition-colors flex items-center justify-center gap-2"
              >
                <X size={14} />
                {cancelLabel}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Decor */}
        <div className="p-3 bg-black/40 border-t border-[var(--border)] flex justify-between items-center px-8">
           <div className="text-[8px] font-mono text-[#444] uppercase">CODA_SYS_PROT_v2.0.4</div>
           <div className="flex gap-2">
              <div className="w-1 h-1 bg-[#222]" />
              <div className="w-1 h-1 bg-[#222]" />
              <div className="w-1 h-1 bg-[#222]" />
           </div>
        </div>
      </div>
    </div>
  );
};
