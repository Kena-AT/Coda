const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Just search for the unique part of the line
const searchStr = "'No tags saved yet'";
const replaceStr = "`Registry empty for user ${user?.id || '?'}`";

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  console.log('Empty state part updated');
} else {
  console.log('String not found');
}

fs.writeFileSync(path, content);
console.log('Finished');
