import React, { useState } from 'react';
import { 
  X,
  Code2,
  FileText,
  Tags,
  Hash,
  Terminal,
  Save,
  AlertCircle,
  FolderGit2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { invoke } from '@tauri-apps/api/core';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import toast from 'react-hot-toast';

interface CreateSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnippetCreated: () => void;
}

export const CreateSnippetModal: React.FC<CreateSnippetModalProps> = ({ isOpen, onClose, onSnippetCreated }) => {
  const { user, projects, preSelectedProjectId, setPreSelectedProjectId } = useStore();
  const playSound = useSoundEffect();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [tags, setTags] = useState('');
  const [projectId, setProjectId] = useState<number | null>(preSelectedProjectId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      const response: any = await invoke('create_snippet', {
        userId: user.id,
        title,
        content,
        language,
        tags: tags || null,
        projectId: projectId && projectId !== -1 ? projectId : null
      });

      if (response.success) {
        playSound('success');
        toast.success('Snippet synchronized with database', {
          style: {
            background: '#19191c',
            color: '#fffbfe',
            borderLeft: '4px solid var(--accent)',
            fontSize: '12px',
            fontFamily: 'Space Grotesk'
          }
        });
        onSnippetCreated();
        onClose();
        // Reset form
        setTitle('');
        setContent('');
        setLanguage('javascript');
        setTags('');
        setProjectId(null);
        setPreSelectedProjectId(null);
      } else {
        playSound('error');
        setError(response.message);
      }
    } catch (err: any) {
      playSound('error');
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#0e0e10] border border-[var(--border)] shadow-[0_0_100px_var(--accent-glow)0.15)] relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
               <Terminal className="text-[var(--accent)] w-5 h-5" />
               <h2 className="text-xl font-main font-bold text-[#fffbfe] tracking-[-1px] uppercase">NEW_SNIPPET_INIT</h2>
             </div>
             <span className="text-[10px] text-[#adaaad] tracking-[1px] uppercase opacity-50">Local Buffer Entry System</span>
          </div>
          <button 
            onClick={() => { playSound('click'); onClose(); }}
            onMouseEnter={() => playSound('hover')}
            className="p-2 text-[#adaaad] hover:text-[var(--accent)] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
          
          {error && (
            <div className="p-4 bg-[#9f0519]/10 border-l-2 border-[#ff716c] flex items-center gap-4">
              <AlertCircle className="w-5 h-5 text-[#ff716c]" />
              <span className="text-[#ff716c] font-main text-xs uppercase tracking-[0.5px]">Error_LOG: {error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Title */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-2 text-[#adaaad] text-[10px] uppercase font-main tracking-[1px]">
                <FileText className="w-3 h-3 text-[var(--accent)]" />
                <span>Title</span>
              </div>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => playSound('hover')}
                placeholder="Database Logic Cluster..."
                className="w-full bg-[#19191c]/60 border border-[var(--border)] p-3 text-white outline-none focus:border-[var(--accent)] transition-colors font-main text-sm"
                required
              />
            </div>

            {/* Language */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-2 text-[#adaaad] text-[10px] uppercase font-main tracking-[1px]">
                <Code2 className="w-3 h-3 text-[var(--accent)]" />
                <span>Language_Key</span>
              </div>
              <select 
                value={language}
                onChange={(e) => { playSound('click'); setLanguage(e.target.value); }}
                onMouseEnter={() => playSound('hover')}
                className="w-full bg-[#19191c]/60 border border-[var(--border)] p-3 text-white outline-none focus:border-[var(--accent)] transition-colors font-main text-sm appearance-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="rust">Rust</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tags */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-2 text-[#adaaad] text-[10px] uppercase font-main tracking-[1px]">
                <Tags className="w-3 h-3 text-[var(--accent)]" />
                <span>Tags (comma-separated)</span>
              </div>
              <input 
                type="text" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onFocus={() => playSound('hover')}
                placeholder="API, Utility, Auth..."
                className="w-full bg-[#19191c]/60 border border-[var(--border)] p-3 text-white outline-none focus:border-[var(--accent)] transition-colors font-main text-sm"
              />
            </div>

            {/* Project Selection */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-2 text-[#adaaad] text-[10px] uppercase font-main tracking-[1px]">
                <FolderGit2 className="w-3 h-3 text-[var(--accent)]" />
                <span>Target Project (Sector)</span>
              </div>
              <select 
                value={projectId || ''}
                onChange={(e) => { playSound('click'); setProjectId(e.target.value ? parseInt(e.target.value) : null); }}
                onMouseEnter={() => playSound('hover')}
                className="w-full bg-[#19191c]/60 border border-[var(--border)] p-3 text-white outline-none focus:border-[var(--accent)] transition-colors font-main text-sm appearance-none"
              >
                <option value="">NO_PROJECT_ASSIGNED (INBOX)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col h-full min-h-[300px]">
            <div className="flex items-center gap-2 mb-2 text-[#adaaad] text-[10px] uppercase font-main tracking-[1px]">
              <Hash className="w-3 h-3 text-[var(--accent)]" />
              <span>Snippet_Logic_Body</span>
            </div>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => playSound('hover')}
              placeholder="export const connect = () => { ... }"
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] p-4 text-[#f3ffca] font-mono text-xs outline-none focus:border-[var(--accent)] transition-colors resize-none overflow-y-auto custom-scrollbar"
              required
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]/50">
            <div className="text-[9px] text-[#adaaad] uppercase font-main opacity-50 tracking-[1px]">
              Memory_Buffer: Allocated 4.02kb
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => { playSound('click'); onClose(); }}
                onMouseEnter={() => playSound('hover')}
                className="text-xs font-main text-[#adaaad] uppercase tracking-[1px] hover:text-white transition-colors"
                disabled={loading}
              >
                Abort
              </button>
              <button 
                type="submit"
                disabled={loading}
                onMouseEnter={() => playSound('hover')}
                onClick={() => playSound('click')}
                className="bg-[var(--accent)] text-white flex items-center gap-3 px-8 py-3 font-main font-bold text-xs tracking-[2px] uppercase hover:shadow-[0_0_20px_var(--accent-glow)0.3)] transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'STORING...' : 'STORE_SNIPPET'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
