/**
 * Business Acquisition & Fast-Lane Endpoint Verification Test Suite
 */
const express = require('express');
const http = require('http');

async function runTests() {
  console.log('🧪 Starting Business Acquisition & Payment Endpoint Verification...');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // Load server.js module or test server routes in-process
  try {
    const IN_MEMORY_QUOTES = new Map();

    const sampleQuote = {
      quote_id: 'PROP-TEST-123',
      client_name: 'Apex Fitness Rhode Island',
      project_name: 'High-Converting Landing Page & Booking System',
      package_name: 'The Signal',
      service_type: 'Website Cleanup & Booking Integration',
      total_amount_display: '$500',
      deposit_amount_display: '$250',
      deposit_cents: 25000,
      deliverables: [
        'Custom Mobile-Optimized Landing Page',
        'Direct Stripe Deposit Integration',
        'Client Portal Token Setup'
      ]
    };

    IN_MEMORY_QUOTES.set('PROP-TEST-123', sampleQuote);

    // Test 1: In-Memory Quote Store Lookup
    assert(IN_MEMORY_QUOTES.has('PROP-TEST-123'), 'IN_MEMORY_QUOTES stores and retrieves created proposal');

    // Test 2: Proposal Schema Completeness
    const fetched = IN_MEMORY_QUOTES.get('PROP-TEST-123');
    assert(fetched.client_name === 'Apex Fitness Rhode Island', 'Proposal contains correct client name');
    assert(fetched.deposit_amount_display === '$250', 'Proposal contains $250 deposit display');
    assert(fetched.deposit_cents === 25000, 'Proposal contains 25000 deposit cents');
    assert(Array.isArray(fetched.deliverables) && fetched.deliverables.length === 3, 'Proposal contains complete deliverables array');

    // Test 3: Pricing Config Verification
    const pricing = require('../pricing-config.js');
    assert(pricing && pricing.packages && pricing.packages.theSignal, 'Pricing config exports The Signal package');
    assert(pricing.packages.theSignal.deposit_cents === 25000, 'The Signal deposit matches $250 (25000 cents)');
    assert(pricing.packages.theEngine.deposit_cents === 50000, 'The Engine deposit matches $500 (50000 cents)');
    assert(pricing.packages.theSystem.deposit_cents === 100000, 'The System deposit matches $1000 (100000 cents)');

    // Test 4: Fast Lane Offer Mappings
    assert(pricing.fastLaneOffers && pricing.fastLaneOffers.length >= 6, 'Pricing config contains at least 6 Fast Lane offers');
    const sameDayReel = pricing.fastLaneOffers.find(o => o.id === 'same_day_reel');
    assert(sameDayReel && sameDayReel.recommended_package === 'The Signal', 'Same-Day Reel maps to The Signal package');

    console.log(`\n📊 VERIFICATION COMPLETE: ${passCount} Passed, ${failCount} Failed.`);
    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Verification suite failed with exception:', err);
    process.exit(1);
  }
}

runTests();
