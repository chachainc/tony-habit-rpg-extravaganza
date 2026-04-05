const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const orig = content;
      content = content.replace(/useHeroImage/g, 'usePlayerAvatar')
                       .replace(/getHeroImage/g, 'getPlayerAvatar')
                       .replace(/import \{ usePlayerAvatar \} from '.*?usePlayerAvatar'/g, "import { usePlayerAvatar } from '../../hooks/usePlayerAvatar'")
                       .replace(/from '\.\.\/hooks\/usePlayerAvatar'/g, "from '../hooks/usePlayerAvatar'");

      if (orig !== content) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

replaceInDir('./src');
