'use strict';

const { renderHeader, renderFooter } = require('./public-shell');
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const localAsset = (value) => `/${String(value || '').replace(/^\/+/, '')}`;
const safeHref = (value) => /^(\/(?!\/)|https:\/\/)/.test(String(value || '')) ? escapeHtml(value) : '#';

const stories = {
  weatheros: {
    title: 'Weather, given room to breathe.',
    introduction: 'A mobile weather interface built around atmospheric day and night themes, precipitation radar, and visual forecasts.',
    built: 'The work connects mobile application design with radar visualization and a product landing page. Flutter, Swift, Kotlin, and Canvas sit behind an interface designed to make current conditions and the days ahead easy to scan.',
    note: 'These are product interface captures. Current availability and platform details are maintained on the WeatherOS product page.',
    caption: 'WeatherOS · Today interface',
    role: 'Product design & mobile development'
  },
  'otp-os': {
    title: 'The infrastructure behind the work.',
    introduction: 'An internal business operating system connecting client intake, documents, payments, and delivery.',
    built: 'OTP OS brings CRM leads, booking handoffs, document generation, Stripe payment webhooks, and client workspaces into one operational system. The scope covers full-stack architecture, database security, and intake workflows.',
    note: 'In progress. Client records and internal operational screens are private; the image shown is OTP brand artwork.',
    caption: 'OnlyTruePerspective · Brand artwork',
    role: 'Systems design & full-stack development'
  },
  'otp-fixline': {
    title: 'A clearer starting point for business repair.',
    introduction: 'A structured intake and consultant-review workflow for a business’s public presence.',
    built: 'FIXLINE collects business-presence information and organizes it for consultant review, priority recommendations, and implementation scoping. The project covers intake design, diagnostic structure, secure persistence, and a mobile-friendly path into review.',
    note: 'Private beta. Findings are review inputs and recommendations; implementation is scoped separately.',
    caption: 'OTP FIXLINE · Public product page',
    role: 'Product design & diagnostic workflow'
  },
  songwars: {
    title: 'A stage before the first song.',
    introduction: 'A campaign and digital entry point for The Smack Club’s Song Wars music event.',
    built: 'The campaign combines event positioning, creative direction, a responsive landing page, and a focused Discord registration path. A share-ready visual identity connects the event poster to the online experience.',
    note: 'This is an archive of the July 2026 campaign. Registration figures and dates are historical; visit the community for current updates.',
    caption: 'The Smack Club · Original July 2026 campaign poster',
    role: 'Creative direction & event website'
  },
  protocol: {
    title: 'One world around a release.',
    introduction: 'An independent music rollout for ELI3GANT, connecting sound, identity, and a digital listening path.',
    built: 'The release experience brings together visual identity, a campaign website, an interactive countdown, track reveals, and streaming destinations. Creative direction and responsive production give the campaign a single place to live.',
    note: 'The release campaign is documented here without audience or streaming-performance claims. The image shown is OTP brand artwork.',
    caption: 'OnlyTruePerspective · Brand artwork',
    role: 'Creative direction & release experience'
  },
  'hyh-architecture-design': {
    title: 'Architecture deserves a better frame.',
    introduction: 'A website transformation for HYH Architecture & Design, centered on its architecture and visualization work.',
    built: 'OTP reworked the homepage copy, visual direction, navigation, portfolio structure, responsive layout, and project-start calls to action. The before-and-after captures show the change in hierarchy and presentation.',
    note: 'The supplied homepage captures document the visual transformation. No traffic, lead, or conversion results are claimed.',
    caption: 'HYH Architecture & Design · OTP homepage rebuild',
    role: 'Website redesign & brand presentation'
  }
};

function imageMarkup(image, extra = '') {
  return `<img src="${safeHref(localAsset(image.src))}" alt="${escapeHtml(image.alt)}" width="${Number(image.width) || 1200}" height="${Number(image.height) || 800}" ${extra}>`;
}

