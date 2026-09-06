import fs from 'node:fs';
import crypto from 'node:crypto';
import postcss from 'postcss';

// The manifest pins this theme's own snapshot; provenance is informational only.
// Photographs are supplied independently by the repository asset preparation step.
const manifest = JSON.parse(fs.readFileSync('source-manifest.json', 'utf8'));
const mismatches = manifest.files.filter(({ snapshot, sha256 }) =>
  !fs.existsSync(snapshot) ||
  crypto.createHash('sha256').update(fs.readFileSync(snapshot)).digest('hex') !== sha256
);
if (mismatches.length) throw new Error(`Snapshot drift: ${mismatches.map(file => file.snapshot).join(', ')}`);
const styles = ['globals', 'cover', 'correspondence', 'image-save', 'arrows', 'red-thread', 'fusion', 'thread-path', 'dusk-ring'];
const matchesMobile = (query) => query.split(',').some(part => {
  if (/print|prefers-reduced-motion/.test(part)) return false;
  if (/orientation:\s*landscape/.test(part)) return false;
  for (const [, bound, dimension, value] of part.matchAll(/(min|max)-(width|height):\s*(\d+)px/g)) {
    const actual = dimension === 'width' ? 375 : 812;
    if (bound === 'max' ? actual > Number(value) : actual < Number(value)) return false;
  }
  return true;
});
let css = fs.readFileSync('vendor-source/tailwind-preflight.css', 'utf8');
for (const name of styles) {
  const root = postcss.parse(fs.readFileSync(`vendor-source/app/${name}.css`, 'utf8'));
  root.walkAtRules(rule => {
    if (rule.name === 'import' || rule.name === 'theme') rule.remove();
    else if (rule.name === 'media') {
      if (matchesMobile(rule.params)) rule.replaceWith(rule.nodes);
      else rule.remove();
    }
  });
  root.walkDecls(decl => {
    decl.value = decl.value.replace(/(-?[\d.]+)(svh|svw|vmin|vmax|vw|vh)\b/g,
      (_, n, unit) => `${+(Number(n) * (/svh|vh|vmax/.test(unit) ? 8.12 : 3.75)).toFixed(5)}px`);
    decl.value = decl.value.replaceAll("'./assets/", "'../vendor-source/app/assets/").replaceAll("'../public/paper-grain.svg'", "'/paper-grain.svg'");
  });
  css += `\n/* Source: app/${name}.css; evaluated at 375 × 812. */\n${root.toString()}\n`;
}
fs.writeFileSync('src/source-mobile.css', css);
const threadSource = fs.readFileSync('vendor-source/components/red-thread/PhotoThread.tsx', 'utf8');
const motifSource = threadSource.slice(threadSource.indexOf('type Point ='), threadSource.indexOf('const cubic ='));
fs.writeFileSync('src/motifs.ts', '// Exact static silhouettes from vendor-source/components/red-thread/PhotoThread.tsx.\n' + motifSource.replace('const MOTIFS:', 'export const MOTIFS:'));
console.log(`Prepared fixed mobile CSS and verified ${manifest.files.length} pinned source assets.`);
