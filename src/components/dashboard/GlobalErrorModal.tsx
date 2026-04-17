import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, RefreshCcw, XCircle, Terminal } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const GlobalErrorModal: React.FC = () => {
  const { globalError, setGlobalError } = useStore();

  if (!globalError) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="absolute inset-0 bg-[var(--bg-primary)cc] backdrop-blur-md"
           onClick={() => setGlobalError(null)}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-[var(--bg-primary)ff] border border-red-500/30 overflow-hidden shadow-[0_0_50px_var(--accent-glow)0.1)]"
        >
          {/* Scanline Effect */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_2px,3px_100%]" />

          {/* Top Bar */}
          <div className="h-8 bg-[var(--border)ff] border-b border-red-500/20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                CRIMSON_PROTOCOL_CORE_STABLE
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 uppercase">
              <span>LOC: 0x00FB2</span>
              <span>ID: ERR_INTERCEPT</span>
            </div>
          </div>

          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
              <div className="p-4 bg-red-600 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                <AlertOctagon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-red-600 tracking-tighter uppercase leading-none">
                  {globalError.title}
                </h1>
                <p className="text-slate-400 font-mono text-sm mt-1 uppercase tracking-tight">
                  {globalError.message}
                </p>
              </div>
            </div>

            {/* Log Window */}
            <div className="bg-black border-l-4 border-red-600 p-6 mb-8 font-mono text-xs overflow-hidden relative">
              <div className="absolute top-2 right-2 opacity-10">
                <Terminal className="w-12 h-12 text-red-600" />
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-4">
                {globalError.logs.map((log, index) => (
                  <div key={index} className="flex gap-4 group">
                    <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                    <span className={log.level === 'CRITICAL' ? 'text-red-500 font-bold' : 'text-slate-400'}>
                      {log.level}:
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                ))}
                <div className="flex gap-4 animate-pulse">
                   <span className="text-slate-600 shrink-0">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                   <span className="text-red-500">{'>'} _</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  globalError.onRetry?.();
                  setGlobalError(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 font-mono font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
              >
                <RefreshCcw className="w-4 h-4" />
                RETRY OPERATION
              </button>
              <button
                onClick={() => setGlobalError(null)}
                className="flex-1 bg-[#252525] hover:bg-[#333] text-slate-400 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 border border-slate-700/50 uppercase"
              >
                <XCircle className="w-4 h-4" />
                IGNORE (FORCE_CONTINUE)
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-between items-center text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em] border-t border-slate-800/50 pt-4">
              <span>ENCRYPTION: AES-256</span>
              <span>UID: OPERATOR_01</span>
              <span className="flex items-center gap-1.5 text-red-600/50 animate-pulse">
                <div className="w-1 h-1 bg-red-600 rounded-full" />
                UPLINK_STABLE
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
