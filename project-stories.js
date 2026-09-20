'use strict';

const { renderHeader, renderFooter } = require('./public-shell');
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const localAsset = (value) => `/${String(value || '').replace(/^\/+/, '')}`;
const safeHref = (value) => /^(\/(?!\/)|https:\/\/)/.test(String(value || '')) ? escapeHtml(value) : '#';

const stories = {
  weatheros: {
    title: 'Weather, given room to breathe.',
    introduction: 'A mobile weather interface built around atmospheric day and night themes, precipitation radar, and visual forecasts.',
    problem: 'Weather information needed to feel calm, useful, and readable across a real mobile product instead of looking like a dense utility screen.',
    built: 'The work connects mobile application design with radar visualization and a product landing page. Flutter, Swift, Kotlin, and Canvas sit behind an interface designed to make current conditions and the days ahead easy to scan.',
    deliverables: ['Mobile product interface', 'Atmospheric day and night themes', 'Precipitation radar views', 'Product landing page', 'iOS and Android release surfaces'],
    result: 'WeatherOS is live on the Apple App Store and Google Play with public product and support surfaces.',
    capabilities: ['Product design', 'Mobile development', 'Atmospheric interface systems', 'Radar visualization'],
    nextStep: 'Need a product interface or launch surface with this level of focus? Start a general project brief.',
    note: 'These are product interface captures. Current availability and platform details are maintained on the WeatherOS product page.',
    caption: 'WeatherOS · Today interface',
    role: 'Product design & mobile development'
  },
  'otp-os': {
    title: 'The infrastructure behind the work.',
    introduction: 'An internal business operating system connecting client intake, documents, payments, and delivery.',
    problem: 'OTP needed one operational layer for leads, booking handoffs, documents, payments, and private client delivery instead of disconnected tools.',
    built: 'OTP OS brings CRM leads, booking handoffs, document generation, Stripe payment webhooks, and client workspaces into one operational system. The scope covers full-stack architecture, database security, and intake workflows.',
    deliverables: ['CRM lead records', 'Booking handoff contract', 'Document generation', 'Stripe payment webhooks', 'Private client workspaces'],
    result: 'The operating system is in progress and now provides the internal structure behind OTP client intake, documents, payments, and delivery.',
    capabilities: ['Full-stack architecture', 'Operational workflows', 'Database security', 'Payment infrastructure'],
    nextStep: 'If your business has work spread across disconnected tools, request a systems overview.',
    note: 'In progress. Client records and internal operational screens are private; the image shown is OTP brand artwork.',
    caption: 'OnlyTruePerspective · Brand artwork',
    role: 'Systems design & full-stack development'
  },
  'otp-fixline': {
    title: 'A clearer starting point for business repair.',
    introduction: 'A structured intake and consultant-review workflow for a business’s public presence.',
    problem: 'Businesses often know their public presence is underperforming without having a clear, structured way to show the problem or prioritize the repair.',
    built: 'FIXLINE collects business-presence information and organizes it for consultant review, priority recommendations, and implementation scoping. The project covers intake design, diagnostic structure, secure persistence, and a mobile-friendly path into review.',
    deliverables: ['Business-presence intake', 'Consultant review workflow', 'Priority recommendations', 'Secure persistence', 'Mobile review path'],
    result: 'FIXLINE is in private beta as a separate review funnel; its findings remain recommendations until implementation is scoped.',
    capabilities: ['Diagnostic product design', 'Structured intake', 'Secure persistence', 'Conversion review'],
    nextStep: 'Need a public-presence review before execution? Start the FIXLINE review.',
    note: 'Private beta. Findings are review inputs and recommendations; implementation is scoped separately.',
    caption: 'OTP FIXLINE · Public product page',
    role: 'Product design & diagnostic workflow'
  },
  songwars: {
    title: 'A stage before the first song.',
    introduction: 'A campaign and digital entry point for The Smack Club’s Song Wars music event.',
    problem: 'The event needed one clear identity and online entry point that could carry the poster, community context, and registration path together.',
    built: 'The campaign combines event positioning, creative direction, a responsive landing page, and a focused Discord registration path. A share-ready visual identity connects the event poster to the online experience.',
    deliverables: ['Event positioning', 'Campaign landing page', 'Poster and visual direction', 'Discord registration path', 'Responsive production'],
    result: 'The July 2026 campaign shipped with a focused public landing page and community entry path.',
    capabilities: ['Creative direction', 'Event campaigns', 'Community entry flows', 'Responsive web production'],
    nextStep: 'Planning an event or launch that needs a stronger public entry point? Start a launch brief.',
    note: 'This is an archive of the July 2026 campaign. Registration figures and dates are historical; visit the community for current updates.',
    caption: 'The Smack Club · Original July 2026 campaign poster',
    role: 'Creative direction & event website'
  },
  protocol: {
    title: 'One world around a release.',
    introduction: 'An independent music rollout for ELI3GANT, connecting sound, identity, and a digital listening path.',
    problem: 'The release needed a single digital world where music, identity, countdown, track reveals, and listening destinations felt connected.',
    built: 'The release experience brings together visual identity, a campaign website, an interactive countdown, track reveals, and streaming destinations. Creative direction and responsive production give the campaign a single place to live.',
    deliverables: ['Release identity', 'Campaign website', 'Interactive countdown', 'Track reveal system', 'Streaming destinations'],
    result: 'PROTOCOL shipped as a focused independent release experience with one public path from story to listening.',
    capabilities: ['Release strategy', 'Creative direction', 'Interactive web production', 'Artist campaigns'],
    nextStep: 'Have a release or campaign that needs a world around it? Plan an artist rollout.',
    note: 'The release campaign is documented here without audience or streaming-performance claims. The image shown is OTP brand artwork.',
    caption: 'OnlyTruePerspective · Brand artwork',
    role: 'Creative direction & release experience'
  },
  'hyh-architecture-design': {
    title: 'Architecture deserves a better frame.',
    introduction: 'A website transformation for HYH Architecture & Design, centered on its architecture and visualization work.',
    problem: 'The previous public web presence had limited hierarchy, sparse navigation, and a basic presentation of the architecture work.',
    built: 'OTP reworked the homepage copy, visual direction, navigation, portfolio structure, responsive layout, and project-start calls to action. The before-and-after captures show the change in hierarchy and presentation.',
    deliverables: ['Homepage copy and positioning', 'Visual direction', 'Portfolio structure', 'Responsive layout', 'Project-start CTA flow'],
    result: 'The delivered rebuild gives HYH a cinematic public presentation with clearer navigation and a more direct path into its work.',
    capabilities: ['Website transformation', 'Architecture presentation', 'Portfolio UX', 'Conversion structure'],
    nextStep: 'Need a clearer website and enquiry path for your business? Request a website and business-fix quote.',
    note: 'The supplied homepage captures document the visual transformation. No traffic, lead, or conversion results are claimed.',
    caption: 'HYH Architecture & Design · OTP homepage rebuild',
    role: 'Website redesign & brand presentation'
  }
};

