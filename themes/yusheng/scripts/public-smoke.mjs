import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const baseURL = new URL(
  `${(process.env.TEST_URL || 'http://localhost:3000/wedding').replace(/\/$/, '')}/`,
);
const outputDir = process.env.EVIDENCE_DIR || 'release/validation/mobile';
await mkdir(outputDir, { recursive: true });
const results = [];
for (const { name, type, device } of [
  { name: 'iphone', type: webkit, device: devices['iPhone 13'] },
  { name: 'android', type: chromium, device: devices['Pixel 7'] },
]) {
  const browser = await type.launch();
  const page = await browser.newPage({ ...device });
  const failures = [],
    external = [],
    errors = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() });
  });
  page.on('request', (r) => {
    if (new URL(r.url()).origin !== baseURL.origin) external.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  const start = Date.now();
  await page.goto(baseURL.href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${outputDir}/${name}-cover.png` });
  const initialLoadMs = Date.now() - start;
  await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).tap();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'open',
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: `${outputDir}/${name}-inside.png` });
  await page.getByRole('button', { name: '继续读我们的故事' }).tap();
  await expect(page.locator('#photo-0')).toBeFocused();
  await page
    .getByRole('button', { name: '翻看照片 01：在你身旁', exact: true })
    .tap();
  const papers = ['letter', 'memo', 'postcard', 'book'];
  for (let i = 0; i < papers.length; i++) {
    await expect(page.locator('.stationery')).toHaveAttribute(
      'data-paper',
      papers[i],
    );
    await page.locator('.stationery').evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    await page.screenshot({ path: `${outputDir}/${name}-note-${i}.png` });
    await page
      .getByRole('button', {
        name: i === 3 ? '收好这封信' : '下一封信',
        exact: true,
      })
      .tap();
  }
  for (const id of [
    'photo-1',
    'photo-2',
    'photo-3',
    'heartfelt',
    'invitation',
  ]) {
    await page.locator('.next-page').tap();
    await expect(page.locator(`#${id}`)).toBeFocused();
  }
  await page.locator('.date-display').scrollIntoViewIfNeeded();
  await expect(page.locator('.venue p')).toHaveText('黄山市歙县徽苑一楼');
  await expect(page.locator('.venue > span')).toHaveText('2号厅');
  await page.locator('.map-options summary').tap();
  await expect(
    page.getByRole('link', { name: '高德地图网页版' }),
  ).toBeVisible();
  await page.screenshot({ path: `${outputDir}/${name}-invitation.png` });
  await page.getByRole('button', { name: '保存为图片' }).tap();
  await expect(page.locator('.invitation-image')).toBeVisible();
  const imageSize = await page
    .locator('.invitation-image')
    .evaluate((e) => [e.naturalWidth, e.naturalHeight]);
  const saving = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载图片' }).tap();
  const download = await saving;
  await download.saveAs(`${outputDir}/${name}-keepsake.png`);
  await page.getByRole('button', { name: '收起邀请图片' }).tap();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: '保存为图片' })).toBeFocused();
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'instant',
    }),
  );
  await expect(page.locator('.next-page')).toHaveAttribute(
    'data-at-end',
    'true',
  );
  await page.getByRole('link', { name: '回到请柬开头' }).tap();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'closed',
  );
  await expect(
    page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }),
  ).toBeInViewport();
  await page.screenshot({ path: `${outputDir}/${name}-returned-cover.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  results.push({
    name,
    initialLoadMs,
    errors,
    external,
    failures,
    overflow,
    imageSize,
  });
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(overflow).toBe(false);
  expect(imageSize).toEqual([1080, 1620]);
  await browser.close();
}
await writeFile(
  `${outputDir}/mobile-smoke.json`,
  JSON.stringify(results, null, 2),
);
console.log(results);
