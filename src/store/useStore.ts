import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Snippet {
  id?: number;
  user_id: number;
  project_id?: number | null;
  title: string;
  content: string;
  language: string;
  tags: string | null;
  is_archived: boolean;
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
  geminiApiKey: string | null;
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
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  setUser: (user: { id: number; username: string } | null) => void;
  setSnippets: (snippets: Snippet[]) => void;
  setLoading: (loading: boolean) => void;
  
  addSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: number) => void;
  updateSnippetInStore: (id: number, updates: Partial<Snippet>) => void;

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
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      snippets: [],
      loading: false,
      activeTab: 'library',
      setActiveTab: (activeTab) => set({ activeTab }),
      selectedSnippetId: null,

      setUser: (user) => set({ user }),
      setSnippets: (snippets) => set({ snippets }),
      setLoading: (loading) => set({ loading }),

      addSnippet: (snippet) => set((state) => ({ snippets: [snippet, ...state.snippets] })),
      removeSnippet: (id) => set((state) => ({ 
        snippets: state.snippets.filter((s) => s.id !== id) 
      })),
      updateSnippetInStore: (id, updates) => set((state) => ({
        snippets: state.snippets.map((s) => s.id === id ? { ...s, ...updates } : s)
      })),

      setSelectedSnippetId: (id) => set({ selectedSnippetId: id }),
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      projects: [],
      setProjects: (projects) => set({ projects }),

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
        geminiApiKey: 'AIzaSyD-eW4TcBJUoxF1DerjG1bLS-ee3xUMqVY'
      },
      setSettings: (newSettings) => set((state) => ({ 
        settings: { ...state.settings, ...newSettings } 
      })),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      preSelectedProjectId: null,
      setPreSelectedProjectId: (id) => set({ preSelectedProjectId: id }),

      globalError: null,
      setGlobalError: (globalError) => set({ globalError }),

      sessionCopies: {},
      incrementCopy: (id) => set((state) => ({
        sessionCopies: { 
          ...state.sessionCopies, 
          [id]: (state.sessionCopies[id] || 0) + 1 
        }
      }))
    }),
    {
      name: 'coda-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
