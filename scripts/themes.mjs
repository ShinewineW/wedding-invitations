import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const themes = ['yusheng', 'tongxin', 'fusion', 'hunbei'];
const [action, ...args] = process.argv.slice(2);
const selected = args.filter(arg => arg !== '--local');
if (!['install', 'build'].includes(action) || selected.some(name => !themes.includes(name))) {
  throw new Error('Usage: node scripts/themes.mjs <install|build> [theme ...] [--local]');
}
for (const theme of selected.length ? selected : themes) {
  const result = spawnSync('npm', action === 'install' ? ['ci'] : ['run', 'build'], {
    cwd: fileURLToPath(new URL(`../themes/${theme}/`, import.meta.url)),
    stdio: 'inherit',
    env: { ...process.env, WEDDING_ASSETS: args.includes('--local') ? 'local' : 'placeholder' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
