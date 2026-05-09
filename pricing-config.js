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
        price_display: 'Focused custom quote',
        mode: 'custom_quote'
      }),
      theEngine: Object.freeze({
        key: 'The Engine',
        label: 'The Engine',
        price_display: 'Packages available',
        mode: 'packages_available'
      }),
      theSystem: Object.freeze({
        key: 'The System',
        label: 'The System',
        price_display: 'Tailored partnership',
        mode: 'tailored_scope'
      }),
      custom: Object.freeze({
        key: 'Custom',
        label: 'Custom',
        price_display: 'Scope-based',
        mode: 'custom'
      })
    }),
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
