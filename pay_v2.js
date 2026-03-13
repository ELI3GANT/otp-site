/**
 * OPT PAYMENT SYSTEM V2
 * robustified logic + form integration + Debug Toast
 */

// Debug Toast Utility
function showToast(msg, type = 'info') {
    let toast = document.getElementById('pay-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pay-toast';
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: rgba(10,10,18,0.95); var(--accent2);
            color: #fff; padding: 12px 24px; border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            font-family: 'Space Grotesk', sans-serif;
            z-index: 100000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transform: translateY(100px); transition: transform 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    
    toast.style.borderColor = type === 'error' ? '#ff0055' : 'var(--accent2)';
    toast.innerHTML = type === 'error' ? `⚠️ ${msg}` : `⚡ ${msg}`;
    toast.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
    }, 4000);
}

console.log('💰 Payment System Loading...');

// Force execution if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaymentSystem);
} else {
    initPaymentSystem();
}

// CONFIG: Defined packages eligible for direct payment
const VALID_PAY_PACKAGES = [
    'The Drop', 'The Vision', 'The Visualizer', 'The Official Video',
    'The Rollout', 'The Identity', 'The Digital HQ', 'The Rebrand', 
    'The Stack', 'The Partner'
];

async function initPaymentSystem() {
    console.log('💰 Init Payment System...');
    const STRIPE_PK = 'pk_live_51SqqA9Pux5EhFZOuR0oo7VsFZrKoebiaWLXHNTZPx2kpa3w9kmqgUCtmEN4sY9LPW80UyfjBIfZkIfnPQW0Ba5MC007yWafN6y'; 

    if (typeof Stripe === 'undefined') {
        setTimeout(initPaymentSystem, 500); // Retry if Stripe JS slow
        return;
    }

    let stripe;
    try {
        stripe = Stripe(STRIPE_PK);
        console.log("Stripe Initialized Client Side");
    } catch(e) {
        console.error("Stripe Init Failed", e);
        showToast("Payment System Init Failed: " + e.message, 'error');
        return;
    }

    // --- 1. CARD BUTTONS (Visual check) ---
    const pkgs = document.querySelectorAll('.package-static');
    if (pkgs.length === 0) console.warn("💰 No packages found to inject buttons into.");

    pkgs.forEach(pkg => {
        // Debounce: Don't inject twice — skip if already has a pay button (static or dynamic)
        if (pkg.querySelector('.pkg-buy-btn')) return;

        const titleEl = pkg.querySelector('h4');
        const selectBtn = pkg.querySelector('.pkg-select-btn');
        if(!titleEl || !selectBtn) return;

        const titleClean = titleEl.innerText.trim();
        
        // --- RESTRICTED: ALLOW DIRECT PAY FOR ALL DEFINED FIXED-PRICE PACKAGES ---
        if (!VALID_PAY_PACKAGES.map(p => p.toLowerCase()).includes(titleClean.toLowerCase())) {
             return;
        }
        
        console.log(`✅ Injecting Payment Button for: ${titleClean}`);
        
        // --- DYNAMIC PRICE EXTRACTION ---
        let priceStr = "";
        const priceEl = pkg.querySelector('.pkg-amount');
        if (priceEl) {
            priceStr = ` — $${priceEl.innerText.trim()}`;
        }
        
        // Create Buy Button
        const buyBtn = document.createElement('button');
        buyBtn.className = 'pkg-buy-btn';
        buyBtn.innerHTML = `<span>⚡ PAY NOW${priceStr}</span>`;

        buyBtn.onclick = (e) => handleDirectPay(e, titleClean, stripe, buyBtn);
        
        // Insert
        selectBtn.insertAdjacentElement('afterend', buyBtn);
    });

    console.log(`✅ Injected ${document.querySelectorAll('.pkg-buy-btn').length} Payment Buttons.`);

    // --- 2. CONTACT FORM INTEGRATION ---
    const form = document.getElementById('contactForm');
    const serviceSelect = document.getElementById('service');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (form && serviceSelect && submitBtn) {
        
        // Listen for service changes to update button text
        serviceSelect.addEventListener('change', () => {
            const val = serviceSelect.value;
            const validPayPackages = [
                'The Drop', 'The Vision', 'The Visualizer', 'The Official Video',
                'The Rollout', 'The Identity', 'The Digital HQ', 'The Rebrand', 
                'The Stack', 'The Partner'
            ];

            if (validPayPackages.includes(val)) {
                // Find corresponding price from the grid if possible, otherwise rely on backend sync
                submitBtn.innerHTML = `SECURE YOUR SLOT // PAY NOW <span style="font-size:0.8em; opacity:0.8">(${val})</span>`;
                submitBtn.style.background = 'var(--accent2)';
                submitBtn.style.color = '#000';
                submitBtn.style.boxShadow = '0 0 30px rgba(var(--accent2-rgb), 0.3)';
            } else {
                submitBtn.innerHTML = `REQUEST CUSTOM QUOTE`;
                submitBtn.style.background = 'transparent';
                submitBtn.style.color = '#fff';
                submitBtn.style.boxShadow = 'none';
            }
        });

        // Intercept Submission
        form.addEventListener('submit', async (e) => {
            const val = serviceSelect.value;
            
            if (VALID_PAY_PACKAGES.includes(val)) {
                e.preventDefault();
                e.stopImmediatePropagation(); // STOP site-init.js

                submitBtn.disabled = true;
                submitBtn.innerText = "SECURING SLOT...";
                showToast("Processing Payment...");

                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                try {
                    // SECURE BACKEND BRIDGE
                    let API_BASE = localStorage.getItem('otp_api_base') || window.OTP_CONFIG?.apiBase || 'https://otp-site.vercel.app';
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        API_BASE = window.location.origin;
                    }

                    // A. Save Lead
                    const saveRes = await fetch(`${API_BASE}/api/contact/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    if (!saveRes.ok) {
                        const errData = await saveRes.json();
                        throw new Error(errData.message || "Lead storage failed. Please try again.");
                    }

                    // B. Redirect to Stripe
                    submitBtn.innerText = "REDIRECTING TO SECURE CHECKOUT...";
                    
                    const payRes = await fetch(`${API_BASE}/api/create-checkout-session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            packageName: val,
                            customerEmail: data.email 
                        })
                    });

                    const session = await payRes.json();
                    if (session.error) throw new Error(session.error);

                    const result = await stripe.redirectToCheckout({ sessionId: session.id });
                    if (result.error) {
                        throw new Error(result.error.message);
                    }

                } catch (err) {
                    console.error("Payment Flow Error:", err);
                    showToast(err.message, 'error');
                    
                    submitBtn.disabled = false;
                    // Restore dynamic price-aware text on error
                    serviceSelect.dispatchEvent(new Event('change'));
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
    
    showToast(`Securing ${title}...`);
    // SECURE BACKEND BRIDGE: Point to verified Vercel endpoint
    let API_BASE = localStorage.getItem('otp_api_base') || window.OTP_CONFIG?.apiBase || 'https://otp-site.vercel.app';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        API_BASE = window.location.origin;
    }
    console.log(`🔌 Payment Uplink: ${API_BASE}/api/create-checkout-session`);

    try {
        const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageName: title })
        });

        if (!response.ok) {
            // Handle HTTP errors specifically
             throw new Error(`Server returned ${response.status}`);
        }

        const session = await response.json();

        if (session.error) {
             throw new Error(session.error.message || session.error);
        }

        showToast("Redirecting to Stripe...");
        const result = await stripe.redirectToCheckout({ sessionId: session.id });
        if (result.error) {
             throw new Error(result.error.message);
        }
    } catch (err) {
        console.error("Buy Error:", err);
        showToast("Payment Failed: " + err.message, 'error');
        alert("Payment Failed: " + err.message);
        btn.innerHTML = "ERROR";
    } finally {
        if(btn.innerHTML !== "ERROR") {
            btn.innerHTML = originalText;
            btn.style.opacity = 1;
            btn.disabled = false;
        }
    }
}
