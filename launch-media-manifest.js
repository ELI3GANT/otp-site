/**
 * OTP LAUNCH Unified Visual Media & Motion Manifest (V1.3)
 * Single source of truth for authentic OTP portfolio recordings/captures (~70%)
 * paired with Google Flow cinematic sequence slots (~30%).
 *
 * Adding new founder recordings or Google Flow exports only requires registering
 * or dropping files under /assets/demos/ or /assets/flow/ with no layout rewrite.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OTP_LAUNCH_MEDIA = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MANIFEST_VERSION = 'otp-launch-media-v1.4-signature-assets';

  // Conceptual 3D Obsidian & Titanium Service Illustrations (strictly distinct from verified portfolio proof in AUTHENTIC_ASSETS)
  const SERVICE_VISUALS = Object.freeze([
    Object.freeze({
      serviceId: 'starter-website',
      title: 'Starter Website',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/starter-website.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Obsidian MacBook and titanium iPhone floating in architectural studio lighting for Starter Websites',
      flowSlot: Object.freeze({
        id: 'flow-svc-starter-website',
        status: 'ready',
        mp4: '/assets/flow/services/starter-website.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'artist-epk',
      title: 'Artist Websites & EPKs',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/artist-epk.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Brushed titanium audio deck and translucent acoustic glass planes for Artist Websites and EPKs',
      flowSlot: Object.freeze({
        id: 'flow-svc-artist-epk',
        status: 'ready',
        mp4: '/assets/flow/services/artist-epk.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'business-website',
      title: 'Business Websites',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/business-website.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Synchronized matte black laptop, desktop display, and titanium smartphone assembling clean service grids, appointment tiles, and client inquiry cards for Business Websites',
      flowSlot: Object.freeze({
        id: 'flow-svc-business-website',
        status: 'ready',
        mp4: '/assets/flow/services/business-website.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'ecommerce-experience',
      title: 'E-Commerce Experiences',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/ecommerce-experience.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Luxury obsidian studio products paired with an interactive glass storefront, product cards, shopping bag indicator, and checkout pill for E-Commerce Experiences',
      flowSlot: Object.freeze({
        id: 'flow-svc-ecommerce-experience',
        status: 'ready',
        mp4: '/assets/flow/services/ecommerce-experience.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'redesign-repair',
      title: 'Website Redesigns & Repairs',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/redesign-repair.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Dual-plane frosted architectural transformation splitting shadow into luminous titanium structure for Website Redesigns',
      flowSlot: Object.freeze({
        id: 'flow-svc-redesign-repair',
        status: 'ready',
        mp4: '/assets/flow/services/redesign-repair.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'custom-web-app',
      title: 'Custom Web Applications',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/custom-web-app.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Connected obsidian glass nodes and precision orbital rings for Custom Web Applications',
      flowSlot: Object.freeze({
        id: 'flow-svc-custom-web-app',
        status: 'ready',
        mp4: '/assets/flow/services/custom-web-app.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'native-app',
      title: 'Native Applications',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/native-app.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Black titanium smartphone angled over dark basalt with floating haptic glass tile for Native Applications',
      flowSlot: Object.freeze({
        id: 'flow-svc-native-app',
        status: 'ready',
        mp4: '/assets/flow/services/native-app.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'digital-templates',
      title: 'Digital Templates & Kits',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/digital-templates.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Precision-aligned obsidian, matte graphite, and glass grid modules for Digital Templates and Kits',
      flowSlot: Object.freeze({
        id: 'flow-svc-digital-templates',
        status: 'ready',
        mp4: '/assets/flow/services/digital-templates.mp4',
        webm: '',
        durationSec: 6
      })
    }),
    Object.freeze({
      serviceId: 'maintenance-enhancements',
      title: 'Maintenance & Enhancements',
      visualRole: 'conceptual_service_illustration',
      poster: '/assets/services/maintenance-enhancements.webp',
      aspectRatio: '16:10',
      width: 1280,
      height: 800,
      alt: 'Dark obsidian website interface swept by an amber diagnostic beam aligning blocks, performance gauges, and a luminous security shield for Maintenance and Enhancements',
      flowSlot: Object.freeze({
        id: 'flow-svc-maintenance-enhancements',
        status: 'ready',
        mp4: '/assets/flow/services/maintenance-enhancements.mp4',
        webm: '',
        durationSec: 6
      })
    })
  ]);

  const AUTHENTIC_ASSETS = Object.freeze([
    Object.freeze({
      id: 'floivation-desktop',
      slug: 'floivation',
      title: 'FLOIVATION',
      subtitle: 'Flagship Brand Storefront',
      category: 'Websites & Commerce',
      visualGroup: 'websites',
      deviceType: 'macbook',
      originLabel: 'Live Website Recording',
      mp4: '/assets/demos/floivation-desktop-loop.mp4',
      webm: '',
      poster: '/assets/demos/floivation-desktop-poster.webp',
      alt: 'Authentic desktop screen recording of the FLOIVATION brand storefront built by OnlyTruePerspective',
      href: '/projects/floivation',
      outcome: 'Clear brand website built to showcase work, products, and fast mobile browsing.',
      serviceIds: Object.freeze(['business-website', 'artist-epk', 'ecommerce-experience']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'floivation-mobile',
      slug: 'floivation',
      title: 'FLOIVATION Mobile',
      subtitle: 'Responsive Commerce Flow',
      category: 'Websites & Commerce',
      visualGroup: 'websites',
      deviceType: 'iphone',
      originLabel: 'Mobile Screen Recording',
      mp4: '/assets/demos/floivation-mobile-loop.mp4',
      webm: '',
      poster: '/assets/demos/floivation-mobile-poster.webp',
      alt: 'Authentic iPhone viewport recording of the FLOIVATION mobile web experience',
      href: '/projects/floivation',
      outcome: 'Thumb-friendly navigation, crisp collection cards, and fast mobile checkout pathways.',
      serviceIds: Object.freeze(['ecommerce-experience', 'business-website', 'starter-website']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'hyh-transformation',
      slug: 'hyh-architecture-design',
      title: 'HYH Architecture & Design',
      subtitle: 'Full Architectural Web Rebuild',
      category: 'Website Transformation',
      visualGroup: 'websites',
      deviceType: 'compare',
      originLabel: 'Before → After Verified Capture',
      beforeImage: '/assets/hyh-previous-website.jpg',
      afterImage: '/assets/hyh-otp-rebuild.jpg',
      poster: '/assets/hyh-otp-rebuild.jpg',
      alt: 'HYH Architecture & Design before-and-after website transformation by OnlyTruePerspective',
      href: '/projects/hyh-architecture-design',
      outcome: 'Transformed a dated static brochure site into a structured dark-mode architectural showcase with consultation flow.',
      serviceIds: Object.freeze(['redesign-repair', 'starter-website', 'business-website']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'otp-site-experience',
      slug: 'otp-site',
      title: 'OnlyTruePerspective Flagship',
      subtitle: 'Creative Technology Studio Web',
      category: 'Websites & Creative Systems',
      visualGroup: 'websites',
      deviceType: 'macbook',
      originLabel: 'Live Website Recording',
      mp4: '/assets/demos/otp-site-desktop-loop.mp4',
      webm: '',
      poster: '/assets/demos/otp-site-desktop-poster.webp',
      alt: 'Live desktop recording of the OnlyTruePerspective flagship website',
      href: '/archive',
      outcome: 'Fast, clean flagship website designed for easy reading on phones and desktops.',
      serviceIds: Object.freeze(['starter-website', 'artist-epk', 'business-website']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'floorops-platform',
      slug: 'floorops',
      title: 'OTP FloorOps',
      subtitle: 'Warehouse Exception SaaS',
      category: 'Apps & Custom Systems',
      visualGroup: 'apps',
      deviceType: 'macbook',
      originLabel: 'Verified Production Platform',
      mp4: '',
      webm: '',
      poster: '/assets/demos/floorops-dockguard.webp',
      secondaryStill: '/assets/demos/floorops-desktop.webp',
      alt: 'OTP FloorOps DockGuard live warehouse exception dashboard',
      href: '/floorops',
      outcome: 'Custom web dashboard for reporting issues, photo documentation, and team sign-offs.',
      serviceIds: Object.freeze(['custom-web-app', 'business-website', 'maintenance-enhancements']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'evehalo-ios',
      slug: 'evehalo',
      title: 'EVEHALO',
      subtitle: 'Spatial Native iOS Application',
      category: 'Native iOS Build',
      visualGroup: 'apps',
      deviceType: 'iphone',
      originLabel: 'iOS Simulator Recording',
      mp4: '/assets/demos/evehalo-iphone-loop.mp4',
      webm: '',
      poster: '/assets/demos/evehalo-iphone-poster.webp',
      alt: 'Authentic iPhone navigation recording inside the EVEHALO native iOS application',
      href: '/evehalo',
      outcome: 'Smooth native iPhone app built for fast touch interactions and visual depth.',
      serviceIds: Object.freeze(['native-app', 'digital-templates']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'vault-ios',
      slug: 'vault',
      title: 'VAULT Audio',
      subtitle: 'Private Music App',
      category: 'iPhone Apps',
      visualGroup: 'apps',
      deviceType: 'iphone',
      originLabel: 'iPhone Screen Capture',
      mp4: '',
      webm: '',
      poster: '/assets/demos/vault-foreground-iphone.webp',
      secondaryStill: '/assets/demos/vault-nowplaying-iphone.webp',
      alt: 'VAULT iPhone music player interface showing clear track library and waveform playback',
      href: '/archive',
      outcome: 'Private iPhone music player designed to organize unreleased tracks and masters.',
      serviceIds: Object.freeze(['native-app', 'artist-epk']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'otp-studio-ios',
      slug: 'otp-studio',
      title: 'OTP Studio',
      subtitle: 'Mobile Creator Suite',
      category: 'Creative Tools',
      visualGroup: 'care',
      deviceType: 'iphone',
      originLabel: 'iPhone Recording',
      mp4: '/assets/demos/otp-studio-iphone-loop.mp4',
      webm: '',
      poster: '/assets/demos/otp-studio-iphone-poster.webp',
      secondaryStill: '/assets/demos/otp-studio-iphone-still.webp',
      alt: 'Authentic screen recording of OTP Studio mobile creator workspace on iPhone',
      href: '/studio',
      outcome: 'Mobile creative suite for organizing projects, themes, and release assets.',
      serviceIds: Object.freeze(['digital-templates', 'native-app', 'artist-epk']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'weatheros-suite',
      slug: 'weatheros',
      title: 'WeatherOS',
      subtitle: 'Clean Daily Forecast App',
      category: 'Apps & Care',
      visualGroup: 'care',
      deviceType: 'macbook',
      originLabel: 'Live Product Page',
      mp4: '',
      webm: '',
      poster: '/assets/demos/weatheros-desktop.webp',
      alt: 'WeatherOS product interface showcase engineered by OnlyTruePerspective',
      href: '/weatheros',
      outcome: 'Minimal weather product focused on clear daily updates and reliable performance.',
      serviceIds: Object.freeze(['maintenance-enhancements', 'native-app', 'digital-templates']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'otp-templates-system',
      slug: 'digital-templates',
      title: 'Launch Templates',
      subtitle: 'Ready-Made Website Layouts',
      category: 'Templates & Kits',
      visualGroup: 'care',
      deviceType: 'macbook',
      originLabel: 'Template Collection',
      mp4: '',
      webm: '',
      poster: '/assets/demos/otp-templates-grid.webp',
      alt: 'OnlyTruePerspective ready-made website templates and layouts preview',
      href: '/launch?service=digital-templates',
      outcome: 'Ready-made website layouts and brand kits customized around your business.',
      serviceIds: Object.freeze(['digital-templates', 'starter-website']),
      approvedForProposals: true
    }),
    Object.freeze({
      id: 'otp-os-control',
      slug: 'otp-os',
      title: 'OTP Client System',
      subtitle: 'Quotes, Portals & Delivery',
      category: 'Client Systems',
      visualGroup: 'care',
      deviceType: 'macbook',
      originLabel: 'Studio Workspace',
      mp4: '',
      webm: '',
      poster: '/assets/demos/otp-os-desktop.webp',
      secondaryStill: '/assets/fixline-product-preview.png',
      alt: 'OTP OS client quotes, portals, and project delivery workspace',
      href: '/projects/otp-os',
      outcome: 'One workspace connecting project requests, proposals, client portals, and payments.',
      serviceIds: Object.freeze(['maintenance-enhancements', 'custom-web-app']),
      approvedForProposals: true
    })
  ]);

  const FLOW_SEQUENCES = Object.freeze([
    Object.freeze({
      id: 'flow-wizard-presence',
      title: 'OTP Wizard Signature Emergence',
      placement: 'launch-wizard-badge, studio-lore, proposal-cover',
      aspectRatio: '9:16',
      durationSec: 7.8,
      status: 'ready',
      mp4: '/assets/demos/otp-wizard-ambient.mp4',
      webm: '',
      poster: '/assets/demos/otp-wizard-poster.webp',
      fallbackRef: 'otp-wizard-poster',
      alt: 'Signature cloaked OTP Wizard silhouette with subtle luminous rim lighting'
    }),
    Object.freeze({
      id: 'flow-hero-reveal',
      title: 'Floating Obsidian MacBook & iPhone Orbital Reveal',
      placement: 'launch-hero-intro, homepage-showcase-bridge',
      aspectRatio: '16:10',
      durationSec: 6,
      status: 'ready',
      mp4: '/assets/flow/flow-hero-reveal.mp4',
      webm: '',
      poster: '/assets/services/starter-website.webp',
      fallbackRef: 'floivation-desktop',
      alt: 'Orbital reveal of obsidian MacBook and iPhone framing live OTP product interfaces'
    }),
    Object.freeze({
      id: 'flow-architecture-assembly',
      title: 'Monochrome & Violet Interface Assembly',
      placement: 'launch-websites-stage, start-project-bridge',
      aspectRatio: '16:9',
      durationSec: 6,
      status: 'slot_pending',
      mp4: '/assets/flow/flow-architecture-assembly.mp4',
      webm: '/assets/flow/flow-architecture-assembly.webm',
      poster: '/assets/demos/otp-site-desktop-poster.webp',
      fallbackRef: 'otp-site-experience',
      alt: 'Architectural wireframe assembling into a finished dark-mode web experience'
    }),
    Object.freeze({
      id: 'flow-device-bridge',
      title: 'Camera Push into Live Product Screen Recording',
      placement: 'proposal-hero-reel, archive-featured-opener',
      aspectRatio: '16:9',
      durationSec: 4,
      status: 'slot_pending',
      mp4: '/assets/flow/flow-device-bridge.mp4',
      webm: '/assets/flow/flow-device-bridge.webm',
      poster: '/assets/demos/evehalo-iphone-poster.webp',
      fallbackRef: 'evehalo-ios',
      alt: 'Smooth orbital camera push settling directly into an active product walkthrough'
    }),
    Object.freeze({
      id: 'booking-hero-assembly',
      title: 'Digital Experience Assembly',
      placement: 'start-project-hero',
      aspectRatio: '16:10',
      durationSec: 6,
      status: 'ready',
      mp4: '/assets/flow/booking/booking-hero.mp4',
      webm: '',
      poster: '/assets/flow/booking/booking-hero.webp',
      fallbackRef: 'otp-site-experience',
      alt: 'Floating browser frames, titanium smartphone, and modular design cards assembling into one digital workspace'
    }),
    Object.freeze({
      id: 'pkg-the-signal',
      title: 'The Signal Signature Visual',
      placement: 'booking-package-signal',
      aspectRatio: '16:10',
      durationSec: 6,
      status: 'ready',
      mp4: '/assets/flow/booking/the-signal.mp4',
      webm: '',
      poster: '/assets/flow/booking/the-signal.webp',
      fallbackRef: 'starter-website',
      alt: 'Brushed titanium prism and obsidian glass display representing The Signal focused deliverables'
    }),
    Object.freeze({
      id: 'pkg-the-engine',
      title: 'The Engine Signature Visual',
      placement: 'booking-package-engine',
      aspectRatio: '16:10',
      durationSec: 6,
      status: 'ready',
      mp4: '/assets/flow/booking/the-engine.mp4',
      webm: '',
      poster: '/assets/flow/booking/the-engine.webp',
      fallbackRef: 'business-website',
      alt: 'Synchronized titanium and smoked glass creative modules aligning for The Engine'
    }),
    Object.freeze({
      id: 'pkg-the-system',
      title: 'The System Signature Visual',
      placement: 'booking-package-system',
      aspectRatio: '16:10',
      durationSec: 6,
      status: 'ready',
      mp4: '/assets/flow/booking/the-system.mp4',
      webm: '',
      poster: '/assets/flow/booking/the-system.webp',
      fallbackRef: 'custom-web-app',
      alt: 'Interconnected obsidian architecture and gold conduit hubs representing The System'
    })
  ]);

  const BEFORE_AFTER_PAIRS = Object.freeze([
    Object.freeze({
      id: 'hyh',
      title: 'HYH Architecture & Design',
      subtitle: 'Brochure Site → Structured Dark Architectural Experience',
      beforeLabel: 'Previous Static Site',
      afterLabel: 'OTP Rebuild',
      beforeImage: '/assets/hyh-previous-website.jpg',
      afterImage: '/assets/hyh-otp-rebuild.jpg',
      alt: 'HYH Architecture & Design before and after comparison slider',
      href: '/projects/hyh-architecture-design',
      metrics: 'Mobile responsiveness · Visual hierarchy · Clear Start a Project funnel'
    }),
    Object.freeze({
      id: 'floivation',
      title: 'FLOIVATION Streetwear',
      subtitle: 'Fragmented Link Page → Cohesive Brand Destination',
      beforeLabel: 'Original Site',
      afterLabel: 'OTP Brand Flagship',
      beforeImage: '/assets/case-studies/floivation/before-viewport.webp',
      afterImage: '/assets/case-studies/floivation/after-home.jpg',
      alt: 'FLOIVATION before and after brand website comparison slider',
      href: '/projects/floivation',
      metrics: 'Brand authority · Editorial movement · Unified shop & community links'
    })
  ]);

  function getAssetById(id) {
    const clean = String(id || '').trim().toLowerCase();
    return AUTHENTIC_ASSETS.find((item) => item.id === clean || item.slug === clean) || AUTHENTIC_ASSETS[0];
  }

  function getAssetsForService(serviceId) {
    const clean = String(serviceId || '').trim().toLowerCase();
    const matches = AUTHENTIC_ASSETS.filter((item) => item.serviceIds.includes(clean));
    return matches.length ? matches : AUTHENTIC_ASSETS.slice(0, 3);
  }

  function getAssetsForCategory(group = 'all') {
    const clean = String(group || 'all').trim().toLowerCase();
    if (clean === 'all') return AUTHENTIC_ASSETS;
    const matches = AUTHENTIC_ASSETS.filter((item) => item.visualGroup === clean);
    return matches.length ? matches : AUTHENTIC_ASSETS;
  }

  function getHeroPairForCategory(group = 'all') {
    const clean = String(group || 'all').trim().toLowerCase();
    if (clean === 'apps') {
      return {
        desktop: getAssetById('floorops-platform'),
        mobile: getAssetById('evehalo-ios'),
        compareId: 'floivation'
      };
    }
    if (clean === 'care') {
      return {
        desktop: getAssetById('otp-os-control'),
        mobile: getAssetById('otp-studio-ios'),
        compareId: 'hyh'
      };
    }
    return {
      desktop: getAssetById('floivation-desktop'),
      mobile: getAssetById('floivation-mobile'),
      compareId: 'hyh'
    };
  }

  function getServiceVisual(serviceId) {
    const clean = String(serviceId || '').trim().toLowerCase();
    return SERVICE_VISUALS.find((item) => item.serviceId === clean) || SERVICE_VISUALS[0];
  }

  function getFlowSequence(id) {
    const clean = String(id || '').trim().toLowerCase();
    return FLOW_SEQUENCES.find((item) => item.id === clean) || FLOW_SEQUENCES[0];
  }

  return Object.freeze({
    MANIFEST_VERSION,
    SERVICE_VISUALS,
    AUTHENTIC_ASSETS,
    FLOW_SEQUENCES,
    BEFORE_AFTER_PAIRS,
    getServiceVisual,
    getAssetById,
    getAssetsForService,
    getAssetsForCategory,
    getHeroPairForCategory,
    getFlowSequence
  });
});
