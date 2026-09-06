import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'exports/panels/13-invitation.png');
const output = path.join(root, 'exports/map-insertion');
await fs.mkdir(output, { recursive: true });
const cut = 1764;
const gap = 440;
const { width, height } = await sharp(source).metadata();
if (width !== 750 || height !== 2166) throw new Error('Unexpected invitation dimensions');
const upper = await sharp(source).extract({ left: 0, top: 0, width, height: cut }).png().toBuffer();
// Continue the existing blank paper behind the user's 220 px native map.
const paper = await sharp(source).extract({ left: 0, top: cut - 20, width, height: 20 }).resize(width, gap, { fit: 'fill' }).png().toBuffer();
const top = await sharp({ create: { width, height: cut + gap, channels: 3, background: '#faf7f0' } })
  .composite([{ input: upper, top: 0, left: 0 }, { input: paper, top: cut, left: 0 }]).png().toBuffer();
const bottom = await sharp(source).extract({ left: 0, top: cut, width, height: height - cut }).png().toBuffer();
for (const [name, bytes] of [['13a-invitation-map-space', top], ['13b-invitation-footer', bottom]]) {
  await fs.writeFile(path.join(output, name + '.png'), bytes);
  await sharp(bytes).jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toFile(path.join(output, name + '.jpg'));
}
const originalRaw = await sharp(source).removeAlpha().raw().toBuffer();
const upperRaw = await sharp(top).extract({ left: 0, top: 0, width, height: cut }).removeAlpha().raw().toBuffer();
const lowerRaw = await sharp(bottom).removeAlpha().raw().toBuffer();
if (!Buffer.concat([upperRaw, lowerRaw]).equals(originalRaw)) throw new Error('Split changed source pixels');
const manifest = {
  source: 'exports/panels/13-invitation.png', cutPixelY: cut, insertedPaperPixels: gap,
  sourceContentPixelIdentical: true, hunbeiHeight: 20000,
  upper: { file: '13a-invitation-map-space.jpg', x: 0, y: 8698, width: 375, height: 1102 },
  map: { x: 86, y: 9580, width: 220, height: 220, preservedUserPosition: true },
  // The editor caps its height at 20000; fit the 201 px footer into 200 CSS px.
  lower: { file: '13b-invitation-footer.jpg', x: 0, y: 9800, width: 375, height: 200 },
};
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest));
