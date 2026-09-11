(function initOtpProjectLibrary(root) {
  'use strict';

  const STATUSES = Object.freeze([
    'Live',
    'Released',
    'In Progress',
    'Archived',
    'Internal',
    'Private Beta',
    'Coming Soon'
  ]);

  const CATEGORIES = Object.freeze([
    'Architecture',
    'Music',
    'Events',
    'Branding',
    'Creative Direction',
    'AI',
    'Software',
    'Internal Systems',
    'Marketing',
    'Content Production',
    'Product Design',
    'Web Development',
    'Client Work',
    'Experimental',
    'Business Diagnostic'
  ]);

  const COLLECTIONS = Object.freeze([
    'Featured Projects',
    'Newest',
    'Internal Products',
    'Client Projects',
    'Music',
    'Events',
    'Software',
    'Everything'
  ]);

  const PROJECTS = Object.freeze([
    Object.freeze({
      id: 'weatheros',
      slug: 'weatheros',
      title: 'WeatherOS',
      type: 'Mobile Weather App / Ambient Interface',
      category: 'Software',
      categories: Object.freeze(['Software', 'Product Design', 'Web Development']),
      disciplines: Object.freeze(['Mobile Application', 'Atmospheric UI', 'Radar Visualization', 'Privacy Architecture']),
      collections: Object.freeze(['Featured Projects', 'Newest', 'Internal Products', 'Software', 'Everything']),
      featured: true,
      homepageFeatured: false,
      pinned: true,
      status: 'Live',
      launchDate: '2026-08-20',
      year: 2026,
      shortDescription: 'A clean, ad-free mobile weather application built by OnlyTruePerspective, featuring real-time precipitation radar, atmospheric day/night themes, 7-day visual forecasts, and zero ad tracking. Live on Apple App Store ($0.99 · v1.0.6) and Google Play ($0.99 · v1.0.4).',
      tags: Object.freeze(['WeatherOS', 'iOS App', 'Android App', 'Atmospheric UI', 'Radar', 'Zero Tracking', 'Ad-Free']),
      services: Object.freeze(['Mobile app design', 'Atmospheric interface design', 'Radar visualization', 'iOS & Android deployment', 'Product landing page']),
      technology: Object.freeze(['Flutter', 'Swift', 'Kotlin', 'Canvas', 'App Store', 'Google Play']),
      appStoreUrl: 'https://apps.apple.com/us/app/weatheros-by-otp/id6803727019',
      googlePlayUrl: 'https://play.google.com/store/apps/details?id=app.weatheros.app',
      platforms: Object.freeze({
        ios: 'v1.0.6 (Live on Apple App Store)',
        android: 'v1.0.4 (Live on Google Play)'
      }),
      heroImage: Object.freeze({
        src: '/assets/weatheros/screenshots/today-public.png',
        alt: 'WeatherOS mobile interface showing live weather metrics and radar',
        width: 1080,
        height: 1920
      }),
      heroFit: 'contain',
      projectUrl: '/weatheros',
      projectCtaLabel: 'Explore WeatherOS',
      bookingUrl: '/bookings?source=archive-weatheros&service=product-design',
      bookingCtaLabel: 'Build a custom app',
      caseStudyUrl: '',
      caseStudyCtaLabel: 'Read Case Study'
    }),
    Object.freeze({
      id: 'otp-os',
      slug: 'otp-os',
      title: 'OTP OS',
      type: 'Internal Business Operating System / Client Infrastructure',
      category: 'Internal Systems',
      categories: Object.freeze(['Internal Systems', 'Software', 'Web Development']),
      disciplines: Object.freeze(['Operational Engine', 'CRM & Invoicing', 'Stripe Integration', 'Supabase Architecture', 'Automated Workflows']),
      collections: Object.freeze(['Internal Products', 'Software', 'Everything']),
      featured: false,
      homepageFeatured: false,
      pinned: false,
      status: 'In Progress',
      launchDate: '2026-05-15',
      year: 2026,
      shortDescription: 'The centralized operational engine for OnlyTruePerspective, managing real-time CRM leads, automated booking handoffs, dynamic document generation, Stripe payment webhooks, and private client delivery workspaces.',
      tags: Object.freeze(['OTP OS', 'Business Infrastructure', 'CRM', 'Automations', 'Invoicing', 'Client Portal']),
      services: Object.freeze(['Full-stack web architecture', 'Client portal systems', 'Payment infrastructure', 'Database security & RLS', 'Automated intake pipelines']),
      technology: Object.freeze(['Node.js', 'Express', 'Supabase', 'Stripe API', 'Vercel']),
      heroImage: Object.freeze({
        src: '/assets/otp-social-preview.png',
        alt: 'OTP OS operational architecture preview',
        width: 1200,
        height: 630
      }),
      projectUrl: '/bookings?source=archive-otpos&service=business-systems',
      projectCtaLabel: 'Request Systems Overview',
      bookingUrl: '/bookings?source=archive-otpos&service=business-systems',
      bookingCtaLabel: 'Build a custom business OS',
      caseStudyUrl: '',
      caseStudyCtaLabel: 'Read Case Study'
    }),
    Object.freeze({
      id: 'otp-fixline',
      slug: 'otp-fixline',
      title: 'OTP FIXLINE',
      type: 'Product / Business Diagnostic',
      category: 'Business Diagnostic',
      categories: Object.freeze(['Business Diagnostic', 'Software', 'Internal Systems', 'Web Development']),
      disciplines: Object.freeze(['Multi-source Intake', 'Consultant Audit', 'Duplicate Protection', 'Secure Persistence', 'Mobile Support', 'Consultant Conversion']),
      collections: Object.freeze(['Featured Projects', 'Newest', 'Internal Products', 'Software', 'Everything']),
      featured: true,
      homepageFeatured: false,
      pinned: true,
      status: 'Private Beta',
      launchDate: '2026-07-14',
      year: 2026,
      shortDescription: 'A structured business-presence intake and consultant-audit system built by OnlyTruePerspective to turn public business signals into prioritized review requests and an honest implementation path.',
      tags: Object.freeze(['FIXLINE', 'Business Diagnosis', 'Consultant Audit', 'Digital Presence', 'Secure Intake']),
      services: Object.freeze(['Business-presence intake', 'Diagnostic structuring', 'Consultant review workflow', 'Priority recommendations', 'Implementation scoping']),
      technology: Object.freeze(['Next.js', 'TypeScript', 'React', 'Supabase', 'Vercel']),
      heroImage: Object.freeze({
        src: '/assets/fixline-product-preview.png',
        alt: 'OTP FIXLINE business-presence diagnostic landing page',
        width: 1440,
        height: 705
      }),
      projectUrl: '/fixline',
      projectCtaLabel: 'Explore OTP FIXLINE',
      bookingUrl: '/fixline/intake?source=archive-fixline',
      bookingCtaLabel: 'Start My FIXLINE Review',
      caseStudyUrl: '',
      caseStudyCtaLabel: 'View Future Case Studies'
    }),
    Object.freeze({
      id: 'song-wars',
      slug: 'songwars',
      title: 'THE SMACK CLUB: SONG WARS',
      type: 'Live Music Event / Community Experience',
      category: 'Events',
      categories: Object.freeze(['Events', 'Branding', 'Marketing', 'Content Production', 'Web Development']),
      disciplines: Object.freeze(['Live Event', 'Community', 'Creative Production', 'Brand Experience', 'Website', 'Marketing']),
      collections: Object.freeze(['Featured Projects', 'Newest', 'Events', 'Everything']),
      featured: true,
      homepageFeatured: false,
      pinned: true,
      status: 'Live',
      launchDate: '2026-07-05',
      year: 2026,
      shortDescription: 'A cinematic event launch built to turn interest into participation through a focused Discord registration path, live status, and share-ready campaign storytelling.',
      tags: Object.freeze(['Song Wars', 'The Smack Club', 'Community Voting', 'Independent Artists', 'Event Launch']),
      services: Object.freeze(['Creative direction', 'Campaign landing page', 'Event positioning', 'Registration UX', 'Social sharing system', 'Responsive production']),
      technology: Object.freeze(['HTML', 'CSS', 'JavaScript', 'Express', 'Vercel']),
      heroImage: Object.freeze({
        src: '/assets/songwars/songwars-poster-1200.webp',
        alt: 'Independence Day Song Wars Weekend poster for The Smack Club',
        width: 1200,
        height: 1200
      }),
      heroFit: 'contain',
      projectUrl: '/songwars',
      projectCtaLabel: 'Visit Song Wars',
      bookingUrl: '/bookings?source=archive-songwars&service=event-community-rollout',
      bookingCtaLabel: 'Book OTP for a launch',
      caseStudyUrl: '',
      caseStudyCtaLabel: 'Read Case Study'
    }),
    Object.freeze({
      id: 'protocol',
      slug: 'protocol',
      title: 'PROTOCOL',
      type: 'Music Rollout / Independent Release System',
      category: 'Music',
      categories: Object.freeze(['Music', 'Branding', 'Creative Direction', 'Marketing', 'Content Production', 'Web Development']),
      disciplines: Object.freeze(['Music Rollout', 'Brand Identity', 'Creative Direction', 'Marketing', 'Website', 'Content']),
      collections: Object.freeze(['Featured Projects', 'Newest', 'Music', 'Everything']),
      featured: true,
      homepageFeatured: false,
      pinned: true,
      status: 'Released',
      launchDate: '2026-06-26',
      year: 2026,
      shortDescription: 'A self-contained release world for ELI3GANT, connecting the music, visual identity, countdown, track reveal, and streaming path inside one focused digital experience.',
      tags: Object.freeze(['ELI3GANT', 'Independent Music', 'Release Campaign', 'Visual Identity', 'Digital Experience']),
      services: Object.freeze(['Creative direction', 'Release strategy', 'Campaign website', 'Visual identity', 'Interactive countdown', 'Responsive production']),
      technology: Object.freeze(['HTML', 'CSS', 'JavaScript', 'Express', 'Vercel']),
      heroImage: Object.freeze({
        src: '/assets/otp-social-preview.png',
        alt: 'PROTOCOL by ELI3GANT social preview artwork',
        width: 1200,
        height: 630
      }),
      projectUrl: '/protocol',
      projectCtaLabel: 'Visit PROTOCOL',
      bookingUrl: '/bookings?source=archive-protocol&service=artist-campaign',
      bookingCtaLabel: 'Plan an artist rollout',
      caseStudyUrl: '',
      caseStudyCtaLabel: 'Read Case Study'
    }),
    Object.freeze({
      id: 'hyh-architecture-design',
      slug: 'hyh-architecture-design',
      title: 'HYH Architecture & Design',
      type: 'Website Transformation / Architecture Visualization Brand System',
      category: 'Architecture',
      categories: Object.freeze(['Architecture', 'Branding', 'Web Development', 'Client Work']),
      disciplines: Object.freeze(['Website Transformation', 'Architecture Visualization', 'Brand System', 'Portfolio UX']),
      collections: Object.freeze(['Client Projects', 'Everything']),
      featured: false,
      homepageFeatured: true,
      pinned: false,
      status: 'Released',
      launchDate: '2026-06-09',
      year: 2026,
      shortDescription: "OTP rebuilt HYH's outdated web presence into a cinematic architecture and visualization experience with stronger positioning, premium visuals, clearer navigation, and project-start CTAs.",
      tags: Object.freeze(['Website', 'Brand Refresh', 'Architecture', 'Visualization', 'Portfolio System', 'Before / After']),
      services: Object.freeze(['Website redesign', 'Homepage copywriting', 'Premium visual direction', 'Portfolio/project structure', 'Responsive layout polish', 'CTA flow', 'Architecture visualization positioning']),
      technology: Object.freeze(['Responsive Web Design', 'Content System', 'Conversion UX']),
      heroImage: Object.freeze({
        src: '/assets/hyh-otp-rebuild.jpg',
        alt: 'OTP rebuild of the HYH Architecture and Design homepage',
        width: 1600,
        height: 869
      }),
      heroFit: 'contain',
      beforeAfter: Object.freeze({
        before: Object.freeze({
          label: 'Previous Website',
          src: 'assets/hyh-previous-website.jpg',
          alt: 'Previous HYH Architecture and Design website homepage',
          width: 1600,
          height: 816,
          caption: 'The previous public web presence had limited hierarchy, sparse navigation, and a basic presentation of architecture visuals.'
        }),
        after: Object.freeze({
          label: 'OTP Rebuild',
          src: 'assets/hyh-otp-rebuild.jpg',
          alt: 'OTP rebuild of the HYH Architecture and Design homepage',
          width: 1600,
          height: 869,
          caption: 'OTP rebuilt the homepage into a cinematic architecture and visualization experience with premium navigation and clear project-start CTAs.'
        })
      }),
      projectUrl: '/bookings?source=hyh-project',
      projectCtaLabel: 'Start a Similar Project',
      bookingUrl: '/bookings?source=archive-hyh&service=website-business-fix',
      bookingCtaLabel: 'Get a site fix quote',
      caseStudyUrl: '',
      caseStudyCtaLabel: 'Read Case Study',
      ctaHref: '/bookings?source=hyh-project',
      ctaLabel: 'Start a Similar Project'
    })
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uniqueSorted = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));

  const library = Object.freeze({
    getProjects: () => clone(PROJECTS),
    getFeaturedProjects: () => clone(PROJECTS.filter((project) => project.homepageFeatured === true)),
    getArchiveFeaturedProjects: () => clone(PROJECTS.filter((project) => project.featured === true)),
    getCategories: () => clone(CATEGORIES),
    getStatuses: () => clone(STATUSES),
    getCollections: () => clone(COLLECTIONS),
    getYears: () => uniqueSorted(PROJECTS.map((project) => project.year)).sort((a, b) => b - a),
    getTechnologies: () => uniqueSorted(PROJECTS.flatMap((project) => project.technology || []))
  });

  root.OTP_PROJECT_LIBRARY = library;
  if (typeof module !== 'undefined' && module.exports) module.exports = library;
})(typeof window !== 'undefined' ? window : globalThis);
