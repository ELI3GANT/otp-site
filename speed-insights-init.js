/**
 * Vercel Speed Insights Initialization
 * Loads and initializes @vercel/speed-insights for performance tracking
 */

(async function() {
    try {
        // Dynamically import the Speed Insights module
        const { injectSpeedInsights } = await import('./speed-insights.mjs');
        
        // Initialize Speed Insights with default configuration
        // Debug mode is automatically enabled in development
        injectSpeedInsights({
            debug: false // Set to true for development debugging
        });
        
        console.log('✅ [OTP] Vercel Speed Insights: Initialized');
    } catch (error) {
        console.warn('⚠️ [OTP] Speed Insights initialization failed:', error.message);
    }
})();
