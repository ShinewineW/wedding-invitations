import { test, expect } from '@playwright/test';

test('fusion keeps the cover, adds only the desktop invitation, and orders all six chapters', async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('./');
    await expect(page).toHaveTitle(/一线 · 同心/);
    await expect(page.locator('.cover-title')).toHaveText('一线·同心');
    await expect(page.locator('.cover-prefix')).toHaveText('朱敏 & 汪家喆');
    await expect(page.locator('.cover-invitation'))[
      width > 700 ? 'toBeVisible' : 'toBeHidden'
    ]();
    await expect(page.locator('.unseal-hint')).toHaveCount(0);
    expect(
      await page.locator('.chapter-navigation a').allTextContents(),
    ).toEqual([
      '01 展信',
      '02 牵线',
      '03 相系',
      '04 心意',
      '05 圆满',
      '06 敬邀',
    ]);
    expect(
      await page.locator('.story img').nth(3).getAttribute('src'),
    ).toContain('5A8A1854-');
    expect(
      await page.locator('.story img').nth(4).getAttribute('src'),
    ).toContain('5A8A6596-');
    await expect(page.locator('[data-chapter="pull"]')).toHaveCount(0);
  }
});

test('the moving cord avoids the inner title and rests quietly in reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('./');
    await page
      .getByRole('button', { name: '展信，展开我们的婚礼邀请' })
      .click();
    await page.waitForTimeout(100);
    const coveredPixels = await page
      .locator('.red-thread-canvas')
      .evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!;
        const scale = canvas.width / innerWidth;
        return ['inside-title', 'inside-names'].map((anchor) => {
          const r = document
            .querySelector(`[data-redline-anchor="${anchor}"]`)!
            .getBoundingClientRect();
          const bytes = ctx.getImageData(
            r.left * scale,
            r.top * scale,
            r.width * scale,
            r.height * scale,
          ).data;
          let count = 0;
          for (let i = 3; i < bytes.length; i += 4) if (bytes[i] > 20) count++;
          return count;
        });
      });
    expect(coveredPixels).toEqual([0, 0]);
    const before = await page
      .locator('.red-thread-canvas')
      .evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await page.waitForTimeout(300);
    expect(
      await page
        .locator('.red-thread-canvas')
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    ).toBe(before);
  }
});

test('photo silk breathes, responds to scrolling and settles when reduced motion is enabled', async ({
  page,
}) => {
  await page.goto('./');
  await page
    .locator('#photo-1')
    .evaluate((el) =>
      el.scrollIntoView({ block: 'start', behavior: 'instant' }),
    );
  await page.waitForTimeout(150);
  const path = page.locator('.photo-thread-cord > path');
  const idle = await path.getAttribute('d');
  await page.waitForTimeout(350);
  expect(await path.getAttribute('d')).not.toBe(idle);
  await page.evaluate(() => scrollBy({ top: 120, behavior: 'instant' }));
  await page.waitForTimeout(150);
  expect(await path.getAttribute('d')).not.toBe(idle);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const still = await path.getAttribute('d');
  await page.waitForTimeout(300);
  expect(await path.getAttribute('d')).toBe(still);
});

test('the moving cord leaves all five captions clear without a full-page bitmap mask', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.photo-thread-cord mask')).toHaveCount(0);
    await expect(page.locator('[data-caption-clip]')).toHaveAttribute(
      'clip-rule',
      'evenodd',
    );
    await expect
      .poll(() =>
        page.locator('.photo-thread-cord').evaluate((svg: SVGSVGElement) => {
          const clip = svg.querySelector('[data-caption-clip]')!;
          const shape = new Path2D(clip.getAttribute('d') || '');
          const context = document.createElement('canvas').getContext('2d')!;
          const inverse = svg.getScreenCTM()!.inverse();
          const excluded = [
            ...document.querySelectorAll('.story-caption'),
          ].every((el) => {
            const r = el.getBoundingClientRect();
            return [
              [r.left - 7, r.top - 7],
              [r.left + r.width / 2, r.top + r.height / 2],
              [r.right + 7, r.bottom + 7],
            ].every(([x, y]) => {
              const p = new DOMPoint(x, y).matrixTransform(inverse);
              return !context.isPointInPath(shape, p.x, p.y, 'evenodd');
            });
          });
          const first = JSON.parse(svg.dataset.joins || '[]')[0];
          return (
            excluded &&
            Boolean(first) &&
            context.isPointInPath(shape, first.topX, first.top + 10, 'evenodd')
          );
        }),
      )
      .toBe(true);
  }
});
