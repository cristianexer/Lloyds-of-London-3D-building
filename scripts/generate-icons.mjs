import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
// Raster fallbacks are rendered from the original vector mark, not reference photos.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const svg = await readFile('public/favicon.svg', 'utf8');
  const icons = [];
  for (const size of [32, 48, 180]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:${size === 180 ? '#1b241f' : 'transparent'}}svg{width:100%;height:100%;display:block}</style>${svg}`,
    );
    const png = await page.screenshot({ omitBackground: size !== 180 });
    if (size === 32) await writeFile('public/favicon-32.png', png);
    if (size === 180) await writeFile('public/apple-touch-icon.png', png);
    else icons.push({ size, png });
    await page.close();
  }
  // ICO directory with two PNG-compressed entries (32px and 48px).
  const directory = Buffer.alloc(6 + 16 * icons.length);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(icons.length, 4);
  let offset = directory.length;
  icons.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    directory[entry] = size;
    directory[entry + 1] = size;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile('public/favicon.ico', Buffer.concat([directory, ...icons.map((i) => i.png)]));
  console.log('Generated 32px PNG, 32/48px ICO and 180px Apple touch icon from favicon.svg.');
} finally {
  await browser.close();
}
