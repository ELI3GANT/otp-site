-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE MISSING INSIGHTS

INSERT INTO posts (title, slug, excerpt, content, published, category, image_url)
VALUES 
(
  'The Architecture of a Visual Drop',
  'architecture-visual-drop',
  'Why pacing and cinematic color are the most underrated tools in your rollout strategy. We deconstruct the "The Takeover" approach.',
  '<h2>The Pacing of Perspective</h2><p class="lead">Rollouts aren''t just about hitting "publish". They are about building a sonic and visual architecture that demands attention.</p><p>We focus on: <br>1. The Hook (0-3 seconds)<br>2. The Atmosphere (Color)<br>3. The Retention (Pacing)</p>',
  true,
  'Strategy',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000'
),
(
  'Beyond the Edit: Brand Identity',
  'brand-identity-edit',
  'How we build consistency across 9:16 and 16:9 formats without losing the soul of the project.',
  '<h2>Formatting for the Soul</h2><p>In 2026, you can''t just crop 16:9 to 9:16 and expect it to hit the same. You need a dedicated vertical strategy that retains the composition''s intent.</p>',
  true,
  'Production',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000'
),
(
  'Turning Vision into Strategy',
  'vision-strategy',
  'A look into the "Phase 01" process of OTP. How alignment in the pre-production phase saves 10 hours of editing.',
  '<h2>Phase 01: The Blueprint</h2><p>Alignment is the only true efficiency. We spend more time in pre-production so the execution feels like a reflex.</p>',
  true,
  'Strategy',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000'
);
