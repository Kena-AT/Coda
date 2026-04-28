const fs = require('fs');
const path = 'c:\\Users\\hp\\Documents\\Programming\\Projects\\Coda\\src\\components\\dashboard\\SnippetEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add RefreshCw to imports
const importRegex = /import \{ Tags, ChevronDown \} from 'lucide-react';/;
if (importRegex.test(content)) {
  content = content.replace(importRegex, "import { Tags, ChevronDown, RefreshCw } from 'lucide-react';");
  console.log('Import added');
} else {
  // Try the other import block
  const otherImportStr = "ShieldAlert\n} from 'lucide-react';";
  if (content.includes(otherImportStr)) {
    content = content.replace(otherImportStr, "ShieldAlert,\n  RefreshCw\n} from 'lucide-react';");
    console.log('Import added to main block');
  } else {
    console.log('Import target not found');
  }
}

fs.writeFileSync(path, content);
console.log('Finished');
