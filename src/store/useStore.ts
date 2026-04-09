import { create } from 'zustand';

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

interface AppState {
  user: { id: number; username: string } | null;
  snippets: Snippet[];
  loading: boolean;
  
  setUser: (user: { id: number; username: string } | null) => void;
  setSnippets: (snippets: Snippet[]) => void;
  setLoading: (loading: boolean) => void;
  
  addSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: number) => void;
  updateSnippetInStore: (id: number, updates: Partial<Snippet>) => void;

  sessionCopies: Record<number, number>;
  incrementCopy: (id: number) => void;

  selectedSnippetId: number | null;
  setSelectedSnippetId: (id: number | null) => void;

  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;

  projects: Project[];
  setProjects: (projects: Project[]) => void;
  
  settings: UserSettings | null;
  setSettings: (settings: UserSettings) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  snippets: [],
  loading: false,
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

  settings: null,
  setSettings: (settings) => set({ settings }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  sessionCopies: {},
  incrementCopy: (id) => set((state) => ({
    sessionCopies: { 
      ...state.sessionCopies, 
      [id]: (state.sessionCopies[id] || 0) + 1 
    }
  }))
}));
