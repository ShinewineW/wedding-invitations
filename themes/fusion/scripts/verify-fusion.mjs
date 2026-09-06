import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.TEST_URL || 'http://127.0.0.1:4175/wedding2/';
const output = process.env.EVIDENCE_DIR || 'release/validation/fusion';
await mkdir(output, { recursive: true });
const results = [];
/** @type {[string, typeof chromium, {width: number, height: number}, boolean][]} */
const cases = [
  ['desktop', chromium, { width: 1440, height: 1000 }, false],
  ['phone', webkit, { width: 390, height: 844 }, false],
  ['small', webkit, { width: 320, height: 568 }, true],
];
for (const [name, browserType, viewport, reduced] of cases) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference', isMobile: name !== 'desktop', hasTouch: name !== 'desktop', deviceScaleFactor: 1 });
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() }); });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const shot = async label => page.screenshot({ path: `${output}/${name}-${label}.png` });
  const canvasPixels = () => page.locator('.red-thread-canvas').evaluate(c => {
    const data = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let n = 0; for (let i=3;i<data.length;i+=4) if(data[i]>20)n++;return n;
  });
  await shot('cover');
  const closedPixels = await canvasPixels();
  await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).click();
  await page.waitForFunction(() => document.querySelector('.opening-cover').dataset.phase === 'open');
  await page.waitForTimeout(800);
  const innerPixels = await canvasPixels();
  const scrollAfterOpen = await page.evaluate(() => scrollY);
  await shot('inside');
  const sections = [ ['intro','#companionship',0], ['photo','#photo-1',0], ['rose','#photo-3',0], ['tie','#tie',0.6], ['heart','#heartfelt',0], ['ring','#ring',0] ];
  const geometry = {};
  for (const [label, selector, p] of sections) {
    await page.locator(selector).evaluate((el,p) => scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.clientHeight-innerHeight)*p,behavior:'instant'}),p);
    await page.waitForTimeout(reduced ? 150 : 950);
    await shot(label);
    geometry[label] = await page.locator(selector).evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  }
  await page.getByRole('button', { name: '读第 4 张照片背面的信' }).click();
  await shot('rose-note');
  await page.keyboard.press('Escape');
  await page.locator('.heart-letters').evaluate(el => el.scrollIntoView({block:'center',behavior:'instant'}));
  await page.waitForTimeout(1700);
  await shot('heart');
  await page.locator('#invitation').evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
  await shot('invitation');
  const widths = await page.evaluate(() => ({ doc:document.documentElement.scrollWidth, view:innerWidth }));
  const finalPixels = await canvasPixels();
  const assets = await page.locator('img[src],script[src],link[rel="stylesheet"]').evaluateAll(els=>els.map(el=>el.getAttribute('src')||el.getAttribute('href')));
  results.push({ name, url, errors, failed, widths, closedPixels, innerPixels, finalPixels, scrollAfterOpen, assets, geometry });
  await browser.close();
}
await writeFile(`${output}/report.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(({assets: _assets,geometry: _geometry,...r})=>r),null,2));
if(results.some(r=>r.errors.length||r.failed.length||r.widths.doc>r.widths.view+1||r.closedPixels||!r.innerPixels||r.scrollAfterOpen))process.exitCode=1;
