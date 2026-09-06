import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await mkdir('output/playwright', { recursive: true });
await page.goto('http://localhost:5173');
await page.waitForFunction(() => window.__LLOYDS__?.renderer.info.render.frame > 5);
await page.waitForTimeout(1800);
await page.screenshot({ path: 'output/playwright/detailed-assembled.png' });
await page.getByRole('slider', { name: 'Explosion', exact: true }).fill('100');
await page.waitForTimeout(2300);
await page.screenshot({ path: 'output/playwright/detailed-exploded.png' });
console.log(
  await page.evaluate(() => ({
    parts: window.__LLOYDS__.parts.length,
    camera: window.__LLOYDS__.camera.position.toArray(),
    render: window.__LLOYDS__.renderer.info.render,
  })),
);
await browser.close();
