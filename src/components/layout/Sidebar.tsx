import React from 'react';
import { 
  Folder, 
  FolderGit2, 
  Star, 
  BarChart2, 
  Tag, 
  XSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewSnippet: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onNewSnippet }) => {
  const navItems = [
    { id: 'library', label: 'Library', icon: Folder },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'trash', label: 'Trash', icon: XSquare },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[256px] bg-[#0e0e0e] border-r border-[#222226] flex flex-col justify-between py-8 z-50">
      
      {/* Logo Section */}
      <div className="px-6 mb-12">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-4 h-4 bg-[#e60000]" />
          <h1 className="text-[13px] font-main font-bold text-[#e60000] tracking-[1px] uppercase">TERMINAL_SYSTEM</h1>
        </div>
        <p className="text-[#adaaad] font-main text-[9px] tracking-[1px] uppercase opacity-60 ml-7">v2.0.4-STABLE</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 transition-colors duration-200 group relative",
              activeTab === item.id 
                ? "bg-[#e60000] text-white" 
                : "text-[#adaaad] hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-[18px] h-[18px]",
              activeTab === item.id ? "text-white" : "text-[#adaaad] group-hover:text-white"
            )} strokeWidth={1.5} />
            <span className="font-main text-[11px] font-medium tracking-[0.5px] uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Action Button */}
      <div className="px-6">
        <button 
          onClick={onNewSnippet}
          className="w-full bg-[#e60000] text-white flex items-center justify-center gap-2 py-4 font-main font-bold text-[11px] tracking-[2px] uppercase hover:bg-[#ff0000] transition-colors"
        >
          <span>NEW_Project</span>
        </button>
      </div>

    </aside>
  );
};
