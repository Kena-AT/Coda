import React from 'react';
import { 
  Copy, 
  Trash2, 
  Archive, 
  Edit3, 
  ChevronRight
} from 'lucide-react';
import { Snippet } from '../../store/useStore';
import toast from 'react-hot-toast';

interface SnippetCardProps {
  snippet: Snippet;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

export const SnippetCard: React.FC<SnippetCardProps> = ({ snippet, onEdit, onDelete, onArchive }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(snippet.content);
    toast.success('Snippet copied to terminal buffer', {
      style: {
        background: '#19191c',
        color: '#fffbfe',
        borderLeft: '4px solid #e60000',
        fontSize: '12px',
        fontFamily: 'Space Grotesk'
      }
    });
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
    <div className="group bg-[#19191c]/40 border border-[#222226] p-5 hover:bg-[#19191c]/60 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-[40%] h-full bg-[#e60000]/[0.02] transform skew-x-[-15deg] translate-x-12" />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span 
              className="w-1.5 h-1.5 rounded-full" 
              style={{ backgroundColor: getLanguageColor(snippet.language) }} 
            />
            <span className="text-[10px] font-main tracking-[1px] uppercase text-[#adaaad] opacity-70">
              {snippet.language}
            </span>
          </div>
          <h3 className="text-lg font-main font-bold text-white group-hover:text-[#e60000] transition-colors line-clamp-1">
            {snippet.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={copyToClipboard}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] hover:bg-black/20 rounded transition-colors"
            title="Copy Code"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onEdit}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] hover:bg-black/20 rounded transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onArchive}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] hover:bg-black/20 rounded transition-colors"
            title="Archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 text-[#adaaad] hover:text-[#e60000] hover:bg-black/20 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Snippet */}
      <div className="flex-1 mb-6 relative z-10">
        <div className="bg-black/40 p-4 font-mono text-[11px] text-[#48474a] line-clamp-4 rounded border border-white/5 overflow-hidden">
          <code className="text-xs leading-relaxed opacity-60">
            {snippet.content}
          </code>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center pt-4 border-t border-[#222226]/50 relative z-10">
        <div className="flex items-center gap-4">
          {snippet.tags && snippet.tags.split(',').map((tag, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[9px] text-[#adaaad] py-0.5 px-1.5 bg-[#222226] border border-white/5">
                {tag.trim()}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[#adaaad] group-hover:text-white transition-colors cursor-pointer" onClick={onEdit}>
          <span className="text-[10px] font-main tracking-[0.5px] uppercase">Details</span>
          <ChevronRight className="w-3 h-3 text-[#e60000]" />
        </div>
      </div>
    </div>
  );
};
