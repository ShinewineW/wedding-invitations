import { chromium, webkit, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Independent browser evidence. This script never edits the site or its tests.
const url = process.env.TEST_URL || 'http://127.0.0.1:4173/wedding/';
const output = path.resolve(
  process.env.EVIDENCE_DIR || 'release/validation/book',
);
await mkdir(output, { recursive: true });
const basisFiles = [
  'components/wedding/OpeningCover.tsx',
  'components/wedding/CoverFront.tsx',
  'components/wedding/WeddingExperience.tsx',
  'app/cover.css',
  'app/correspondence.css',
  'dist/client/wedding/index.html',
];
const fingerprint = async () =>
  Object.fromEntries(
    await Promise.all(
      basisFiles.map(async (file) => [
        file,
        createHash('sha256')
          .update(await readFile(file))
          .digest('hex'),
      ]),
    ),
  );
const basis = await fingerprint();
const results = [];
const failures = [];
const round = (n) => Math.round(n * 1000) / 1000;

async function readFrame(page) {
  return page.evaluate(() => {
    const cover = document.querySelector('.opening-cover');
    const sheet = cover.querySelector('.cover-sheet');
    const inside = cover.querySelector('.cover-inside p');
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    };
    const turn = Number(cover.style.getPropertyValue('--cover-turn'));
    const sheetBox = rect(sheet);
    return {
      phase: cover.dataset.phase,
      side: cover.dataset.side,
      turn,
      sheet: sheetBox,
      spineX: turn < 0.5 ? sheetBox.x : sheetBox.right,
      inner: rect(inside),
      innerTransform: getComputedStyle(inside).transform,
      sheetOrigin: getComputedStyle(sheet).transformOrigin,
      perspectiveOrigin: getComputedStyle(cover).perspectiveOrigin,
      frontVisibility: getComputedStyle(cover.querySelector('.cover-front'))
        .visibility,
      backVisibility: getComputedStyle(cover.querySelector('.cover-back'))
        .visibility,
      headerVisibility: getComputedStyle(document.querySelector('.site-header'))
        .visibility,
      scrollY,
      scrollX,
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      imageCount: cover.querySelectorAll('img').length,
      innerText: inside.textContent,
    };
  });
}

async function ready(page) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('.unseal-button')).toBeEnabled();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.querySelector('.cover-front img').decode();
  });
}

async function firstPhotoPosition(page) {
  // WebKit scrollY is integral while layout positions can be fractional.
  // Verify the intended 32px offset within one physical CSS pixel, plus focus.
  await expect
    .poll(() =>
      page
        .locator('#photo-0')
        .evaluate((el) => Math.abs(el.getBoundingClientRect().top - 32)),
    )
    .toBeLessThanOrEqual(1);
  await expect(page.locator('#photo-0')).toBeFocused();
  return page
    .locator('#photo-0')
    .evaluate((el) => el.getBoundingClientRect().top);
}

