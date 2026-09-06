import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto(process.env.TEST_URL || 'http://localhost:4173');
  await page.waitForFunction(() => window.__LLOYDS__);
  await page.waitForTimeout(1300);
  await page.getByRole('combobox', { name: 'Camera viewpoint' }).selectOption('room');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'output/playwright/final-room.png' });
  await page.getByRole('button', { name: 'Inside the market', exact: true }).click();
  await page.waitForTimeout(1600);
  await page.getByRole('button', { name: 'Market hotspot: broker', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__LLOYDS__.store.getState().marketStep), 1);
  await page.getByRole('button', { name: 'Market hotspot: underwriters', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__LLOYDS__.store.getState().marketStep), 2);
  await page.getByRole('button', { name: 'Market hotspot: client', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__LLOYDS__.store.getState().marketStep), 0);
  // A real context-loss event must expose the catalogue and allow a clean retry.
  await page.evaluate(() =>
    window.__LLOYDS__.renderer.getContext().getExtension('WEBGL_lose_context').loseContext(),
  );
  await page.getByRole('button', { name: 'Retry 3D rendering' }).waitFor();
  await page.getByRole('button', { name: 'Retry 3D rendering' }).click();
  await page.waitForFunction(() => window.__LLOYDS__?.renderer.info.render.frame > 5);
  await page.waitForTimeout(1400);
  assert.equal(await page.locator('canvas').count(), 1);
  console.log('PASS market hotspots, interior camera, real WebGL context-loss recovery');
} finally {
  await browser.close();
}
