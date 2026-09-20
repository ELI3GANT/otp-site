# Redesign release verification

Checked 2026-09-20 before publishing. The redesign is still local at the time of this record.

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | PASS | 52/52 suite processes, zero failures; optional database checks skip without local secrets |
| `npm run test:e2e` | PASS | 47/47 adversarial browser checks, including booking steps, quote state, and responsive overflow |
| `npm run master_test:ci` | PASS | 52/52, including live public API analytics and security/performance checks |
| `npm run contracts:verify` | PASS | Four pinned OTP contracts |
| `npm run security:scan` | PASS | Secret scan across 289 files |
| `npm run build:speed-insights` | PASS | Existing bundle built |
| `node --check` | PASS | Changed server, shell, archive, stories, campaign config, sweep script |
| `git diff --check` | PASS | Workspace whitespace |
| `OTP_SWEEP_HTTP_ONLY=1 npm run prod:full-sweep` | PASS | 34 existing-production public HTTP checks; predeploy baseline |
| Authenticated production HTTP sweep | PASS 2026-09-16 | 34 public checks and five authenticated GET checks; CI will rerun |
| Authenticated browser smoke | NOT RUN | Existing script stores an admin JWT in browser localStorage; HTTP checks avoid that storage |
| Responsive layout matrix | PASS | 124 affected-page/viewport cases, zero horizontal overflow |
| Lighthouse local | PASS | Home 100/100/100/100; Archive 92/100/100/100; Studio 100/100/100/100; WeatherOS story 100/100/100/100; Signal final 100/100/100/100 (performance/accessibility/best practices/SEO) |

Manual Chrome QA confirmed Archive search narrows to Song Wars and displays its Released status, the July 2026 campaign page labels registration figures as historical, and a real Journal article loads its content. Independent design and visual reviewers passed core and supporting page top views. Lower sections were checked through the responsive layout matrix, link crawl, and adversarial browser run; full manual visual inspection of every lower section was not completed. The 83-link local crawl found no broken internal links or assets. No intake submission, payment, business-data mutation, or production configuration change was made during QA.

The public sweep skipped authenticated checks because no admin secret was loaded in the current shell. The prior authenticated check used a five-minute JWT signed in memory from existing local production configuration; no token or secret value appears in reports or browser storage. CI will use configured GitHub secrets.

Sanitized results: `public-http-sweep.json`, `authenticated-http-sweep.json`, and `local-links.json`. Detailed local command logs are ignored. JavaScript LSP was unavailable after a previously declined installation; syntax and runtime checks passed.

The production workflow uses a clean release gate, reruns the test and HTTP checks, builds and deploys to the existing Vercel project, then runs a post-deploy sweep. Do not mark deployment or live visual QA complete until those steps return evidence.