for (const { engine, type, launch } of [
  { engine: 'chrome', type: chromium, launch: { channel: 'chrome' } },
  { engine: 'webkit', type: webkit, launch: {} },
]) {
  let browser;
  try {
    browser = await type.launch(launch);
    for (const { name, width, height } of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'phone', width: 390, height: 844 },
      { name: 'small', width: 320, height: 568 },
    ]) {
      const result = {
        engine,
        version: browser.version(),
        viewport: { width, height },
        checks: [],
        frames: [],
      };
      results.push(result);
      const page = await browser.newPage({
        viewport: { width, height },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
      });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const check = (label, okay, observed) => {
        result.checks.push({ label, status: okay ? 'PASS' : 'FAIL', observed });
        if (!okay) failures.push(`${engine}/${name}: ${label}`);
      };
      const screenshot = async (label) => {
        const representative =
          (engine === 'chrome' && name === 'desktop') ||
          (engine === 'webkit' && name === 'phone');
        if (!representative || !['closed', 'near-edge', 'open'].includes(label))
          return;
        const file = `${engine}-${name}-${label}.png`;
        await page.screenshot({ path: path.join(output, file) });
        result.frames.push(file);
      };
      try {
        await ready(page);
        const closed = await readFrame(page);
        await screenshot('closed');
        check(
          'One whole photograph on one cover, stationary page is its sibling',
          await page.evaluate(() => {
            const cover = document.querySelector('.opening-cover');
            const sheet = cover.querySelector('.cover-sheet');
            const inner = cover.querySelector('.cover-page');
            return (
              cover.querySelectorAll('.cover-sheet').length === 1 &&
              cover.querySelectorAll('img').length === 1 &&
              sheet.parentElement === inner.parentElement &&
              !sheet.contains(inner) &&
              sheet.querySelector('img').naturalWidth > 0
            );
          }),
          { imageCount: closed.imageCount },
        );
        check(
          'Left spine and left perspective origin',
          closed.sheetOrigin.startsWith('0px ') &&
            closed.perspectiveOrigin.startsWith('0px '),
          { sheet: closed.sheetOrigin, perspective: closed.perspectiveOrigin },
        );

        // Pausing the browser clock controls frame capture only; the production
        // requestAnimationFrame handler and computed CSS geometry stay intact.
        const start = new Date('2026-09-05T12:00:00Z');
        await page.clock.install({ time: start });
        await page.clock.pauseAt(new Date(+start + 1000));
        await page.locator('.unseal-button').click({ force: true });
        const duration = width <= 700 ? 1900 : 2400;
        const samples = [closed];
        let elapsed = 0;
        for (const progress of [0.25, 0.4, 0.48, 0.6, 0.8, 1.1]) {
          const target = Math.round(duration * progress);
          await page.clock.runFor(target - elapsed);
          elapsed = target;
          samples.push(await readFrame(page));
          if (progress === 0.48) await screenshot('near-edge');
        }
        const open = samples.at(-1);
        await screenshot('open');
        await page.clock.resume();
        result.geometry = samples.map((frame) =>
          JSON.parse(
            JSON.stringify(frame, (_key, value) =>
              typeof value === 'number' ? round(value) : value,
            ),
          ),
        );
        const maxSpineError = Math.max(
          ...samples.map((s) => Math.abs(s.spineX)),
        );
        const maxInnerShift = Math.max(
          ...samples.flatMap((s) =>
            ['x', 'y', 'width', 'height'].map((key) =>
              Math.abs(s.inner[key] - closed.inner[key]),
            ),
          ),
        );
        const turning = samples.filter((s) => s.phase === 'opening');
        check(
          'Observed left edge stays at x = 0 through both sides of the turn',
          maxSpineError <= 1,
          { maxSpineError },
        );
        check(
          'Cover moves left beyond the spine after 90 degrees',
          turning.some(
            (s) =>
              s.turn > 0.5 &&
              s.sheet.x < -width * 0.25 &&
              Math.abs(s.sheet.right) <= 1,
          ),
          { mostNegativeLeft: Math.min(...turning.map((s) => s.sheet.x)) },
        );
        check(
          'Inner lettering never rotates or shifts',
          maxInnerShift <= 1 &&
            samples.every((s) => s.innerTransform === 'none'),
          { maxInnerShift },
        );
        check(
          'Front is hidden before a mirrored reverse could appear',
          turning
            .filter((s) => s.turn > 0.5)
            .every((s) => s.frontVisibility === 'hidden') &&
            turning
              .filter((s) => s.turn < 0.5)
              .every((s) => s.backVisibility === 'hidden'),
          turning.map((s) => ({
            turn: round(s.turn),
            front: s.frontVisibility,
            back: s.backVisibility,
          })),
        );
        check(
          'Header stays hidden during the turn and returns on paper',
          turning.every((s) => s.headerVisibility === 'hidden') &&
            open.headerVisibility === 'visible',
          {
            during: turning.map((s) => s.headerVisibility),
            after: open.headerVisibility,
          },
        );
        check(
          'Opening creates no horizontal overflow or scroll jump',
          samples.every(
            (s) =>
              s.documentWidth <= s.viewportWidth &&
              s.scrollX === 0 &&
              s.scrollY === 0,
          ),
          samples.map((s) => ({
            phase: s.phase,
            width: s.documentWidth,
            scrollY: s.scrollY,
          })),
        );
        check(
          'Completed inner text is fully inside the viewport',
          open.phase === 'open' &&
            open.inner.x >= 0 &&
            open.inner.y >= 0 &&
            open.inner.right <= width &&
            open.inner.bottom <= height,
          { text: open.innerText, bounds: open.inner },
        );
        await expect(page.locator('.cover-revisit')).toBeFocused();
        await page.waitForTimeout(1100);
        check(
          'No automatic story scroll after opening; continue receives focus',
          await page.evaluate(
            () =>
              scrollY === 0 && document.activeElement.matches('.cover-revisit'),
          ),
          await page.evaluate(() => ({
            scrollY,
            active: document.activeElement.className,
          })),
        );
        await page.locator('.cover-revisit').click();
        check('Manual continue reaches and focuses first photograph', true, {
          photoTop: await firstPhotoPosition(page),
        });
        await page.locator('.chapter-navigation a[href="#invitation"]').click();
        await expect
          .poll(() =>
            page
              .locator('#invitation')
              .evaluate((el) => el.getBoundingClientRect().top),
          )
          .toBeLessThan(150);
        // Follow the actual next control until it offers the final return.
        let downClicks = 0;
        while (
          (await page.locator('.next-page').getAttribute('data-at-end')) !==
            'true' &&
          downClicks < 8
        ) {
          await page.locator('.next-page').click();
          await page.waitForTimeout(950);
          downClicks += 1;
        }
        await expect(page.locator('.next-page')).toHaveAttribute(
          'data-at-end',
          'true',
        );
        const bottom = await page.evaluate(() => ({
          y: scrollY,
          bottom: scrollY + innerHeight,
          documentHeight: document.documentElement.scrollHeight,
        }));
        check(
          'Final return appears at the actual document end',
          bottom.bottom >= bottom.documentHeight - 4,
          { ...bottom, downClicks },
        );
        await page
          .getByRole('button', { name: '回到请柬开头', exact: true })
          .click();
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        await expect(page.locator('.opening-cover')).toHaveAttribute(
          'data-phase',
          'closed',
        );
        const reset = await readFrame(page);
        check(
          'Final return resets the whole cover and its turn',
          reset.turn === 0 &&
            reset.side === 'front' &&
            reset.frontVisibility === 'visible' &&
            Math.abs(reset.sheet.width - width) <= 1,
          { turn: reset.turn, side: reset.side, width: reset.sheet.width },
        );
        await page.locator('.unseal-button').click();
        await expect(page.locator('.opening-cover')).toHaveAttribute(
          'data-phase',
          'opening',
        );
        await expect(page.locator('.opening-cover')).toHaveAttribute(
          'data-phase',
          'open',
        );
        check(
          'Returned cover opens again and stays at the top',
          await page.evaluate(() => scrollY === 0),
          { scrollY: await page.evaluate(() => scrollY) },
        );
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await ready(page);
        const reducedStart = Date.now();
        await page.locator('.unseal-button').click();
        await expect(page.locator('.opening-cover')).toHaveAttribute(
          'data-phase',
          'open',
          { timeout: 1000 },
        );
        const reduced = await readFrame(page);
        await expect(page.locator('.cover-revisit')).toBeFocused();
        await page.waitForTimeout(1000);
        check(
          'Reduced motion immediately shows readable stationary page and waits',
          Date.now() - reducedStart < 1800 &&
            reduced.phase === 'open' &&
            (await page.evaluate(() => scrollY === 0)),
          {
            elapsedIncludingOneSecondDwell: Date.now() - reducedStart,
            bounds: reduced.inner,
          },
        );
        await page.locator('.cover-revisit').click();
        check(
          'Reduced-motion manual continue still works and focuses the photograph',
          true,
          { photoTop: await firstPhotoPosition(page) },
        );
        check('No browser runtime errors', errors.length === 0, errors);
      } catch (error) {
        failures.push(`${engine}/${name}: ${error.message.split('\n')[0]}`);
        result.error = error.message;
        await page
          .screenshot({
            path: path.join(output, `${engine}-${name}-failure.png`),
          })
          .catch(() => {});
      } finally {
        await page.close();
      }
      result.status =
        result.error || result.checks.some((c) => c.status === 'FAIL')
          ? 'FAIL'
          : 'PASS';
      console.log(
        `${engine}/${name}: ${result.status} (${result.checks.length} checks)`,
      );
    }
  } catch (error) {
    failures.push(`${engine}: BLOCKED ${error.message}`);
  } finally {
    await browser?.close();
  }
}
const finalBasis = await fingerprint();
if (JSON.stringify(finalBasis) !== JSON.stringify(basis))
  failures.push('Verification basis changed during the run; rerun required.');
