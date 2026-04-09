import { Snippet, Project } from '../store/useStore';

export interface SearchResult {
  snippet: Snippet;
  score: number;
  matches: string[]; // Fields that matched
}

export const parseSearchQuery = (query: string) => {
  const terms: string[] = [];
  const filters: {
    lang?: string;
    tag?: string;
    project?: string;
    isArchived?: boolean;
    isStale?: boolean;
  } = {};

  const parts = query.split(/\s+/);
  
  parts.forEach(part => {
    if (part.startsWith('lang:')) {
      filters.lang = part.split(':')[1]?.toLowerCase() || '';
    } else if (part.startsWith('tag:')) {
      filters.tag = part.split(':')[1]?.toLowerCase() || '';
    } else if (part.startsWith('project:')) {
      filters.project = part.split(':')[1]?.toLowerCase() || '';
    } else if (part === 'is:archived') {
      filters.isArchived = true;
    } else if (part === 'is:stale') {
      filters.isStale = true;
    } else if (part.trim()) {
      terms.push(part.toLowerCase());
    }
  });

  return { terms, filters };
};

export const filterSnippets = (
  snippets: Snippet[], 
  projects: Project[],
  query: string
): SearchResult[] => {
  if (!query.trim()) return snippets.map(s => ({ snippet: s, score: 0, matches: [] }));

  const { terms, filters } = parseSearchQuery(query);
  
  return snippets
    .map(snippet => {
      let score = 0;
      const matches: string[] = [];

      // 1. Prefix Filters (Mandatory if present)
      if (filters.lang && snippet.language?.toLowerCase() !== filters.lang) return null;
      if (filters.tag && !(snippet.tags && snippet.tags.toLowerCase().includes(filters.tag))) return null;
      if (filters.isArchived !== undefined && snippet.is_archived !== filters.isArchived) return null;
      
      if (filters.project) {
        const proj = projects.find(p => p.id === snippet.project_id);
        if (!proj || !proj.name?.toLowerCase().includes(filters.project)) return null;
      }

      // 2. Keyword Matching (Score based)
      if (terms.length > 0) {
        let termMatchCount = 0;
        
        terms.forEach(term => {
          let termScore = 0;
          let matchedThisTerm = false;

          // Exact Title match
          const title = snippet.title?.toLowerCase() || '';
          if (title === term) {
            termScore += 100;
            matchedThisTerm = true;
            matches.push('title');
          } else if (title.includes(term)) {
            termScore += 50;
            matchedThisTerm = true;
            matches.push('title');
          }

          // Language match
          const lang = snippet.language?.toLowerCase() || '';
          if (lang === term) {
            termScore += 40;
            matchedThisTerm = true;
            matches.push('language');
          }

          // Tag match
          if (snippet.tags && snippet.tags.toLowerCase().includes(term)) {
            termScore += 30;
            matchedThisTerm = true;
            matches.push('tags');
          }

          // Content match
          const content = snippet.content?.toLowerCase() || '';
          if (content.includes(term)) {
            termScore += 10;
            matchedThisTerm = true;
            matches.push('content');
          }

          if (matchedThisTerm) {
            termMatchCount++;
            score += termScore;
          }
        });

        // If we have terms but none matched, drop it
        if (termMatchCount === 0) return null;
        
        // Multi-term logic: Bonus for matching more terms
        if (termMatchCount === terms.length) score += 50;
      } else {
        // If only filters were used, give a base score
        score = 100;
      }

      return { snippet, score, matches: Array.from(new Set(matches)) };
    })
    .filter((res): res is SearchResult => res !== null)
    .sort((a, b) => b.score - a.score);
};
