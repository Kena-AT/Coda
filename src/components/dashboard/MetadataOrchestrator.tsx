import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Tag as TagIcon, Plus, X, Edit2, Trash2, Search, Filter, Info } from 'lucide-react';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Tag {
  id?: number;
  user_id: number;
  name: string;
  category?: string;
  color?: string;
  created_at?: string;
}

export const MetadataOrchestrator: React.FC = () => {
  const { user } = useStore();
  const playSound = useSoundEffect();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#e60000');
  const [tagCategory, setTagCategory] = useState('GENERAL');

  const fetchTags = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response: any = await invoke('list_tags', { userId: user.id });
      if (response.success) {
        setTags(response.data || []);
      }
    } catch (err) {
      toast.error('Failed to load metadata tags');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const syncAndFetch = async () => {
      if (!user) return;
      try {
        await invoke('sync_all_metadata', { userId: user.id });
        fetchTags();
      } catch (err) {
        fetchTags();
      }
    };
    syncAndFetch();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !tagName.trim()) return;
    try {
      const response: any = await invoke('create_tag', {
        userId: user.id,
        name: tagName.toUpperCase(),
        category: tagCategory.toUpperCase(),
        color: tagColor
      });
      if (response.success) {
        toast.success('METADATA_NODE_CREATED');
        playSound('success');
        setTagName('');
        setIsCreating(false);
        fetchTags();
      }
    } catch (err) {
      toast.error('Creation protocol failed');
    }
  };

  const handleUpdate = async () => {
    if (!editingTag?.id || !tagName.trim()) return;
    try {
      const response: any = await invoke('update_tag', {
        id: editingTag.id,
        name: tagName.toUpperCase(),
        category: tagCategory.toUpperCase(),
        color: tagColor
      });
      if (response.success) {
        toast.success('METADATA_NODE_UPDATED');
        playSound('success');
        setEditingTag(null);
        setTagName('');
        fetchTags();
      }
    } catch (err) {
      toast.error('Update protocol failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response: any = await invoke('delete_tag', { id });
      if (response.success) {
        toast.success('METADATA_NODE_DELETED');
        playSound('error');
        fetchTags();
      }
    } catch (err) {
      toast.error('Deletion protocol failed');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || '#e60000');
    setTagCategory(tag.category || 'GENERAL');
    setIsCreating(true);
  };

  return (
    <div className="flex-1 h-full bg-[#131313] flex flex-col overflow-hidden font-main relative">
      <main className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12 border-b border-[#5f3f3a] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#e60000]" />
              <span className="text-[10px] font-mono text-[#adaaad] tracking-[2px] uppercase">Metadata_Registry // System_Taxonomy</span>
            </div>
            <h1 className="text-4xl md:text-[56px] font-bold text-white tracking-[-2px] uppercase leading-tight">Metadata Orchestrator</h1>
          </div>

          <button 
            onClick={() => { setIsCreating(true); setEditingTag(null); setTagName(''); }}
            className="flex items-center gap-3 px-6 py-3 bg-[#e60000] text-white font-bold text-[11px] uppercase tracking-wider hover:bg-[#ff0000] transition-all shadow-[0_0_20px_rgba(230,0,0,0.3)]"
          >
            <Plus size={16} />
            <span>Register_New_Tag</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Panel: Creation & Search */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-[#0e0e0e] border border-[#353534] p-6 flex flex-col gap-6">
              <div className="flex items-center gap-2 border-b border-[#353534] pb-4">
                <Filter size={14} className="text-[#e60000]" />
                <h3 className="text-[10px] font-mono text-white uppercase tracking-widest">Filter_&_Search_Panel</h3>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#adaaad]" />
                <input 
                  type="text" 
                  placeholder="QUERY_TAXONOMY..."
                  className="w-full bg-[#151515] border border-[#353534] pl-10 pr-4 py-2.5 text-white text-[10px] uppercase font-mono outline-none focus:border-[#e60000]/50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-mono text-[#5f3f3a] uppercase">Active_Categories</span>
                <div className="flex flex-wrap gap-2">
                  {['GENERAL', 'LOGIC', 'INTERFACE', 'BACKEND', 'STYLE'].map(cat => (
                    <button key={cat} className="px-3 py-1 bg-[#151515] border border-[#353534] text-[#adaaad] text-[8px] uppercase font-mono hover:text-[#e60000] hover:border-[#e60000]/30 transition-all">
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#0e0e0e] border-l-4 border-[#e60000] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-[#e60000]" />
                <span className="text-[10px] font-mono text-white uppercase tracking-widest">System_Alerts</span>
              </div>
              <p className="text-[#adaaad] font-mono text-[9px] uppercase leading-relaxed">
                Metadata nodes facilitate neural mapping across the intelligence vault. 
                Ensure tag nomenclature follows terminal standards for optimal synergy.
              </p>
            </div>
          </div>

          {/* Right Panel: Tags Cloud/Grid Area */}
          <div className="xl:col-span-8">
            <div className="bg-[#0e0e0e] border border-[#353534] p-8 min-h-[600px] relative overflow-hidden">
               {/* Decorative Background Element from Design */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#e60000] opacity-[0.02] blur-[100px] -mr-32 -mt-32" />

               <div className="flex items-center justify-between mb-8">
                 <div className="flex flex-col gap-1">
                   <h2 className="text-white font-bold text-xl uppercase tracking-tight">Taxonomy_Grid</h2>
                   <span className="text-[9px] font-mono text-[#5f3f3a] uppercase">Registry_Count: {tags.length}_NODES_ACTIVE</span>
                 </div>
               </div>

               {isLoading ? (
                 <div className="flex flex-col items-center justify-center h-[400px] gap-4 opacity-20">
                   <div className="w-12 h-1 bg-[#353534] overflow-hidden">
                     <div className="h-full bg-[#e60000] w-1/2 animate-[loading_1s_infinite]" />
                   </div>
                   <span className="text-[10px] font-mono text-[#adaaad] uppercase">Syncing_Registry...</span>
                 </div>
               ) : tags.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[400px] gap-4 border border-dashed border-[#353534]">
                   <TagIcon size={48} className="text-[#353534]" />
                   <span className="text-[10px] font-mono text-[#adaaad] uppercase">No_Metadata_Nodes_Detected</span>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                   {tags.map(tag => (
                     <div 
                       key={tag.id} 
                       className="group bg-[#151515] border border-[#353534] p-4 flex flex-col gap-3 hover:border-[#e60000]/50 transition-all relative"
                     >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2" style={{ backgroundColor: tag.color || '#e60000' }} />
                            <span className="text-[9px] font-mono text-[#5f3f3a] uppercase tracking-widest">{tag.category || 'GENERAL'}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(tag)} className="p-1 text-[#adaaad] hover:text-white transition-colors">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDelete(tag.id!)} className="p-1 text-[#adaaad] hover:text-[#e60000] transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-white font-bold text-sm tracking-widest uppercase">{tag.name}</h4>
                        <div className="mt-2 pt-2 border-t border-[#353534]/50 flex justify-between items-center">
                          <span className="text-[8px] font-mono text-[#adaaad] opacity-50 uppercase">0x{tag.id?.toString(16).toUpperCase()}</span>
                          <div className="px-2 py-0.5 bg-[#e60000]/10 border border-[#e60000]/20 text-[#e60000] text-[8px] font-mono">ACTIVE</div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {/* Creation Modal / Overlay */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#131313cc] backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0e0e0e] border-l-4 border-[#e60000] shadow-[0_0_50px_rgba(230,0,0,0.2)] w-full max-w-xl overflow-hidden"
            >
              <div className="bg-[#353534] px-6 py-3 flex justify-between items-center">
                <span className="text-[10px] font-mono text-white font-bold uppercase tracking-[3px]">
                  {editingTag ? 'Protocol: Edit_Metadata' : 'Protocol: New_Metadata'}
                </span>
                <button onClick={() => setIsCreating(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-8 flex flex-col gap-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-mono text-[#5f3f3a] uppercase">Node_Nomenclature</label>
                    <input 
                      type="text" 
                      value={tagName}
                      onChange={e => setTagName(e.target.value)}
                      placeholder="TAG_NAME..."
                      className="bg-[#151515] border border-[#353534] p-3 text-white text-xs uppercase font-mono outline-none focus:border-[#e60000] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-mono text-[#5f3f3a] uppercase">Classification</label>
                    <select 
                      value={tagCategory}
                      onChange={e => setTagCategory(e.target.value)}
                      className="bg-[#151515] border border-[#353534] p-3 text-white text-xs uppercase font-mono outline-none focus:border-[#e60000] transition-all"
                    >
                      {['GENERAL', 'LOGIC', 'INTERFACE', 'BACKEND', 'STYLE', 'EXPERIMENTAL'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-mono text-[#5f3f3a] uppercase">Chromatic_ID</label>
                  <div className="flex flex-wrap gap-3">
                    {['#e60000', '#15ff00', '#00f5ff', '#facc15', '#a855f7', '#353534', '#ffffff'].map(color => (
                      <button 
                        key={color}
                        onClick={() => setTagColor(color)}
                        className={`w-8 h-8 transition-all ${tagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e0e0e] scale-110' : 'opacity-40 hover:opacity-100'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-[#353534]">
                   <button 
                    onClick={() => setIsCreating(false)}
                    className="px-6 py-2 border border-[#353534] text-[#adaaad] font-mono text-[10px] uppercase hover:bg-white/5 transition-all"
                  >
                    Abort_Protocol
                  </button>
                  <button 
                    onClick={editingTag ? handleUpdate : handleCreate}
                    className="px-8 py-2 bg-[#e60000] text-white font-bold font-main text-[10px] uppercase hover:bg-[#ff0000] transition-all shadow-[0_0_20px_rgba(230,0,0,0.4)]"
                  >
                    {editingTag ? 'Commit_Update' : 'Commit_Registry'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
