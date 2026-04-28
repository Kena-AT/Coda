const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add refresh button - more flexible regex
const refreshRegex = /onClick=\{e => e\.stopPropagation\(\)\}\s*\/>/;
const refreshReplace = 'onClick={e => e.stopPropagation()}\n                        />\n                        <button\n                          onClick={e => { e.stopPropagation(); fetchTags(); }}\n                          className="px-2 text-[#adaaad] hover:text-[var(--accent)] transition-colors"\n                          title="Refresh Registry"\n                        >\n                          <RefreshCw size={12} />\n                        </button>';

if (refreshRegex.test(content)) {
  content = content.replace(refreshRegex, refreshReplace);
  console.log('Refresh button added');
} else {
  console.log('Refresh regex not found');
}

// Update empty state message
const emptyRegex = /\{tagSearchInput \? 'No matches — press Enter to add' : 'No tags saved yet'\}/;
const emptyReplace = "{tagSearchInput ? `No matches for \"${tagSearchInput}\"` : `Registry empty for user ${user?.id || '?'}`}";

if (emptyRegex.test(content)) {
  content = content.replace(emptyRegex, emptyReplace);
  console.log('Empty state updated');
} else {
  console.log('Empty state regex not found');
}

fs.writeFileSync(path, content);
console.log('Finished');
