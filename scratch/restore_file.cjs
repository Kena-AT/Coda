const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Line 1 corruption
const line1Prefix = "{savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && (";
if (content.startsWith(line1Prefix)) {
  content = content.substring(line1Prefix.length);
  console.log('Line 1 prefix removed');
}

// Fix broken condition at line 657 (which now might be shifted)
const brokenCondition = "{savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && ({savedTags.filter(t => !tagSearchInput || t.name.toLowerCase().includes(tagSearchInput.toLowerCase())).length === 0 && (";
const fixedCondition = "{savedTags.length > 0 && savedTags.filter(t => !tagSearchInput || (t.name && t.name.toLowerCase().includes(tagSearchInput.toLowerCase()))).length === 0 && (";

if (content.includes(brokenCondition)) {
  content = content.replace(brokenCondition, fixedCondition);
  console.log('Broken condition at line 657 fixed');
} else {
  // Try a more flexible search for the duplication
  const duplicationStr = "length === 0 && ({savedTags.filter";
  if (content.includes(duplicationStr)) {
     const startIndex = content.indexOf(duplicationStr);
     const endIndex = content.indexOf("&& (", startIndex + duplicationStr.length) + 4;
     const toReplace = content.substring(startIndex, endIndex);
     content = content.replace(toReplace, "length === 0 && (");
     console.log('Duplication fixed via flexible search');
  }
}

fs.writeFileSync(path, content);
console.log('Finished');
