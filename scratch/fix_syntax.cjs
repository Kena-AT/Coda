const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the broken line 657
const brokenLineRegex = /\{savedTags\.length > 0 && savedTags\.filter\(t => !tagSearchInput || \(t\.name && t\.name\.toLowerCase\(\)\.includes\(tagSearchInput\.toLowerCase\(\)\)\)\)\.length === 0 && \(\{savedTags\.filter\(t => !tagSearchInput || t\.name\.toLowerCase\(\)\.includes\(tagSearchInput\.toLowerCase\(\)\)\)\.length === 0 && \(/;

const fixedLine = "{savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && (";

if (brokenLineRegex.test(content)) {
  content = content.replace(brokenLineRegex, fixedLine);
  console.log('Line fixed');
} else {
  // Try a more flexible search
  const flexSearch = "length === 0 && ({savedTags.filter";
  if (content.includes(flexSearch)) {
    // This is risky, let's find the start and end of the mess
    const startIndex = content.indexOf(flexSearch);
    const endIndex = content.indexOf('&& (', startIndex + flexSearch.length) + 4;
    const toReplace = content.substring(startIndex, endIndex);
    content = content.replace(toReplace, "length === 0 && (");
    console.log('Line fixed via flexible search');
  } else {
    console.log('Broken line not found');
  }
}

fs.writeFileSync(path, content);
console.log('Finished');
