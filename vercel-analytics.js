/**
 * Vercel Web Analytics Integration
 * 
 * This script provides a simple initialization for Vercel Web Analytics.
 * When deployed to Vercel with Analytics enabled in the dashboard,
 * page views and events are automatically tracked.
 * 
 * The @vercel/analytics package has been installed and is available
 * for future custom event tracking if needed.
 */

(function() {
  'use strict';
  
  // Initialize Vercel Analytics queue
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
  
  // Mark analytics as initialized
  window.vai = true;
  
  // Set mode based on environment
  window.vam = (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1') 
                ? 'development' 
                : 'production';
  
  // Log initialization in development
  if (window.vam === 'development') {
    console.log('[Vercel Analytics] Initialized in development mode');
    console.log('[Vercel Analytics] Events will be logged to console');
    console.log('[Vercel Analytics] Enable Analytics in Vercel Dashboard for production tracking');
  }
  
  // The actual analytics script will be injected by Vercel when deployed
  // and Analytics is enabled in the project dashboard
})();
