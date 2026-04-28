const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the start of the corrupted block
const corruptedStart = '                      {/* Saved tags list */}';
// Find the end of the corrupted block (the start of the next section)
const nextSection = '        {/* Scrollable Content Area: Editor + Linking Panel */}';

if (content.includes(corruptedStart) && content.includes(nextSection)) {
  const parts = content.split(corruptedStart);
  const before = parts[0];
  const rest = parts[1].split(nextSection);
  const after = rest[1];

  const fixedBlock = `                      {/* Saved tags list */}
                      <div className="flex-1 min-h-[50px] max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col bg-[#1a1a1a]">
                        <div className="px-3 py-2 text-[8px] font-mono text-[#adaaad]/40 border-b border-white/[0.05] flex justify-between items-center sticky top-0 bg-[#1a1a1a] z-10">
                          <span className="flex items-center gap-1"><Activity size={8} /> REGISTRY_DATA</span>
                          <span>{savedTags.length} NODES</span>
                        </div>
                        
                        {savedTags.length > 0 ? (
                          <div className="flex flex-col">
                            {savedTags
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
                                    {active && <span className="text-[var(--accent)] text-[10px] font-bold">SELECTED</span>}
                                  </button>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="px-3 py-10 text-center flex flex-col items-center gap-2">
                            <Zap size={16} className="text-[#adaaad]/10" />
                            <div className="text-[9px] font-mono text-[#adaaad]/20 tracking-widest uppercase">Registry_Empty</div>
                          </div>
                        )}
                        
                        {savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && (
                          <div className="px-3 py-6 text-[9px] font-mono text-[#adaaad]/40 text-center uppercase italic">
                            No matches for "{tagSearchInput}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
           </div>
         </div>

`;

  content = before + fixedBlock + nextSection + after;
  console.log('File restored and fixed');
} else {
  console.log('Markers not found');
}

fs.writeFileSync(path, content);
console.log('Finished');
