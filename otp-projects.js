(function initOtpProjectLibrary(root) {
  'use strict';

  const STATUSES = Object.freeze([
    'Live',
    'Released',
    'In Progress',
    'Archived',
    'Internal',
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
    'Experimental'
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
