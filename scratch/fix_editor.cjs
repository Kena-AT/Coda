const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the dropdown list render with a more robust and informative version
const listRegex = /\{savedTags\s+\.filter\([^)]+\)\s+\.map\([^)]+\)\}/;
// Since regex might fail with complex blocks, I'll use a string replacement for the container

const searchStart = '{/* Saved tags list */}';
const searchEnd = '{savedTags.filter(t => !tagSearchInput || t.name.toLowerCase().includes(tagSearchInput.toLowerCase())).length === 0 && (';

const newContent = `{/* Saved tags list */}
                      <div className="max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="px-3 py-1.5 text-[8px] font-mono text-[#adaaad]/30 border-b border-[var(--border)]/5 flex justify-between items-center bg-white/[0.02]">
                          <span>REGISTRY_PROTOCOL</span>
                          <span>{savedTags.length} NODES</span>
                        </div>
                        {savedTags.length > 0 ? (
                          savedTags
                            .filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase())))
                            .map((t, idx) => {
                              const active = getActiveTags().some(a => a.toLowerCase() === (t.name || "").toLowerCase());
                              return (
                                <button
                                  key={t.id || \`tag-\${idx}\`}
                                  onClick={e => { e.stopPropagation(); toggleTag(t.name); }}
                                  className={\`w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.5px] transition-all border-b border-white/[0.02] \${
                                    active ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[#adaaad] hover:bg-white/5 hover:text-white'
                                  }\`}
                                >
                                  <span className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: t.color || 'var(--accent)' }} />
                                    {t.name || "UNKNOWN_TAG"}
                                  </span>
                                  {active && <span className="text-[var(--accent)] text-[10px] font-bold">LOCKED</span>}
                                </button>
                              );
                            })
                        ) : (
                          <div className="px-3 py-8 text-center">
                            <div className="text-[10px] font-mono text-[#adaaad]/20 animate-pulse">VAULT_EMPTY</div>
                          </div>
                        )}
                        {savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && (`;

if (content.includes(searchStart) && content.includes(searchEnd)) {
  const parts = content.split(searchStart);
  const before = parts[0];
  const rest = parts[1].split(searchEnd);
  const after = rest[1];
  
  content = before + searchStart + "\n" + newContent + searchEnd + after;
  console.log('List render updated');
} else {
  console.log('Markers not found');
}

fs.writeFileSync(path, content);
console.log('Finished');
