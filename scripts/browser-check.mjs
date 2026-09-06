import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.TEST_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = {
  browser: browser.version(),
  url: base,
  checks: [],
  performance: [],
  errors: [],
  failedRequests: [],
};
await mkdir('output/playwright', { recursive: true });
function monitor(page) {
  page.on('pageerror', (e) => results.errors.push(e.message));
  page.on('requestfailed', (r) =>
    results.failedRequests.push(`${r.url()}: ${r.failure()?.errorText}`),
  );
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
monitor(page);
const ready = async (p) => {
  await p.waitForFunction(() => window.__LLOYDS__?.renderer.info.render.frame > 5);
  await p.waitForTimeout(1500);
};
const snap = async (name) =>
  page.screenshot({ path: `output/playwright/${name}.png`, scale: 'css' });
const state = () =>
  page.evaluate(() => {
    const s = window.__LLOYDS__.store.getState();
    return {
      mode: s.mode,
      explosion: s.explosion,
      selected: s.selected,
      isolated: s.isolated,
      hidden: s.hidden,
      view: s.view,
      rotate: s.autoRotate,
      floor: s.floor,
      tour: s.tour,
    };
  });
const matrixHash = () =>
  page.evaluate(() => {
    let hash = 2166136261;
    window.__LLOYDS__.scene.getObjectByName('Lloyd’s building').children.forEach((m) => {
      const a = new Uint32Array(m.instanceMatrix.array.buffer);
      for (const n of a) {
        hash ^= n;
        hash = Math.imul(hash, 16777619);
      }
    });
    return hash >>> 0;
  });
const check = (name) => {
  results.checks.push(name);
  console.log('PASS', name);
};
async function measure(p, label) {
  await p.evaluate(() => window.__LLOYDS__.store.getState().setRotate(true));
  await p.waitForTimeout(1500);
  const result = await p.evaluate(async () => {
    const d = window.__LLOYDS__;
    const times = [];
    let last = performance.now();
    const start = last;
    const startFrame = d.renderer.info.render.frame;
    await new Promise((resolve) => {
      function loop(t) {
        times.push(t - last);
        last = t;
        if (t - start < 3500) requestAnimationFrame(loop);
        else resolve();
      }
      requestAnimationFrame(loop);
    });
    times.sort((a, b) => a - b);
    const gl = d.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      fps: Number(
        ((d.renderer.info.render.frame - startFrame) / ((last - start) / 1000)).toFixed(1),
      ),
      rafP95Ms: Number(times[Math.floor(times.length * 0.95)].toFixed(2)),
      drawCalls: d.renderer.info.render.calls,
      triangles: d.renderer.info.render.triangles,
      devicePixelRatio: d.renderer.getPixelRatio(),
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      viewport: [innerWidth, innerHeight],
    };
  });
  results.performance.push({ label, ...result });
  await p.evaluate(() => window.__LLOYDS__.store.getState().setRotate(false));
  console.log('PERFORMANCE', label, result);
}
try {
  await page.goto(base);
  await ready(page);
  await snap('desktop-assembled');
  const initial = await matrixHash();
  for (const value of ['100', '17', '86', '0', '100', '0']) {
    await page.getByRole('slider', { name: 'Explosion', exact: true }).fill(value);
    await page.waitForTimeout(1100);
  }
  assert.equal(await matrixHash(), initial);
  check('Rendered instance matrices return exactly after repeated explosion scrubbing');
  await page.getByRole('slider', { name: 'Explosion', exact: true }).fill('100');
  await page.waitForTimeout(1600);
  await snap('desktop-exploded');
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.waitForTimeout(1400);
  assert.equal((await state()).explosion, 0);
  assert.equal(await page.getByRole('slider', { name: 'Explosion', exact: true }).count(), 0);
  await snap('desktop-cutaway');
  await page.getByRole('slider', { name: 'Section position' }).fill('30');
  assert.equal(await page.evaluate(() => window.__LLOYDS__.store.getState().section), 0.3);
  check('Cutaway reassembles and section plane responds');
  await page.getByRole('button', { name: 'Floors', exact: true }).click();
  await page.getByLabel('Explore a model level').selectOption('0');
  await page.waitForTimeout(1500);
  assert.equal((await state()).floor, 0);
  await snap('desktop-floor');
  check('Ground floor isolation and camera framing');
  await page.getByRole('button', { name: 'Reset view', exact: true }).last().click();
  await page.waitForTimeout(1400);
  await page.getByRole('textbox', { name: 'Search components' }).fill('barrel');
  await page.getByRole('button', { name: 'Barrel-vaulted glass roof', exact: true }).click();
  assert.equal((await state()).selected, 'vault');
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  await page.waitForTimeout(400);
  assert.equal((await state()).isolated, 'vault');
  await snap('desktop-inspection');
  await page.getByRole('button', { name: 'Frame', exact: true }).click();
  await page.waitForTimeout(1400);
  assert.equal((await state()).view, 'frame');
  await page.getByRole('button', { name: 'Related system', exact: true }).click();
  assert.equal((await state()).isolated, 'roof');
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  assert((await state()).hidden.includes('vault'));
  await page.getByRole('button', { name: 'Restore all', exact: true }).click();
  assert.deepEqual((await state()).hidden, []);
  assert.equal((await state()).isolated, null);
  check('Search, select, frame, isolate, related system, hide and restore');
  await page.getByRole('textbox', { name: 'Search components' }).fill('');
  await page.getByRole('button', { name: 'Reset view', exact: true }).last().click();
  await page.waitForTimeout(1400);
  assert.equal(await matrixHash(), initial);
  check('Reset restores exact rendered geometry after inspection');
  await page.getByRole('combobox', { name: 'Camera viewpoint' }).selectOption('atrium');
  await page.waitForTimeout(1600);
  await snap('desktop-atrium');
  await page.getByRole('combobox', { name: 'Camera viewpoint' }).selectOption('room');
  await page.waitForTimeout(1600);
  await snap('desktop-room');
  check('Curated interior viewpoints');
  await page.getByRole('button', { name: 'Guided tour', exact: true }).click();
  for (let i = 0; i < 5; i++) {
    assert.equal((await state()).tour, i);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Start exploring', exact: true }).click();
  assert.equal((await state()).tour, null);
  assert.equal((await state()).explosion, 0);
  check('All six guided tour stops and reassembly');
  await page.getByRole('button', { name: 'Inside the market', exact: true }).click();
  await page.waitForTimeout(1700);
  await page.getByRole('button', { name: '3 The underwriters' }).click();
  await snap('desktop-market');
  await page.getByRole('button', { name: 'Market structure', exact: true }).click();
  assert(
    await page
      .getByText(
        'These are organisational relationships, not extra steps in the placement journey.',
      )
      .isVisible(),
  );
  check('Fictional market journey and separate organisational relationships');
  await page.getByRole('button', { name: 'Reset view', exact: true }).last().click();
  await page.waitForTimeout(1600);
  await measure(page, 'Desktop Chrome — assembled auto-rotation');
  await page.getByRole('button', { name: 'Start auto-rotation', exact: true }).click();
  await page.locator('canvas').dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0 });
  assert.equal((await state()).rotate, false);
  check('Pointer interaction immediately stops auto-rotation');
  await page.getByRole('button', { name: 'Reduce motion', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Start auto-rotation' }).isDisabled());
  await page.getByRole('button', { name: 'Reduce motion', exact: true }).click();
  check('Reduced motion disables auto-rotation');
  const cameraBefore = await page.evaluate(() => window.__LLOYDS__.camera.position.toArray());
  await page.locator('canvas').focus();
  await page.keyboard.press('ArrowLeft');
  const cameraAfter = await page.evaluate(() => window.__LLOYDS__.camera.position.toArray());
  assert.notDeepEqual(cameraBefore, cameraAfter);
  await page.keyboard.press('Home');
  check('Keyboard orbit and reset');
  await page.getByRole('button', { name: 'Text catalogue', exact: true }).click();
  assert(await page.getByRole('heading', { name: 'Every part has a purpose.' }).isVisible());
  assert.equal(await page.locator('canvas').count(), 0);
  await page.getByRole('button', { name: 'Return to 3D', exact: true }).last().click();
  await ready(page);
  check('Text catalogue works without Canvas and returns to 3D');
  // Distinct touch context, leaving the desktop and the user’s own browser untouched.
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
  });
  const mobile = await mobileContext.newPage();
  monitor(mobile);
  await mobile.goto(base);
  await ready(mobile);
  await mobile.screenshot({ path: 'output/playwright/mobile-assembled.png' });
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await mobile.getByRole('button', { name: 'Building anatomy', exact: true }).tap();
  await mobile.getByRole('textbox', { name: 'Search components' }).fill('Lutine');
  await mobile.getByRole('button', { name: 'The Rostrum & Lutine Bell', exact: true }).tap();
  assert(await mobile.getByRole('complementary', { name: 'Component information' }).isVisible());
  await mobile.screenshot({ path: 'output/playwright/mobile-inspection.png' });
  await mobile.getByRole('button', { name: 'Close component information' }).tap();
  await mobile.getByRole('button', { name: 'Reset view', exact: true }).last().tap();
  await mobile.waitForTimeout(1200);
  await measure(
    mobile,
    'Touch viewport emulation in desktop Chrome — not physical iPhone hardware',
  );
  await mobile.getByRole('button', { name: 'Cutaway', exact: true }).tap();
  await mobile.getByRole('slider', { name: 'Section position' }).fill('65');
  check('390 × 844 touch layout, bottom-sheet selection and section controls');
  await mobileContext.close();
  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await fallbackContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).startsWith('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  const fallback = await fallbackContext.newPage();
  monitor(fallback);
  await fallback.goto(base);
  await fallback
    .getByText('3D rendering is unavailable in this browser.', { exact: false })
    .waitFor();
  await fallback.getByRole('textbox', { name: 'Search components' }).fill('bell');
  await fallback.getByRole('button', { name: 'The Rostrum & Lutine Bell', exact: true }).click();
  assert(await fallback.getByRole('complementary', { name: 'Component information' }).isVisible());
  await fallback.screenshot({ path: 'output/playwright/webgl-fallback.png' });
  check('WebGL-unavailable fallback retains complete searchable content');
  await fallbackContext.close();
  assert.deepEqual(results.errors, []);
  assert.deepEqual(results.failedRequests, []);
  check('No page errors or failed asset requests');
} finally {
  await writeFile('output/playwright/results.json', JSON.stringify(results, null, 2));
  await browser.close();
}