function imageMarkup(image, extra = '') {
  return `<img src="${safeHref(localAsset(image.src))}" alt="${escapeHtml(image.alt)}" width="${Number(image.width) || 1200}" height="${Number(image.height) || 800}" ${extra}>`;
}

function listMarkup(items) {
  return `<ul class="project-deliverables">${(items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function conversionHref(project) {
  return project.bookingUrl || `/bookings?source=archive-${encodeURIComponent(project.slug)}`;
}

function conversionLabel(project) {
  return project.bookingCtaLabel || (project.id === 'otp-fixline' ? 'Start My FIXLINE Review' : 'Start a project');
}

function renderProjectPage(project, allProjects) {
  const story = stories[project.slug] || { title: project.title, introduction: project.shortDescription, problem: project.shortDescription, built: project.shortDescription, deliverables: project.services || [], result: project.status, capabilities: project.disciplines || [], nextStep: 'Have a related project in mind? Start a project brief.', note: project.status, caption: project.title, role: project.type };
  const related = allProjects.filter((item) => item.slug !== project.slug).sort((a, b) => Number(b.category === project.category) - Number(a.category === project.category)).slice(0, 2);
  const liveLink = project.projectUrl && !/^\/book(?:ings?|ing|-otp)?(?:[/?#]|$)/.test(project.projectUrl) ? `<a class="project-action project-action-secondary" href="${safeHref(project.projectUrl)}">${escapeHtml(project.projectCtaLabel || 'Explore the project')} <span aria-hidden="true">↗</span></a>` : '';
  const projectConversionHref = conversionHref(project);
  const projectConversionLabel = conversionLabel(project);
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: story.introduction,
    url: `https://www.onlytrueperspective.tech/projects/${encodeURIComponent(project.slug)}`,
    image: `https://www.onlytrueperspective.tech${localAsset(project.heroImage?.src)}`,
    creator: { '@type': 'Organization', name: 'OnlyTruePerspective', url: 'https://www.onlytrueperspective.tech/' },
    keywords: [...(project.categories || []), ...(project.services || [])].join(', '),
    isPartOf: { '@type': 'CollectionPage', name: 'OnlyTruePerspective Archive', url: 'https://www.onlytrueperspective.tech/archive' }
  });
  const comparison = project.beforeAfter ? `<section class="project-section" aria-labelledby="comparison-title"><div class="project-section-heading"><span class="project-label">02 / Transformation</span><h2 id="comparison-title">Before. After.</h2></div><div class="project-comparison">${['before', 'after'].map((key) => { const item = project.beforeAfter[key]; return `<figure><div class="project-media-label">${escapeHtml(item.label)}</div>${imageMarkup(item, 'loading="lazy"')}<figcaption>${escapeHtml(item.caption)}</figcaption></figure>`; }).join('')}</div></section>` : '';
  const gallery = project.slug === 'weatheros' ? `<section class="project-section" aria-labelledby="interface-title"><div class="project-section-heading"><span class="project-label">02 / Interface</span><h2 id="interface-title">The days ahead.</h2></div><div class="project-phone-gallery"><figure>${imageMarkup({ src: '/assets/weatheros/screenshots/hourly-public.webp', alt: 'WeatherOS hourly weather interface', width: 1080, height: 1920 }, 'loading="lazy"')}<figcaption>Hourly view</figcaption></figure><figure>${imageMarkup({ src: '/assets/weatheros/screenshots/daily-public.webp', alt: 'WeatherOS daily forecast interface', width: 1080, height: 1920 }, 'loading="lazy"')}<figcaption>Daily view</figcaption></figure></div></section>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.title)} — Work by OnlyTruePerspective</title><meta name="description" content="${escapeHtml(story.introduction)}"><meta property="og:title" content="${escapeHtml(project.title)} — OnlyTruePerspective"><meta property="og:description" content="${escapeHtml(story.introduction)}"><meta property="og:type" content="website"><meta property="og:url" content="https://www.onlytrueperspective.tech/projects/${encodeURIComponent(project.slug)}"><meta property="og:image" content="https://www.onlytrueperspective.tech/assets/seo/otp-og-image.webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(project.title)} — OnlyTruePerspective"><meta name="twitter:description" content="${escapeHtml(story.introduction)}"><meta name="twitter:image" content="https://www.onlytrueperspective.tech/assets/seo/otp-og-image.webp"><link rel="icon" href="/favicon-32x32.png"><meta name="theme-color" content="#101110"><link rel="canonical" href="https://www.onlytrueperspective.tech/projects/${encodeURIComponent(project.slug)}"><script type="application/ld+json">${schema.replace(/</g, '\\u003c')}</script><link rel="stylesheet" href="/public-system.css?v=20260915b"><link rel="stylesheet" href="/project-page.css?v=20260915b"><script src="/public-shell.js?v=20260915b" defer></script></head>
<body class="public-page project-page"><a class="public-skip" href="#main-content">Skip to content</a>${renderHeader('Archive')}<main id="main-content" class="project-main">
<a class="project-back" href="/archive">← All projects</a>
<header class="project-intro"><div class="project-kicker"><span>${escapeHtml(project.category)}</span><span>${escapeHtml(project.status)}</span></div><p class="project-name">${escapeHtml(project.title)}</p><h1>${escapeHtml(story.title)}</h1><p class="project-lead">${escapeHtml(story.introduction)}</p><div class="project-actions">${liveLink}<a class="project-action" href="${safeHref(projectConversionHref)}">${escapeHtml(projectConversionLabel)} <span aria-hidden="true">↗</span></a></div></header>
<figure class="project-hero ${project.slug === 'weatheros' ? 'project-hero-phone' : ''}">${imageMarkup(project.heroImage, 'fetchpriority="high"')}<figcaption>${escapeHtml(story.caption)}</figcaption></figure>
<section class="project-section project-overview" aria-labelledby="built-title"><div><span class="project-label">01 / The work</span><h2 id="built-title">Problem to proof.</h2><div class="project-story-grid"><div><span class="project-label">Problem</span><p>${escapeHtml(story.problem)}</p></div><div><span class="project-label">Solution</span><p>${escapeHtml(story.built)}</p></div><div><span class="project-label">Deliverables</span>${listMarkup(story.deliverables)}</div><div><span class="project-label">Result</span><p>${escapeHtml(story.result)}</p></div><div><span class="project-label">Capabilities</span><p>${escapeHtml(story.capabilities.join(' · '))}</p></div></div><p class="project-status-note">${escapeHtml(story.note)}</p></div><dl class="project-facts"><div><dt>Who it was for</dt><dd>${escapeHtml(project.title === 'OTP OS' || project.title === 'OTP FIXLINE' ? 'OnlyTruePerspective internal product work' : project.title)}</dd></div><div><dt>OTP role</dt><dd>${escapeHtml(story.role)}</dd></div><div><dt>Scope</dt><dd>${(project.services || []).map(escapeHtml).join(' · ')}</dd></div><div><dt>Technology</dt><dd>${(project.technology || []).map(escapeHtml).join(' · ')}</dd></div></dl></section>
${comparison}${gallery}<section class="project-section" aria-labelledby="related-title"><div class="project-section-heading"><span class="project-label">Keep exploring</span><h2 id="related-title">More perspectives.</h2></div><div class="project-related">${related.map((item) => `<a href="/projects/${encodeURIComponent(item.slug)}"><span class="project-label">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><span aria-hidden="true">↗</span></a>`).join('')}</div></section>
<section class="project-contact"><span class="project-label">Your next move</span><h2>${escapeHtml(story.nextStep)}</h2><a class="project-action" href="${safeHref(projectConversionHref)}">${escapeHtml(projectConversionLabel)} <span aria-hidden="true">↗</span></a></section>
</main>${renderFooter()}</body></html>`;
}

module.exports = { renderProjectPage };
