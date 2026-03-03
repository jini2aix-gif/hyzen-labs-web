import { execSync } from 'child_process';
import fs from 'fs';

const log = execSync('git log -n 15 --pretty=format:"%h|%cd|%s"', { encoding: 'utf8' });
fs.writeFileSync('commits.json', JSON.stringify(log.split('\n').map(l => l.split('|'))));
