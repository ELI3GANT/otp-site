# OTP Site — Only True Perspective

A high-end, AI-integrated web platform for creative visionaries. Features include real-time analytics, automated lead auditing, and a custom admin portal for content management.

## Tech stack

- **Frontend**: Vanilla JS, Chart.js, Supabase client. Marketing site may live on **Framer** (`onlytrueperspective.tech`); repo files can be mirrored from Git for admin HTML/JS or pasted/synced manually.
- **Backend**: Node/Express on **Vercel** (`/api/*`, schema SQL endpoints), Supabase (PostgreSQL), OpenAI/Gemini APIs.
- **Performance**: IntersectionObserver-based lazy loading, compression, client-side image optimization.

## Directory layout

| Path | Purpose |
|------|---------|
| **Root** (`*.html`, `site-*.js`, `*.css`) | Public site, shared scripts, and styles. Kept at root so asset URLs stay simple for static hosting. |
| **`assets/`** | Brand media (e.g. animated logo). |
| **`docs/business/`** | Internal business documents (MSA, onboarding questionnaire). |
| **`scripts/`** | Node utilities: `prepare_deploy.js`, `bake_insights.js`, `watch_push.js`, etc. |
| **`supabase/migrations/`** | SQL to run in the Supabase SQL editor (schema, hardening, seeds). |
| **`supabase/functions/`** | Supabase Edge Function sources (when used). |
| **`tests/`** | Automated checks; run via `npm run master_test`. |

## Setup

1. Clone the repository.
2. `npm install`
3. Copy env: create `.env` from your secrets (Supabase, JWT, AI keys, Stripe, etc. — never commit `.env`).
4. Local API: `npm start` or `npm run dev` (nodemon).

## Daily workflow (push → Vercel)

1. **`npm run watch:push`** — leave running; after you save, it debounces, then **commit + push** to the current branch.  
   - Detached Cursor worktree: `WATCH_PUSH_TARGET=main npm run watch:push`
2. **Vercel** rebuilds from **`main`** (or your connected branch).
3. **Framer** — publish there when you change what Framer serves; Git does not replace Framer publish.

## Admin

- Secure login with JWT.
- Post/broadcast management, analytics, and client auditing from the terminal UI.
- Schema SQL modal: **`GET /api/schema-migration`** (alias **`/api/deploy-sql`**) with **`Authorization: Bearer <JWT>`** (same token as the Terminal). Not public. Source file: `supabase/migrations/DEPLOY_V1.3.sql`.

## Optional hosts

- **Netlify**: `netlify.toml` publishes repo **root** as static only (no API — use Vercel for `/api`).
- **GitHub Pages**: `CNAME` + `.nojekyll` present if you point DNS/repo pages here.
