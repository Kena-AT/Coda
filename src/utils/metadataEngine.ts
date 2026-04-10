export type InferredMetadata = {
  title: string;
  language: string;
  tags: string[];
};

const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  javascript: [/\bconst\b/, /\blet\b/, /\bvar\b/, /\bfunction\b/, /=>/],
  typescript: [/\binterface\b/, /\btype\b\s+\w+\s+=/, /:\s+\w+/, /\bprivate\b\s/],
  rust: [/\bfn\b/, /\bpub\b/, /\bmatch\b/, /\buse\b\s+std/],
  python: [/\bdef\b\s/, /\bimport\b\s\w+/, /\bif\s+__name__/, /\bprint\(/],
  ruby: [/\bdef\b/, /\bend\b/, /\bmodule\b/],
  java: [/\bpublic\s+class\b/, /\bSystem\.out\.println\b/],
};

const TAG_PATTERNS: Record<string, RegExp> = {
  'auth-hook': /\b(auth|token|login|signup|user)\b/i,
  'security': /\b(encrypt|decrypt|hash|crypto|password|shield)\b/i,
  'database': /\b(db|sql|query|table|insert|select|update)\b/i,
  'react': /\b(use|useEffect|useState|React|jsx)\b/i,
  'api': /\b(fetch|axios|http|get|post|endpoint)\b/i,
  'ui': /\b(div|span|className|html|css|style)\b/i,
};

export const metadataEngine = {
  guessLanguage(content: string, filename?: string): string {
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      const map: Record<string, string> = {
        'js': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'rs': 'rust', 'go': 'go', 'java': 'java',
        'rb': 'ruby', 'php': 'php', 'html': 'html', 'css': 'css',
        'json': 'json', 'md': 'markdown'
      };
      if (map[ext || '']) return map[ext || ''];
    }

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      if (patterns.some(p => p.test(content))) return lang;
    }
    return 'plaintext';
  },

  predictTags(content: string): string[] {
    const tags: string[] = [];
    for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
      if (pattern.test(content)) tags.push(tag);
    }
    return tags;
  },

  extractTitle(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for first comment line or first non-empty line
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) {
        return trimmed.replace(/[#/\\*]/g, '').trim().substring(0, 40);
      }
      if (trimmed.length > 0) {
        return trimmed.substring(0, 40);
      }
    }
    return 'Untitled_Snippet';
  }
};
