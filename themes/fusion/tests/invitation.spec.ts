import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const originals = [
  '人间的风景很多，\n我偏爱有你的这一处。',
  '那些平凡的小事，\n因为是你，都值得珍藏。',
  '不用赶路。\n往后的日子，我们慢慢走。',
  '阳光在木地板上慢慢走。\n我靠近你，\n一个寻常的午后，就有了余生的模样。',
  '这一页写我们，\n下一页，想请你也在场。',
];

test('book cover opens as one intact sheet and waits for the guest to continue', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('.opening-cover img')).toHaveCount(1);
  await expect(page.locator('.cover-front')).toBeVisible();
  await expect(page.locator('.cover-back')).toBeHidden();
  await expect(page.locator('.cover-front')).toHaveAttribute(
    'aria-hidden',
    'false',
  );
  await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).click();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'opening',
  );
  await page.waitForTimeout(900);
  const transform = await page
    .locator('.cover-sheet')
    .evaluate((e) => getComputedStyle(e).transform);
  expect(transform).not.toBe('none');
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'open',
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.cover-front')).toBeHidden();
  await expect(page.locator('.cover-sheet')).toBeHidden();
  await expect(page.locator('.cover-page')).toBeVisible();
  await expect(page.locator('.cover-revisit')).toBeFocused();
  await expect(page.locator('.cover-inside')).toContainText('每一页都有你');
  await page.getByRole('button', { name: '继续读我们的故事' }).click();
  await expect(page.locator('#companionship')).toBeFocused();
  await expect(page.locator('#companionship-title')).toBeInViewport();
  expect(await page.locator('.story').count()).toBe(5);
  expect(
    await page.locator('.paper-gesture, .paper-world, [role="slider"]').count(),
  ).toBe(0);
});

test('phone completes every chapter by tapping without a premature return', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).click();
  await page.getByRole('button', { name: '继续读我们的故事' }).click();
  const next = page.locator('.next-page');
  let taps = 0;
  while ((await next.getAttribute('data-at-end')) !== 'true' && taps < 65) {
    const before = await page.evaluate(() => scrollY);
    await next.click();
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before);
    await page.waitForTimeout(30);
    taps++;
  }
  expect(taps).toBeLessThanOrEqual(12);
  expect(taps).toBeGreaterThanOrEqual(10);
  await expect(next).toHaveAttribute('data-at-end', 'true');
  await expect(page.locator('.site-footer')).toBeInViewport();
  await next.click();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'closed',
  );
});

test('each photograph opens only its own letter and returns focus through the bottom exit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: '直接看照片' }).click();
  const kinds = ['letter', 'memo', 'postcard', 'rose', 'book'];
  const fonts = new Set<string>();
  const papers = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const trigger = page.getByRole('button', {
      name: `读第 ${i + 1} 张照片背面的信`,
    });
    await trigger.click();
    await expect(
      page.getByRole('button', { name: /上一封|下一封/ }),
    ).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.stationery')).toHaveAttribute(
      'data-paper',
      kinds[i],
    );
    await expect(page.locator('.stationery-message')).toHaveText(originals[i]);
    await expect(page.locator('.stationery-signature')).toContainText('汪家喆');
    fonts.add(
      await page
        .locator('.stationery-message')
        .evaluate((e) => getComputedStyle(e).fontFamily),
    );
    papers.add(
      await page
        .locator('.stationery')
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    );
    await expect(
      page.getByRole('button', { name: '收起照片背面的信' }),
    ).toBeInViewport();
    const close = page.getByRole('button', { name: '返回照片', exact: true });
    await expect(close).toBeInViewport();
    await close.click();
    await expect(trigger).toBeFocused();
  }
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(fonts.size).toBeGreaterThanOrEqual(3);
  expect(papers.size).toBe(5);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === 'loaded')
        .map((f) => f.family),
    ),
  ).toEqual(
    expect.arrayContaining(['LXGW WenKai GB', 'Letter Brush', 'Letter Serif']),
  );
});

test('closing the fifth letter keeps the next step at twilight even when its edge is visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    const read = page.getByRole('button', {
      name: '读第 5 张照片背面的信',
    });
    await read.evaluate((element) =>
      element.scrollIntoView({ block: 'start', behavior: 'instant' }),
    );
    await expect(page.locator('.next-page')).toHaveAttribute(
      'aria-label',
      '下一步：黄昏中的相系',
    );
    await read.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    const before = await page.evaluate(() => scrollY);
    await page.locator('.next-page').click();
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before);
    expect(await page.locator('.next-page').getAttribute('data-at-end')).toBe(
      'false',
    );
  }
});

