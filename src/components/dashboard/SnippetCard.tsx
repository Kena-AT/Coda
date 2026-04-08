import React, { useState } from 'react';
import { 
  Copy, 
  Trash2, 
  Archive, 
  Edit3, 
  ChevronRight,
  FolderInput,
  Check,
  X
} from 'lucide-react';
import { Snippet, useStore } from '../../store/useStore';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

interface SnippetCardProps {
  snippet: Snippet;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

export const SnippetCard: React.FC<SnippetCardProps> = ({ snippet, onEdit, onDelete, onArchive }) => {
  const { user, projects, updateSnippetInStore } = useStore();
  const [isMoving, setIsMoving] = useState(false);
  const [tempProjectId, setTempProjectId] = useState<number | null>(snippet.project_id || null);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(snippet.content);
      if (snippet.id) {
        await invoke('record_snippet_usage', { snippetId: snippet.id });
      }
      toast.success('Snippet copied to terminal buffer', {
        style: {
          background: '#19191c',
          color: '#fffbfe',
          borderLeft: '4px solid #e60000',
          fontSize: '12px',
          fontFamily: 'Space Grotesk'
        }
      });
    } catch (err) {
      toast.error('Failed to copy snippet');
    }
  };

  const handleMove = async () => {
    if (!user || !snippet.id) return;
    try {
      const response: any = await invoke('update_snippet', {
        userId: user.id,
        id: snippet.id,
        projectId: tempProjectId,
        title: snippet.title,
        content: snippet.content,
        language: snippet.language,
        tags: snippet.tags
      });

      if (response.success) {
        updateSnippetInStore(snippet.id, { project_id: tempProjectId });
        toast.success(`Moved to ${tempProjectId ? projects.find(p => p.id === tempProjectId)?.name : 'Inbox'}`);
        setIsMoving(false);
      }
    } catch (err) {
      toast.error('Failed to move snippet');
    }
  };

  const getLanguageColor = (lang: string) => {
    const langs: Record<string, string> = {
      'javascript': '#f3ffca',
      'typescript': '#00f5ff',
      'rust': '#e60000',
      'python': '#3776ab',
      'html': '#e34c26',
      'css': '#264de4'
    };
    return langs[lang.toLowerCase()] || '#adaaad';
  };

  return (
    <div className="group bg-[#151515] border border-[#222226] p-5 hover:bg-[#19191c] hover:border-[#e60000]/30 transition-all duration-300 relative overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span 
              className="w-1.5 h-1.5 rounded-full" 
              style={{ backgroundColor: getLanguageColor(snippet.language) }} 
            />
            <span className="text-[9px] font-mono tracking-[1px] uppercase text-[#adaaad]">
              {snippet.language}
            </span>
          </div>
          <h3 className="text-md font-main font-bold text-white group-hover:text-[#e60000] transition-colors line-clamp-1 uppercase">
            {snippet.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={copyToClipboard}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] transition-colors"
            title="Quick Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setIsMoving(!isMoving)}
            className={`p-1.5 transition-colors ${isMoving ? 'text-[#e60000]' : 'text-[#adaaad] hover:text-[#e60000]'}`}
            title="Move Project"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onEdit}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] transition-colors"
            title="Edit Snippet"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onArchive}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] transition-colors"
            title="Archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isMoving ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-3 bg-black/20 rounded p-4 animate-in fade-in duration-300">
          <span className="text-[9px] font-mono text-[#adaaad] uppercase">Select Destination</span>
          <select 
            value={tempProjectId || ''}
            onChange={e => setTempProjectId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full bg-[#111111] border border-[#222226] text-white text-[10px] font-mono p-2 outline-none"
          >
            <option value="">INBOX (UNSORTED)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
            ))}
          </select>
          <div className="flex gap-2 w-full">
            <button 
              onClick={handleMove}
              className="flex-1 bg-[#e60000] text-white py-2 flex justify-center hover:bg-[#ff0000] transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsMoving(false)}
              className="px-4 border border-[#222226] text-[#adaaad] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 mb-4 relative z-10 overflow-hidden" onClick={onEdit}>
          <div className="bg-black/40 p-3 font-mono text-[10px] text-[#adaaad]/60 line-clamp-3 rounded border border-white/5 cursor-pointer hover:bg-black/60 transition-colors">
            <code className="leading-relaxed">
              {snippet.content}
            </code>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-[#222226]/50 relative z-10">
        <div className="flex items-center gap-2 overflow-hidden max-w-[70%]">
          {snippet.tags && snippet.tags.split(',').slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[8px] text-[#adaaad] py-0.5 px-1.5 bg-[#222226] border border-white/5 truncate">
              {tag.trim().toUpperCase()}
            </span>
          ))}
          {snippet.tags && snippet.tags.split(',').length > 2 && (
            <span className="text-[8px] text-[#adaaad] opacity-50">+{snippet.tags.split(',').length - 2}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[#adaaad] group-hover:text-white transition-colors cursor-pointer" onClick={onEdit}>
          <span className="text-[9px] font-mono uppercase">Open</span>
          <ChevronRight className="w-3 h-3 text-[#e60000]" />
        </div>
      </div>
    </div>
  );
};
