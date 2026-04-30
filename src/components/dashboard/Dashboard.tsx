import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Settings as SettingsIcon,
  Power,
  Shield,
  Activity,
  Database,
  Upload,
  Download,
  Archive,
  Menu,
  RefreshCw
} from 'lucide-react';
import { soundService } from '../../utils/sounds';
import { updateTaskState } from '../../hooks/useTelemetry';
import { useStore } from '../../store/useStore';
import { Sidebar } from '../layout/Sidebar';
import { HardwareVisualization } from './HardwareVisualization';
import { SnippetEditor } from './SnippetEditor';
import { AnalyticsPage } from './AnalyticsPage';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { ArchiveModal } from './ArchiveModal';
import { ArchiveView } from './ArchiveView';
import { TrashRepository } from './TrashRepository';
import { FavoritesVault } from './FavoritesVault';
import { MetadataOrchestrator } from './MetadataOrchestrator';
import { ProjectVault } from './ProjectVault';
import { IntelligenceDashboard } from './IntelligenceDashboard';
import { GlobalSearchResults } from './GlobalSearchResults';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { SettingsPage } from './SettingsPage';
import { BackupRestorePage } from './BackupRestorePage';
import { ChangePasswordPage } from './ChangePasswordPage';
import { VersionInfoPage } from './VersionInfoPage';
import { LogoutConfirmationPage } from './LogoutConfirmationPage';
import { CodaAI } from './CodaAI';
import { sessionManager, authApi } from '../../store/authStore';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useAutoLock } from '../../hooks/useAutoLock';
import { listen } from '@tauri-apps/api/event';

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
    setProjects,
    activeTab,
    setActiveTab,
    settings,
    sidebarOpen,
    setSidebarOpen
  } = useStore();

  // Enable automatic token expiry tracking and refresh
  useAuthSession();
  
  // Enable inactivity auto-lock
  useAutoLock();


  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [hasCandidates, setHasCandidates] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    // Auditory feedback loop
    const unlisten = listen('play-fx', () => {
      if (!settings.soundEffects) return; // Respect global quiet mode
      soundService.playSuccess();
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [settings.soundEffects]);

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

  const fetchSnippets = async (force = false) => {
    if (!user) return;
    setLoading(true);
    updateTaskState('search_indexing', 'running');
    try {
      const includeArchived = activeTab === 'archive' || !!searchQuery;
      const includeDeleted = activeTab === 'trash';
      const response: any = await invoke('list_snippets', {
        userId: user.id,
        includeArchived: includeArchived,
        includeDeleted: includeDeleted,
        bypass_cache: force,
        load_content: false // Optimization: Don't load full code content in the list
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
      updateTaskState('search_indexing', 'completed');
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const response: any = await invoke('list_projects', { userId: user.id });
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    soundService.playClick();
    
    const toastId = toast.loading('SYNCHRONIZING_INTELLIGENCE_VAULT...', {
      style: { 
        background: '#1a1a1a', 
        color: '#fff', 
        border: '1px solid var(--accent)',
        fontSize: '10px',
        fontFamily: 'var(--font-main)',
        letterSpacing: '1px'
      }
    });

    try {
      // 1. Fetch latest data (force fresh from DB)
      await Promise.all([fetchSnippets(true), fetchProjects()]);
      
      // 2. Trigger backend analysis
      updateTaskState('analytics', 'running');
      await invoke('run_vault_maintenance');
      updateTaskState('analytics', 'completed');
      
      // Only recompute links if a snippet is currently active
      if (selectedSnippetId && selectedSnippetId !== -1) {
        await invoke('recompute_snippet_links', { 
          snippetId: selectedSnippetId, 
          userId: user.id 
        });
      }
      
      toast.success('INTELLIGENCE_VAULT_SYNCHRONIZED', { 
        id: toastId,
        style: { 
          background: '#1a1a1a', 
          color: '#15ff00', 
          border: '1px solid #15ff00' 
        }
      });
      soundService.playSuccess();
    } catch (e) {
      console.error('Refresh failed:', e);
      toast.error('SYNCHRONIZATION_ERROR', { id: toastId });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
    fetchProjects();

    const checkArchivable = async () => {
      if (!user) return;
      try {
        const candidates = await invoke<any[]>('get_archive_candidates', { userId: user.id });
        setHasCandidates(candidates.length > 0);
        if (candidates.length > 0) {
          setIsArchiveModalOpen(true);
          toast.success(
            `Smart Archiver: ${candidates.length} stale snippets detected`,
            { icon: '🗄️', duration: 10000, style: { background: '#1a1a1a', color: '#fff', border: '1px solid var(--accent)' } }
          );
        }
      } catch (e) {
        console.error('Archiver check failed:', e);
        toast.error('Smart Archiver scan failed');
        setHasCandidates(false);
      }
    };
    checkArchivable();
  }, [user, activeTab, !!searchQuery]);

  // Keyboard Shortcuts Support (Sprint 10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key.toUpperCase();
        if (key === settings.shortcuts.save.toUpperCase()) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('save-snippet'));
        }
        if (key === settings.shortcuts.newSnippet.toUpperCase()) {
          e.preventDefault();
          setSelectedSnippetId(-1);
        }
        if (key === settings.shortcuts.search.toUpperCase()) {
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder="SEARCH..."]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.shortcuts, setSelectedSnippetId]);

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
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-white overflow-hidden">
      <Sidebar onNewSnippet={() => setSelectedSnippetId(-1)} />

      <main className="flex-1 flex flex-col relative overflow-hidden min-h-0">
        
        {/* Global Navbar Header */}
        <header className="h-[64px] bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 md:px-8 flex items-center justify-between z-40 shrink-0 lg:ml-[256px]">
          <div className="flex items-center gap-3 md:gap-8">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#adaaad] hover:text-white p-1"
            >
              <Menu size={20} />
            </button>

            <h2 className="text-base md:text-lg font-main font-bold text-[var(--accent)] tracking-[-1px] uppercase cursor-pointer hidden sm:block" onClick={() => setSearchQuery('')}>
              CODA
            </h2>
            <div className="relative w-full max-w-[150px] sm:max-w-[300px] flex items-center">
              <Search className="absolute left-3 w-[14px] h-[14px] text-[var(--accent)] z-10" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] pl-10 pr-4 py-2 text-[#adaaad] placeholder-[#adaaad]/50 outline-none focus:border-[var(--accent)] transition-colors font-main text-[10px] md:text-[11px] tracking-[1px]"
              />
              {searchQuery && (
                 <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-[#adaaad] hover:text-white font-mono text-[9px] hidden sm:block"
                 >
                   [ESC]
                 </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden md:flex gap-4">
              <div className={`flex items-center justify-center p-1.5 rounded-md border ${
                systemStatus?.db_healthy ? 'bg-[#15ff00]/10 border-[#15ff00]/30 text-[#15ff00]' : 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
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
            
            <div className="flex items-center gap-4 md:gap-6 border-l border-[var(--border)] pl-4 md:pl-8">
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className={`text-[#adaaad] hover:text-white transition-all ${refreshing ? 'animate-spin text-[var(--accent)]' : ''}`}
                title="Synchronize & Reanalyze"
              >
                <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                onClick={() => setIsImportModalOpen(true)} 
                className="text-[#adaaad] hover:text-white transition-colors"
                title="Import Intelligence"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                onClick={() => setIsExportModalOpen(true)} 
                className="text-[#adaaad] hover:text-white transition-colors"
                title="Export Protocol"
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                onClick={() => setIsArchiveModalOpen(true)} 
                className={`flex items-center gap-1.5 transition-all text-[10px] font-mono tracking-widest uppercase group ${hasCandidates ? 'text-red-500 animate-pulse' : 'text-[#adaaad] hover:text-[var(--accent)]'}`}
                title="Archive Vault"
              >
                <Archive className={`w-4 h-4 transition-transform group-hover:scale-110 ${hasCandidates ? 'text-red-500 ring-4 ring-red-500/20 rounded-full bg-red-500/10' : ''}`} />
                <span className="hidden xl:inline">ARCHIVE</span>
              </button>
              <button onClick={() => setActiveTab('settings')} className={`transition-colors ${activeTab === 'settings' ? 'text-[var(--accent)]' : 'text-[#adaaad] hover:text-[var(--accent)]'}`} title="Settings">
                <SettingsIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={() => setActiveTab('logout-confirm')} className="text-[#adaaad] hover:text-[var(--accent)] transition-colors" title="Logout">
                <Power className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0 lg:ml-[256px]">
          {selectedSnippetId !== null ? (
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-primary)]">
              <SnippetEditor />
            </div>
          ) : searchQuery ? (
            <GlobalSearchResults />
          ) : activeTab === 'settings' ? (
            <SettingsPage onBack={() => setActiveTab('library')} onNavigate={(page) => setActiveTab(page)} />
          ) : activeTab === 'backup' ? (
            <BackupRestorePage onBack={() => setActiveTab('settings')} />
          ) : activeTab === 'change-password' ? (
            <ChangePasswordPage onBack={() => setActiveTab('settings')} />
          ) : activeTab === 'version' ? (
            <VersionInfoPage onBack={() => setActiveTab('settings')} />
          ) : activeTab === 'logout-confirm' ? (
            <LogoutConfirmationPage onCancel={() => setActiveTab('settings')} />
          ) : activeTab === 'analytics' ? (
            <AnalyticsPage />
          ) : activeTab === 'projects' ? (
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-primary)]">
              <ProjectVault />
            </div>
          ) : activeTab === 'archive' ? (
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-primary)]">
              <ArchiveView />
            </div>
          ) : activeTab === 'favorites' ? (
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-primary)]">
              <FavoritesVault />
            </div>
          ) : activeTab === 'tags' ? (
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-primary)]">
              <MetadataOrchestrator />
            </div>
          ) : activeTab === 'trash' ? (
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-primary)]">
              <TrashRepository />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <IntelligenceDashboard />

              {/* Right Panel: Assets & Hardware Intelligence */}
              <aside className="w-[360px] bg-[var(--bg-primary)] border-l border-[var(--border)] p-8 flex-col gap-12 hidden xl:flex overflow-y-auto custom-scrollbar relative">
                
                {/* Section: Usage Analytics */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                      <div className="w-2 h-2 bg-[var(--accent)]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          USAGE_ANALYTICS
                      </h3>
                    </div>
                    <div className="space-y-6">
                      {snippets.slice().sort((a,b) => (b.copy_count || 0) - (a.copy_count || 0)).slice(0, 5).map((snippet, idx) => {
                        const copies = snippet.copy_count || 0;
                        const contentLen = snippet.content?.length || 0;
                        const visualWidth = Math.min(100, Math.max(15, (copies * 10) + (contentLen % 20)));
                        return (
                          <div 
                            key={idx} 
                            className="flex flex-col gap-2 group cursor-pointer"
                            onClick={() => {
                              soundService.playTransition();
                              setSelectedSnippetId(snippet.id!);
                            }}
                          >
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-[#adaaad] group-hover:text-white transition-colors truncate w-3/4">{snippet.title}</span>
                                <span className="text-[#adaaad] group-hover:text-[var(--accent)] transition-colors">{copies} copies</span>
                              </div>
                              <div className="h-[2px] bg-[#19191c] relative overflow-hidden">
                                <div 
                                  className="absolute top-0 left-0 h-full bg-[var(--accent)] transition-all duration-500 group-hover:bg-white" 
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
                    <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                      <div className="w-2 h-2 bg-[var(--accent)]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          SYSTEM_STATUS
                      </h3>
                    </div>
                    <div className="bg-[#151515] p-6 border border-[var(--border)] relative overflow-hidden flex flex-col font-mono text-[10px] text-[#adaaad] leading-loose">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
                      <div className="grid grid-cols-[100px_1fr] gap-x-2">
                        <span className="uppercase tracking-[1px] opacity-70">ENCRYPTION:</span>
                        <span className={systemStatus?.session_valid ? "text-[#15ff00]" : "text-[var(--accent)]"}>
                          {systemStatus?.session_valid ? 'SECURE_ACTIVE' : 'DEGRADED_STATE'}
                        </span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">SYNC:</span>
                        <span className={systemStatus?.telemetry_active ? "text-[#3b82f6]" : "text-[#adaaad]"}>
                          {systemStatus?.telemetry_active ? 'SYNCHRONIZING' : 'IDLE'}
                        </span>
                        
                        <span className="uppercase tracking-[1px] opacity-70">DATABASE:</span>
                        <span className={systemStatus?.db_healthy ? "text-white" : "text-[var(--accent)]"}>
                          {systemStatus?.db_healthy ? 'SQLite V3_OK' : 'CONNECTION_ERR'}
                        </span>
                      </div>
                    </div>
                </div>

                {/* Section: Hardware Visualization */}
                <div className="flex flex-col gap-6 mt-auto">
                    <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                      <div className="w-2 h-2 bg-[var(--accent)]" />
                      <h3 className="text-[11px] font-main font-bold text-white tracking-[1.5px] uppercase">
                          HARDWARE_VISUALIZATION
                      </h3>
                    </div>
                    <HardwareVisualization />
                </div>
              </aside>
            </div>
          )}
        </div>

      </main>

      <ArchiveModal 
        isOpen={isArchiveModalOpen} 
        onClose={() => setIsArchiveModalOpen(false)} 
        onRefresh={fetchSnippets} 
      />
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchSnippets}
      />

      {/* Floating Coda AI Assistant */}
      <CodaAI />
    </div>
  );
};
