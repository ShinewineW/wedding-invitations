import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = (process.env.DEMO_BASE_PATH || '/wedding-invitations').replace(/\/$/, '');
if (!/^\/[a-zA-Z0-9_-]+$/.test(base)) throw new Error('DEMO_BASE_PATH must be one repository path, such as /wedding-invitations');
const output = join(root, 'site');
// Always rebuild from placeholders, even after a local real-photo build.
const build = spawnSync(process.execPath, ['scripts/themes.mjs', 'build'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, WEDDING_ASSETS: 'placeholder' },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const themes = {
  yusheng: { source: 'themes/yusheng/dist/client/wedding', replacements: [['/wedding/', `${base}/yusheng/`]] },
  tongxin: { source: 'themes/tongxin/dist', replacements: [] },
  fusion: { source: 'themes/fusion/dist/client/wedding2', replacements: [['/wedding2/', `${base}/fusion/`]] },
  hunbei: { source: 'themes/hunbei/dist', replacements: [['/wedding2/', `${base}/hunbei/wedding2/`], ['/assets/', `${base}/hunbei/assets/`], ['/paper-grain.svg', `${base}/hunbei/paper-grain.svg`]] },
};
const images = [];
for (const [theme, config] of Object.entries(themes)) {
  const target = join(output, theme);
  await cp(join(root, config.source), target, { recursive: true });
  async function rewrite(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) await rewrite(file);
      else if (/\.(html|js|css|rsc|json|svg)$/.test(entry.name)) {
        let text = await readFile(file, 'utf8');
        for (const [from, to] of config.replacements) text = text.replaceAll(from, to);
        await writeFile(file, text);
      } else if (/\.(jpe?g|webp|png)$/i.test(entry.name)) {
        images.push({ path: relative(output, file), sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
      }
    }
  }
  await rewrite(target);
}
await cp(join(root, 'demo/index.html'), join(output, 'index.html'));
await cp(join(root, 'demo/style.css'), join(output, 'style.css'));
await writeFile(join(output, '.nojekyll'), '');
await writeFile(join(output, 'demo-manifest.json'), JSON.stringify({ assetMode: 'placeholder', basePath: base, themes: Object.keys(themes), images }, null, 2) + '\n');
console.log(`Prepared four placeholder-only demos at ${base}/; ${images.length} images in site/.`);
