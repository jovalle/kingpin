import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./enable_web_bluetooth.py',import.meta.url));
const choices=process.platform==='win32'?[['py','-3'],['python']]:[['python3'],['python']];
for (const [command,...prefix] of choices) {
  const result=spawnSync(command,[...prefix,script,...process.argv.slice(2)],{stdio:'inherit'});
  if (result.error?.code==='ENOENT') continue;
  if (result.error) {console.error(result.error.message);process.exit(1)}
  process.exit(result.status ?? 1);
}
console.error('Python 3 is required. Install it, then run this command again.');
process.exit(1);
