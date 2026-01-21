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
        // Debounce: Don't inject twice
        if (pkg.querySelector('.pkg-buy-btn')) return;

        const titleEl = pkg.querySelector('h4');
        const selectBtn = pkg.querySelector('.pkg-select-btn');
        if(!titleEl || !selectBtn) return;

        const titleRaw = titleEl.innerText;
        const titleClean = titleRaw.trim(); // Remove whitespace
        
        // --- RESTRICTED: ONLY PAY NOW for $50 & $100 items ---
        const validPayPackages = ['the drop', 'the vision'];
        
        if (!validPayPackages.includes(titleClean.toLowerCase())) {
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

    // --- 2. CONTACT FORM INTEGRATION ---
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
        form.addEventListener('submit', async (e) => {
            const val = serviceSelect.value;
            const validPayPackages = ['The Drop', 'The Vision'];
            
            if (validPayPackages.includes(val)) {
                e.preventDefault();
                e.stopImmediatePropagation(); // STOP site-init.js

                submitBtn.disabled = true;
                submitBtn.innerText = "SECURING SLOT...";
                showToast("Processing Payment...");

                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                try {
                    // API BASE (Relative for automatic local/prod support)
                    const API_BASE = '';

                    // A. Save Lead
                    const saveRes = await fetch(`${API_BASE}/api/contact/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    // B. Redirect to Stripe
                    submitBtn.innerText = "REDIRECTING...";
                    
                    const payRes = await fetch(`${API_BASE}/api/create-checkout-session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            packageName: val,
                            customerEmail: data.email 
                        })
                    });

                    const session = await payRes.json();
                    if(session.error) throw new Error(session.error);

                    const result = await stripe.redirectToCheckout({ sessionId: session.id });
                    if(result.error) {
                        showToast(result.error.message, 'error');
                        alert(result.error.message);
                    }

                } catch (err) {
                    console.error(err);
                    showToast("Error: " + err.message, 'error');
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
    
    showToast(`Securing ${title}...`);
    const API_BASE = '';

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
