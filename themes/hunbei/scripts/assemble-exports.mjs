import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'exports');
const input = path.join(out, 'complete-mobile.png');
const layout = JSON.parse(await fs.readFile(path.join(out, 'layout.json'), 'utf8'));
const meta = await sharp(input).metadata();
const scale = meta.width / layout.width;
if (Math.abs(scale - 2) > .01) throw new Error(`Expected 2x mobile capture, got ${scale}`);
if (Math.abs(meta.height - Math.ceil(layout.height * scale)) > 2) {
  throw new Error(`Capture height ${meta.height} does not match layout ${layout.height}`);
}
await fs.mkdir(path.join(out, 'panels'), { recursive: true });
const outputs = [];
const thumbs = [];
for (const [index, panel] of layout.panels.entries()) {
  const top = Math.round(panel.y * scale);
  const bottom = Math.min(meta.height, Math.round((panel.y + panel.height) * scale));
  const region = { left: 0, top, width: meta.width, height: bottom - top };
  const stem = `${String(index + 1).padStart(2, '0')}-${panel.id}`;
  const png = path.join(out, 'panels', `${stem}.png`);
  const jpg = path.join(out, 'panels', `${stem}.jpg`);
  await sharp(input).extract(region).png().toFile(png);
  await sharp(input).extract(region).jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toFile(jpg);
  const thumb = await sharp(input).extract(region).resize({ width: 250, height: 680, fit: 'contain', background: '#e7e3dd' }).png().toBuffer();
  thumbs.push({ input: thumb, left: (index % 3) * 270 + 10, top: Math.floor(index / 3) * 700 + 10 });
  outputs.push({
    id: panel.id, png: path.relative(root, png), jpg: path.relative(root, jpg), ...region,
    hunbeiPlacement: {
      x: 0, y: Math.round(top / scale), width: layout.width,
      height: Math.round(bottom / scale) - Math.round(top / scale),
    },
  });
}
await sharp(input).jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toFile(path.join(out, 'hunbei-complete.jpg'));
await sharp({ create: { width: 810, height: Math.ceil(thumbs.length / 3) * 700, channels: 3, background: '#e7e3dd' } }).composite(thumbs).png().toFile(path.join(out, 'contact-sheet.png'));
const jpgBytes = await fs.readFile(path.join(out, 'hunbei-complete.jpg'));
const manifest = {
  cssWidth: layout.width, cssHeight: layout.height,
  pixelWidth: meta.width, pixelHeight: meta.height,
  hunbeiHeight: Math.round(meta.height / scale) * 2,
  hunbeiUploadStrategy: 'section-images',
  file: 'exports/hunbei-complete.jpg', bytes: jpgBytes.length,
  sha256: crypto.createHash('sha256').update(jpgBytes).digest('hex'),
  panels: outputs,
};
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ file: manifest.file, pixelWidth: meta.width, pixelHeight: meta.height, bytes: manifest.bytes, panels: outputs.length }));
