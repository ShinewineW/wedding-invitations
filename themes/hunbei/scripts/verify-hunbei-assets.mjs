import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(await fs.readFile(path.join(root, 'exports/manifest.json')));
const inventory = JSON.parse(await fs.readFile(path.join(root, 'evidence/hunbei-assets/manifest.json')));
// IDs below were read from the saved Hunbei page's rendered image inventory.
const assetIds = ['b2f13ee5af08d37c', 'e3ea68281ec728a9', 'f9a1cd161db0cf79', 'd9cc3b241bbf90b2', 'a5409cc0878dfc93', '77670adb3a41ba14', '6ebc1973fe232b00', '1c98d5a6fda0e915', 'a3d816d361f172be', '82f10b46a0eea8d1', '7ea59e1ad09c2610', '2e6d4920b8952080', '47b21fd0e18709d4'];
// Integer CSS bounds read back after saving and reloading the editor.
const boundaries = [0, 812, 1192, 1512, 2530, 3580, 4657, 5779, 6765, 7065, 7655, 8238, 8698, 9781];
const layers = [];
const composite = [];
for (let i = 0; i < assetIds.length; i++) {
  const original = source.panels[i];
  const asset = inventory.assets.find(a => a.id === assetIds[i]);
  assert(asset, `Missing downloaded image: ${original.id}`);
  const local = path.join(root, 'evidence/hunbei-assets', path.basename(asset.path));
  const metadata = await sharp(local).metadata();
  assert.equal(metadata.width, original.width, `${original.id} width`);
  assert.equal(metadata.height, original.height, `${original.id} height`);
  const a = await sharp(path.join(root, original.jpg)).removeAlpha().raw().toBuffer();
  const b = await sharp(local).removeAlpha().raw().toBuffer();
  assert.equal(a.length, b.length);
  let absoluteError = 0;
  let squaredError = 0;
  for (let p = 0; p < a.length; p++) {
    const delta = a[p] - b[p];
    absoluteError += Math.abs(delta);
    squaredError += delta * delta;
  }
  const height = boundaries[i + 1] - boundaries[i];
  layers.push({
    id: original.id, local, url: asset.url,
    sourcePixels: [metadata.width, metadata.height],
    savedCss: { x: 0, y: boundaries[i], width: 375, height },
    meanAbsoluteChannelError: +(absoluteError / a.length).toFixed(3),
    psnrDb: +(10 * Math.log10(255 ** 2 / (squaredError / a.length))).toFixed(2),
  });
  composite.push({ input: await sharp(local).resize(750, height * 2, { fit: 'cover' }).toBuffer(), left: 0, top: boundaries[i] * 2 });
}
assert.equal(layers.length, 13);
await sharp({ create: { width: 750, height: 19562, channels: 3, background: '#f3efe6' } })
  .composite(composite).jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(path.join(root, 'evidence/hunbei-assets-reconstructed.jpg'));
const report = {
  editor: process.env.HUNBEI_EDITOR_URL || null,
  invitation: process.env.HUNBEI_INVITATION_URL || null,
  mobileViewport: [375, 812],
  savedEditorHeight: 19562,
  savedAfterReload: true,
  nativeMusic: 'A Thousand Years',
  playbackObserved: true,
  replyForms: false,
  giftToolbar: false,
  navigation: {
    configuredPoi: '歙县徽苑一楼(徽国府店)',
    address: '安徽省黄山市歙县披云路1号水畔漫心谷',
    basis: 'Hunbei map search result; branch not explicitly confirmed by user',
    previewResult: '请分享后使用此功能',
  },
  allDownloadedImagesKeepOriginalDimensions: true,
  reconstructionNote: 'Reconstruction from the 13 images actually served by Hunbei, using saved layer positions; not a browser screenshot. Native controls are excluded.',
  layers,
};
await fs.writeFile(path.join(root, 'evidence/hunbei-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ images: layers.length, dimensions: '13/13 unchanged', cssHeight: 9781, maxMeanChannelError: Math.max(...layers.map(x => x.meanAbsoluteChannelError)), minPsnrDb: Math.min(...layers.map(x => x.psnrDb)) }));
