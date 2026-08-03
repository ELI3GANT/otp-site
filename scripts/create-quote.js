/**
 * OTP Custom Proposal / Quote Link Generator CLI
 * Usage: node scripts/create-quote.js "Client Name" "Project Title" "The Signal" "$500" "$250"
 */

const fs = require('fs');

async function createQuote() {
  const args = process.argv.slice(2);
  const clientName = args[0] || 'Valued Client';
  const projectName = args[1] || 'Custom Digital & Creative Systems';
  const packageName = args[2] || 'The Signal';
  const totalDisplay = args[3] || '$500';
  const depositDisplay = args[4] || '$250';
  const baseUrl = process.env.OTP_SITE_URL || 'http://localhost:3000';

  const depositCents = Number(depositDisplay.replace(/[^0-9]/g, '')) * 100 || 25000;

  const payload = {
    client_name: clientName,
    project_name: projectName,
    package_name: packageName,
    service_type: 'Creative Technology & Digital Systems',
    total_amount_display: totalDisplay,
    deposit_amount_display: depositDisplay,
    deposit_cents: depositCents,
    deliverables: [
      `${packageName} Scope Deliverables for ${clientName}`,
      'Responsive Web / Content Asset Integration',
      'Automated Client Portal Access & Instant Deposit Checkout'
    ]
  };

  try {
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    const res = await fetch(`${baseUrl}/api/quote/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      console.log('\n✅ PROPOSAL CREATED SUCCESSFULLY!');
      console.log(`📋 Proposal ID: ${data.quote_id}`);
      console.log(`👤 Client: ${clientName}`);
      console.log(`💰 Deposit: ${depositDisplay} (Total: ${totalDisplay})`);
      console.log(`🔗 Custom Proposal Link: ${baseUrl}${data.link}\n`);
    } else {
      console.error('❌ Failed to create proposal:', data);
    }
  } catch (err) {
    console.error('❌ Error calling proposal creation endpoint:', err.message);
  }
}

createQuote();
