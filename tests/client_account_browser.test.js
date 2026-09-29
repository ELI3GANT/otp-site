const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('client workspace stays usable at 390px without leaking staff content', async () => {
    const app = express();
    const root = path.join(__dirname, '..');
    let sessionActive = false;
    app.get(['/client/login', '/client/profile', '/client/projects', '/client/projects/:id'], (_req, res) => res.sendFile(path.join(root, 'client.html')));
    app.get('/api/client/session', (req, res) => {
        if (!sessionActive) return res.status(401).json({ ok: false });
        return res.json({ ok: true,
            profile: { email: 'client@example.test' },
            organizations: [{ name: 'Client Studio', role: 'client_owner' }]
        });
    });
    app.get('/api/client/projects', (_req, res) => res.json({
        ok: true,
        projects: [{ id: 'JOB-OWN', title: 'Website refresh', service: 'Website', status: 'Approved', summary: 'Scope approved.' }]
    }));
    app.get('/api/client/projects/JOB-OWN', (_req, res) => res.json({
        ok: true,
        project: { id: 'JOB-OWN', title: 'Website refresh', service: 'Website', status: 'Approved',
            summary: 'Scope approved.', nextAction: 'Review the next milestone.', updatedAt: '2026-09-29T12:00:00Z',
            deliverables: [{ name: 'Homepage', status: 'In Production', clientNotes: 'First draft in progress.' }],
            documents: [{ label: 'Approved brief', url: 'https://example.test/approved-brief' }] }
    }));
    app.use(express.static(root));
    const server = await new Promise((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const browser = await chromium.launch({
        headless: true,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        await page.goto(`${base}/client/login`);
        await page.getByRole('heading', { name: 'Client workspace' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Email me a sign-in link' }).isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

        sessionActive = true;
        await page.goto(`${base}/client/projects`);
        await page.getByRole('heading', { name: 'Your projects' }).waitFor();
        assert.equal(await page.getByText('Website refresh').isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.getByRole('link', { name: 'Open project' }).click();
        await page.getByRole('heading', { name: 'Website refresh' }).waitFor();
        assert.equal(await page.getByText('Review the next milestone.').isVisible(), true);
        assert.equal(await page.getByText('First draft in progress.', { exact: false }).isVisible(), true);
        assert.equal(await page.getByRole('link', { name: 'Open file' }).isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.getByRole('link', { name: 'Profile' }).click();
        await page.getByRole('heading', { name: 'Your profile' }).waitFor();
        assert.equal(await page.getByText('client@example.test').isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
});
