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

    // 2. Archive Initial Hydration & Static Pre-rendered cards
    {
      await page.goto(`${baseUrl}/archive`, { waitUntil: 'domcontentloaded' });
      const initialCount = await page.textContent('[data-archive-result-count]');
      report('Archive initial count matches 07 / 07', initialCount.includes('07 / 07'), `count: ${initialCount.trim()}`);

      const cardCount = await page.locator('.archive-case-study-card').count();
      report('Archive exactly 7 cards rendered', cardCount === 7, `cards: ${cardCount}`);
      report('Song Wars is archived and Vault is coming soon', await page.locator('[data-project-id="song-wars"]').textContent().then((text) => text.includes('Archived')) && await page.locator('[data-project-id="vault"]').textContent().then((text) => text.includes('Coming Soon')));
    }

    // 3. Archive Collection Filter & pushState
    {
      const initialHistoryLen = await page.evaluate(() => window.history.length);
      await page.click('button[data-archive-collection="Internal Products"]');
      await page.waitForTimeout(100);

      const newUrl = page.url();
      const filteredCount = await page.textContent('[data-archive-result-count]');
      const productsCardCount = await page.locator('.archive-case-study-card').count();
      const newHistoryLen = await page.evaluate(() => window.history.length);

      report('Collection button updates URL', newUrl.includes('collection=Internal+Products') || newUrl.includes('collection=Internal%20Products'), `url: ${newUrl}`);
      report('Collection button pushes history state', newHistoryLen > initialHistoryLen, `length: ${initialHistoryLen} -> ${newHistoryLen}`);
      report('Filter reduces card count correctly', productsCardCount > 0 && productsCardCount < 7, `visible: ${productsCardCount}`);
    }

    // 4. Browser Back & Forward Navigation (popstate)
    {
      await page.goBack();
      await page.waitForTimeout(150);
      const backCount = await page.textContent('[data-archive-result-count]');
      const backActiveCollection = await page.getAttribute('button[data-archive-collection="Everything"]', 'aria-pressed');

      report('Back button restores Everything collection', backActiveCollection === 'true' && backCount.includes('07 / 07'), `count: ${backCount.trim()}`);

      await page.goForward();
      await page.waitForTimeout(150);
      const fwdActiveCollection = await page.getAttribute('button[data-archive-collection="Internal Products"]', 'aria-pressed');
      report('Forward button restores Internal Products', fwdActiveCollection === 'true', `active: ${fwdActiveCollection}`);
    }

    // 5. Debounced Search & replaceState
    {
      await page.goto(`${baseUrl}/archive`, { waitUntil: 'domcontentloaded' });
      const historyBeforeSearch = await page.evaluate(() => window.history.length);

      await page.fill('[data-archive-search]', 'weather');
      await page.waitForTimeout(250); // wait for 150ms debounce

      const historyAfterSearch = await page.evaluate(() => window.history.length);
      const searchUrl = page.url();
      const searchCount = await page.textContent('[data-archive-result-count]');
      const searchCards = await page.locator('.archive-case-study-card').count();

      report('Search uses replaceState (history length unchanged)', historyAfterSearch === historyBeforeSearch, `len: ${historyAfterSearch}`);
      report('Search updates canonical URL', searchUrl.includes('search=weather'), `url: ${searchUrl}`);
      report('Search filters correctly to WeatherOS', searchCards === 1 && searchCount.includes('01 / 07'), `cards: ${searchCards}`);
    }

    // 6. Direct Deep-linking & Deterministic Sync
    {
      await page.goto(`${baseUrl}/archive?search=weather&category=Software`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(100);

      const searchVal = await page.inputValue('[data-archive-search]');
      const catVal = await page.inputValue('[data-archive-category]');
      const deepCards = await page.locator('.archive-case-study-card').count();

      report('Deep link populates search input', searchVal === 'weather', `search: "${searchVal}"`);
      report('Deep link populates category select', catVal === 'Software', `category: "${catVal}"`);
      report('Deep link renders filtered results', deepCards === 1, `cards: ${deepCards}`);
    }

    // 7. Malformed / Adversarial Query Strings
    {
      await page.goto(`${baseUrl}/archive?category=garbage&status=unknown&year=99999&technology=%3Cscript%3Ealert(1)%3C%2Fscript%3E&collection=fake`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(100);

      const advCount = await page.textContent('[data-archive-result-count]');
      const advCards = await page.locator('.archive-case-study-card').count();

      report('Adversarial query fails safely to all projects', advCards === 7 && advCount.includes('07 / 07'), `cards: ${advCards}, count: ${advCount.trim()}`);
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

    // 9. Honest Quote State
    {
      await page.goto(`${baseUrl}/quote`, { waitUntil: 'domcontentloaded' });
      const bodyText = await page.textContent('body');
      report('Quote page never shows fake "Deposit Confirmed!"', !bodyText.includes('Deposit Confirmed!'), 'No fake deposit confirmation');
    }

    // 10. Viewport & Safe Area Overflows
    {
      const testRoutes = ['/', '/archive', '/bookings', '/weatheros', '/songwars'];
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
          report(`Zero horizontal overflow on ${route} at ${vp.name} (${vp.width}px)`, !hasOverflow, hasOverflow ? 'OVERFLOW DETECTED' : 'OK');
        }
      }
    }

    {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseUrl}/studio`, { waitUntil: 'load' });
      const studioHeaderHeight = await page.locator('.public-header').evaluate((header) => Math.round(header.getBoundingClientRect().height));
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
