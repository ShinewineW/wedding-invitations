import { test, expect } from '@playwright/test';

test('book cover opens from its left spine over a stationary inner page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto('./');
  await expect(page.locator('.unseal-button')).toBeEnabled();
  const innerBefore = await page.locator('.cover-inside').boundingBox();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).click();
  await page.clock.runFor(650);
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-side',
    'front',
  );
  await expect(page.locator('.cover-front')).toBeVisible();
  await expect(page.locator('.cover-back')).toBeHidden();
  const hinged = (await page.locator('.cover-sheet').boundingBox())!;
  expect(Math.abs(hinged.x)).toBeLessThan(1);
  expect(hinged.width).toBeLessThan(390);
  await expect(page.locator('.cover-sheet')).toHaveCSS(
    'transform-origin',
    '0px 422px',
  );
  expect(await page.locator('.cover-inside').boundingBox()).toEqual(
    innerBefore,
  );
  const frontMatrix = await page
    .locator('.cover-sheet')
    .evaluate((e) => getComputedStyle(e).transform);
  await page.clock.runFor(800);
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-side',
    'back',
  );
  await expect(page.locator('.cover-front')).toBeHidden();
  await expect(page.locator('.cover-sheet')).not.toBeInViewport();
  await expect(page.locator('.cover-inside')).toBeInViewport();
  expect(await page.locator('.cover-inside').boundingBox()).toEqual(
    innerBefore,
  );
  expect(
    await page
      .locator('.cover-sheet')
      .evaluate((e) => getComputedStyle(e).transform),
  ).not.toBe(frontMatrix);
  await expect(page.locator('.opening-cover img')).toHaveCount(1);
  await page.clock.runFor(700);
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'open',
  );
  await expect(page.locator('.cover-sheet')).toBeHidden();
  await expect(page.locator('.cover-page')).toHaveAttribute(
    'aria-hidden',
    'false',
  );
  await expect(page.locator('.cover-revisit')).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('arrows keep vector paths when fonts change, including map disclosure and dialogs', async ({
  page,
}) => {
  await page.goto('./');
  const noTextArrows = async () =>
    expect(await page.locator('body').innerText()).not.toMatch(/[←-⇿➔-➿]/u);
  await noTextArrows();
  await expect(page.locator('.unseal-button svg path')).toHaveCount(1);
  await page.getByRole('button', { name: '直接看照片' }).click();
  await page.getByRole('button', { name: '读第 1 张照片背面的信' }).click();
  await noTextArrows();
  await expect(
    page
      .getByRole('button', { name: '返回照片', exact: true })
      .locator('svg path'),
  ).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.locator('.map-options summary').click();
  await noTextArrows();
  const summary = page.locator('.map-options summary');
  expect(await summary.evaluate((e) => getComputedStyle(e).listStyleType)).toBe(
    'none',
  );
  await expect(summary.locator('svg path')).toHaveCount(1);
  await page.getByRole('button', { name: '保存为图片' }).click();
  await expect(page.locator('.invitation-image')).toBeVisible();
  await noTextArrows();
  await expect(
    page.getByRole('link', { name: '下载图片' }).locator('svg path'),
  ).toHaveCount(1);
  const paths = await page
    .locator('svg.arrow-icon path')
    .evaluateAll((els) => els.map((e) => e.getAttribute('d')));
  await page.addStyleTag({
    content: 'button, a, summary { font-family: system-ui !important; }',
  });
  expect(
    await page
      .locator('svg.arrow-icon path')
      .evaluateAll((els) => els.map((e) => e.getAttribute('d'))),
  ).toEqual(paths);
  expect(
    await page
      .locator('svg.arrow-icon')
      .evaluateAll((els) =>
        els.every(
          (e) =>
            e.getAttribute('aria-hidden') === 'true' &&
            e.getAttribute('focusable') === 'false',
        ),
      ),
  ).toBe(true);
});

test('approved upright numerals stay black with only the day and minutes red in page and PNG', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  const plain = page.locator(
    '.date-display > span, .date-display strong > span, .date-display strong > i, .schedule > div > span, .schedule p',
  );
  for (const element of await plain.all())
    await expect(element).toHaveCSS('color', 'rgb(0, 0, 0)');
  const emphasized = page.locator('.date-display strong em, .schedule em');
  for (const element of await emphasized.all()) {
    await expect(element).toHaveCSS('color', 'rgb(144, 46, 44)');
    await expect(element).toHaveCSS('font-style', 'normal');
    await expect(element).toHaveCSS('font-family', /Wedding Numerals/);
  }
  await page.getByRole('button', { name: '保存为图片' }).click();
  await expect(page.locator('.invitation-image')).toBeVisible();
  const regions = await page
    .locator('.invitation-image')
    .evaluate((element: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(element, 0, 0);
      return [
        [200, 820, 340, 165],
        [540, 820, 340, 165],
        [195, 1080, 122, 85],
        [317, 1080, 135, 85],
      ].map(([x, y, w, h]) => {
        const pixels = ctx.getImageData(x, y, w, h).data;
        let black = 0,
          red = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] < 10 && pixels[i + 1] < 10 && pixels[i + 2] < 10)
            black++;
          if (
            Math.abs(pixels[i] - 144) < 4 &&
            Math.abs(pixels[i + 1] - 46) < 4 &&
            Math.abs(pixels[i + 2] - 44) < 4
          )
            red++;
        }
        return { black, red };
      });
    });
  expect(regions[0].black).toBeGreaterThan(300);
  expect(regions[1].red).toBeGreaterThan(300);
  expect(regions[2].black).toBeGreaterThan(100);
  expect(regions[3].red).toBeGreaterThan(100);
});
