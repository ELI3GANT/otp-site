# OTP Site — Only True Perspective

A high-end, AI-integrated web platform for creative visionaries. Features include real-time analytics, automated lead auditing, and a custom admin portal for content management.

## Tech stack

- **Frontend**: Vanilla JS, Chart.js, Supabase client (static hosting, e.g. GitHub Pages → custom domain).
- **Backend**: Node/Express on Vercel (`/api/*`), Supabase (PostgreSQL), OpenAI/Gemini APIs.
- **Performance**: IntersectionObserver-based lazy loading, compression, client-side image optimization.

## Directory layout

| Path | Purpose |
|------|---------|
| **Root** (`*.html`, `site-*.js`, `*.css`) | Public site, shared scripts, and styles. Kept at root so asset URLs stay simple for static hosting. |
| **`assets/`** | Brand media (e.g. animated logo). |
| **`docs/business/`** | Internal business documents (MSA, onboarding questionnaire). |
| **`scripts/`** | Node utilities (deploy prep, content bake, local helpers). |
| **`supabase/migrations/`** | SQL you run in the Supabase SQL editor (schema, hardening, seeds). |
| **`supabase/functions/`** | Supabase Edge Function sources (when used). |
| **`tests/`** | Automated checks; run via `npm run master_test`. |

## Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure `.env` with Supabase, OpenAI, and Gemini keys (for local API).
4. Start the API locally: `npm start` or `npm run dev` (nodemon).

## Admin

- Secure login with JWT.
- Post/broadcast management, analytics, and client auditing from the terminal UI.
- Schema SQL in the admin modal is loaded from **`GET /api/schema-migration`** on your Vercel API (`getApiBase()`), so it works even when the terminal UI is on Framer. Static path `supabase/migrations/DEPLOY_V1.3.sql` is still the source file in the repo.
