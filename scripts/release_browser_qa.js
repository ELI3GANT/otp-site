#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const port = String(32000 + Math.floor(Math.random() * 20000));
const base = `http://127.0.0.1:${port}`;
const output = process.env.OTP_BROWSER_QA_REPORT_PATH || '';
const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: port, NODE_ENV: 'test' },
  stdio: 'ignore'
});

async function ready() {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Local server exited with ${server.exitCode}`);
    try { if ((await fetch(`${base}/bookings`)).ok) return; } catch (_) { /* Wait for startup. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Local booking route did not start.');
}

async function checkPage(page, route, selector, width) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  await page.locator(selector).waitFor({ state: 'visible' });
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    width: window.innerWidth
  }));
  if (layout.overflow) throw new Error(`${route} overflows at ${width}px`);
  if (errors.length) throw new Error(`${route} console errors at ${width}px: ${errors.join(' | ').slice(0, 600)}`);
}

async function run() {
  let browser;
  const report = { ok: false, viewports: [390, 1440], routes: ['/', '/bookings?offer=site-audit', '/bookings'], checks: [] };
  try {
    await ready();
    browser = await chromium.launch({ headless: true });
    for (const width of report.viewports) {
      const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
      const home = await context.newPage();
      await checkPage(home, '/', 'main', width);
      if (width <= 640) {
        await home.locator('summary.public-menu').click();
        if (!(await home.locator('.public-menu a[href="/vault"]').isVisible())) throw new Error('VAULT mobile navigation missing');
      } else if (!(await home.locator('.public-desktop-nav a[href="/vault"]').isVisible())) {
        throw new Error('VAULT desktop navigation missing');
      }
      report.checks.push(`home ${width}`);
      await home.close();

      const audit = await context.newPage();
      let submissions = 0;
      let lead;
      await audit.route('**/api/bookings/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
      await audit.route('**/api/bookings/submit', route => {
        submissions++;
        lead = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, received: true }) });
      });
      await checkPage(audit, '/bookings?offer=site-audit&source=release-browser-qa', '#audit-form', width);
      if (await audit.locator('#service-selector').isVisible()) throw new Error('Paid service selector appears on free audit path');
      await audit.locator('#audit-submit').click();
      if (submissions) throw new Error('Empty audit sent a booking');
      await audit.locator('#audit-url').fill('https://example.com/services');
      await audit.locator('#audit-name').fill('Release Test');
      await audit.locator('#audit-email').fill('test@example.com');
      await audit.locator('#audit-issue').fill('Booking button is hard to find on mobile');
      await audit.locator('#audit-consent').check();
      await audit.locator('#audit-submit').click();
      await audit.locator('#success-title').getByText('Your website review request is in.').waitFor();
      if (submissions !== 1 || lead.package_interest !== 'Not Sure Yet' || lead.service_type !== 'Website / Digital System') {
        throw new Error('Free audit payload or duplicate submission is wrong');
      }
      report.checks.push(`audit ${width}`);
      await audit.close();

      const booking = await context.newPage();
      await booking.route('**/api/bookings/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
      await checkPage(booking, '/bookings', '#booking-form', width);
      if (!(await booking.locator('#service-selector').isVisible())) throw new Error('Project service selector is hidden');
      const choices = await booking.locator('#booking-service option').count();
      if (choices !== 6) throw new Error(`Expected five broad service choices and placeholder, saw ${choices}`);
      report.checks.push(`project booking ${width}`);
      await context.close();
    }
    report.ok = true;
    console.log(`Release browser QA passed: ${report.checks.join(', ')}`);
  } catch (error) {
    report.error = String(error.message || error);
    console.error(report.error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
    if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2));
  }
}
run();