const summary = {
  status: failures.length ? 'FAIL' : 'PASS',
  url,
  command: `TEST_URL=${url} node scripts/verify-book.mjs`,
  generatedAt: new Date().toISOString(),
  basis,
  basisUnchanged: JSON.stringify(finalBasis) === JSON.stringify(basis),
  visualInspection:
    'Pending independent inspection of selected PNGs; automated PASS alone does not assert visual acceptance.',
  limitations: [
    'Desktop Chrome and WebKit with specified viewport emulation; no physical iPhone, iOS Safari, WeChat, or mobile-network validation.',
    'Build, lint, full suite, deployment and release packaging belong to the main agent.',
  ],
  failures,
  results,
};
await writeFile(
  path.join(output, 'results.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
await writeFile(
  path.join(output, 'report.md'),
  `${summary.status} — independent book-opening browser checks\n\nURL: ${url}\n\nCommand: \`TEST_URL=${url} node scripts/verify-book.mjs\`\n\n${results.map((r) => `- ${r.engine} ${r.version}, ${r.viewport.width}×${r.viewport.height}: ${r.status}, ${r.checks.length} checks`).join('\n')}\n\n${failures.length ? failures.join('\n') : 'All automated criteria passed; selected screenshot inspection remains required.'}\n\nBrowser clock controlled only animation frame selection; production requestAnimationFrame and CSS were not replaced. Functional controls were clicked through Playwright. Geometry samples are in results.json, with six selected closed, near-edge and open PNGs.\n\nLimitations: ${summary.limitations.join(' ')}\n`,
);
console.log(`${summary.status}: ${output}/results.json`);
if (failures.length) process.exitCode = 1;
