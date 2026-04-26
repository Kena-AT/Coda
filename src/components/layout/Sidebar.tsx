import React from 'react';
import { 
  Folder, 
  FolderGit2, 
  Star, 
  BarChart2, 
  Tag, 
  Archive,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStore } from '../../store/useStore';
import { useSoundEffect } from '../../hooks/useSoundEffect';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  onNewSnippet: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewSnippet }) => {
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useStore();
  const playSound = useSoundEffect();

  const handleTabClick = (id: string) => {
    playSound('click');
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const navItems = [
    { id: 'library', label: 'Library', icon: Folder },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 h-full w-[256px] bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col justify-between py-8 z-50 transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        
        {/* Logo Section */}
        <div className="px-6 mb-12 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1 cursor-pointer" onMouseEnter={() => playSound('hover')}>
              <div className="w-4 h-4 bg-[var(--accent)]" />
              <h1 className="text-[13px] font-main font-bold text-[var(--accent)] tracking-tight uppercase">TERMINAL_SYSTEM</h1>
            </div>
            <p className="text-[#adaaad] font-main text-[9px] tracking-premium uppercase opacity-60 ml-7">v2.0.4-STABLE</p>
          </div>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#adaaad] hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              onMouseEnter={() => playSound('hover')}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 transition-colors duration-200 group relative",
                activeTab === item.id 
                  ? "bg-[var(--accent)] text-white" 
                  : "text-[#adaaad] hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-[18px] h-[18px]",
                activeTab === item.id ? "text-white" : "text-[#adaaad] group-hover:text-white"
              )} strokeWidth={1.5} />
              <span className="font-main text-[11px] font-medium tracking-premium uppercase">{item.label}</span>
              
              {/* Active Indicator */}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute left-0 w-1 h-full bg-white"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Action Button */}
        <div className="px-6 mt-6">
          <button 
            onClick={() => { 
              playSound('click'); 
              onNewSnippet(); 
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            onMouseEnter={() => playSound('hover')}
            className="w-full bg-[var(--accent)] text-white flex items-center justify-center gap-2 py-4 font-main font-bold text-[11px] tracking-tight uppercase hover:bg-[#ff0000] transition-colors"
          >
            <span>NEW_SNIPPET</span>
          </button>
        </div>

      </aside>
    </>
  );
};