test('heartfelt outer letters restore original words and keep independent reading', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('.heart-letter-left p')).toHaveText(
    '把平凡的日子，\n过成我们的日子。也把这份欢喜，\n郑重地交给你。',
  );
  await expect(page.locator('.heart-letter-right p')).toHaveText(
    '有些欢喜，想当面说。有些时刻，想与你一起。',
  );
  await page.getByRole('button', { name: '放大阅读：致亲爱的你' }).click();
  await expect(page.locator('.stationery-message')).toHaveText(
    '有些欢喜，想当面说。\n\n有些时刻，想与你一起。',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.getByRole('button', { name: '放大阅读：致亲爱的你' }),
  ).toBeFocused();
  expect(await page.locator('body').innerText()).not.toMatch(
    /沈复|朱自清|浮生六记|荷塘月色/,
  );
});

test('reduced motion keeps the same complete flow and immediate opening', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: '展信，展开我们的婚礼邀请' }).click();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'open',
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole('button', { name: '继续读我们的故事' }).click();
  expect(await page.locator('.story').count()).toBe(5);
  await page.getByRole('button', { name: '读第 2 张照片背面的信' }).click();
  expect(
    await page
      .locator('.stationery')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await page.keyboard.press('Escape');
});

test('small screens keep cover facts, every note and controls readable', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 664 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await expect(page.locator('.next-page')).toBeHidden();
    await expect(page.locator('.cover-date').first()).toContainText(
      '农历八月廿三',
    );
    const location = await page
      .locator('.cover-location')
      .first()
      .boundingBox();
    expect(location!.y).toBeGreaterThan(0);
    expect(location!.y + location!.height).toBeLessThanOrEqual(viewport.height);
    await page.getByRole('button', { name: '直接看照片' }).click();
    await page.getByRole('button', { name: '读第 5 张照片背面的信' }).click();
    await expect(
      page.getByRole('button', { name: '返回照片', exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole('button', { name: '收起照片背面的信' }),
    ).toBeInViewport();
    await page.keyboard.press('Escape');
    const sizes = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(sizes.doc).toBeLessThanOrEqual(sizes.viewport + 1);
  }
});

