// Gallery originals stay outside the public directory. Rebuild responsive
// files from those originals; the two approved cover JPEGs remain untouched.
import sharp from 'sharp';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

const sourceDir = 'assets/photo-originals';
const outputDir = 'public/images';
await mkdir(outputDir, { recursive: true });
sharp.concurrency(1);
const photos = [];
for (const file of (await readdir(sourceDir))
  .filter((file) => file.endsWith('.jpg'))
  .sort()) {
  const source = join(sourceDir, file);
  const { width, height } = await sharp(source).metadata();
  const widths = width > height ? [768, 1280, 1920, 2560] : [768, 1280, 1920];
  const variants = [];
  for (const targetWidth of widths) {
    const output = `${basename(file, '.jpg')}-${targetWidth}.webp`;
    const result = await sharp(source)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 86, effort: 5 })
      .toFile(join(outputDir, output));
    variants.push({
      file: output,
      width: result.width,
      height: result.height,
      bytes: result.size,
    });
  }
  photos.push({
    original: file,
    width,
    height,
    sha256: createHash('sha256')
      .update(await readFile(source))
      .digest('hex'),
    variants,
  });
}
await writeFile(
  'assets/photo-variants.json',
  JSON.stringify({ format: 'webp', quality: 86, photos }, null, 2) + '\n',
);
console.log(
  `Prepared ${photos.length} gallery photographs in ${photos.reduce((count, photo) => count + photo.variants.length, 0)} responsive sizes; original covers unchanged.`,
);
