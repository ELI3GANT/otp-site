/**
 * OPT PAYMENT SYSTEM V2
 * robustified logic + form integration
 */

console.log('💰 Payment System Loading...');

// Force execution if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaymentSystem);
} else {
    initPaymentSystem();
}

function initPaymentSystem() {
    console.log('💰 Init Payment System...');
    const STRIPE_PK = 'pk_live_51SqqA9Pux5EhFZOuR0oo7VsFZrKoebiaWLXHNTZPx2kpa3w9kmqgUCtmEN4sY9LPW80UyfjBIfZkIfnPQW0Ba5MC007yWafN6y'; 

    if (typeof Stripe === 'undefined') {
        setTimeout(initPaymentSystem, 500); // Retry if Stripe JS slow
        return;
    }

    let stripe;
    try {
        stripe = Stripe(STRIPE_PK);
    } catch(e) {
        console.error("Stripe Init Failed", e);
        return;
    }

    // --- 1. CARD BUTTONS (Visual check) ---
    const pkgs = document.querySelectorAll('.package-static');
    if (pkgs.length === 0) console.warn("💰 No packages found to inject buttons into.");

    // Define packages that are simple enough for Instant Checkout
    // Bigger projects (Websites, Full Videos, Retainers) require a consultation first.
    const instantBuyPackages = [
        'The Drop',        // Simple Edit ($150)
        'The Visualizer',  // Simple Loop ($500)
        'The Vision',      // Photography ($1,200)
        'The Stack',       // Batch Edits ($1,000)
        'The Identity'     // Logo System ($1,000)
    ];

    pkgs.forEach(pkg => {
        // Debounce: Don't inject twice
        if (pkg.querySelector('.pkg-buy-btn')) return;

        const titleEl = pkg.querySelector('h4');
        const selectBtn = pkg.querySelector('.pkg-select-btn');
        if(!titleEl || !selectBtn) return;

        const titleRaw = titleEl.innerText;
        const titleClean = titleRaw.trim(); // Remove whitespace
        
        // --- RESTRICTED: ONLY PAY NOW for $50 & $100 items ---
        // Comparison using lowercase to avoid any mismatch
        const validPayPackages = ['the drop', 'the vision'];
        
        if (!validPayPackages.includes(titleClean.toLowerCase())) {
             // console.log(`Skipping Payment Button for: ${titleClean}`);
             return;
        }
        
        console.log(`✅ Injecting Payment Button for: ${titleClean}`);
        
        // Create Buy Button
        const buyBtn = document.createElement('button');
        buyBtn.className = 'pkg-buy-btn';
        buyBtn.innerHTML = `<span>⚡ PAY NOW</span>`;

        buyBtn.onclick = (e) => handleDirectPay(e, titleClean, stripe, buyBtn);
        
        // Insert
        selectBtn.insertAdjacentElement('afterend', buyBtn);
    });

    console.log(`✅ Injected ${document.querySelectorAll('.pkg-buy-btn').length} Payment Buttons.`);

    // --- 2. CONTACT FORM INTEGRATION ("Info Included") ---
    const form = document.getElementById('contactForm');
    const serviceSelect = document.getElementById('service');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (form && serviceSelect && submitBtn) {
        
        // Listen for service changes to update button text
        serviceSelect.addEventListener('change', () => {
            const val = serviceSelect.value;
            const validPayPackages = ['The Drop', 'The Vision'];

            if (validPayPackages.includes(val)) {
                submitBtn.innerHTML = `PAY & SEND DETAILS <span style="font-size:0.8em; opacity:0.7">(${val})</span>`;
                submitBtn.style.background = 'var(--accent2)';
                submitBtn.style.color = '#000';
            } else {
                submitBtn.innerText = 'Send Details';
                submitBtn.style.background = ''; // reset
                submitBtn.style.color = '';
            }
        });

        // Intercept Submission
        // NOTE: We override the existing listener by cloning or handling first?
        // Actually, site-init.js handles the submit event. We can't easily prevent it unless we replace the node or add a capture listener.
        // We will add a Capture listener to run BEFORE site-init.js
        form.addEventListener('submit', async (e) => {
            const val = serviceSelect.value;
            // ONLY Enable Pay & Send for the Whitelist
            const validPayPackages = ['The Drop', 'The Vision'];
            
            if (validPayPackages.includes(val)) {
                // It is a payment!
                // It is a payment!
                // We want to SAVE the lead first, then Redirect.
                // We'll let site-init.js run? No, site-init might just show 'Success' and hide form.
                // We need to STOP site-init from hiding everything immediately if we want to redirect?
                // OR we let site-init save it, then we redirect.
                // But site-init prevents default.
                
                // Strategy: We let the existing handler run (to save to DB), 
                // but we hook into the "success" state if possible.
                // Simpler: We'll handle the payment redirection here manually.
                
                // Prevent default is already called by site-init.
                // We can't easily stop site-init from running.
                
                // ALTERNATIVE: Use a global flag or hijack the submit button click.
                e.preventDefault();
                e.stopImmediatePropagation(); // STOP site-init.js

                submitBtn.disabled = true;
                submitBtn.innerText = "SECURING SLOT...";

                // 1. Save to DB manually here (Duplicate logic from site-init but safer for this flow)
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                try {
                    // A. Save Lead
                    const saveRes = await fetch('/api/contact/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    if (!saveRes.ok) throw new Error('Failed to save details');

                    // B. Redirect to Stripe
                    submitBtn.innerText = "REDIRECTING TO PAY...";
                    
                    const payRes = await fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            packageName: val,
                            // Pass email to pre-fill in Stripe
                            customerEmail: data.email 
                        })
                    });

                    const session = await payRes.json();
                    if(session.error) throw new Error(session.error);

                    const result = await stripe.redirectToCheckout({ sessionId: session.id });
                    if(result.error) alert(result.error.message);

                } catch (err) {
                    console.error(err);
                    alert("System Error: " + err.message);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "PAY & SEND DETAILS";
                }
            }
        }, true); // Capture phase!
    }
}

async function handleDirectPay(e, title, stripe, btn) {
    e.preventDefault();
    const originalText = btn.innerHTML;
    btn.innerHTML = "INITIATING...";
    btn.style.opacity = 0.7;
    btn.disabled = true;

    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageName: title })
        });

        const session = await response.json();

        if (session.error) {
            alert('Server Error (Backend): ' + (session.error.message || session.error));
            console.error(session.error);
            btn.innerHTML = "ERROR";
        } else {
            const result = await stripe.redirectToCheckout({ sessionId: session.id });
            if (result.error) {
                alert(result.error.message);
            }
        }
    } catch (err) {
        console.error("Buy Error:", err);
        alert("Connection failed. Check console.");
    } finally {
        if(btn.innerHTML !== "ERROR") {
            btn.innerHTML = originalText;
            btn.style.opacity = 1;
            btn.disabled = false;
        }
    }
}
