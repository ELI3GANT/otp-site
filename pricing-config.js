/**
 * OTP Unified Pricing Config (single source of truth)
 * - Browser: attaches to window.OTP_PRICING
 * - Node: module.exports = config
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OTP_PRICING = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function() {
  return Object.freeze({
    version: '2026-04-14',
    currency: 'USD',
    packages: Object.freeze({
      theSignal: Object.freeze({
        key: 'The Signal',
        label: 'The Signal',
        price_display: 'Starting at $500',
        mode: 'starting_at',
        summary: 'Focused creative work that gives your brand a sharper first impression.',
        best_for: Object.freeze([
          'logo refresh',
          'simple flyer/design',
          'short video edit',
          'content cleanup',
          'landing page section',
          'brand starter work',
          'basic creative direction'
        ])
      }),
      theEngine: Object.freeze({
        key: 'The Engine',
        label: 'The Engine',
        price_display: '$1,200 to $2,000',
        mode: 'range',
        summary: 'Connected assets your brand needs to look real, move faster, and convert better.',
        best_for: Object.freeze([
          'logo + brand kit',
          'video campaign',
          'website/landing page',
          'content rollout',
          'social media visuals',
          'business presentation',
          'client-facing brand upgrade'
        ])
      }),
      theSystem: Object.freeze({
        key: 'The System',
        label: 'The System',
        price_display: 'Starting at $3,500+',
        mode: 'starting_at',
        summary: 'Full structure for visuals, website, automation, documents, and workflow.',
        best_for: Object.freeze([
          'full website',
          'brand identity',
          'content system',
          'AI/automation setup',
          'booking/payment workflow',
          'client portal',
          'document/invoice workflow',
          'business workflow system'
        ])
      }),
      custom: Object.freeze({
        key: 'Custom',
        label: 'Custom Build',
        price_display: 'Scope based',
        mode: 'custom',
        summary: 'Scoped around projects that do not fit inside a box.',
        best_for: Object.freeze([
          'custom app',
          'AI tool',
          'artist rollout',
          'product launch',
          'event coverage',
          'long-term creative support',
          'mixed video/logo/site/automation project'
        ])
      })
    }),
    bookingPackages: Object.freeze([
      Object.freeze({
        id: 'the-signal',
        internal_key: 'The Signal',
        name: 'The Signal',
        price: 'Starting at $500',
        purpose: 'Entry-level creative service for a clean, focused deliverable.',
        description: 'The Signal is for focused creative work that gives your brand a sharper first impression.',
        best_for: Object.freeze(['Logo refresh', 'Simple flyer/design', 'Short video edit', 'Content cleanup', 'Landing page section', 'Brand starter work', 'Basic creative direction']),
        examples: Object.freeze(['Video/content', 'Logo refresh', 'Starter design', 'Landing page section']),
        cta: 'Start with The Signal',
        recommended: false
      }),
      Object.freeze({
        id: 'the-engine',
        internal_key: 'The Engine',
        name: 'The Engine',
        price: '$1,200 to $2,000',
        purpose: 'A stronger package for brands that need multiple connected assets.',
        description: 'The Engine builds the moving parts your brand needs to look real, move faster, and convert better.',
        best_for: Object.freeze(['Logo + brand kit', 'Video campaign', 'Website/landing page', 'Content rollout', 'Social media visuals', 'Business presentation', 'Client-facing brand upgrade']),
        examples: Object.freeze(['Brand kit', 'Video campaign', 'Landing page', 'Content rollout']),
        cta: 'Build with The Engine',
        recommended: true
      }),
      Object.freeze({
        id: 'the-system',
        internal_key: 'The System',
        name: 'The System',
        price: 'Starting at $3,500+',
        purpose: 'Full creative and business workflow system.',
        description: 'The System is for serious brands that need the full structure: visuals, website, automation, documents, and workflow.',
        best_for: Object.freeze(['Full website', 'Brand identity', 'Content system', 'AI/automation setup', 'Booking/payment workflow', 'Client portal', 'Document/invoice workflow', 'Business workflow system']),
        examples: Object.freeze(['Full website', 'AI automation', 'Client portal', 'Document workflow']),
        cta: 'Build The System',
        recommended: false
      }),
      Object.freeze({
        id: 'custom-build',
        internal_key: 'Custom',
        name: 'Custom Build',
        price: 'Scope based',
        purpose: 'For anything unique, advanced, or mixed.',
        description: 'Custom Build is for projects that do not fit inside a box. OTP scopes the work and builds around the real goal.',
        best_for: Object.freeze(['Custom app', 'AI tool', 'Artist rollout', 'Product launch', 'Event coverage', 'Long-term creative support', 'Mixed video/logo/site/automation project']),
        examples: Object.freeze(['Custom app', 'AI tool', 'Artist rollout', 'Event coverage']),
        cta: 'Request Custom Build',
        recommended: false
      })
    ]),
    bookingServiceTypes: Object.freeze([
      'Video / Content',
      'Logo / Brand Identity',
      'Website / Landing Page',
      'AI / Automation',
      'Business System',
      'Music / Artist Rollout',
      'Event Coverage',
      'Custom Request'
    ]),
    services: Object.freeze({
      starterWebPresence: Object.freeze({ label: 'Starter Web Presence', price_display: 'Custom quote', type: 'one_time' }),
      businessWebsitePro: Object.freeze({ label: 'Business Website Pro', price_display: 'Tailored pricing', type: 'one_time' }),
      customWebsiteArchitecture: Object.freeze({ label: 'Custom Website Architecture', price_display: 'Built around scope', type: 'one_time' }),
      videoEditing: Object.freeze({ label: 'Video Editing Services', price_display: 'Packages available', type: 'one_time_range' }),
      filmingProduction: Object.freeze({ label: 'Filming / Production', price_display: 'Scoped production quote', type: 'hourly' }),
      photographySessions: Object.freeze({ label: 'Photography Sessions', price_display: 'Custom quote', type: 'one_time' }),
      aiPromoCreative: Object.freeze({ label: 'AI Promo / Digital Creative', price_display: 'Tailored pricing', type: 'one_time' }),
      customAiAutomation: Object.freeze({ label: 'Custom AI Automation Setup', price_display: 'Built around scope', type: 'one_time' }),
      starterMonthlyContent: Object.freeze({ label: 'Starter Monthly Content Package', price_display: 'Packages available', type: 'monthly' }),
      growthBrandPackage: Object.freeze({ label: 'Growth Brand Package', price_display: 'Tailored monthly scope', type: 'monthly' }),
      fullBrandEngineRetainer: Object.freeze({ label: 'Full Brand Engine Retainer', price_display: 'Retainer by scope', type: 'monthly' }),
      monthlyWebsiteMaintenance: Object.freeze({ label: 'Monthly Website Maintenance', price_display: 'Quote first', type: 'monthly' })
    })
  });
});
