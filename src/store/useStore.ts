import { create } from 'zustand';

export interface Snippet {
  id?: number;
  user_id: number;
  title: string;
  content: string;
  language: string;
  tags?: string;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
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
}

export const useStore = create<AppState>((set) => ({
  user: null,
  snippets: [],
  loading: false,

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

  sessionCopies: {},
  incrementCopy: (id) => set((state) => ({
    sessionCopies: { 
      ...state.sessionCopies, 
      [id]: (state.sessionCopies[id] || 0) + 1 
    }
  }))
}));
