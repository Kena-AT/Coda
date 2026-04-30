import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tag {
  id?: number;
  user_id: number;
  name: string;
  category: string | null;
  color: string | null;
  created_at?: string;
}

export interface Snippet {
  id?: number;
  user_id: number;
  project_id?: number | null;
  title: string;
  content?: string;
  language: string;
  tags: string | null;
  tag_nodes?: Tag[] | null;
  is_archived: boolean;
  is_favorite: boolean;
  deleted_at: string | null;
  copy_count: number;
  edit_count: number;
  detected_patterns: string | null;
  impressions: number;
  clicks: number;
  last_used_at: string | null;
  archive_snoozed_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface UserSettings {
  auto_archive_days: number;
  exclude_favorites: boolean;
  min_copy_threshold: number;
}

export interface Settings {
  lockoutThreshold: number;
  autoLockTimer: number; // minutes
  pushAlerts: boolean;
  soundEffects: boolean;
  theme: 'crimson' | 'void' | 'matrix' | 'glacier';
  fontSize: number;
  shortcuts: {
    save: string;
    newSnippet: string;
    search: string;
  };
  voiceEnabled: boolean;
}

interface AppError {
  title: string;
  message: string;
  logs: { timestamp: string; level: string; message: string }[];
  onRetry?: () => void;
}

interface AppState {
  user: { id: number; username: string } | null;
  snippets: Snippet[];
  snippetContents: Record<number, string>;
  snippetContentLoading: Record<number, boolean>;
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  setUser: (user: { id: number; username: string } | null) => void;
  setSnippets: (snippets: Snippet[]) => void;
  setLoading: (loading: boolean) => void;
  
  addSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: number) => void;
  updateSnippetInStore: (id: number, updates: Partial<Snippet>) => void;
  fetchSnippetContent: (id: number) => Promise<string | null>;
  setSnippetContent: (id: number, content: string) => void;

  sessionCopies: Record<number, number>;
  incrementCopy: (id: number) => void;

  selectedSnippetId: number | null | -1;
  setSelectedSnippetId: (id: number | null | -1) => void;

  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;

  projects: Project[];
  setProjects: (projects: Project[]) => void;
  
  settings: Settings;
  setSettings: (settings: Partial<Settings>) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  preSelectedProjectId: number | null;
  setPreSelectedProjectId: (id: number | null) => void;

  globalError: AppError | null;
  setGlobalError: (error: AppError | null) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      snippets: [],
      snippetContents: {},
      snippetContentLoading: {},
      loading: false,
      activeTab: 'library',
      setActiveTab: (activeTab: string) => set({ activeTab }),
      selectedSnippetId: null,

      setUser: (user: { id: number; username: string } | null) => set({ user }),
      setSnippets: (snippets: Snippet[]) => set({ snippets }),
      setLoading: (loading: boolean) => set({ loading }),

      addSnippet: (snippet: Snippet) => set((state: AppState) => ({ snippets: [snippet, ...state.snippets] })),
      removeSnippet: (id: number) => set((state: AppState) => ({ 
        snippets: state.snippets.filter((s: Snippet) => s.id !== id) 
      })),
      updateSnippetInStore: (id: number, updates: Partial<Snippet>) => set((state: AppState) => ({
        snippets: state.snippets.map((s: Snippet) => s.id === id ? { ...s, ...updates } : s),
        snippetContents: updates.content !== undefined 
          ? { ...state.snippetContents, [id]: updates.content } 
          : state.snippetContents
      })),

      setSnippetContent: (id: number, content: string) => set((state: AppState) => ({
        snippetContents: { ...state.snippetContents, [id]: content }
      })),

      fetchSnippetContent: async (id: number): Promise<string | null> => {
        // Use set to access state instead of useStore.getState() to avoid circularity issues in some TS versions
        let currentContent: string | undefined;
        let isLoading: boolean | undefined;
        
        set((state: AppState) => {
          currentContent = state.snippetContents[id];
          isLoading = state.snippetContentLoading[id];
          return {};
        });

        if (currentContent) return currentContent;
        if (isLoading) return null;

        set((state: AppState) => ({
          snippetContentLoading: { ...state.snippetContentLoading, [id]: true }
        }));

        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const content = await invoke<string>('get_snippet_content', { snippetId: id });
          
          set((state: AppState) => {
            const keys = Object.keys(state.snippetContents);
            const newContents = { ...state.snippetContents, [id]: content };
            
            if (keys.length > 50) {
              const firstKey = parseInt(keys[0]);
              if (!isNaN(firstKey) && firstKey !== id) {
                delete newContents[firstKey];
              }
            }

            return {
              snippetContents: newContents,
              snippetContentLoading: { ...state.snippetContentLoading, [id]: false }
            };
          });
          return content;
        } catch (e) {
          console.error('Failed to fetch snippet content:', e);
          set((state: AppState) => ({
            snippetContentLoading: { ...state.snippetContentLoading, [id]: false }
          }));
          return null;
        }
      },

      setSelectedSnippetId: (id: number | null | -1) => set({ selectedSnippetId: id }),
      selectedProjectId: null,
      setSelectedProjectId: (id: number | null) => set({ selectedProjectId: id }),

      projects: [],
      setProjects: (projects: Project[]) => set({ projects }),

      settings: {
        lockoutThreshold: 3,
        autoLockTimer: 15,
        pushAlerts: true,
        soundEffects: false,
        theme: 'crimson',
        fontSize: 100,
        shortcuts: {
          save: 'S',
          newSnippet: 'N',
          search: 'F'
        },
        voiceEnabled: true
      },
      setSettings: (newSettings: Partial<Settings>) => set((state: AppState) => ({ 
        settings: { ...state.settings, ...newSettings } 
      })),

      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      preSelectedProjectId: null,
      setPreSelectedProjectId: (id: number | null) => set({ preSelectedProjectId: id }),

      globalError: null,
      setGlobalError: (globalError: AppError | null) => set({ globalError }),

      sessionCopies: {},
      incrementCopy: (id: number) => set((state: AppState) => ({
        sessionCopies: { 
          ...state.sessionCopies, 
          [id]: (state.sessionCopies[id] || 0) + 1 
        }
      })),

      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen })
    }),
    {
      name: 'coda-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
