import { readFile, mkdir, rm, copyFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'assets/photo-map.json'), 'utf8'));
const theme = process.argv[2];
if (theme && !Object.hasOwn(manifest, theme)) throw new Error(`Unknown theme: ${theme}`);
const mode = process.env.WEDDING_ASSETS || 'placeholder';
if (!['placeholder', 'local'].includes(mode)) throw new Error('WEDDING_ASSETS must be placeholder or local');
const placeholder = await readFile(join(root, 'assets/placeholders/photo.svg'));
sharp.concurrency(1);

for (const name of theme ? [theme] : Object.keys(manifest)) {
  const { directories, photos } = manifest[name];
  const project = join(root, 'themes', name);
  const privateRoot = join(root, '.local/photos', name);
  // Check the complete local input set before replacing generated images.
  if (mode === 'local') {
    for (const photo of photos) {
      await access(join(privateRoot, photo.path)).catch(() => {
        throw new Error(`Missing local photo: .local/photos/${name}/${photo.path}`);
      });
    }
  }
  for (const directory of directories) {
    await rm(join(project, directory), { recursive: true, force: true });
    await mkdir(join(project, directory), { recursive: true });
  }
  for (const photo of photos) {
    const destination = join(project, photo.path);
    await mkdir(dirname(destination), { recursive: true });
    if (mode === 'local') await copyFile(join(privateRoot, photo.path), destination);
    else await sharp(placeholder).resize(photo.width, photo.height, { fit: 'fill' }).toFile(destination);
  }
  console.log(`${name}: prepared ${photos.length} ${mode} images`);
}
