import { test, expect } from '@playwright/test';

const settled = async (page: import('@playwright/test').Page) =>
  expect(page.locator('html')).not.toHaveAttribute(
    'data-reading-travel',
    'true',
  );

test('inner invitation button and shared corner arrow reach exactly the same story view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.locator('.unseal-button').click();
  await expect(page.locator('.cover-revisit svg')).toHaveCount(0);
  await expect(page.locator('.next-page')).toBeVisible();
  await expect(page.locator('.cover-revisit')).toHaveCSS(
    'background-color',
    'rgb(144, 46, 44)',
  );
  const arrowPath = await page.locator('.next-page path').getAttribute('d');
  await page.locator('.cover-revisit').click();
  await expect(page.locator('#companionship')).toBeFocused();
  const buttonY = await page.evaluate(() => scrollY);
  await page.locator('.chapter-navigation a[href="#beginning"]').click();
  await page.locator('.unseal-button').click();
  await page.locator('.next-page').click();
  await expect(page.locator('#companionship')).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(buttonY);
  expect(await page.locator('.next-page path').getAttribute('d')).toBe(
    arrowPath,
  );
});

test('one tap reaches each photograph, then twilight, then the full knot, even from between pages', async ({
  page,
}) => {
  for (const height of [664, 844]) {
    await page.setViewportSize({ width: 390, height });
    await page.goto('./');
    await page.getByRole('button', { name: '直接看照片' }).click();
    await settled(page);
    for (let i = 1; i < 5; i++) {
      // Stop partway through the current page, just as a hand drag can.
      await page.evaluate(() => scrollBy({ top: 93, behavior: 'instant' }));
      await page.locator('.next-page').click();
      await settled(page);
      await expect(page.locator(`#photo-${i}`)).toBeFocused();
      const box = await page
        .locator(`#photo-${i} .story-photograph`)
        .boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height + 2);
    }
    await page.locator('.next-page').click();
    await settled(page);
    await expect(page.locator('#tie')).toBeFocused();
    await expect(page.locator('.tie__first')).toHaveCSS('opacity', '1');
    await expect(page.locator('.tie__merged')).toHaveCSS('opacity', '0');
    await expect
      .poll(async () =>
        Number(
          await page
            .locator('.red-thread-canvas')
            .getAttribute('data-progress'),
        ),
      )
      .toBeCloseTo(0.08, 2);
    await expect(page.locator('.next-page')).toHaveAttribute(
      'aria-label',
      '下一步：红线相系',
    );
    await page.locator('.next-page').click();
    await settled(page);
    await expect(page.locator('.tie__merged')).toHaveCSS('opacity', '1');
    await expect(page.locator('.tie__after')).toHaveCSS('opacity', '1');
    await expect(page.locator('.tie__inner')).toBeInViewport({ ratio: 0.98 });
    await page.locator('.next-page').click();
    await settled(page);
    await expect(page.locator('#heartfelt')).toBeFocused();
    await expect(page.locator('#heartfelt .eyebrow').first()).toHaveText(
      '04 / 心意',
    );
    await expect(page.locator('#day')).toHaveCount(0);
    await page.locator('.next-page').click();
    await settled(page);
    await expect(page.locator('#ring')).toBeFocused();
  }
});

test('a touch immediately cancels arrow travel without a delayed correction or focus jump', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./');
  await page.getByRole('button', { name: '直接看照片' }).click();
  await settled(page);
  await page.locator('.next-page').click();
  await page.waitForTimeout(90);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('touchstart'));
    window.scrollBy({ top: -80, behavior: 'instant' });
  });
  const position = await page.evaluate(() => scrollY);
  await page.waitForTimeout(850);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await expect(page.locator('#photo-1')).not.toBeFocused();
  await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
});
