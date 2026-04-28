const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add Search to imports
const importStr = "import { Tags, ChevronDown, RefreshCw } from 'lucide-react';";
if (content.includes(importStr)) {
  content = content.replace(importStr, "import { Tags, ChevronDown, RefreshCw, Search } from 'lucide-react';");
  console.log('Search added to imports');
} else {
  console.log('Import target not found for Search');
}

fs.writeFileSync(path, content);
console.log('Finished');
