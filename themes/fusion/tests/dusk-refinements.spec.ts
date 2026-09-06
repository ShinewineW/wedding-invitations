import { test, expect } from '@playwright/test';

const jump = async (
  page: import('@playwright/test').Page,
  selector: string,
  p = 0,
) => {
  await page.locator(selector).evaluate((element, progress) => {
    const r = element.getBoundingClientRect();
    scrollTo({
      top: scrollY + r.top + Math.max(0, r.height - innerHeight) * progress,
      behavior: 'instant',
    });
  }, p);
};

test('the pink folded corner never overlaps either full name and its bottom exit restores the photograph', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 664 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    const trigger = page.getByRole('button', { name: '读第 4 张照片背面的信' });
    await trigger.click();
    await page.locator('.stationery-top').scrollIntoViewIfNeeded();
    const fold = await page.locator('.rose-fold').boundingBox();
    const names = await page
      .locator('.stationery-top > span:last-child')
      .boundingBox();
    expect(names!.y).toBeGreaterThan(fold!.y + fold!.height);
    await expect(page.locator('.stationery-top > span:last-child')).toHaveText(
      '汪家喆 & 朱敏',
    );
    const exit = page.getByRole('button', { name: '返回照片', exact: true });
    const bounds = await exit.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await expect(exit.locator('svg path')).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: /上一封|下一封/ }),
    ).toHaveCount(0);
    await exit.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('paper fades simply into night while every intermediate text remains readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  const samples: {
    ground: number[];
    overlayColor: string;
    overlayOpacity: number;
    contrast: number;
  }[] = [];
  for (const p of [0.08, 0.2, 0.35, 0.5, 0.65, 0.82]) {
    await jump(page, '#tie', p);
    await expect
      .poll(async () =>
        Number(
          await page
            .locator('.red-thread-canvas')
            .getAttribute('data-progress'),
        ),
      )
      .toBeCloseTo(p, 2);
    samples.push(
      await page.evaluate(() => {
        const rgb = (value: string) =>
          value
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
        const lum = (c: number[]) =>
          c.reduce((sum, n, i) => {
            const v = n / 255;
            return (
              sum +
              (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) *
                [0.2126, 0.7152, 0.0722][i]
            );
          }, 0);
        const ground = rgb(
          getComputedStyle(
            document.querySelector('.red-thread-stage')!,
          ).getPropertyValue('--thread-ground'),
        );
        const foreground = rgb(
          getComputedStyle(document.querySelector('.tie__headline')!).color,
        );
        const a = lum(ground),
          b = lum(foreground);
        return {
          ground,
          overlayColor: getComputedStyle(
            document.querySelector('.red-thread-night')!,
          ).backgroundColor,
          overlayOpacity: Number(
            getComputedStyle(document.querySelector('.red-thread-night')!)
              .opacity,
          ),
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      }),
    );
  }
  expect(new Set(samples.map((s) => s.ground.join(','))).size).toBe(6);
  for (let i = 0; i < samples.length; i++) {
    expect(samples[i].overlayColor).toBe('rgb(20, 16, 12)');
    [243, 239, 229].forEach((value, channel) => {
      const faded =
        value + ([20, 16, 12][channel] - value) * samples[i].overlayOpacity;
      expect(Math.abs(samples[i].ground[channel] - faded)).toBeLessThanOrEqual(
        1,
      );
    });
    expect(samples[i].contrast).toBeGreaterThanOrEqual(4.5);
    if (i)
      expect(samples[i].ground.reduce((a, b) => a + b)).toBeLessThan(
        samples[i - 1].ground.reduce((a, b) => a + b),
      );
  }
});

test('reduced motion keeps both deliberate knot stops and a complete still ring', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await jump(page, '#tie', 0.08);
  await expect(page.locator('.tie__first')).toHaveCSS('opacity', '1');
  await expect(page.locator('.tie__merged')).toHaveCSS('opacity', '0');
  await page.locator('.next-page').click();
  await expect(page.locator('.tie__merged')).toHaveCSS('opacity', '1');
  await jump(page, '#ring');
  const canvas = page.locator('.red-thread-canvas');
  await expect(canvas).toHaveAttribute('data-phase', /^(heart:ring|ring:)/);
  await expect(page.locator('.ring__message')).toHaveCSS('clip-path', 'none');
  const first = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(200);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    first,
  );
});
