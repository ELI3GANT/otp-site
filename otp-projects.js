(function initOtpProjectLibrary(root) {
  'use strict';

  const PROJECTS = Object.freeze([
    Object.freeze({
      id: 'hyh-architecture-design',
      title: 'HYH Architecture & Design',
      type: 'Website Transformation / Architecture Visualization Brand System',
      category: 'Creative Systems',
      featured: true,
      pinned: true,
      shortDescription: "OTP rebuilt HYH's outdated web presence into a cinematic architecture and visualization experience with stronger positioning, premium visuals, clearer navigation, and project-start CTAs.",
      tags: Object.freeze([
        'Website',
        'Brand Refresh',
        'Architecture',
        'Visualization',
        'Portfolio System',
        'Before / After'
      ]),
      services: Object.freeze([
        'Website redesign',
        'Homepage copywriting',
        'Premium visual direction',
        'Portfolio/project structure',
        'Responsive layout polish',
        'CTA flow',
        'Architecture visualization positioning'
      ]),
      beforeAfter: Object.freeze({
        before: Object.freeze({
          label: 'Previous Website',
          src: 'assets/hyh-previous-website.jpg',
          alt: 'Previous HYH Architecture & Design website homepage',
          caption: 'The previous public web presence had limited hierarchy, sparse navigation, and a basic presentation of architecture visuals.'
        }),
        after: Object.freeze({
          label: 'OTP Rebuild',
          src: 'assets/hyh-otp-rebuild.jpg',
          alt: 'OTP rebuild of the HYH Architecture & Design homepage',
          caption: 'OTP rebuilt the homepage into a cinematic architecture and visualization experience with premium navigation and clear project-start CTAs.'
        })
      }),
      ctaHref: '/bookings?source=hyh-project',
      ctaLabel: 'Start a Similar Project'
    })
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));

  root.OTP_PROJECT_LIBRARY = Object.freeze({
    getProjects: () => clone(PROJECTS),
    getFeaturedProjects: () => clone(PROJECTS.filter((project) => project.featured !== false))
  });
})(typeof window !== 'undefined' ? window : globalThis);
