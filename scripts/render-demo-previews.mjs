import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { startDemoServer } from './serve-demo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../themes/fusion/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const manifest = JSON.parse(await readFile(join(root, 'site/demo-manifest.json'), 'utf8'));
assert.equal(manifest.assetMode, 'placeholder');
const { server, url } = await startDemoServer(0);
const browser = await chromium.launch();
const results = [];
try {
  await mkdir(join(root, 'site/previews'), { recursive: true });
  for (const theme of manifest.themes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.failure()?.errorText} ${request.url()}`); });
    const response = await page.goto(`${url}${theme}/`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(image => image.loading !== 'lazy').map(image => image.decode())); });
    if (theme === 'hunbei') await page.waitForFunction(() => document.documentElement.dataset.exportReady === 'true');
    const screenshot = await page.screenshot({ animations: 'disabled' });
    await sharp(screenshot).webp({ quality: 86 }).toFile(join(root, `site/previews/${theme}.webp`));
    if (theme === 'yusheng' || theme === 'fusion') {
      await page.getByRole('button', { name: '展信，展开我们的婚礼邀请', exact: true }).click();
      await page.getByRole('button', { name: '继续读我们的故事', exact: true }).click();
      await page.getByRole('button', { name: '保存为图片', exact: true }).click();
      await page.locator('.invitation-image').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: '收起邀请图片', exact: true }).click();
    }
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < pageHeight; y += 700) {
      await page.evaluate(value => window.scrollTo(0, value), y);
      await page.waitForTimeout(50);
    }
    const broken = await page.evaluate(async () => {
      const failed = [];
      for (const image of document.images) {
        try { await image.decode(); } catch { failed.push(image.getAttribute('src')); }
      }
      return failed;
    });
    assert.deepEqual(broken, [], `${theme}: broken images`);
    assert.deepEqual(errors, [], `${theme}: browser errors`);
    results.push({ theme, viewport: '390x844', imageDecode: 'passed', runtime: 'passed', preview: `previews/${theme}.webp` });
    await page.close();
  }
  await writeFile(join(root, 'site/demo-checks.json'), JSON.stringify({ assetMode: 'placeholder', results }, null, 2) + '\n');
  console.log('Four demos passed browser checks; four placeholder-only README previews rendered.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
