// The /wedding route and prefixed chunks are already in place after export.
// Relocate public files into the same namespace; keep Pages controls at root.
import { access, mkdir, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'dist/client';
const mount = join(root, 'wedding');
await mkdir(mount, { recursive: true });
await rename(join(root, 'wedding.html'), join(mount, 'index.html'));
await rename(join(root, 'wedding.rsc'), join(mount, 'index.rsc'));
for (const entry of await readdir(root)) {
  if (['wedding', '404.html', '_headers', '_redirects', '_worker.js', '_routes.json'].includes(entry))
    continue;
  await rename(join(root, entry), join(mount, entry));
}
await access(join(mount, 'index.html'));
console.log(
  'Static invitation mounted at /wedding/; root has no invitation index.',
);
