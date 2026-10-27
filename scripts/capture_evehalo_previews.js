const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

async function run() {
  const app = require('../server.js');
  const port = 4567;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Server listening on http://127.0.0.1:${port}`);

  const outDir = '/Users/eli/OTP/output/evehalo-preview';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const baseUrl = `http://127.0.0.1:${port}/evehalo`;

  // 1. Desktop Viewport
  console.log('Capturing Desktop preview (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktopPage.screenshot({ path: path.join(outDir, 'desktop-hero.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await desktopPage.screenshot({ path: path.join(outDir, 'desktop-full.png'), fullPage: true });

  // Capture individual feature sections on desktop
  const sections = ['today', 'horizon', 'evo', 'focus', 'spaces', 'apple', 'duo', 'plus', 'privacy'];
  for (const sec of sections) {
    const el = await desktopPage.$(`#${sec}`);
    if (el) {
      await el.screenshot({ path: path.join(outDir, `section-${sec}.png`) });
      console.log(`  ✓ Captured section: #${sec}`);
    }
  }
  await desktopContext.close();

  // 2. Tablet / Expanded Duo Viewport
  console.log('Capturing Tablet / Duo preview (820x1180)...');
  const tabletContext = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await tabletPage.screenshot({ path: path.join(outDir, 'tablet-duo-hero.png'), clip: { x: 0, y: 0, width: 820, height: 1180 } });
  await tabletPage.screenshot({ path: path.join(outDir, 'tablet-duo-full.png'), fullPage: true });
  await tabletContext.close();

  // 3. Mobile Viewport (iPhone 18 Pro)
  console.log('Capturing Mobile preview (393x852)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-hero.png'), clip: { x: 0, y: 0, width: 393, height: 852 } });
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-full.png'), fullPage: true });
  await mobileContext.close();

  console.log('All responsive preview captures saved to:', outDir);

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log('Server stopped cleanly.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
