import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('slow first load only offers opening and saving once their handlers are ready', async ({
  page,
}) => {
  let releaseScripts!: () => void;
  const scripts = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route('**/*.js', async (route) => {
    await scripts;
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'commit' });
  const unseal = page.getByRole('button', { name: '展信，展开我们的婚礼邀请' });
  const save = page.getByRole('button', { name: '保存为图片' });
  await expect(unseal).toBeDisabled();
  await expect(save).toBeDisabled();
  releaseScripts();
  // This assertion includes downloading the previously blocked production JS.
  await expect(unseal).toBeEnabled({ timeout: 30000 });
  await expect(save).toBeEnabled();
  await unseal.click();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'open',
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('opening keeps the inner letter on screen and cover names match left and right', async ({
  page,
}) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto('./');
    await expect(page.locator('.cover-prefix').first()).toHaveText(
      '朱敏 & 汪家喆',
    );
    await expect(page.locator('.couple-signature')).toContainText(
      '汪家喆 & 朱敏',
    );
    await page
      .getByRole('button', { name: '展信，展开我们的婚礼邀请' })
      .click();
    await expect(page.locator('.opening-cover')).toHaveAttribute(
      'data-phase',
      'open',
    );
    await expect(page.locator('.cover-revisit')).toBeFocused();
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator('.cover-inside p')).toBeInViewport();
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  }
});

test('mobile heart hierarchy is invitation first with two compact notes below', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 664 });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    const main = (await page.locator('.heart-invite').boundingBox())!;
    const left = (await page.locator('.heart-letter-left').boundingBox())!;
    const right = (await page.locator('.heart-letter-right').boundingBox())!;
    if (width < 700) {
      expect(main.y + main.height).toBeLessThan(left.y);
      expect(main.y + main.height).toBeLessThan(right.y);
      expect(left.height).toBeLessThan(330);
      expect(right.height).toBeLessThan(330);
    } else {
      expect(left.x).toBeLessThan(main.x);
      expect(main.x).toBeLessThan(right.x);
    }
  }
});

test('small arrow reads the entire invitation before it offers a return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.locator('.header-invite').click();
  const next = page.locator('.next-page');
  await expect(next).toHaveAttribute('data-at-end', 'false');
  await expect(next).toHaveText('');
  expect((await next.boundingBox())!.width).toBeLessThanOrEqual(52);
  await expect(page.getByRole('link', { name: '回到请柬开头' })).toBeHidden();
  let taps = 0;
  while ((await next.getAttribute('data-at-end')) !== 'true' && taps < 12) {
    const before = await page.evaluate(() => scrollY);
    await next.click();
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const bottom =
            document.documentElement.scrollHeight - scrollY - innerHeight <= 4;
          return (
            document
              .querySelector('.next-page')
              ?.getAttribute('data-at-end') === String(bottom)
          );
        }),
      )
      .toBe(true);
    taps++;
  }
  expect(taps).toBeGreaterThan(1);
  await expect(next).toHaveAttribute('data-at-end', 'true');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight - scrollY - innerHeight,
    ),
  ).toBeLessThanOrEqual(4);
  await expect(page.locator('.site-footer')).toBeInViewport();
  await page.locator('.map-options summary').click();
  await expect(next).toHaveAttribute('data-at-end', 'false');
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'instant',
    }),
  );
  await expect(next).toHaveAttribute('data-at-end', 'true');
  await next.click();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'closed',
  );
  await expect(
    page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }),
  ).toBeInViewport();
});

test('invitation image is a real full-size PNG and can be downloaded with keyboard', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await page.getByRole('button', { name: '保存为图片' }).click();
  const image = page.locator('.invitation-image');
  await expect(image).toBeVisible();
  expect(
    await image.evaluate((element: HTMLImageElement) => [
      element.naturalWidth,
      element.naturalHeight,
    ]),
  ).toEqual([1080, 1620]);
  await expect(image).toHaveAttribute(
    'alt',
    /汪家喆与朱敏.*17:28到场相聚.*黄山市歙县徽苑一楼.*2号厅晚宴/,
  );
  await expect(image).not.toHaveAttribute('alt', /17:58|仪式/);
  await expect(page.locator('.next-page')).toBeHidden();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole('link', { name: '下载图片' }).focus();
  const downloadEvent = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    '汪家喆与朱敏的婚礼邀请-2026-10-03.png',
  );
  const path = testInfo.outputPath('invitation.png');
  await download.saveAs(path);
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1620);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '保存为图片' })).toBeFocused();
});

test('phone saving uses capability detection, real image files and a usable cancel fallback', async ({
  browser,
  baseURL,
}) => {
  for (const device of [devices['iPhone 13'], devices['Pixel 7']]) {
    const context = await browser.newContext({ ...device, baseURL });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', {
        value: (data: ShareData) => data.files?.[0].type === 'image/png',
      });
      Object.defineProperty(navigator, 'share', {
        value: async (data: ShareData) => {
          (window as unknown as { sharedImage: unknown }).sharedImage =
            data.files?.map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
            }));
          throw new DOMException('Canceled', 'AbortError');
        },
      });
    });
    const page = await context.newPage();
    await page.goto('./');
    await page.getByRole('button', { name: '保存为图片' }).click();
    await page.getByRole('button', { name: '打开系统保存菜单' }).click();
    const files = await page.evaluate(
      () =>
        (
          window as unknown as {
            sharedImage: { name: string; type: string; size: number }[];
          }
        ).sharedImage,
    );
    expect(files[0].type).toBe('image/png');
    expect(files[0].size).toBeGreaterThan(10000);
    await expect(page.getByRole('link', { name: '下载图片' })).toBeVisible();
    await expect(page.locator('.image-save-feedback')).toHaveText('');
    await context.close();
  }
});

test('a phone can open a letter immediately after continuing and keep the next arrow', async ({
  browser,
  baseURL,
}) => {
  for (const device of [devices['iPhone 13'], devices['Pixel 7']]) {
    const context = await browser.newContext({ ...device, baseURL });
    const page = await context.newPage();
    await page.goto('./');
    await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).tap();
    await page.getByRole('button', { name: '继续读我们的故事' }).tap();
    await page
      .getByRole('button', { name: '翻看照片 01：在你身旁', exact: true })
      .tap();
    await page.getByRole('button', { name: '返回照片', exact: true }).tap();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.next-page')).toBeVisible();
    const before = await page.evaluate(() => scrollY);
    await page.locator('.next-page').tap();
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before);
    await context.close();
  }
});
