import { test, expect } from '@playwright/test';

test('heart papers open in a fan, settle without overlap and replay on re-entry', async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('./');
    await expect(page.locator('.unseal-button')).toBeEnabled();
    const row = page.locator('.heart-letters');
    await expect(row).toHaveAttribute('data-fan', 'folded');
    await row.evaluate((e) =>
      e.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await expect(row).toHaveAttribute('data-fan', 'opening');
    const sample = (time: number) =>
      row.evaluate((e, t) => {
        const animations = e.getAnimations({ subtree: true });
        animations.forEach((animation) => {
          animation.pause();
          animation.currentTime = t;
        });
        return [...e.querySelectorAll('.heart-letter')].map(
          (paper) => getComputedStyle(paper).transform,
        );
      }, time);
    const folded = await sample(0);
    const middle = await sample(550);
    expect(middle[0]).not.toBe(folded[0]);
    expect(middle[1]).not.toBe(folded[1]);
    expect(folded[0].startsWith('matrix3d')).toBe(width > 700);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await row.evaluate((e) =>
      e.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(row).toHaveAttribute('data-fan', 'open');
    const left = (await row.locator('.heart-letter-left').boundingBox())!;
    const right = (await row.locator('.heart-letter-right').boundingBox())!;
    expect(left.x + left.width).toBeLessThan(right.x);
    if (width < 700) {
      const invite = (await page.locator('.heart-invite').boundingBox())!;
      expect(invite.y + invite.height).toBeLessThan(left.y);
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await expect(row).toHaveAttribute('data-fan', 'folded');
    await row.evaluate((e) =>
      e.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await expect(row).toHaveAttribute('data-fan', 'opening');
    await expect(row).toHaveAttribute('data-fan', 'open');
    await row.locator('.heart-letter-left').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(row.locator('.heart-letter-left')).toBeFocused();
  }
});

test('reduced motion shows both papers immediately and keyboard reading remains available', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./');
  const row = page.locator('.heart-letters');
  await expect(row).toHaveAttribute('data-fan', 'open');
  await row.evaluate((e) =>
    e.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  expect(
    await row.evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await row.locator('.heart-letter-right').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(row.locator('.heart-letter-right')).toBeFocused();
});
