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
          'business content system'
        ])
      }),
      custom: Object.freeze({
        key: 'Custom',
        label: 'Custom Build',
        price_display: 'Scope based',
        mode: 'custom',
        summary: 'Scoped around projects that route into The System or manual OTP review.',
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
    mainPackageLadder: Object.freeze([
      Object.freeze({
        id: 'signal',
        label: 'The Signal',
        position: 'Focused output',
        description: 'A focused creative deliverable built to make your brand, event, or project look ready fast.',
        bestFor: 'Single asset, quick creative deliverable, short-form content, landing page polish, site/content fix, event recap, or clear project piece.',
        chooseWhen: 'Choose this when one defined output needs to look professional fast.'
      }),
      Object.freeze({
        id: 'engine',
        label: 'The Engine',
        position: 'Connected project build',
        description: 'A connected project build for campaigns, websites, content systems, launches, or business presence upgrades.',
        bestFor: 'Campaigns, website refreshes, content systems, booking flows, brand launches, multi-piece creative packages, or business presence upgrades.',
        chooseWhen: 'Choose this when multiple pieces need to work together.'
      }),
      Object.freeze({
        id: 'system',
        label: 'The System',
        position: 'Full operating layer',
        description: 'A full operating layer for brands and businesses that need website, content, client flow, automation, and ongoing support working together.',
        bestFor: 'Website, content, brand, client flow, automation, portal support, or monthly/retainer-style creative systems.',
        chooseWhen: 'Choose this when the project touches the business layer, not just one deliverable.'
      })
    ]),
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
        purpose: 'Full creative and business system.',
        description: 'The System is for serious brands that need the full structure: visuals, website, automation, documents, and workflow.',
        best_for: Object.freeze(['Full website', 'Brand identity', 'Content system', 'AI/automation setup', 'Booking/payment workflow', 'Client portal', 'Document/invoice workflow', 'Business content system']),
        examples: Object.freeze(['Full website', 'AI automation', 'Client portal', 'Document workflow']),
        cta: 'Build The System',
        recommended: false
      }),
    ]),
    bookingServiceTypes: Object.freeze([
      'Video / Content',
      'Website / Digital System',
      'Brand Launch',
      'Fast Lane',
      'Custom Build',
      'Same-Day Reel',
      'Event Promo',
      'Website Cleanup',
      'Business Content Pack',
      'Brand Launch Assets',
      'Emergency Booking/Client Flow Fix',
      'Logo / Brand Identity',
      'AI / Automation',
      'Business System',
      'Music / Artist Rollout',
      'Event Coverage',
      'Custom Request'
    ]),
    fastLaneMappings: Object.freeze({
      'Same-Day Reel': 'The Signal',
      'Event Promo': 'The Signal',
      'Website Cleanup': 'The Signal',
      'Business Content Pack': 'The Engine',
      'Brand Launch Assets': 'The Engine',
      'Emergency Booking/Client Flow Fix': 'The System'
    }),
    fastLaneOffers: Object.freeze([
      Object.freeze({
        id: 'same_day_reel',
        label: 'Same-Day Reel',
        package_fit: 'The Signal',
        recommended_package: 'The Signal',
        urgency: 'Urgent',
        priority: 'High',
        next_action: 'Confirm deadline, platform, references, and delivery format; then send The Signal quote.',
        description: 'Same-day reel requests need a fast Signal lane and quick scope confirmation.',
        missing: Object.freeze(['timeline', 'reference link'])
      }),
      Object.freeze({
        id: 'event_promo',
        label: 'Event Promo',
        package_fit: 'The Signal / The Engine',
        recommended_package: 'The Signal',
        urgency: 'Time-sensitive',
        priority: 'High',
        next_action: 'Confirm event date, location, run of show, and delivery deadline; then send The Signal quote.',
        description: 'Event promos are time-sensitive and need date/location before quoting cleanly.',
        missing: Object.freeze(['event date', 'location'])
      }),
      Object.freeze({
        id: 'business_content_pack',
        label: 'Business Content Pack',
        package_fit: 'The Engine',
        recommended_package: 'The Engine',
        urgency: 'Planning needed',
        priority: 'Medium-High',
        next_action: 'Confirm deliverables, platforms, posting cadence, and timeline; then scope The Engine.',
        description: 'Business content packs need planning details across deliverables and channels.',
        missing: Object.freeze(['deliverables/platforms', 'timeline'])
      }),
      Object.freeze({
        id: 'website_cleanup',
        label: 'Website Cleanup',
        package_fit: 'The Signal',
        recommended_package: 'The Signal',
        urgency: 'Time-sensitive',
        priority: 'Medium-High',
        next_action: 'Confirm site link, issue list, access needs, and deadline; then send The Signal quote.',
        description: 'Website cleanup is a fast fix when the work is focused on one visible output.',
        missing: Object.freeze(['site link', 'issue list', 'deadline'])
      }),
      Object.freeze({
        id: 'brand_launch_pack',
        label: 'Brand Launch Assets',
        package_fit: 'The Engine',
        recommended_package: 'The Engine',
        urgency: 'Strategic planning',
        priority: 'High',
        next_action: 'Confirm scope, brand goals, launch timeline, and budget range; then scope The Engine.',
        description: 'Brand launch assets need a connected Engine plan across identity, launch content, and rollout pieces.',
        missing: Object.freeze(['scope/brand goals', 'budget', 'timeline'])
      }),
      Object.freeze({
        id: 'emergency_booking_flow_fix',
        label: 'Emergency Booking/Client Flow Fix',
        package_fit: 'The Signal / The System',
        recommended_package: 'The System',
        urgency: 'Urgent',
        priority: 'High',
        next_action: 'Confirm the broken flow, access needs, user impact, and deadline; then route the fix into The Signal or The System.',
        description: 'Emergency flow fixes move fast, but the package depth depends on whether it is one visible fix or an operating-layer repair.',
        missing: Object.freeze(['flow link', 'access needs', 'deadline'])
      })
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
