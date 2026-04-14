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
        starting_at_cents: 50000
      }),
      theEngine: Object.freeze({
        key: 'The Engine',
        label: 'The Engine',
        price_display: '$1,200 to $2,000',
        mode: 'range',
        low_cents: 120000,
        high_cents: 200000
      }),
      theSystem: Object.freeze({
        key: 'The System',
        label: 'The System',
        price_display: 'Starting at $3,500+',
        mode: 'starting_at_plus',
        starting_at_cents: 350000
      }),
      custom: Object.freeze({
        key: 'Custom',
        label: 'Custom',
        price_display: 'Scope-based',
        mode: 'custom'
      })
    }),
    services: Object.freeze({
      starterWebPresence: Object.freeze({ label: 'Starter Web Presence', price_display: '$750', cents: 75000, type: 'one_time' }),
      businessWebsitePro: Object.freeze({ label: 'Business Website Pro', price_display: '$1,500', cents: 150000, type: 'one_time' }),
      customWebsiteArchitecture: Object.freeze({ label: 'Custom Website Architecture', price_display: '$3,500+', starting_at_cents: 350000, type: 'one_time' }),
      videoEditing: Object.freeze({ label: 'Video Editing Services', price_display: '$150 to $800+', low_cents: 15000, high_cents: 80000, type: 'one_time_range' }),
      filmingProduction: Object.freeze({ label: 'Filming / Production', price_display: '$150/hour minimum', hourly_cents: 15000, type: 'hourly' }),
      photographySessions: Object.freeze({ label: 'Photography Sessions', price_display: '$250', cents: 25000, type: 'one_time' }),
      aiPromoCreative: Object.freeze({ label: 'AI Promo / Digital Creative', price_display: '$300', cents: 30000, type: 'one_time' }),
      customAiAutomation: Object.freeze({ label: 'Custom AI Automation Setup', price_display: '$1,500+', starting_at_cents: 150000, type: 'one_time' }),
      starterMonthlyContent: Object.freeze({ label: 'Starter Monthly Content Package', price_display: '$600/month', monthly_cents: 60000, type: 'monthly' }),
      growthBrandPackage: Object.freeze({ label: 'Growth Brand Package', price_display: '$1,500/month', monthly_cents: 150000, type: 'monthly' }),
      fullBrandEngineRetainer: Object.freeze({ label: 'Full Brand Engine Retainer', price_display: '$3,000+/month', monthly_starting_at_cents: 300000, type: 'monthly' }),
      monthlyWebsiteMaintenance: Object.freeze({ label: 'Monthly Website Maintenance', price_display: '$79/month', monthly_cents: 7900, type: 'monthly' })
    })
  });
});

