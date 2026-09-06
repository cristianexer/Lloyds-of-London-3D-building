import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 500 } });
  const svg = await readFile('docs/banner.svg', 'utf8');
  await page.setContent(`<style>html,body{margin:0;background:#1b241f}</style>${svg}`);
  await mkdir('output/playwright', { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'output/playwright/banner-assembled.png' });
  await page.waitForTimeout(5250);
  const transformed = await page
    .locator('.piece')
    .evaluateAll((nodes) =>
      nodes.some((n) => getComputedStyle(n).transform !== 'matrix(1, 0, 0, 1, 0, 0)'),
    );
  assert(transformed);
  await page.screenshot({ path: 'output/playwright/banner-exploded.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert(
    await page
      .locator('.piece')
      .evaluateAll((nodes) => nodes.every((n) => getComputedStyle(n).animationName === 'none')),
  );
  console.log('PASS: SVG rendering, animated transforms and reduced-motion fallback');
} finally {
  await browser.close();
}
