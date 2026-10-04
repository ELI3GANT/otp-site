/**
 * OTP End-to-End Adversarial QA Test Suite
 * Validates real browser rendering, history pushState/replaceState/popstate,
 * deep linking, query string edge-cases, booking form accessibility & keyboard flow,
 * honest payment states, responsive safe-area insets, and zero horizontal overflow.
 */
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const app = require(path.join(__dirname, '../../server.js'));

async function runAdversarialQA() {
  console.log('--- OTP ADVERSARIAL QA SUITE ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (launchErr) {
    console.warn('Playwright browser launch skipped:', launchErr.message);
    await new Promise((resolve) => server.close(resolve));
    return;
  }

  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();

  const results = [];
  const report = (name, passed, detail = '') => {
    results.push({ name, passed, detail });
    console.log(`${passed ? '✅' : '❌'} ${name} ${detail ? `(${detail})` : ''}`);
  };

  try {
    // 1. Route Aliases and 308 Redirects
    {
      const resWeb = await page.request.get(`${baseUrl}/website-design`);
      report('Route /website-design returns 200', resWeb.status() === 200, `status: ${resWeb.status()}`);

      const resSupp = await page.request.get(`${baseUrl}/weatheros-support.html`, { maxRedirects: 0 });
      report('Route /weatheros-support.html redirects 308', resSupp.status() === 308, `location: ${resSupp.headers()['location']}`);

      const resPriv = await page.request.get(`${baseUrl}/weatheros-privacy.html`, { maxRedirects: 0 });
      report('Route /weatheros-privacy.html redirects 308', resPriv.status() === 308, `location: ${resPriv.headers()['location']}`);
    }

    // Curated categories, deep links, and browser history.
    {
      await page.goto(`${baseUrl}/archive`, { waitUntil: 'domcontentloaded' });
      report('Archive retains seven projects', await page.locator('.archive-case-study-card').count() === 7);
      const projectLinks = await page.locator('.archive-project-action-primary').evaluateAll(items => items.map(item => item.href));
      for (const link of projectLinks) report('Project story returns 200: ' + new URL(link).pathname, (await page.request.get(link)).status() === 200);
      report('All retains eight films', await page.locator('#motion a[href*="youtube.com/watch"]').count() === 8);
      report('Archive has four category controls', await page.locator('[data-archive-collection]').count() === 4);
      report('Advanced database controls are removed', await page.locator('[data-archive-search], [data-archive-year], [data-archive-technology], [data-archive-status], [data-archive-category], [data-archive-result-count]').count() === 0);
      report('Song Wars archived and VAULT coming soon', (await page.locator('[data-project-id="song-wars"]').textContent()).includes('Archived') && (await page.locator('[data-project-id="vault"]').textContent()).includes('Coming Soon'));
      const historyLength = await page.evaluate(() => history.length);
      await page.click('[data-archive-collection="Digital"]');
      report('Digital shows five projects and hides films', await page.locator('.archive-case-study-card').count() === 5 && await page.locator('#motion').isHidden());
      report('Categories push shareable history', page.url().includes('collection=Digital') && await page.evaluate(() => history.length) > historyLength);
      await page.goBack();
      report('Back restores all projects', await page.locator('.archive-case-study-card').count() === 7 && await page.locator('#motion').isVisible());
      await page.goForward();
      report('Forward restores Digital', await page.locator('.archive-case-study-card').count() === 5 && await page.getAttribute('[data-archive-collection="Digital"]', 'aria-pressed') === 'true');
      await page.click('[data-archive-collection="Music / Campaigns"]');
      report('Music maps to PROTOCOL and Song Wars', JSON.stringify(await page.locator('[data-project-id]').evaluateAll(items => items.map(item => item.dataset.projectId))) === JSON.stringify(['protocol', 'song-wars']));
      await page.click('[data-archive-collection="Video"]');
      report('Video shows films without an empty project state', await page.locator('#motion').isVisible() && await page.locator('[data-archive-project-section]').isHidden() && await page.locator('[data-archive-empty]').isHidden());
      await page.goto(`${baseUrl}/archive?collection=Music%20%2F%20Campaigns`);
      report('Music deep link restores selection', await page.locator('.archive-case-study-card').count() === 2);
      await page.goto(`${baseUrl}/archive?collection=Internal+Products&search=weather&year=2026`);
      report('Legacy URLs normalize without hidden filters', await page.locator('.archive-case-study-card').count() === 5 && new URL(page.url()).search === '?collection=Digital');
      await page.goto(`${baseUrl}/archive?collection=%3Cscript%3E&status=unknown&year=99999`);
      report('Adversarial queries safely restore All', await page.locator('.archive-case-study-card').count() === 7 && new URL(page.url()).search === '');
    }

    {
      const noJS = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
      const fallback = await noJS.newPage();
      await fallback.goto(`${baseUrl}/archive`);
      report('No-JS Archive retains all seven stories', await fallback.locator('.archive-case-study-card').count() === 7);
      report('No-JS categories truthfully disabled', await fallback.locator('[data-archive-collection]:disabled').count() === 4);
      await noJS.close();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${baseUrl}/archive`);
      report('Reduced Motion preserves visible portfolio', await page.locator('#motion').isVisible() && await page.locator('[data-archive-project-section]').isVisible());
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }

    {
      await page.goto(`${baseUrl}/`);
      const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-otp').trim());
      await page.locator('a[href="/bookings?source=homepage-hero"]').click();
      report('Inquiry retains homepage accent', await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-otp').trim()) === accent);
      report('Inquiry action uses selected accent', await page.locator('.booking-site').evaluate(el => getComputedStyle(el).getPropertyValue('--accent').trim()) === accent);
      await page.goto(`${baseUrl}/`);
      const cards = page.locator('.home-work-pair .home-project-image');
      const heights = await cards.evaluateAll(items => items.map(item => item.getBoundingClientRect().height));
      report('Desktop project previews align', Math.abs(heights[0] - heights[1]) < 2);
      report('Full app screenshot fits its frame', await page.locator('.home-project-phone .home-project-image').evaluate(el => el.querySelector('img').getBoundingClientRect().height <= el.getBoundingClientRect().height));
      const footerLinks = page.locator('.public-footer-links a');
      report('Every footer navigation arrow is clickable inside its link', await footerLinks.count() === await page.locator('.public-footer-links a .public-link-arrow').count());
      report('Footer arrows stay small and render as strokes', await page.locator('.public-link-arrow').evaluateAll(items => items.every(el => { const box = el.getBoundingClientRect(); return box.width > 0 && box.width <= 24 && box.height <= 24 && getComputedStyle(el).fill === 'none'; })));
      await page.locator('.home-signal-type').click();
      report('Signal card opens ELI3GANT music timeline', new URL(page.url()).pathname === '/signal' && (await page.locator('.signal-timeline').textContent()).includes('SIGNAL / LORE'));
    }

    // 8. Booking Flow Validation, A11y, and Enter Key Progression
    {
      const bookingConsoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') bookingConsoleErrors.push(message.text());
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.locator('a[href="/bookings?source=homepage-hero"]').click();
      report('Homepage Start a project opens project inquiry', new URL(page.url()).pathname === '/bookings' && new URL(page.url()).searchParams.get('source') === 'homepage-hero', page.url());
      await page.goto(`${baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });

      report('Project inquiry has exactly five need choices', await page.locator('input[name="service_category"]').count() === 5);
      report('Project inquiry hides package choices before review', await page.locator('#booking-package').isHidden());
      const mobileChoices = await page.locator('.inquiry-choice').evaluateAll((items) => items.map((el) => {
        const box = el.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      }));
      report('390px inquiry choices fit and are visible', mobileChoices.every((box) => box.width > 0 && box.left >= 0 && box.right <= 390), JSON.stringify(mobileChoices));

      await page.click('#next-step');
      const errorMsg = await page.textContent('#booking-error');
      const focusedId = await page.evaluate(() => document.activeElement ? document.activeElement.id : null);
      report('Empty need step requires a project category', errorMsg.includes('project category'), `error: "${errorMsg.trim()}"`);
      const focusedName = await page.evaluate(() => document.activeElement ? document.activeElement.getAttribute('name') : null);
      report('Validation focuses first need choice', focusedName === 'service_category', `focused: ${focusedId || focusedName}`);

      await page.check('input[name="service_category"][value="Website / Digital System"]');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      const stepAfterEnter = await page.evaluate(() => document.documentElement.dataset.bookingStep);
      report('Need selection advances to Scope', stepAfterEnter === '2', `current step: ${stepAfterEnter}`);
      report('Scope step asks how to build or fix', await page.locator('#booking-description').isVisible());
      report('Contact fields remain after scope', !(await page.locator('#booking-name').isVisible()));
      await page.fill('#booking-description', 'A project inquiry page with a clear booking handoff.');
      await page.fill('#booking-success-criteria', 'Clients can explain the project and receive clear next steps.');
      await page.focus('#booking-description');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      const stepAfterTextareaEnter = await page.evaluate(() => document.documentElement.dataset.bookingStep);
      report('Enter key in textarea does not advance step', stepAfterTextareaEnter === '2', `step: ${stepAfterTextareaEnter}`);
      await page.click('#next-step');
      const step3 = await page.evaluate(() => document.documentElement.dataset.bookingStep);
      report('Scope advances to Contact', step3 === '3', `step: ${step3}`);
      await page.fill('#booking-name', 'Browser QA');
      await page.fill('#booking-email', 'qa@example.invalid');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      const step4 = await page.evaluate(() => document.documentElement.dataset.bookingStep);
      report('Contact advances to Project Inquiry review', step4 === '4', `step: ${step4}`);
      const reviewText = await page.textContent('#review-summary');
      report('Review summary reflects scope', reviewText.includes('booking handoff'), 'Review summary contains project details');
      report('Review summary reflects contact', reviewText.includes('Browser QA') && reviewText.includes('qa@example.invalid'), 'Review summary contains name and email');
      report('Final CTA says Send Project Inquiry', await page.locator('#submit-booking').textContent() === 'Send Project Inquiry');
      report('No scope-call scheduling promise appears', !(await page.locator('body').innerText()).match(/book a scope call/i));
      await page.check('#booking-consent');
      let submittedPayload = null;
      await page.route('**/api/bookings/submit', async (route) => {
        submittedPayload = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          schema_version: 'otp-booking-intake-v1',
          ok: true,
          received: true,
          message: 'Project inquiry received. OTP will review the scope and follow up with the next step.',
          writerEvidence: { writer: 'otp_os', contractVersion: 'otp-booking-intake-v1', status: 'persisted' }
        }) });
      });
      await page.click('#submit-booking');
      await page.waitForSelector('#booking-success:not(.hidden)');
      report('Mocked writer success displays truthful inquiry confirmation', (await page.textContent('#success-copy')).includes('no call, appointment, or delivery slot has been scheduled'));
      report('Inquiry sends canonical service and scope fields', submittedPayload?.service_type === 'Website / Digital System' && submittedPayload?.project_description.includes('Success looks like:'));
      report('Booking page has no console errors', bookingConsoleErrors.length === 0, bookingConsoleErrors.join(' | '));
    }

    // Public choices must reach the writer with existing canonical service values.
    {
      await page.unroute('**/api/bookings/submit');
      const choices = [
        ['Video production / editing', 'Video / Content', 'The Signal'],
        ['Creative direction / campaign', 'Brand Launch', 'The Engine'],
        ['Website / digital product', 'Website / Digital System', 'The Engine'],
        ['Business system / automation', 'Business System', 'The System'],
        ['Something custom', 'Custom Build', 'The System']
      ];
      for (const [label, service, recommendation] of choices) {
        await page.goto(`${baseUrl}/bookings`, { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('#booking-service').options.length > 1);
        await page.getByText(label, { exact: true }).click();
        await page.click('#next-step');
        await page.fill('#booking-description', 'A focused creative deliverable.');
        await page.fill('#booking-success-criteria', 'Clear, finished work.');
        await page.click('#next-step');
        await page.fill('#booking-name', 'Mapping QA');
        await page.fill('#booking-email', 'qa@example.invalid');
        await page.click('#next-step');
        report(label + ' review keeps the public label and recommendation', (await page.textContent('#review-summary')).includes(label) && (await page.textContent('#recommended-package-name')).includes(recommendation));
        await page.check('#booking-consent');
        let payload;
        await page.route('**/api/bookings/submit', async route => {
          payload = route.request().postDataJSON();
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'QA intercepted; no write performed.' }) });
        });
        await Promise.all([page.waitForResponse('**/api/bookings/submit'), page.click('#submit-booking')]);
        report(label + ' submits canonical service', payload?.service_type === service);
        await page.unroute('**/api/bookings/submit');
      }
      for (const [alias, expected] of [['artist-campaign', 'Brand Launch'], ['event-community-rollout', 'Brand Launch'], ['launch-package', 'Brand Launch'], ['product-design', 'Website / Digital System'], ['website-business-fix', 'Website / Digital System'], ['business-systems', 'Business System'], ['AI / Automation', 'Business System'], ['same-day-signal', 'Video / Content']]) {
        await page.goto(`${baseUrl}/bookings?service=${encodeURIComponent(alias)}`, { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('#booking-service').options.length > 1);
        report('Inquiry alias resolves: ' + alias, await page.inputValue('#booking-service') === expected);
      }
    }

    // 9. Honest Quote State
    {
      await page.goto(`${baseUrl}/quote`, { waitUntil: 'domcontentloaded' });
      const bodyText = await page.textContent('body');
      report('Quote page never shows fake "Deposit Confirmed!"', !bodyText.includes('Deposit Confirmed!'), 'No fake deposit confirmation');
    }

    // 10. Viewport & Safe Area Overflows
    {
      const testRoutes = ['/', '/archive', '/studio', '/signal', '/bookings', '/weatheros', '/songwars'];
      const viewports = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 390, height: 844, name: 'iPhone 14' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1440, height: 900, name: 'Desktop' }
      ];

      for (const route of testRoutes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' });
        for (const vp of viewports) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.waitForTimeout(50);
          const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
          });
          if (process.env.OTP_QA_SCREENSHOT_DIR && ['/', '/archive', '/studio', '/signal', '/bookings'].includes(route) && [390, 1440].includes(vp.width)) await page.screenshot({ path: path.join(process.env.OTP_QA_SCREENSHOT_DIR, `otp-final-${route.replaceAll('/', '') || 'home'}-${vp.width}.png`) });
          if (process.env.OTP_QA_SCREENSHOT_DIR && route === '/bookings' && [390, 1440].includes(vp.width)) {
            await page.locator('#booking-form').scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(process.env.OTP_QA_SCREENSHOT_DIR, `otp-final-choices-${vp.width}.png`), fullPage: false });
          }
          report(`Zero horizontal overflow on ${route} at ${vp.name} (${vp.width}px)`, !hasOverflow, hasOverflow ? 'OVERFLOW DETECTED' : 'OK');
        }
      }
    }

    {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseUrl}/studio`, { waitUntil: 'load' });
      const studioHeaderHeight = await page.locator('.public-header').evaluate((header) => Math.round(header.getBoundingClientRect().height));
      const iconBounds = await page.locator('.studio-service-icon, .studio-section-icon, .studio-question-icon svg').evaluateAll(items => items.map(el => { const b = el.getBBox(); return { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height }; }));
      report('All fifteen Studio icons render inside their viewboxes', iconBounds.length === 15 && iconBounds.every(b => b.x >= 1 && b.y >= 1 && b.right <= 23 && b.bottom <= 23));

      await page.goto(`${baseUrl}/website-design.html`, { waitUntil: 'load' });
      const serviceHeaderHeight = await page.locator('.public-header').evaluate((header) => Math.round(header.getBoundingClientRect().height));
      report('Service page uses shared mobile header height', serviceHeaderHeight === studioHeaderHeight, `${serviceHeaderHeight}px vs ${studioHeaderHeight}px`);

      const menu = page.locator('.public-menu');
      const trigger = menu.locator('summary');
      report('Mobile menu trigger is visible', await trigger.isVisible());
      await trigger.click();
      report('Mobile menu opens on trigger click', await menu.evaluate((element) => element.open));
      await page.mouse.click(10, 500);
      report('Mobile menu closes on click outside', !(await menu.evaluate((element) => element.open)));
      await trigger.click();
      await trigger.press('Escape');
      report('Mobile menu closes on Escape', !(await menu.evaluate((element) => element.open)));
    }

  } catch (err) {
    console.error('Fatal error during adversarial QA:', err);
    report('Adversarial QA Suite Run', false, err.message);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n--- QA SUMMARY: ${results.length - failed.length}/${results.length} PASSED ---`);
  if (failed.length > 0) {
    console.error(`Failed ${failed.length} checks:`, failed);
    process.exit(1);
  } else {
    console.log('🎉 ALL ADVERSARIAL QA CHECKS PASSED PERFECTLY!\n');
  }
}

if (require.main === module) {
  runAdversarialQA();
}

module.exports = runAdversarialQA;
