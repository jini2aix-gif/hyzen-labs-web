import { execSync } from 'child_process';
const log = execSync('git log -n 10 --format="%h|%cd|%s"', { encoding: 'utf8' });
console.log(log.split('\n').reverse().join('\n'));
