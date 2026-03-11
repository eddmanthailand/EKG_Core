const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      let content = fs.readFileSync(full, 'utf8');
      
      // Replace explicit `.js` in local imports
      content = content.replace(/from '(\.[^']+)\.js'/g, "from '$1'");
      content = content.replace(/import '(\.[^']+)\.js'/g, "import '$1'");
      
      fs.writeFileSync(full, content);
    }
  }
}

walk('src/components/pixel-agents');
console.log('Fixed imports successfully.');
