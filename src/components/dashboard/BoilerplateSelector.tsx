import React, { useState, useEffect } from 'react';
import { X, Search, FileCode, Shield, Database, Zap, Terminal } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Template {
  id: string;
  title: string;
  description: string;
  language: string;
  content: string;
  tag: string;
}

interface Recommendation {
  id: string;
  title: string;
  content: string;
  reason: string;
  match_percent: number;
}

interface BoilerplateSelectorProps {
  onClose: () => void;
  onSelect: (content: string) => void;
  currentContent: string;
}

export const BoilerplateSelector: React.FC<BoilerplateSelectorProps> = ({ onClose, onSelect, currentContent }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('ALL');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const t = await invoke<Template[]>('get_templates');
      setTemplates(t);
      const r = await invoke<Recommendation[]>('get_smart_recommendations', { currentContent });
      setRecommendations(r);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = selectedLang === 'ALL' || 
                       (selectedLang === 'TS' && (t.language === 'typescript' || t.language === 'javascript')) ||
                       (selectedLang === 'PY' && t.language === 'python') ||
                       (selectedLang === 'SQL' && t.language === 'sql');
    return matchesSearch && matchesLang;
  });

  const handleMerge = () => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        onSelect(template.content);
        onClose();
      }
    }
  };

  const getIcon = (tag: string) => {
    if (tag.includes('rest')) return <Terminal className="w-5 h-5 text-[#e60000]" />;
    if (tag.includes('hook')) return <Zap className="w-5 h-5 text-[#e60000]" />;
    if (tag.includes('perf')) return <Database className="w-5 h-5 text-[#e60000]" />;
    if (tag.includes('auth')) return <Shield className="w-5 h-5 text-[#e60000]" />;
    return <FileCode className="w-5 h-5 text-[#e60000]" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-[#131313cc] backdrop-blur-sm selection:bg-[#e60000] selection:text-white">
      <main className="w-full max-w-6xl h-[80vh] bg-[#0e0e0e] border-t-2 border-[#e60000] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <header className="h-12 bg-[#353534] flex items-center justify-between px-4 border-b border-[#0e0e0e]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#e60000] flex items-center justify-center rounded-sm">
                <div className="w-3 h-[1px] bg-white" />
                <div className="w-3 h-[1px] bg-white rotate-90 absolute" />
            </div>
            <span className="text-[10px] font-main font-bold text-white tracking-[2px] uppercase">TEMPLATE_PROTOCOL_OVERRIDE</span>
          </div>
          <div className="flex items-center gap-6">
             <span className="text-[9px] font-mono text-[#adaaad] uppercase opacity-50">SESSION_TOKEN: 0x44FE2</span>
             <button onClick={onClose} className="text-[#adaaad] hover:text-white transition-colors">
               <X size={20} />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Select Area */}
          <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-main font-bold text-white tracking-[-1px] uppercase">Boilerplate_Selector</h2>
              <div className="flex gap-2 bg-[#1c1b1b] p-1 border border-[#353534]/30">
                {['ALL', 'TS', 'PY', 'SQL'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-4 py-1 text-[10px] font-main font-bold transition-all ${selectedLang === lang ? 'bg-[#e60000] text-white' : 'text-[#adaaad] hover:text-white'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Patterns Input */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad] group-focus-within:text-[#e60000] transition-colors">
                <Search size={16} />
              </div>
              <input 
                type="text"
                placeholder="FILTER_PATTERNS..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#131313] border border-[#353534]/50 p-4 pl-12 text-[12px] font-mono text-white outline-none focus:border-[#e60000] transition-all uppercase placeholder:opacity-30"
              />
            </div>

            {/* Grid of Templates */}
            <div className="grid grid-cols-2 gap-6 pb-8">
              {filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`relative text-left p-6 bg-[#131313] border transition-all flex flex-col gap-4 group ${selectedTemplateId === t.id ? 'border-[#e60000] shadow-[0_0_20px_rgba(230,0,0,0.1)]' : 'border-[#353534]/30 hover:border-[#adaaad]/50'}`}
                >
                  <div className="flex justify-between items-start">
                    {getIcon(t.tag)}
                    <span className="text-[10px] font-mono text-[#adaaad] opacity-50 group-hover:opacity-100 transition-opacity">{t.tag}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-main font-bold text-white uppercase">{t.title}</h3>
                    <p className="text-[11px] text-[#adaaad] font-main leading-relaxed tracking-tight">
                      {t.description}
                    </p>
                  </div>
                  <div className={`h-1 w-8 transition-all ${selectedTemplateId === t.id ? 'bg-[#e60000] w-full' : 'bg-[#e60000]/20'}`} />
                </button>
              ))}
            </div>

          </div>

          {/* Recommendations Sidebar */}
          <aside className="w-[380px] border-l border-[#353534]/30 bg-[#0e0e0e] flex flex-col p-8 overflow-y-auto custom-scrollbar">
             <div className="flex items-center gap-3 mb-8">
               <div className="w-2 h-2 bg-[#e60000]" />
               <h3 className="text-[12px] font-main font-bold text-white tracking-[2px] uppercase">SMART_RECOMMENDATIONS</h3>
             </div>

             <div className="flex flex-col gap-10">
                {recommendations.map(r => (
                  <div key={r.id} className="flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-[#e60000] uppercase font-bold">{r.id.toUpperCase()}</span>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] text-[#e60000] font-bold">{r.match_percent}% MATCH</span>
                           <div className="w-12 h-[1px] bg-[#e60000] opacity-30 mt-1" />
                        </div>
                     </div>
                     <p className="text-[11px] text-[#adaaad] font-main leading-relaxed italic border-l border-[#353534] pl-4">
                        "{r.reason}"
                     </p>
                     
                     <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-white font-bold uppercase font-main">{r.title}</span>
                        <div className="bg-[#131313] p-3 text-[10px] font-mono text-[#e60000]/80 border border-[#353534]/20 overflow-hidden text-ellipsis whitespace-nowrap">
                           {r.content}
                        </div>
                     </div>

                     <div className="flex gap-4">
                        <button className="text-[9px] font-bold text-[#e60000] uppercase tracking-[1px] hover:underline" onClick={() => onSelect(r.content)}>Preview</button>
                        <button className="text-[9px] font-bold text-[#adaaad] uppercase tracking-[1px] hover:underline">Ignore</button>
                     </div>
                  </div>
                ))}
             </div>

             {recommendations.length === 0 && (
               <div className="mt-20 flex flex-col items-center gap-4 opacity-30">
                  <Terminal size={40} className="text-[#adaaad]" />
                  <p className="text-[10px] uppercase font-main tracking-[1px] text-center">Analyze sequence for patterns...</p>
               </div>
             )}

             {/* Footer decorative footer in design */}
             <div className="mt-auto pt-10">
                <div className="w-full flex items-center justify-end gap-2 mb-2">
                   <div className="w-8 h-8 rounded-sm bg-[#1c1b1b] flex items-center justify-center border border-[#353534]/50">
                      <Terminal size={14} className="text-[#adaaad]" />
                   </div>
                </div>
                <div className="text-[8px] font-mono text-[#adaaad] uppercase mb-1">SYSTEM_DATA_STREAM</div>
                <div className="flex gap-1 h-[3px] w-full">
                   <div className="h-full flex-1 bg-[#e60000]/20" />
                   <div className="h-full flex-1 bg-[#e60000]/20" />
                   <div className="h-full flex-1 bg-[#e60000]/20" />
                   <div className="h-full flex-1 bg-[#e60000]" />
                </div>
             </div>
          </aside>
        </div>

        {/* Modal Footer */}
        <footer className="h-20 bg-[#161618] border-t border-[#353534]/30 flex items-center justify-between px-8">
           <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border border-[#e60000] flex items-center justify-center animate-pulse">
                 <div className="w-1.5 h-1.5 bg-[#e60000] rounded-full" />
              </div>
              <span className="text-[10px] font-main text-[#adaaad] tracking-[1px]">Select a pattern to overwrite editor buffer</span>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-[#353534] text-white text-[11px] font-main font-bold tracking-[2px] uppercase hover:bg-[#454544] transition-all"
              >
                Discard_Session
              </button>
              <button 
                onClick={handleMerge}
                disabled={!selectedTemplateId}
                className="px-8 py-3 bg-[#e60000] text-white text-[11px] font-main font-bold tracking-[2px] uppercase hover:bg-[#ff0000] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Execute_Merge
              </button>
           </div>
        </footer>

      </main>
    </div>
  );
};
