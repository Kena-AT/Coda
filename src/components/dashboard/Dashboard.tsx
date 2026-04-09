import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Settings,
  Power,
  Plus,
  Shield,
  Activity,
  Database
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Sidebar } from '../layout/Sidebar';
import { HardwareVisualization } from './HardwareVisualization';
import { SnippetEditor } from './SnippetEditor';
import { AnalyticsPage } from './AnalyticsPage';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { ArchiveModal } from './ArchiveModal';
import { ProjectVault } from './ProjectVault';
import { MaintenanceSettingsModal } from './MaintenanceSettingsModal';
import { IntelligenceDashboard } from './IntelligenceDashboard';
import { GlobalSearchResults } from './GlobalSearchResults';
import { sessionManager, authApi } from '../../store/authStore';
import { useAuthSession } from '../../hooks/useAuthSession';

export const Dashboard: React.FC = () => {
  const { 
    user, 
    setUser, 
    snippets, 
    setSnippets, 
    setLoading, 
    selectedSnippetId, 
    setSelectedSnippetId,
    searchQuery,
    setSearchQuery,
    setProjects
  } = useStore();

  // Enable automatic token expiry tracking and refresh
  useAuthSession();

  const handleLogout = async () => {
    if (!user) return;
    
    try {
      const session = sessionManager.getSession();
      if (session) {
        // Call backend to invalidate session
        await authApi.logout(
          session.accessToken,
          session.refreshToken,
          user.id
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local session regardless of backend response
      sessionManager.clearSession();
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const [activeTab, setActiveTab] = useState('library');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke('get_system_status');
        setSystemStatus(status);
      } catch (e) {
        console.error('System status check failed:', e);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSnippets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const includeArchived = activeTab === 'archive' || !!searchQuery;
      const response: any = await invoke('list_snippets', {
        userId: user.id,
        includeArchived
      });
      if (response.success) {
        setSnippets(response.data || []);
      } else {
        toast.error(response.message || 'Failed to list snippets');
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const response: any = await invoke('get_projects', { userId: user.id });
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  useEffect(() => {
    fetchSnippets();
    fetchProjects();

    const checkArchivable = async () => {
      if (!user) return;
      try {
        const candidates = await invoke<any[]>('get_archive_candidates', { userId: user.id });
        if (candidates.length > 0) {
          setIsArchiveModalOpen(true);
        }
      } catch (e) {
        console.error('Archiver check failed:', e);
      }
    };
    checkArchivable();
  }, [user, activeTab, !!searchQuery]);

  // When selected tab changes, clear snippet editor
  useEffect(() => {
    if (selectedSnippetId !== null) {
      setSelectedSnippetId(null);
    }
  }, [activeTab]);

  // Refresh list when editor closes just in case we created one
  useEffect(() => {
    if (selectedSnippetId === null && user) {
      fetchSnippets();
      fetchProjects();
    }
  }, [selectedSnippetId]);

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onNewSnippet={() => setSelectedSnippetId(-1)} />

      <main className="flex-1 ml-[0px] lg:ml-[256px] flex flex-col relative overflow-hidden">
        
        {/* Global Navbar Header */}
        <header className="h-[64px] bg-[#111111] border-b border-[#222226] px-8 flex items-center justify-between z-40 shrink-0">
          <div className="flex items-center gap-8">
            <h2 className="text-lg font-main font-bold text-[#e60000] tracking-[-1px] uppercase cursor-pointer" onClick={() => setSearchQuery('')}>
              CODA
            </h2>
            <div className="relative w-[300px] flex items-center">
              <Search className="absolute left-3 w-[14px] h-[14px] text-[#e60000] z-10" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="GLOBAL_SEARCH_CMD..."
                className="w-full bg-[#0e0e0e] border border-[#222226] pl-10 pr-4 py-2 text-[#adaaad] placeholder-[#adaaad]/50 outline-none focus:border-[#e60000] transition-colors font-main text-[11px] tracking-[1px]"
              />
              {searchQuery && (
                 <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-[#adaaad] hover:text-white font-mono text-[9px]"
                 >
                   [ESC]
                 </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex gap-4">
              <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                systemStatus?.db_healthy ? 'bg-[#15ff00]/10 border-[#15ff00]/30 text-[#15ff00]' : 'bg-[#e60000]/10 border-[#e60000]/30 text-[#e60000]'
              }`}>
                <Database className="w-3.5 h-3.5" />
              </div>
              
              <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                systemStatus?.telemetry_active ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]' : 'bg-[#adaaad]/10 border-[#adaaad]/30 text-[#adaaad]'
              }`}>
                <Activity className={`w-3.5 h-3.5 ${systemStatus?.telemetry_active ? 'animate-pulse' : ''}`} />
              </div>
              
              <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                systemStatus?.session_valid ? 'bg-[#facc15]/10 border-[#facc15]/30 text-[#facc15]' : 'bg-[#adaaad]/10 border-[#adaaad]/30 text-[#adaaad]'
              }`}>
                <Shield className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <div className="flex items-center gap-6 border-l border-[#222226] pl-8">
              <button onClick={() => setIsMaintenanceModalOpen(true)} className="text-[#adaaad] hover:text-[#e60000] transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={handleLogout} className="text-[#adaaad] hover:text-[#e60000] transition-colors">
                <Power className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {selectedSnippetId !== null ? (
            <SnippetEditor />
          ) : searchQuery ? (
            <GlobalSearchResults />
          ) : activeTab === 'analytics' ? (
            <AnalyticsPage />
          ) : activeTab === 'projects' ? (
            <ProjectVault />
          ) : (
            <>
              <IntelligenceDashboard />

              {/* Right Panel: Assets & Hardware Intelligence */}
              <aside className="w-[360px] bg-[#111111] border-l border-[#222226] p-8 flex-col gap-12 hidden xl:flex overflow-y-auto custom-scrollbar relative">
                
                {/* Section: Usage Analytics */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
                      <div className="w-2 h-2 bg-[#e60000]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          USAGE_ANALYTICS
                      </h3>
                    </div>
                    <div className="space-y-6">
                      {snippets.slice(0, 3).sort((a,b) => (b.copy_count || 0) - (a.copy_count || 0)).map((snippet, idx) => {
                        const copies = snippet.copy_count || 0;
                        const contentLen = snippet.content?.length || 0;
                        const visualWidth = Math.min(100, Math.max(15, (copies * 10) + (contentLen % 20)));
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-[#adaaad] truncate w-3/4">{snippet.title}</span>
                                <span className="text-[#adaaad]">{copies} copies</span>
                              </div>
                              <div className="h-[2px] bg-[#19191c] relative">
                                <div 
                                  className="absolute top-0 left-0 h-full bg-[#e60000] transition-all duration-500" 
                                  style={{ width: `${visualWidth}%` }}
                                />
                              </div>
                          </div>
                        );
                      })}
                      {snippets.length === 0 && (
                        <div className="text-[10px] text-[#adaaad] font-mono whitespace-pre-wrap uppercase">VAULT_EMPTY :: ANALYTICS_NULL</div>
                      )}
                    </div>
                </div>

                {/* Section: System Status */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
                      <div className="w-2 h-2 bg-[#e60000]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          SYSTEM_STATUS
                      </h3>
                    </div>
                    <div className="bg-[#151515] p-6 border border-[#222226] relative overflow-hidden flex flex-col font-mono text-[10px] text-[#adaaad] leading-loose">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#e60000]" />
                      <div className="grid grid-cols-[100px_1fr] gap-x-2">
                        <span className="uppercase tracking-[1px] opacity-70">ENCRYPTION:</span>
                        <span className={systemStatus?.session_valid ? "text-[#15ff00]" : "text-[#e60000]"}>
                          {systemStatus?.session_valid ? 'SECURE_ACTIVE' : 'DEGRADED_STATE'}
                        </span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">SYNC:</span>
                        <span className={systemStatus?.telemetry_active ? "text-[#3b82f6]" : "text-[#adaaad]"}>
                          {systemStatus?.telemetry_active ? 'SYNCHRONIZING' : 'IDLE'}
                        </span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">DATABASE:</span>
                        <span className={systemStatus?.db_healthy ? "text-white" : "text-[#e60000]"}>
                          {systemStatus?.db_healthy ? 'SQLite V3_OK' : 'CONNECTION_ERR'}
                        </span>
                      </div>
                    </div>
                </div>

                {/* Section: Hardware Visualization */}
                <div className="flex flex-col gap-6 mt-auto">
                    <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
                      <div className="w-2 h-2 bg-[#e60000]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          HARDWARE_VISUALIZATION
                      </h3>
                    </div>
                    <HardwareVisualization />
                </div>
              </aside>
            </>
          )}
        </div>

        {/* Global Floating Action Button for Snippets */}
        <button 
          onClick={() => setSelectedSnippetId(-1)}
          className="absolute bottom-8 right-8 w-14 h-14 bg-[#e60000] flex items-center justify-center hover:bg-[#ff0000] hover:scale-105 transition-all shadow-[0_0_20px_rgba(230,0,0,0.3)] z-50"
        >
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </main>

      <ArchiveModal 
        isOpen={isArchiveModalOpen} 
        onClose={() => setIsArchiveModalOpen(false)} 
        onRefresh={fetchSnippets} 
      />
      <MaintenanceSettingsModal 
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
      />
    </div>
  );
};
