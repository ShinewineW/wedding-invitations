import { test, expect, type Page } from '@playwright/test';

// Inspect the actual ribbon pixels: a state flag alone cannot prove a closed ring.
const ringPixels = (page: Page) =>
  page.locator('.red-thread-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const r = document
      .querySelector('[data-ring-center]')!
      .getBoundingClientRect();
    const cx = r.x + r.width / 2,
      cy = r.y + r.height / 2;
    const scale = canvas.width / innerWidth;
    const data = canvas
      .getContext('2d')!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const distances: number[] = [],
      angles = new Set<number>();
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] < 96) continue;
        const dx = (x + 0.5) / scale - cx,
          dy = (y + 0.5) / scale - cy;
        distances.push(Math.hypot(dx, dy));
        angles.add(
          Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 72) %
            72,
        );
      }
    distances.sort((a, b) => a - b);
    const radius = distances[Math.floor(distances.length / 2)] || 0;
    const errors = distances
      .map((d) => Math.abs(d - radius))
      .sort((a, b) => a - b);
    return {
      pixels: distances.length,
      radius,
      angularBins: angles.size,
      deviation95: errors[Math.floor(errors.length * 0.95)] || Infinity,
    };
  });

async function expectComplete(page: Page) {
  await expect(page.locator('.red-thread-canvas')).toHaveAttribute(
    'data-phase',
    /^(heart:ring|ring:)/,
  );
  expect(await page.locator('#ring').getAttribute('data-ring-state')).toBe(
    'closed',
  );
  await expect(page.locator('.ring__message')).toHaveCSS('clip-path', 'none');
  const pixels = await ringPixels(page);
  expect(pixels.pixels).toBeGreaterThan(300);
  expect(pixels.radius).toBeGreaterThan(80);
  expect(pixels.angularBins).toBeGreaterThanOrEqual(70);
  expect(pixels.deviation95).toBeLessThan(5);
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 664 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`round invitation is complete on arrow arrival, direct entry and return at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.chapter-navigation a[href="#heartfelt"]').click();
    await expect(page.locator('#heartfelt')).toBeFocused();
    await page.locator('.next-page').click();
    await expect(page.locator('#ring')).toBeFocused();
    await expectComplete(page);
    const y = await page.evaluate(() => scrollY);
    await page.waitForTimeout(350);
    await expectComplete(page);
    expect(await page.evaluate(() => scrollY)).toBe(y);
    await page
      .locator('#invitation')
      .evaluate((el) =>
        el.scrollIntoView({ block: 'start', behavior: 'instant' }),
      );
    await page
      .locator('#ring')
      .evaluate((el) =>
        el.scrollIntoView({ block: 'start', behavior: 'instant' }),
      );
    await expectComplete(page);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator('#ring')
      .evaluate((el) =>
        el.scrollIntoView({ block: 'start', behavior: 'instant' }),
      );
    await expectComplete(page);
  });
}
