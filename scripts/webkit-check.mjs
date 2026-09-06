import { webkit } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await webkit.launch();
const context = await browser.newContext({
  viewport: { width: 1024, height: 1366 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173');
  await page.waitForFunction(() => window.__LLOYDS__?.renderer.info.render.frame > 5);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'output/playwright/webkit-ipad.png' });
  await page.getByRole('slider', { name: 'Explosion', exact: true }).fill('100');
  await page.waitForTimeout(1600);
  assert.equal(await page.evaluate(() => window.__LLOYDS__.store.getState().explosion), 1);
  await page.screenshot({ path: 'output/playwright/webkit-exploded.png' });
  await page.getByRole('button', { name: 'Cutaway', exact: true }).tap();
  await page.getByRole('slider', { name: 'Section position' }).fill('50');
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.__LLOYDS__.store.getState().explosion), 0);
  await page.getByRole('button', { name: 'Floors', exact: true }).tap();
  await page.getByLabel('Explore a model level').selectOption('2');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Reset view', exact: true }).last().tap();
  await page.waitForTimeout(1000);
  await page.getByRole('textbox', { name: 'Search components' }).fill('service pods');
  await page.getByRole('button', { name: 'Prefabricated service pods', exact: true }).tap();
  assert(await page.getByRole('heading', { name: 'Prefabricated service pods' }).isVisible());
  await page.getByRole('button', { name: 'Isolate', exact: true }).tap();
  await page.getByRole('button', { name: 'Frame', exact: true }).tap();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'output/playwright/webkit-pods.png' });
  await page.getByRole('button', { name: 'Reset view', exact: true }).last().tap();
  await page.waitForTimeout(1500);
  assert.deepEqual(errors, []);
  const result = {
    engine: 'Playwright WebKit',
    version: browser.version(),
    viewport: [1024, 1366],
    touch: true,
    physicalIPad: false,
    checks: [
      'WebGL model rendering',
      '100% staged explosion',
      'section reassembly',
      'floor selection',
      'touch search/selection',
      'service-pod isolation and framing',
      'reset',
    ],
    errors,
  };
  console.log(result);
  await writeFile('output/playwright/webkit-results.json', JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
