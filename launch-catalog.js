/**
 * OTP LAUNCH Unified Service & Product Catalog (V1.1)
 * Single shared catalog definition for storefront, configurator, and requirement generation.
 * All pricing beyond the existing $199 Starter Website offer requires explicit owner approval.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OTP_LAUNCH_CATALOG = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const CATALOG_VERSION = 'otp-launch-catalog-v1';

  const VISUAL_GROUPS = Object.freeze([
    Object.freeze({ id: 'all', label: 'All Services', description: 'Every way to launch with OnlyTruePerspective' }),
    Object.freeze({ id: 'websites', label: 'Websites & Commerce', description: 'Flagship websites, artist press kits & storefronts' }),
    Object.freeze({ id: 'apps', label: 'Apps & Custom Systems', description: 'Tailored web portals, internal tools & native iOS builds' }),
    Object.freeze({ id: 'care', label: 'Kits & Ongoing Care', description: 'Launch-ready templates & continuous site stewardship' })
  ]);

  const SERVICES = Object.freeze([
    Object.freeze({
      id: 'starter-website',
      slug: 'starter-website',
      name: 'Starter Website',
      category: 'Fixed Starter Offer',
      visualGroup: 'websites',
      iconKey: 'spark',
      previewImage: '/assets/services/starter-website.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'otp-site-experience',
      previewAlt: 'Obsidian MacBook and titanium iPhone floating in architectural studio lighting for Starter Websites',
      previewLabel: 'Signature Starter Build',
      catalogKind: 'service',
      pricingMode: 'fixed_offer',
      fixedPriceCents: 19900,
      estimateMinCents: 19900,
      estimateMaxCents: 19900,
      priceDisplay: '$199 Fixed Offer',
      checkoutEligible: true,
      ownerApprovedPublicPrice: true,
      ownerApprovalRequired: false,
      otpPackage: 'The Signal',
      bookingServiceType: 'Website / Digital System',
      timeline: '3–5 business days',
      tagline: 'Get your business online cleanly — built for mobile, speed, and customer inquiries.',
      cardSummary: 'Get your business online.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'mobile', label: 'Mobile-ready' }),
        Object.freeze({ iconKey: 'palette', label: 'Custom design' }),
        Object.freeze({ iconKey: 'inbox', label: 'Customer inquiries' })
      ]),
      ctaLabel: 'Build my website',
      deliverables: Object.freeze([
        'Custom mobile-ready landing page design',
        'Clear story, services & portfolio section',
        'Direct inquiry & booking call-to-action',
        'Search-ready titles & pre-launch review'
      ]),
      scopeBoundary: 'Includes a focused single-page launch site. Multi-page sites, shops, and custom software are quoted individually.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'seo-foundation', 'inquiry-cta']),
      portfolioSlug: 'otp-site'
    }),
    Object.freeze({
      id: 'artist-epk',
      slug: 'artist-epk',
      name: 'Artist Websites & EPKs',
      category: 'Music & Creative Identity',
      visualGroup: 'websites',
      iconKey: 'music',
      previewImage: '/assets/services/artist-epk.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'vault-ios',
      previewAlt: 'Brushed titanium audio deck and translucent acoustic glass planes for Artist Websites and EPKs',
      previewLabel: 'Release & Music Hub',
      catalogKind: 'service',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 50000,
      estimateMaxCents: 150000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The Signal',
      bookingServiceType: 'Music / Artist Rollout',
      timeline: '5–7 business days',
      tagline: 'Share your music, photos, videos, and booking requests from one atmospheric page.',
      cardSummary: 'Give your music a real home.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'music', label: 'Music & embeds' }),
        Object.freeze({ iconKey: 'play', label: 'Visual gallery' }),
        Object.freeze({ iconKey: 'calendar', label: 'Booking requests' })
      ]),
      ctaLabel: 'Create my artist page',
      deliverables: Object.freeze([
        'Press bio, booking links & venue inquiry flow',
        'Featured release hub with Spotify & video embeds',
        'Editorial photo gallery & upcoming dates module',
        'Fast shareable link for Instagram bios & labels'
      ]),
      scopeBoundary: 'Pricing reflects release depth, interactive visuals, and press assets, confirmed directly with OTP.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'media-showcase', 'inquiry-cta', 'seo-foundation']),
      portfolioSlug: 'vault'
    }),
    Object.freeze({
      id: 'business-website',
      slug: 'business-website',
      name: 'Business Websites',
      category: 'Commercial Web Presence',
      visualGroup: 'websites',
      iconKey: 'building',
      previewImage: '/assets/services/business-website.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'floivation-desktop',
      previewAlt: 'Synchronized matte black laptop, desktop display, and titanium smartphone assembling clean service grids, appointment tiles, and client inquiry cards for Business Websites',
      previewLabel: 'Flagship Brand Presence',
      catalogKind: 'service',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 120000,
      estimateMaxCents: 350000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The Engine',
      bookingServiceType: 'Website / Digital System',
      timeline: '1–2 weeks',
      tagline: 'Multi-page brand flagship engineered to turn visitors into booked clients.',
      cardSummary: 'Turn visitors into booked clients.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'building', label: 'Service pages' }),
        Object.freeze({ iconKey: 'seo', label: 'Google visibility' }),
        Object.freeze({ iconKey: 'calendar', label: 'Direct booking' })
      ]),
      ctaLabel: 'Build my business site',
      deliverables: Object.freeze([
        'Tailored editorial pages & visual hierarchy',
        'Clear service breakdown with portfolio proof',
        'Streamlined intake & appointment booking flow',
        'Speed tuning, search indexing & accessibility check'
      ]),
      scopeBoundary: 'Quote depends on page count, copywriting support, and booking/CRM tools.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'booking-intake', 'seo-foundation']),
      portfolioSlug: 'floivation'
    }),
    Object.freeze({
      id: 'ecommerce-experience',
      slug: 'ecommerce-experience',
      name: 'E-Commerce Experiences',
      category: 'Digital Commerce',
      visualGroup: 'websites',
      iconKey: 'bag',
      previewImage: '/assets/services/ecommerce-experience.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'floivation-mobile',
      previewAlt: 'Luxury obsidian studio products paired with an interactive glass storefront, product cards, shopping bag indicator, and checkout pill for E-Commerce Experiences',
      previewLabel: 'Online Store & Checkout',
      catalogKind: 'service',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 200000,
      estimateMaxCents: 500000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The System',
      bookingServiceType: 'Business System',
      timeline: '2–4 weeks',
      tagline: 'Clean online stores with clear product pages and built-in card & Apple Pay checkout.',
      cardSummary: 'Sell your products easily online.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'bag', label: 'Storefront catalog' }),
        Object.freeze({ iconKey: 'card', label: 'Card & Apple Pay' }),
        Object.freeze({ iconKey: 'inbox', label: 'Order updates' })
      ]),
      ctaLabel: 'Build my online store',
      deliverables: Object.freeze([
        'Custom storefront & product variant showcase',
        'Verified checkout, receipts & order tracking',
        'Instant cart clarity across phone and desktop',
        'Shipping, tax & fulfillment workflow setup'
      ]),
      scopeBoundary: 'Quote depends on catalog size, custom bundles, and fulfillment tools.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'stripe-payments', 'seo-foundation']),
      portfolioSlug: 'floivation'
    }),
    Object.freeze({
      id: 'redesign-repair',
      slug: 'redesign-repair',
      name: 'Website Redesigns & Repairs',
      category: 'Optimization & Recovery',
      visualGroup: 'websites',
      iconKey: 'wrench',
      previewImage: '/assets/services/redesign-repair.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'hyh-transformation',
      previewAlt: 'Dual-plane frosted architectural transformation splitting shadow into luminous titanium structure for Website Redesigns',
      previewLabel: 'Before → After Recovery',
      catalogKind: 'service',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 50000,
      estimateMaxCents: 200000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The Signal',
      bookingServiceType: 'Website Cleanup',
      timeline: '3–7 business days',
      visualStyle: 'studio-concept',
      tagline: 'Rescue slow, broken, or outdated websites into crisp experiences that convert.',
      cardSummary: 'Give your website a fresh start.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'spark', label: 'Modern design' }),
        Object.freeze({ iconKey: 'mobile', label: 'Better usability' }),
        Object.freeze({ iconKey: 'bolt', label: 'Faster experience' })
      ]),
      ctaLabel: 'Upgrade my website',
      deliverables: Object.freeze([
        'Visual polish & navigation clarity overhaul',
        'Mobile screen repairs & page speed recovery',
        'Broken form, link & checkout stabilization',
        'Launch verification across modern devices'
      ]),
      scopeBoundary: 'Scoped by your existing platform condition and visual rebuild depth.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'seo-foundation']),
      portfolioSlug: 'hyh-architecture-design'
    }),
    Object.freeze({
      id: 'custom-web-app',
      slug: 'custom-web-app',
      name: 'Custom Web Applications',
      category: 'Software & Operating Systems',
      visualGroup: 'apps',
      iconKey: 'layers',
      previewImage: '/assets/services/custom-web-app.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'floorops-platform',
      previewAlt: 'Connected obsidian glass nodes and precision orbital rings for Custom Web Applications',
      previewLabel: 'Portals & Custom Tools',
      catalogKind: 'service',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 350000,
      estimateMaxCents: 1000000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The System',
      bookingServiceType: 'Business System',
      timeline: '3–6 weeks',
      tagline: 'Custom client portals, booking tools, and dashboards designed for your business.',
      cardSummary: 'Run your business in one place.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'portal', label: 'Client portals' }),
        Object.freeze({ iconKey: 'layers', label: 'Custom dashboards' }),
        Object.freeze({ iconKey: 'cpu', label: 'Smart workflows' })
      ]),
      ctaLabel: 'Build my web app',
      deliverables: Object.freeze([
        'Interactive web workspace tailored to your team',
        'Secure client sign-in & private project visibility',
        'Connected payments, automations & notifications',
        'Tested release with clear ownership documentation'
      ]),
      scopeBoundary: 'Scoped around user workflows, data storage, and third-party tools.',
      defaultFeatures: Object.freeze(['client-portal', 'ai-automation', 'stripe-payments']),
      portfolioSlug: 'floorops'
    }),
    Object.freeze({
      id: 'native-app',
      slug: 'native-app',
      name: 'Native Applications',
      category: 'iOS & Cross-Platform',
      visualGroup: 'apps',
      iconKey: 'phone',
      previewImage: '/assets/services/native-app.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'evehalo-ios',
      previewAlt: 'Black titanium smartphone angled over dark basalt with floating haptic glass tile for Native Applications',
      previewLabel: 'iPhone & App Store',
      catalogKind: 'service',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 450000,
      estimateMaxCents: 1500000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'Custom',
      bookingServiceType: 'Custom Build',
      timeline: '4–8 weeks',
      tagline: 'App Store-grade mobile apps crafted for responsiveness, offline reliability, and tactile feel.',
      cardSummary: 'Bring your app idea to life.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'phone', label: 'iPhone experiences' }),
        Object.freeze({ iconKey: 'bolt', label: 'Custom interactions' }),
        Object.freeze({ iconKey: 'shield', label: 'Release support' })
      ]),
      ctaLabel: 'Build my app',
      deliverables: Object.freeze([
        'Thoughtful iOS-native gesture & layout architecture',
        'Smooth offline-ready state & real-time updates',
        'TestFlight beta distribution & device testing',
        'App Store screenshots, listing prep & submission'
      ]),
      scopeBoundary: 'Requires technical discovery and milestone schedule approved by OTP.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'custom-integrations']),
      portfolioSlug: 'evehalo'
    }),
    Object.freeze({
      id: 'digital-templates',
      slug: 'digital-templates',
      name: 'Digital Templates & Kits',
      category: 'Extensible Digital Products',
      visualGroup: 'care',
      iconKey: 'grid',
      previewImage: '/assets/services/digital-templates.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'otp-site-experience',
      previewAlt: 'Precision-aligned obsidian, matte graphite, and glass grid modules for Digital Templates and Kits',
      previewLabel: 'Ready-Made Launch Kits',
      catalogKind: 'template',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 15000,
      estimateMaxCents: 60000,
      priceDisplay: 'Configurable Kit',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The Signal',
      bookingServiceType: 'Website / Digital System',
      timeline: 'Instant / 1–3 business days with setup',
      visualStyle: 'studio-concept',
      tagline: 'Flexible website and artist page templates styled to match your brand colors.',
      cardSummary: 'Launch faster with a studio template.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'grid', label: 'Modular layouts' }),
        Object.freeze({ iconKey: 'palette', label: 'Brand styling' }),
        Object.freeze({ iconKey: 'feather', label: 'Guided setup' })
      ]),
      ctaLabel: 'Browse Launch kits',
      deliverables: Object.freeze([
        'Clean, high-contrast responsive template pack',
        'Color palette & font customization guide',
        'Optional white-glove domain & launch setup',
        'Full source files ready to grow with your brand'
      ]),
      scopeBoundary: 'Supports direct template packs or guided OTP setup upon owner release.',
      defaultFeatures: Object.freeze(['mobile-responsive', 'seo-foundation']),
      portfolioSlug: 'otp-studio'
    }),
    Object.freeze({
      id: 'maintenance-enhancements',
      slug: 'maintenance-enhancements',
      name: 'Maintenance & Enhancements',
      category: 'Ongoing Operations',
      visualGroup: 'care',
      iconKey: 'shield',
      previewImage: '/assets/services/maintenance-enhancements.webp',
      previewVideo: '',
      previewDevice: 'studio',
      visualStyle: 'studio-concept',
      visualRole: 'conceptual_service_illustration',
      proofAssetId: 'otp-os-control',
      previewAlt: 'Dark obsidian website interface swept by an amber diagnostic beam aligning blocks, performance gauges, and a luminous security shield for Maintenance and Enhancements',
      previewLabel: 'Priority Studio Care',
      catalogKind: 'retainer',
      pricingMode: 'configurable_quote',
      fixedPriceCents: null,
      estimateMinCents: 25000,
      estimateMaxCents: 120000,
      priceDisplay: 'Custom Quote',
      checkoutEligible: false,
      ownerApprovedPublicPrice: false,
      ownerApprovalRequired: true,
      otpPackage: 'The Engine',
      bookingServiceType: 'Website Cleanup',
      timeline: 'Ongoing / Monthly or Sprint',
      tagline: 'Keep your site fast, updated, and continuously improving with on-call OTP care.',
      cardSummary: 'Keep your website fast and protected.',
      benefitItems: Object.freeze([
        Object.freeze({ iconKey: 'bolt', label: 'Speed updates' }),
        Object.freeze({ iconKey: 'shield', label: 'Security care' }),
        Object.freeze({ iconKey: 'wrench', label: 'Content changes' })
      ]),
      ctaLabel: 'Keep my site running',
      deliverables: Object.freeze([
        'Priority bug resolution & security upkeep',
        'Fresh sections, seasonal updates & page iterations',
        'Speed monitoring & search health maintenance',
        'Direct preview & revision tracking in your portal'
      ]),
      scopeBoundary: 'Available as an ongoing monthly retainer or focused upgrade sprint.',
      defaultFeatures: Object.freeze(['seo-foundation']),
      portfolioSlug: 'weatheros'
    })
  ]);

  const FEATURES = Object.freeze([
    Object.freeze({ id: 'mobile-responsive', label: 'Mobile-First Responsive Polish', customerTitle: 'Mobile-ready layout', shortLabel: 'Mobile-ready', hint: 'Crisp on phones & desktops.', iconKey: 'mobile', minDeltaCents: 0, maxDeltaCents: 0, starterCompatible: true }),
    Object.freeze({ id: 'seo-foundation', label: 'SEO & Metadata Foundation', customerTitle: 'Search visibility', shortLabel: 'Search ready', hint: 'Clean titles & Google indexing.', iconKey: 'seo', minDeltaCents: 0, maxDeltaCents: 0, starterCompatible: true }),
    Object.freeze({ id: 'inquiry-cta', label: 'Direct Lead & Contact Capture', customerTitle: 'Direct inquiry form', shortLabel: 'Inquiry form', hint: 'Fast leads to your inbox.', iconKey: 'inbox', minDeltaCents: 0, maxDeltaCents: 0, starterCompatible: true }),
    Object.freeze({ id: 'booking-intake', label: 'Structured Booking & Intake Flow', customerTitle: 'Guided booking flow', shortLabel: 'Guided booking', hint: 'Collect details before calls.', iconKey: 'calendar', minDeltaCents: 25000, maxDeltaCents: 50000, starterCompatible: false }),
    Object.freeze({ id: 'client-portal', label: 'Private Client Portal & Approvals', customerTitle: 'Client workspace', shortLabel: 'Client portal', hint: 'Shared previews & approvals.', iconKey: 'portal', minDeltaCents: 50000, maxDeltaCents: 120000, starterCompatible: false }),
    Object.freeze({ id: 'stripe-payments', label: 'Stripe Checkout & Invoice Flow', customerTitle: 'Online payments', shortLabel: 'Online pay', hint: 'Cards, Apple Pay & deposits.', iconKey: 'card', minDeltaCents: 35000, maxDeltaCents: 90000, starterCompatible: false }),
    Object.freeze({ id: 'media-showcase', label: 'Audio / Video / Press Showcase', customerTitle: 'Music & video player', shortLabel: 'Media player', hint: 'Embedded releases & reels.', iconKey: 'play', minDeltaCents: 15000, maxDeltaCents: 40000, starterCompatible: false }),
    Object.freeze({ id: 'ai-automation', label: 'AI Workflow / Lead Routing', customerTitle: 'Smart lead routing', shortLabel: 'Lead routing', hint: 'Automatic follow-ups & tasks.', iconKey: 'cpu', minDeltaCents: 50000, maxDeltaCents: 150000, starterCompatible: false }),
    Object.freeze({ id: 'custom-integrations', label: 'Custom API / CRM Integrations', customerTitle: 'Tool integrations', shortLabel: 'Integrations', hint: 'Sync email, calendar & CRM.', iconKey: 'plug', minDeltaCents: 40000, maxDeltaCents: 120000, starterCompatible: false })
  ]);

  const ENHANCEMENTS = Object.freeze([
    Object.freeze({ id: 'priority-turnaround', label: 'Priority 48–72h Turnaround', customerTitle: 'Priority 48–72h speed', shortLabel: '48–72h rush', hint: 'Front-of-queue turnaround.', iconKey: 'bolt', minDeltaCents: 15000, maxDeltaCents: 45000, starterCompatible: false }),
    Object.freeze({ id: 'brand-kit', label: 'Visual Brand & Typography Refresh', customerTitle: 'Brand & type system', shortLabel: 'Brand kit', hint: 'Cohesive colors & typography.', iconKey: 'palette', minDeltaCents: 25000, maxDeltaCents: 75000, starterCompatible: false }),
    Object.freeze({ id: 'copy-direction', label: 'Conversion Copy & Positioning', customerTitle: 'Conversion copywriting', shortLabel: 'Copy polish', hint: 'Refined headlines & flow.', iconKey: 'feather', minDeltaCents: 15000, maxDeltaCents: 40000, starterCompatible: false }),
    Object.freeze({ id: 'monthly-care', label: 'Ongoing Care & Monthly Updates', customerTitle: 'Monthly site care', shortLabel: 'Monthly care', hint: 'Ongoing updates & backups.', iconKey: 'shield', minDeltaCents: 25000, maxDeltaCents: 60000, starterCompatible: false })
  ]);

  const OBJECTIVES = Object.freeze([
    'Get more leads',
    'Launch my brand',
    'Sell online',
    'Book clients',
    'Build my app'
  ]);

  const PORTFOLIO_EVIDENCE = Object.freeze([
    Object.freeze({
      slug: 'floivation',
      title: 'FLOIVATION',
      category: 'Brand Experience & Web Rebuild',
      outcome: 'Cohesive community storefront, visual identity, and mobile-first navigation.',
      image: '/assets/case-studies/floivation/after-home.jpg',
      href: '/projects/floivation'
    }),
    Object.freeze({
      slug: 'hyh-architecture-design',
      title: 'HYH Architecture & Design',
      category: 'Website Transformation',
      outcome: 'Portfolio clarity, modern structure, and direct consultation conversion path.',
      image: '/assets/hyh-otp-rebuild.jpg',
      href: '/projects/hyh-architecture-design'
    }),
    Object.freeze({
      slug: 'floorops',
      title: 'OTP FloorOps',
      category: 'Custom Web Application',
      outcome: 'Operational SaaS platform with interactive demo, auth, and live telemetry.',
      image: '/assets/fixline-product-preview.png',
      href: '/floorops'
    }),
    Object.freeze({
      slug: 'weatheros',
      title: 'WeatherOS',
      category: 'Native iOS Application',
      outcome: 'Precision weather operating system engineered for clarity on iPhone.',
      image: '/assets/weatheros/screenshots/today-public.webp',
      href: '/weatheros'
    }),
    Object.freeze({
      slug: 'evehalo',
      title: 'EVEHALO',
      category: 'Digital Product & Native Build',
      outcome: 'Atmospheric cosmic experience designed, built, and shipped end to end.',
      image: '/assets/evehalo/hero-launch.webp',
      href: '/evehalo'
    })
  ]);

  const EXPANSION_SLOT_TYPES = Object.freeze([
    'premium_website_template',
    'artist_epk_template',
    'landing_page_kit',
    'downloadable_creative_asset',
    'otp_application_license'
  ]);

  function findService(serviceId) {
    const cleanId = String(serviceId || '').trim().toLowerCase();
    return SERVICES.find((s) => s.id === cleanId || s.slug === cleanId) || SERVICES[0];
  }

  function cleanList(values, allowedIds) {
    const allowed = new Set(allowedIds);
    const list = Array.isArray(values) ? values : [];
    const out = [];
    for (const item of list) {
      const id = String(item || '').trim().toLowerCase();
      if (allowed.has(id) && !out.includes(id)) out.push(id);
    }
    return out;
  }

  function formatUsd(cents) {
    const num = Number(cents);
    if (!Number.isFinite(num) || num < 0) return 'Custom quote';
    return '$' + Math.round(num / 100).toLocaleString('en-US');
  }

  function computeLaunchEstimate(rawInput = {}) {
    const service = findService(rawInput.service_id || rawInput.serviceId);
    const featureIds = cleanList(rawInput.features, FEATURES.map((f) => f.id));
    const enhancementIds = cleanList(rawInput.enhancements, ENHANCEMENTS.map((e) => e.id));

    const selectedFeatures = featureIds.map((id) => FEATURES.find((f) => f.id === id)).filter(Boolean);
    const selectedEnhancements = enhancementIds.map((id) => ENHANCEMENTS.find((e) => e.id === id)).filter(Boolean);

    const hasStarterUpgrade = service.id === 'starter-website' && (
      selectedFeatures.some((f) => !f.starterCompatible) || selectedEnhancements.length > 0
    );

    let minCents = service.estimateMinCents;
    let maxCents = service.estimateMaxCents;

    for (const f of selectedFeatures) {
      if (service.defaultFeatures.includes(f.id)) continue;
      minCents += f.minDeltaCents;
      maxCents += f.maxDeltaCents;
    }
    for (const e of selectedEnhancements) {
      minCents += e.minDeltaCents;
      maxCents += e.maxDeltaCents;
    }

    const isPureFixedStarter = service.id === 'starter-website' && !hasStarterUpgrade;
    const pricingMode = isPureFixedStarter ? 'fixed_offer' : 'configurable_quote';
    const checkoutEligible = isPureFixedStarter;
    const ownerApprovalRequired = !isPureFixedStarter;
    const fixedPriceCents = isPureFixedStarter ? 19900 : null;
    const estimateDisplay = isPureFixedStarter
      ? '$199 (Fixed Starter Offer)'
      : `${formatUsd(minCents)} – ${formatUsd(maxCents)} (Estimated range)`;

    const recommendedPackage = isPureFixedStarter
      ? 'The Signal'
      : maxCents >= 320000
        ? 'The System'
        : maxCents >= 120000
          ? 'The Engine'
          : service.otpPackage;

    const identity = String(rawInput.business_name || rawInput.artist_name || rawInput.name || '').trim().slice(0, 160);
    const websiteUrl = String(rawInput.existing_website || rawInput.website_url || '').trim().slice(0, 300);
    const socialLinks = String(rawInput.social_links || rawInput.ig_handle || '').trim().slice(0, 400);
    const objectives = Array.isArray(rawInput.objectives)
      ? rawInput.objectives.map((o) => String(o || '').trim().slice(0, 160)).filter(Boolean).slice(0, 8)
      : [];
    const notes = String(rawInput.project_description || rawInput.notes || '').trim().slice(0, 4000);

    const requirements = {
      schema_version: CATALOG_VERSION,
      service_id: service.id,
      service_name: service.name,
      catalog_kind: service.catalogKind,
      recommended_package: recommendedPackage,
      pricing_mode: pricingMode,
      fixed_price_cents: fixedPriceCents,
      estimate_min_cents: minCents,
      estimate_max_cents: maxCents,
      estimate_display: estimateDisplay,
      checkout_eligible: checkoutEligible,
      owner_approval_required: ownerApprovalRequired,
      scope_upgrade_triggered: hasStarterUpgrade,
      timeline: service.timeline,
      identity,
      existing_website: websiteUrl,
      social_links: socialLinks,
      objectives,
      features: selectedFeatures.map((f) => ({ id: f.id, label: f.label })),
      enhancements: selectedEnhancements.map((e) => ({ id: e.id, label: e.label })),
      deliverables: [...service.deliverables],
      notes
    };

    const requirementLines = [
      `Service: ${service.name} (${service.category})`,
      `Pricing Mode: ${isPureFixedStarter ? 'Fixed Starter Offer ($199)' : 'Configurable Estimate (Owner Approval Required)'}`,
      `Estimate: ${estimateDisplay}`,
      `Recommended OTP Tier: ${recommendedPackage}`,
      identity ? `Brand / Artist: ${identity}` : null,
      websiteUrl ? `Existing Website: ${websiteUrl}` : null,
      socialLinks ? `Social Links: ${socialLinks}` : null,
      objectives.length ? `Objectives: ${objectives.join('; ')}` : null,
      selectedFeatures.length ? `Selected Features: ${selectedFeatures.map((f) => f.label).join(', ')}` : null,
      selectedEnhancements.length ? `Optional Enhancements: ${selectedEnhancements.map((e) => e.label).join(', ')}` : null,
      notes ? `Project Notes: ${notes}` : null
    ].filter(Boolean);

    return {
      requirements,
      summaryText: requirementLines.join('\n')
    };
  }

  return Object.freeze({
    CATALOG_VERSION,
    VISUAL_GROUPS,
    SERVICES,
    FEATURES,
    ENHANCEMENTS,
    OBJECTIVES,
    PORTFOLIO_EVIDENCE,
    EXPANSION_SLOT_TYPES,
    findService,
    formatUsd,
    computeLaunchEstimate
  });
});