function renderProjectPage(project, allProjects) {
  const story = stories[project.slug] || { title: project.title, introduction: project.shortDescription, built: project.shortDescription, note: project.status, caption: project.title, role: project.type };
  const related = allProjects.filter((item) => item.slug !== project.slug).sort((a, b) => Number(b.category === project.category) - Number(a.category === project.category)).slice(0, 2);
  const liveLink = project.projectUrl && !/^\/book(?:ings?|ing|-otp)?(?:[/?#]|$)/.test(project.projectUrl) ? `<a class="project-action project-action-secondary" href="${safeHref(project.projectUrl)}">${escapeHtml(project.projectCtaLabel || 'Explore the project')} <span aria-hidden="true">↗</span></a>` : '';
  const comparison = project.beforeAfter ? `<section class="project-section" aria-labelledby="comparison-title"><div class="project-section-heading"><span class="project-label">02 / Transformation</span><h2 id="comparison-title">Before. After.</h2></div><div class="project-comparison">${['before', 'after'].map((key) => { const item = project.beforeAfter[key]; return `<figure><div class="project-media-label">${escapeHtml(item.label)}</div>${imageMarkup(item, 'loading="lazy"')}<figcaption>${escapeHtml(item.caption)}</figcaption></figure>`; }).join('')}</div></section>` : '';
  const gallery = project.slug === 'weatheros' ? `<section class="project-section" aria-labelledby="interface-title"><div class="project-section-heading"><span class="project-label">02 / Interface</span><h2 id="interface-title">The days ahead.</h2></div><div class="project-phone-gallery"><figure>${imageMarkup({ src: '/assets/weatheros/screenshots/hourly-public.webp', alt: 'WeatherOS hourly weather interface', width: 1080, height: 1920 }, 'loading="lazy"')}<figcaption>Hourly view</figcaption></figure><figure>${imageMarkup({ src: '/assets/weatheros/screenshots/daily-public.webp', alt: 'WeatherOS daily forecast interface', width: 1080, height: 1920 }, 'loading="lazy"')}<figcaption>Daily view</figcaption></figure></div></section>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.title)} — Work by OnlyTruePerspective</title><meta name="description" content="${escapeHtml(story.introduction)}"><meta property="og:title" content="${escapeHtml(project.title)} — OnlyTruePerspective"><meta property="og:description" content="${escapeHtml(story.introduction)}"><meta property="og:type" content="website"><meta property="og:image" content="https://www.onlytrueperspective.tech/assets/seo/otp-og-image.webp"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon-32x32.png"><meta name="theme-color" content="#101110"><link rel="canonical" href="https://www.onlytrueperspective.tech/projects/${encodeURIComponent(project.slug)}"><link rel="stylesheet" href="/public-system.css?v=20260915b"><link rel="stylesheet" href="/project-page.css?v=20260915b"><script src="/public-shell.js?v=20260915b" defer></script></head>
<body class="public-page project-page"><a class="public-skip" href="#main-content">Skip to content</a>${renderHeader('Archive')}<main id="main-content" class="project-main">
<a class="project-back" href="/archive">← All projects</a>
<header class="project-intro"><div class="project-kicker"><span>${escapeHtml(project.category)}</span><span>${escapeHtml(project.status)}</span></div><p class="project-name">${escapeHtml(project.title)}</p><h1>${escapeHtml(story.title)}</h1><p class="project-lead">${escapeHtml(story.introduction)}</p><div class="project-actions">${liveLink}<a class="project-action" href="${safeHref('/fixline/intake?source=project-' + project.slug)}">${escapeHtml(project.bookingCtaLabel || 'Start a project')} <span aria-hidden="true">↗</span></a></div></header>
<figure class="project-hero ${project.slug === 'weatheros' ? 'project-hero-phone' : ''}">${imageMarkup(project.heroImage, 'fetchpriority="high"')}<figcaption>${escapeHtml(story.caption)}</figcaption></figure>
<section class="project-section project-overview" aria-labelledby="built-title"><div><span class="project-label">01 / The work</span><h2 id="built-title">What we built.</h2><p>${escapeHtml(story.built)}</p><p class="project-status-note">${escapeHtml(story.note)}</p></div><dl class="project-facts"><div><dt>OTP role</dt><dd>${escapeHtml(story.role)}</dd></div><div><dt>Scope</dt><dd>${(project.services || []).map(escapeHtml).join(' · ')}</dd></div><div><dt>Disciplines</dt><dd>${(project.disciplines || []).map(escapeHtml).join(' · ')}</dd></div><div><dt>Technology</dt><dd>${(project.technology || []).map(escapeHtml).join(' · ')}</dd></div></dl></section>
${comparison}${gallery}<section class="project-section" aria-labelledby="related-title"><div class="project-section-heading"><span class="project-label">Keep exploring</span><h2 id="related-title">More perspectives.</h2></div><div class="project-related">${related.map((item) => `<a href="/projects/${encodeURIComponent(item.slug)}"><span class="project-label">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><span aria-hidden="true">↗</span></a>`).join('')}</div></section>
<section class="project-contact"><span class="project-label">Your next move</span><h2>Have something<br>worth building?</h2><a class="project-action" href="${safeHref('/fixline/intake?source=project-' + project.slug)}">${escapeHtml(project.bookingCtaLabel || 'Start a project')} <span aria-hidden="true">↗</span></a></section>
</main>${renderFooter()}</body></html>`;
}

module.exports = { renderProjectPage };
