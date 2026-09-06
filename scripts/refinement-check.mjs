import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('output/playwright', { recursive: true });
try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173');
  await page.waitForFunction(() => window.__LLOYDS__?.renderer.info.render.frame > 5);
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.connection-label:visible').count(), 0);
  await page.screenshot({ path: 'output/playwright/refined-assembled.png' });
  await page.getByRole('slider', { name: 'Explosion', exact: true }).fill('100');
  await page.waitForTimeout(1700);
  assert.equal(await page.locator('.connection-label:visible').count(), 6);
  await page.screenshot({ path: 'output/playwright/refined-exploded.png' });
  await page.getByLabel('Connection guides').uncheck();
  await page.waitForFunction(() => document.querySelectorAll('.connection-label').length === 0);
  await page.getByLabel('Connection guides').check();
  await page.waitForTimeout(1200);
  await page.locator('.connection-label').getByText('Meeting pods', { exact: true }).click();
  assert.equal(
    await page.evaluate(() => window.__LLOYDS__.store.getState().selected),
    'meeting-pods',
  );
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.waitForTimeout(1500);
  assert(
    await page.evaluate(
      () =>
        window.__LLOYDS__.scene
          .getObjectByName('Solid section faces')
          .geometry.getAttribute('position').count > 0,
    ),
  );
  await page.screenshot({ path: 'output/playwright/refined-section.png' });
  await page.getByRole('button', { name: 'Floors', exact: true }).click();
  await page.getByLabel('Explore a model level').selectOption('3');
  await page.getByLabel('Levels above', { exact: true }).selectOption('ghost');
  await page.waitForTimeout(1500);
  assert(
    await page.evaluate(() =>
      window.__LLOYDS__.scene
        .getObjectByName('Upper floor context')
        .children.every((m) => m.visible),
    ),
  );
  await page.screenshot({ path: 'output/playwright/refined-ghost.png' });
  await page.getByLabel('Levels above', { exact: true }).selectOption('hide');
  await page.waitForTimeout(300);
  assert(
    await page.evaluate(() =>
      window.__LLOYDS__.scene
        .getObjectByName('Upper floor context')
        .children.every((m) => !m.visible),
    ),
  );
  await page.getByRole('button', { name: 'Reset view', exact: true }).last().click();
  await page.getByRole('combobox', { name: 'Camera viewpoint' }).selectOption('rear');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'output/playwright/refined-rear.png' });
  await page.getByRole('textbox', { name: 'Search components' }).fill('Cooper');
  await page.getByRole('button', { name: 'Retained Cooper entrance', exact: true }).click();
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  await page.getByRole('button', { name: 'Frame', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'output/playwright/refined-entrance.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: guide visibility and selection; capped section; ghost/hide transitions; entrance catalogue and framing; no page errors',
  );
} finally {
  await browser.close();
}
