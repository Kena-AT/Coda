import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { SnippetCard } from './SnippetCard';
import { Star, Search, Filter, Shield, Activity, Database } from 'lucide-react';
import { useSoundEffect } from '../../hooks/useSoundEffect';

export const FavoritesVault: React.FC = () => {
  const { snippets, setSelectedSnippetId, searchQuery, activeTab } = useStore();
  const playSound = useSoundEffect();
  const [localSearch, setLocalSearch] = useState('');

  const favoriteSnippets = useMemo(() => {
    return snippets.filter(s => s && s.is_favorite && !s.deleted_at &&
      (s.title.toLowerCase().includes(localSearch.toLowerCase()) || 
       s.language.toLowerCase().includes(localSearch.toLowerCase()))
    );
  }, [snippets, localSearch]);

  return (
    <div className="flex-1 flex flex-col bg-[#131313] overflow-hidden relative">
      {/* Background Gradients from Design */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(45deg, #e60000 1px, transparent 1px), linear-gradient(-45deg, #e60000 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 mb-12">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-400 rotate-45 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              <span className="text-[10px] font-mono text-[#adaaad] tracking-[3px] uppercase">Protocol // High_Value_Assets</span>
            </div>
            <h1 className="text-4xl md:text-[64px] font-bold text-white tracking-[-3px] uppercase leading-none">Favorites Vault</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaad] group-focus-within:text-yellow-400 transition-colors" />
              <input 
                type="text" 
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="QUERY_FAVORITES..."
                className="w-full bg-[#0e0e0e] border border-[#353534] pl-10 pr-4 py-3 text-white text-[11px] uppercase font-mono outline-none focus:border-yellow-400/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#353534] border border-[#353534] mb-12">
          <div className="bg-[#1c1b1b] p-6 flex flex-col gap-1 border-r border-[#353534]">
            <span className="text-[9px] font-mono text-[#5f3f3a] uppercase">Total_Favorites</span>
            <span className="text-2xl text-white font-bold">{favoriteSnippets.length}</span>
          </div>
          <div className="bg-[#1c1b1b] p-6 flex flex-col gap-1 border-r border-[#353534]">
            <span className="text-[9px] font-mono text-[#5f3f3a] uppercase">Asset_Density</span>
            <span className="text-2xl text-white font-bold">{snippets.length > 0 ? Math.round((favoriteSnippets.length / snippets.length) * 100) : 0}%</span>
          </div>
          <div className="bg-[#1c1b1b] p-6 flex flex-col gap-1 border-r border-[#353534]">
            <span className="text-[9px] font-mono text-[#5f3f3a] uppercase">Synergy_Index</span>
            <span className="text-2xl text-white font-bold">0.98</span>
          </div>
          <div className="bg-[#1c1b1b] p-6 flex flex-col gap-1">
            <span className="text-[9px] font-mono text-[#5f3f3a] uppercase">Encryption_lvl</span>
            <span className="text-2xl text-white font-bold uppercase">MAX</span>
          </div>
        </div>

        {/* Snippets Area */}
        {favoriteSnippets.length === 0 ? (
          <div className="h-[400px] border border-dashed border-[#353534] flex flex-col items-center justify-center gap-6 group">
            <div className="relative">
                <Star size={64} className="text-[#353534] group-hover:text-yellow-400/20 transition-colors duration-500" />
                <div className="absolute inset-0 blur-2xl bg-yellow-400/5 group-hover:bg-yellow-400/10 transition-colors" />
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono text-[#adaaad] uppercase tracking-[4px]">Vault_Empty // No_Pinned_Assets</span>
                <p className="text-[9px] font-mono text-[#5f3f3a] uppercase">Tag snippets with [STAR] to synchronize them with this layer</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteSnippets.map(s => (
              <SnippetCard 
                key={s.id} 
                snippet={s} 
                onEdit={() => { playSound('transition'); setSelectedSnippetId(s.id!); }}
                onDelete={() => {}} 
                onArchive={() => {}}
              />
            ))}
          </div>
        )}

        {/* Footer Meta */}
        <div className="mt-16 pt-8 border-t border-[#353534] flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 opacity-50">
                    <Shield size={14} className="text-yellow-400" />
                    <span className="text-[10px] font-mono text-[#adaaad] uppercase">Secure_Channel_Active</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                    <Activity size={14} className="text-[#15ff00]" />
                    <span className="text-[10px] font-mono text-[#adaaad] uppercase">Telemetry_Stable</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                    <Database size={14} className="text-[#3b82f6]" />
                    <span className="text-[10px] font-mono text-[#adaaad] uppercase">Index_Verified</span>
                </div>
            </div>
            <div className="text-[9px] font-mono text-[#5f3f3a] uppercase tracking-widest">
                Last_Sync: {new Date().toLocaleTimeString()} // v2.0.4-STABLE
            </div>
        </div>
      </main>

      {/* Decorative Corner Accents */}
      <div className="absolute top-8 right-8 opacity-20 pointer-events-none font-mono text-[8px] text-right text-[#5f3f3a]">
        LAT: 40.7128 N<br />
        LONG: 74.0060 W<br />
        ALT: 12.4m
      </div>
    </div>
  );
};
