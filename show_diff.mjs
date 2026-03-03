import fs from 'fs';
import { execSync } from 'child_process';
const diff = execSync('git diff 22abeb7 5f56819 src/hooks/useFirebase.js', { encoding: 'utf8' });
console.log(diff);