test('keyboard access and axe audit cover the waterfall, all papers and invitation', async ({
  page,
  browserName,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: '直接看照片' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#photo-0')).toBeFocused();
  // Safari's default keyboard setting uses Option-Tab to include buttons.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(
    page.getByRole('button', { name: '翻看照片 01：在你身旁' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 5; i++) {
    if (i > 0) {
      await page
        .getByRole('button', { name: `读第 ${i + 1} 张照片背面的信` })
        .focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').evaluate(async (dialog) => {
      await Promise.all(
        dialog
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      );
    });
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.getByRole('button', { name: '返回照片', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('full venue, lunar date, schedule and image save action remain consistent', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('.venue p')).toHaveText('黄山市歙县徽苑一楼');
  await expect(page.locator('.venue > span')).toHaveText('2号厅');
  await expect(page.locator('.cover-location').first()).toHaveText(
    '黄山市歙县徽苑一楼2号厅',
  );
  await expect(page.locator('.invitation .schedule')).toContainText('17:28');
  await expect(page.locator('.invitation .schedule')).toContainText('17:58');
  await expect(page.locator('.date-display')).toContainText('农历八月廿三');
  await expect(page.getByRole('button', { name: '保存为图片' })).toBeVisible();
  await expect(page.locator('a[href$=".ics"]')).toHaveCount(0);
});

test('wedding mount keeps root free and all resource requests in its directory', async ({
  page,
}) => {
  const failed: string[] = [];
  page.on('pageerror', (error) => failed.push(error.message));
  await page.goto('./');
  const paths = await page
    .locator('script[src], img[src], link[rel="stylesheet"], link[rel="icon"]')
    .evaluateAll((elements) =>
      elements.map((e) => e.getAttribute('src') || e.getAttribute('href')),
    );
  expect(paths.every((path) => path?.startsWith('/wedding2/'))).toBe(true);
  const root = await page.request.get(new URL('/', page.url()).href);
  expect(root.status()).toBe(404);
  expect(await root.text()).not.toContain('展信，展开我们的婚礼邀请');
  expect(failed).toEqual([]);
});

test('phone map choices preserve native URLs and web fallbacks with full venue name', async ({
  browser,
  baseURL,
}) => {
  for (const device of [devices['iPhone 13'], devices['Pixel 7']]) {
    const context = await browser.newContext({ ...device, baseURL });
    const page = await context.newPage();
    await page.goto('./');
    await page.locator('.map-options summary').click();
    await expect(page.locator('.map-options')).toHaveAttribute('open', '');
    const links = await page
      .locator('.map-directions a')
      .evaluateAll((a) =>
        a.map((e) => decodeURIComponent(e.getAttribute('href')!)),
      );
    expect(links.every((href) => href.includes('黄山市歙县徽苑一楼'))).toBe(
      true,
    );
    await expect(
      page.getByRole('link', { name: '百度地图', exact: true }),
    ).toHaveAttribute(
      'href',
      /iPhone/.test(device.userAgent) ? /^baidumap:\/\// : /^bdapp:\/\//,
    );
    await expect(page.getByRole('link', { name: '查看地点' })).toHaveAttribute(
      'href',
      /callnative=1$/,
    );
    await expect(
      page.getByRole('link', { name: '高德地图网页版' }),
    ).toHaveAttribute('href', /callnative=0$/);
    await expect(page.getByRole('link', { name: '苹果地图' })).toHaveAttribute(
      'href',
      /^https:\/\/maps\.apple\.com/,
    );
    await context.close();
  }
});

test('every return route closes the cover and allows a fresh opening', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const seal = page.getByRole('button', { name: '展信，展开我们的婚礼邀请' });
  for (const route of ['footer', 'chapter', 'wordmark', 'next', 'scroll']) {
    await seal.click();
    await page.getByRole('button', { name: '继续读我们的故事' }).click();
    await expect(page.locator('#companionship')).toBeFocused();
    if (route === 'footer') {
      await page.evaluate(() =>
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'instant',
        }),
      );
      await page.getByRole('link', { name: '回到请柬开头' }).click();
    }
    if (route === 'chapter')
      await page.locator('.chapter-navigation a[href="#beginning"]').click();
    if (route === 'wordmark') await page.locator('.wordmark').click();
    if (route === 'next') {
      await page.locator('.header-invite').click();
      await expect(page.locator('#invitation-title')).toBeInViewport();
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
      await page
        .getByRole('button', { name: '回到请柬开头', exact: true })
        .click();
    }
    if (route === 'scroll') {
      await page.waitForTimeout(100);
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: 'instant' }),
      );
    }
    await expect(page.locator('.opening-cover')).toHaveAttribute(
      'data-phase',
      'closed',
    );
    await expect(seal).toBeVisible();
    await expect(seal).toBeInViewport();
    const peel = await page
      .locator('.opening-cover')
      .evaluate((e) =>
        getComputedStyle(e).getPropertyValue('--cover-turn').trim(),
      );
    expect(peel).toBe('0');
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seal.click();
  await expect(page.locator('.opening-cover')).toHaveAttribute(
    'data-phase',
    'opening',
  );
  await page.getByRole('button', { name: '继续读我们的故事' }).click();
  await expect(page.locator('#companionship')).toBeFocused();
});

test('double happiness, GB signature and aligned date numerals match the final copy', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./');
  await expect(page.locator('.heart-invite > strong')).toHaveText('囍');
  expect(await page.locator('body').innerText()).not.toContain('北京时间');
  const map = page.getByRole('link', { name: '查看地点', exact: true });
  await expect(map).toHaveAttribute('href', /^https:\/\/uri.amap.com\/search/);
  expect(decodeURIComponent((await map.getAttribute('href'))!)).toContain(
    'keyword=黄山市歙县徽苑一楼',
  );
  await page.getByRole('button', { name: '读第 5 张照片背面的信' }).click();
  await expect(page.locator('.stationery-signature strong')).toHaveText(
    '汪家喆 & 朱敏',
  );
  expect(
    await page
      .locator('.stationery-signature strong')
      .evaluate((e) => getComputedStyle(e).fontFamily),
  ).toContain('LXGW WenKai GB');
  await page.keyboard.press('Escape');
  const numerals = await page
    .locator('.date-display strong, .schedule div > span')
    .evaluateAll((elements) =>
      elements.map((e) => ({
        font: getComputedStyle(e).fontFamily,
        variant: getComputedStyle(e).fontVariantNumeric,
        size: getComputedStyle(e).fontSize,
        emphasis: getComputedStyle(e.querySelector('em')!).fontSize,
        style: getComputedStyle(e).fontStyle,
      })),
    );
  for (const n of numerals) {
    expect(n.font).toContain('Wedding Numerals');
    expect(n.style).toBe('normal');
    expect(n.variant).toContain('lining-nums');
    expect(n.variant).toContain('tabular-nums');
    expect(n.size).toBe(n.emphasis);
  }
  const alignment = await page.locator('.date-display strong').evaluate((e) => {
    const month = e.querySelector('span')!.getBoundingClientRect();
    const day = e.querySelector('em')!.getBoundingClientRect();
    return Math.abs(month.bottom - day.bottom);
  });
  expect(alignment).toBeLessThan(1);
});
