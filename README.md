# OTP Site v1.3.0 - Only True Perspective

A high-end, AI-integrated web platform for creative visionaries. Features include real-time analytics, automated lead auditing, and a custom admin portal for content management.

## Tech Stack
- **Frontend**: Vanilla JS, Chart.js, Supabase Client.
- **Backend**: Node.js/Express, Supabase (PostgreSQL), OpenAI/Gemini AI API.
- **Performance**: IntersectionObserver for lazy loading, Gzip compression, Client-side image optimization.

## Directory Structure (Proposed Cleanup)
- `/assets`: Brand images and media assets.
- `/scripts`: Server-side automation and utility scripts.
- `/supabase`: SQL migrations and edge function configs.
- `/tests`: Automated E2E and unit test suite (Runnable via `npm run master_test`).
- `/docs`: Project reports, roadmap, and API documentation.
- `/logs`: Runtime and crash logs for debugging.

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure `.env` with Supabase, OpenAI, and Gemini keys.
4. Start the server: `npm start` or `npm run dev` (for development).

## Admin Features
- Secure login with JWT.
- Live Post/Broadcast management.
- Visual analytics dashboard with interactive charts.
- Automated client auditing and lead capture.