/**
 * site-init.js [SIG:2026-01-10-04-58]
 * Centralized initialization for Kursor, Year, and Scroll Progress.
 */

(function() {
    // 1. Footer Year
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // PREMIUM PRELOADER LOGIC
    window.addEventListener('load', () => {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
            loader.style.pointerEvents = 'none';
        }
    });

    // 1.5 Lenis Smooth Scroll REMOVED for native feel.


    // 2. Kursor.js Initialization
    // Check if we are on desktop. Kursor typically hinders mobile touch.
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    
    // STRICT CHECK: Only init Kursor if NOT mobile.
    if (typeof kursor !== 'undefined' && !isMobile) {
        new kursor({
            type: 1, // Ring
            color: 'var(--accent2)', // Cyan
            removeDefaultCursor: false
        });
    } 
    
    // Mobile Starfield Visiblity Logic
    if (isMobile) {
        // Ensure kursor elements are hidden if they were somehow injected
        const kursorNodes = document.querySelectorAll('.kursor, .kursor-child');
        kursorNodes.forEach(n => n.remove()); // NUCLEAR OPTION: Remove them entirely
        
        // Force Starfield Canvas to be visible
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) {
            canvas.style.display = 'block';
            canvas.style.opacity = '1';
        }
    }

    // 3. Scroll Progress + Nav Shrink (Optimized for 120fps)
    let isScrolling = false;
    const navEl = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const docHeight = Math.max(
                    document.body.scrollHeight, document.documentElement.scrollHeight,
                    document.body.offsetHeight, document.documentElement.offsetHeight,
                    document.body.clientHeight, document.documentElement.clientHeight
                );
                const winHeight = window.innerHeight || document.documentElement.clientHeight;
                const max = docHeight - winHeight;
                const scrollPercent = max > 0 ? (scrollTop / max) * 100 : 0;
                document.body.style.setProperty('--scroll', `${scrollPercent}%`);

                // Nav scroll-shrink
                if (navEl) {
                    if (scrollTop > 20) {
                        navEl.classList.add('scrolled');
                    } else {
                        navEl.classList.remove('scrolled');
                    }
                }

                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });


    // 4. Force Scroll To Top on Refresh (HomePage Only)
    // Prevents mobile jumping on index, but allows reading continuity on blogs.
    const path = window.location.pathname;
    const isHome = path === '/' || path.endsWith('index.html') || path === '';
    
    if (isHome) {
        if (history.scrollRestoration) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 10);
    }

    // 5. Black Hole Effect for "Enter Archive"
    // RACE CONDITION FIX: Retry binding if stars-v2.js hasn't loaded yet.
    const bindBlackHole = (attempts = 0) => {
        const warpBtn = document.querySelector('.cool-work-link');
        
        if (!warpBtn) return; // No button on this page

        if (typeof window.setAttractor === 'function') {
            const getCenter = (el) => {
                const rect = el.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            };

            // Desktop Hover
            warpBtn.addEventListener('mouseenter', () => {
                warpBtn.classList.add('is-black-hole');
                const c = getCenter(warpBtn);
                window.setAttractor(c.x, c.y);
            });

            warpBtn.addEventListener('mouseleave', () => {
                 warpBtn.classList.remove('is-black-hole');
                 window.clearAttractor();
            });

            // Mobile Touch
            warpBtn.addEventListener('touchstart', () => {
                 warpBtn.classList.add('is-black-hole');
                 const c = getCenter(warpBtn);
                 window.setAttractor(c.x, c.y);
            }, { passive: true });

            warpBtn.addEventListener('touchend', () => {
                setTimeout(() => window.clearAttractor(), 600); 
            });
            
            console.log('[OTP] Black Hole Effect Bound Successfully');
        } else {
            if (attempts < 10) {
                setTimeout(() => bindBlackHole(attempts + 1), 200);
            } else {
                console.warn('[OTP] Failed to bind Black Hole: Stars system missing.');
            }
        }
    };
    
    // Start binding process
    bindBlackHole();

    // 6. Portal Dropdown Logic (Removed)

})();

// 7. Site-Wide Initialization

// Global OTP Namespace for Theme Logic & Tests
window.OTP = window.OTP || {};

window.OTP.getThemeIcon = function(theme) {
    if (theme === 'light') {
        // Moon Icon (Switch to Dark)
        return `<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    } else {
        // Sun Icon (Switch to Light)
        return `<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
};

window.OTP.setTheme = function(theme, isManual = false) {
    const html = document.documentElement;
    const rootStyle = html.style;
    
    // Fallback if THEME GUARD didn't run for some reason
    let hues = window.OTP_HUES || [{ dark: '0, 236, 255', light: '0, 170, 204' }];
    let hueIndex = window.OTP_HUE_INDEX !== undefined ? window.OTP_HUE_INDEX : 0;
    let selectedHue = hues[hueIndex];

    if (theme === 'light') {
        html.setAttribute('data-theme', 'light');
        rootStyle.setProperty('--accent2-rgb', selectedHue.light);
        rootStyle.setProperty('--accent2', `rgb(${selectedHue.light})`);
    } else {
        html.removeAttribute('data-theme');
        rootStyle.setProperty('--accent2-rgb', selectedHue.dark);
        rootStyle.setProperty('--accent2', `rgb(${selectedHue.dark})`);
    }
    
    // Save to local storage
    localStorage.setItem('theme', theme);
    if (isManual) {
        localStorage.setItem('theme_manual', 'true');
        localStorage.setItem('theme_manual_time', Date.now().toString());
    }
    
    // Globally update any toggles on the page
    if (typeof window.OTP.updateAllToggles === 'function') {
        window.OTP.updateAllToggles(theme);
    }
};

window.OTP.initTheme = function() {
    const savedTheme = localStorage.getItem('theme');
    const isManual = localStorage.getItem('theme_manual') === 'true';
    const manualTime = parseInt(localStorage.getItem('theme_manual_time') || '0');
    
    // If manual override is older than 12 hours, expire it to allow auto-chrono again
    const isExpired = Date.now() - manualTime > 12 * 60 * 60 * 1000;
    
    let targetTheme;

    // 1. Check for manual user preference that hasn't expired
    if (isManual && !isExpired) {
        targetTheme = savedTheme;
        console.log(`[OTP] Theme: ${targetTheme} (Manual Override Active)`);
    } else {
        // 2. Chrono-Logic (World Time Sync)
        targetTheme = window.OTP.calculateChronoTheme();
        console.log(`[OTP] Theme: ${targetTheme} (World Timing Sync)`);
    }
    
    window.OTP.setTheme(targetTheme);

    // 3. Start Live Sync (Check every 5 minutes)
    setInterval(() => {
        const isManual = localStorage.getItem('theme_manual') === 'true';
        const manualTime = parseInt(localStorage.getItem('theme_manual_time') || '0');
        const isExpired = Date.now() - manualTime > 12 * 60 * 60 * 1000;

        if (!isManual || (isManual && isExpired)) {
            // Clear expired flag if needed
            if (isManual && isExpired) {
                localStorage.removeItem('theme_manual');
                localStorage.removeItem('theme_manual_time');
            }

            const nextTheme = window.OTP.calculateChronoTheme();
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            if (nextTheme !== currentTheme) {
                console.log(`[OTP] World Timing Sync: Auto-Switching to ${nextTheme}`);
                window.OTP.setTheme(nextTheme);
            }
        }
    }, 5 * 60 * 1000);

    return targetTheme;
};

window.OTP.calculateChronoTheme = function() {
    // We use local hours but refer to it as "World Timing" logic. 
    const hour = new Date().getHours();
    // 6 AM to 6 PM is Daytime
    const isDaytime = hour >= 6 && hour < 18; 
    return isDaytime ? 'light' : 'dark';
};

window.OTP.trackView = async function(slug) {
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    
    // SECURE UPDATE: Use Server Backend (Bypasses RLS)
    try {
        let apiBase = window.OTP_CONFIG?.apiBase || '';
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            apiBase = window.location.origin;
        }

        await fetch(`${apiBase}/api/analytics/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug })
        });
    } catch (e) {
        console.warn("[OTP] Analytics Tracking Offline", e);
    }
};

// 7.5 Premium Broadcast UI
// 7.5 Cinematic Transmission Overlay
window.OTP.showBroadcast = function(message) {
    const existing = document.getElementById('otp-broadcast-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'otp-broadcast-overlay';
    overlay.style = `
        position: fixed; inset: 0;
        background: radial-gradient(circle at center, rgba(0,20,40,0.95) 0%, rgba(0,0,0,0.98) 100%);
        backdrop-filter: blur(20px) saturate(1.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 2147483647; color: #fff; text-align: center; 
        font-family: 'Space Grotesk', sans-serif;
        overflow: hidden; pointer-events: auto;
    `;

    overlay.innerHTML = `
        <!-- Scanlines -->
        <div style="position:absolute; inset:0; background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03)); background-size: 100% 4px, 3px 100%; pointer-events:none; z-index:1;"></div>
        
        <div class="bc-container" style="position:relative; z-index:2; padding: 60px; max-width: 900px; width: 90%;">
            <!-- Close Button -->
            <button onclick="this.closest('#otp-broadcast-overlay').remove()" style="position:fixed; top:40px; right:40px; background:transparent; border:1px solid rgba(255,255,255,0.2); color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.2rem; display:flex; align-items:center; justify-content:center; transition:0.3s; z-index:10;">×</button>

            <div class="bc-eyebrow" style="font-size: 0.7rem; letter-spacing: 0.5em; color: var(--accent2); margin-bottom: 30px; font-weight: 700; opacity: 0; transform: translateY(20px);">
                <span style="display:inline-block; padding: 4px 12px; border: 1px solid var(--accent2); border-radius: 4px; background: rgba(0,195,255,0.05);">SYSTEM UPLINK ACTIVE</span>
            </div>
            
            <h2 class="bc-title" style="font-size: clamp(1.8rem, 7vw, 4rem); font-weight: 900; line-height: 1.1; margin-bottom: 40px; text-transform: uppercase; font-family: 'Syne', sans-serif; opacity: 0; filter: blur(10px); color: #fff; text-shadow: 0 0 30px rgba(255,255,255,0.2);">
                ${message}
            </h2>
            
            <div class="bc-timer-bar" style="width: 100%; height: 2px; background: rgba(255,255,255,0.05); position:relative; overflow:hidden; border-radius: 2px; opacity: 0;">
                <div class="bc-timer-fill" style="position:absolute; top:0; left:0; height:100%; width:100%; background: var(--accent2); transform-origin: left; box-shadow: 0 0 15px var(--accent2);"></div>
            </div>
            
            <div class="bc-footer" style="margin-top: 30px; font-size: 0.6rem; color: #666; letter-spacing: 3px; font-weight: 600; opacity: 0;">
                SECURE STREAM ESTABLISHED // AUTH_ID: ${Math.random().toString(36).substr(2, 6).toUpperCase()}
            </div>
        </div>

        <style>
            @keyframes bc-glitch {
                0% { transform: translate(0); }
                20% { transform: translate(-2px, 2px); }
                40% { transform: translate(-2px, -2px); }
                60% { transform: translate(2px, 2px); }
                80% { transform: translate(2px, -2px); }
                100% { transform: translate(0); }
            }
            .bc-glitch-active { animation: bc-glitch 0.2s infinite; }
        </style>
    `;

    document.body.appendChild(overlay);

    // GSAP ANIMATION SEQUENCE
    if (typeof gsap !== 'undefined') {
        const tl = gsap.timeline();
        
        // Initial Blur & Pop
        tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power4.out" });
        
        // Content Stagger
        tl.to('.bc-eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }, "-=0.2");
        
        tl.to('.bc-title', { 
            opacity: 1, 
            filter: 'blur(0px)', 
            duration: 0.8, 
            ease: "expo.out",
            onStart: () => overlay.querySelector('.bc-title').classList.add('bc-glitch-active'),
            onComplete: () => setTimeout(() => overlay.querySelector('.bc-title').classList.remove('bc-glitch-active'), 500)
        }, "-=0.4");

        tl.to('.bc-timer-bar', { opacity: 1, duration: 0.4 }, "-=0.4");
        tl.to('.bc-footer', { opacity: 1, duration: 0.4 }, "-=0.2");

        // Timer Fill Animation (5 seconds)
        gsap.fromTo('.bc-timer-fill', 
            { scaleX: 1 }, 
            { scaleX: 0, duration: 6, ease: "none" }
        );

        // Auto Logout / Dismiss
        tl.to(overlay, { 
            opacity: 0, 
            scale: 1.1, 
            filter: 'blur(20px)',
            duration: 1, 
            delay: 5, 
            ease: "power4.in",
            onComplete: () => overlay.remove() 
        });

    } else {
        // Fallback for no GSAP
        setTimeout(() => {
            overlay.style.transition = 'opacity 1s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 1000);
        }, 6000);
    }
};

// Run init immediately
window.OTP.initTheme();

// 8. REALTIME SITE STATE (Sync Dashboard Controls)
window.OTP.initRealtimeState = function() {
    // SAFETY: Never sync on Admin/Portal (they handle their own state)
    if (window.location.pathname.includes('otp-terminal') || 
        window.location.pathname.includes('portal')) return;

    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    const client = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
    
    // 8.1 Fetch Remote State on Load (Sticky Config)
    (async function() {
        // SAFETY: Ignore on Admin/Portal pages
        if (window.location.pathname.includes('otp-terminal') || 
            window.location.pathname.includes('portal') ||
            window.location.pathname.includes('404')) return;

        try {
            const { data, error } = await client
                .from('posts')
                .select('content')
                .eq('slug', 'system-global-state')
                .single();
            
            if (data && data.content) {
                const config = JSON.parse(data.content);
                console.log("📡 REMOTE STATE SYNC:", config);
                
                // Apply Maintenance
                if (config.maintenance === 'on') {
                    document.body.innerHTML = `
                        <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; font-family: 'Space Grotesk', sans-serif; text-align: center; padding: 20px;">
                            <h1 style="font-size: 3rem; margin-bottom: 10px;">SYSTEM MAINTENANCE</h1>
                            <p style="opacity: 0.5; letter-spacing: 2px;">WE ARE CURRENTLY CALIBRATING THE FEED. STANDBY.</p>
                            <div style="margin-top: 30px; width: 40px; height: 1px; background: #333;"></div>
                        </div>
                    `;
                    return; // Stop further init
                }

                // Apply Visuals
                if (config.visuals) {
                    document.documentElement.setAttribute('data-fx-intensity', config.visuals);
                    window.FX_INTENSITY = config.visuals;
                    const canvas = document.getElementById('cursor-canvas');
                    if(canvas) canvas.style.display = config.visuals === 'high' ? 'block' : 'none';
                }
                
                 // Apply Kursor
                if (config.kursor) {
                    const kNodes = document.querySelectorAll('.kursor, .kursor-child');
                    kNodes.forEach(n => n.style.opacity = config.kursor === 'on' ? '1' : '0');
                }
                
                // Apply Theme
                if (config.theme) {
                    const hasOverride = localStorage.getItem('theme');
                    if (!hasOverride) {
                        window.OTP.setTheme(config.theme);
                    }
                    localStorage.setItem('last_global_theme', config.theme);
                }
            }
        } catch(e) { console.error("Config Sync Error:", e); }
    })();

    // Listen for Site Commands (Broadcast/Maintenance/Theme)
    const channel = client.channel('site_state');
    
    channel.on('broadcast', { event: 'command' }, (message) => {
        console.log("📡 INCOMING COMMAND:", message);
        const { type, value } = message.payload || {};
        
        if (type === 'maintenance') {
            // SAFETY: Ignore on Admin/Portal
            if (window.location.pathname.includes('otp-terminal') || 
                window.location.pathname.includes('portal')) return;

            if (value === 'on') {
                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; font-family: 'Space Grotesk', sans-serif; text-align: center; padding: 20px;">
                        <h1 style="font-size: 3rem; margin-bottom: 10px;">SYSTEM MAINTENANCE</h1>
                        <p style="opacity: 0.5; letter-spacing: 2px;">WE ARE CURRENTLY CALIBRATING THE FEED. STANDBY.</p>
                        <div style="margin-top: 30px; width: 40px; height: 1px; background: #333;"></div>
                    </div>
                `;
            } else { location.reload(); }
        }

        if (type === 'theme') {
            window.OTP.setTheme(value, true);
            localStorage.setItem('theme', value); // Force overwrite user pref
            localStorage.setItem('last_global_theme', value);
            
            // Sync Toggle Icons
            if (typeof window.OTP.updateAllToggles === 'function') {
                window.OTP.updateAllToggles(value);
            }

            // Visual transition
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('body', { opacity: 0.5 }, { opacity: 1, duration: 0.6, ease: "power2.out" });
            }
        }
        if (type === 'refresh') location.reload();
        if (type === 'alert') window.OTP.showBroadcast(value);
        
        if (type === 'visuals') {
            document.documentElement.setAttribute('data-fx-intensity', value);
            window.FX_INTENSITY = value === 'high' ? 'high' : 'low';
            const canvas = document.getElementById('cursor-canvas');
            if(canvas) canvas.style.display = value === 'high' ? 'block' : 'none';
        }

        if (type === 'kursor') {
            const kNodes = document.querySelectorAll('.kursor, .kursor-child');
            kNodes.forEach(n => n.style.opacity = value === 'on' ? '1' : '0');
        }

        if (type === 'warp') {
            // SAFETY: Ignore on Admin/Portal
            if (window.location.pathname.includes('otp-terminal') || 
                window.location.pathname.includes('portal') ||
                window.location.pathname.includes('404')) return;

            // Ensure absolute URL
            let dest = value;
            if (!dest.startsWith('http')) dest = 'https://' + dest;

            window.OTP.showBroadcast(`NETWORK WARP INITIATED: REDIRECTING TO ${dest}`);
            setTimeout(() => { window.location.href = dest; }, 5000);
        }
    }).subscribe((status) => {
        console.log("📡 SITE COMMAND CHANNEL:", status);
    });

    // Init Presence
    const room = client.channel('system', {
        config: { presence: { key: 'user-' + Math.random().toString(36).substring(7) } }
    });
    room.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await room.track({ online_at: new Date().toISOString(), page: window.location.pathname });
        }
    });
};

// 9. LIVE SITE EDITOR (Admin Only)
window.OTP.initLiveEditor = async function() {
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    
    const client = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
    const params = new URLSearchParams(window.location.search);
    const isEditMode = params.get('mode') === 'edit';
    const token = localStorage.getItem('otp_admin_token');

    // 9.1 Fetch & Apply Content (Always run)
    try {
        const { data: contentRows, error } = await client.from('site_content').select('*');
        if (!error && contentRows) {
            contentRows.forEach(row => {
                const el = document.getElementById(row.key);
                if (el) el.innerHTML = row.content;
            });
            console.log(`[OTP] Loaded ${contentRows.length} dynamic content blocks.`);
        }
    } catch (e) {
        console.warn("[OTP] Content Load Error:", e);
    }

    // 9.2 Init Editor UI (Only if authorized & mode=edit)
    if (isEditMode && token) {
        console.log("📝 LIVE EDITOR ACTIVE");
        document.body.classList.add('otp-edit-mode');

        // Inject Styles
        const style = document.createElement('style');
        style.innerHTML = `
            .otp-edit-mode [data-editable] {
                outline: 2px dashed rgba(0, 255, 170, 0.3);
                cursor: text;
                transition: outline 0.2s;
            }
            .otp-edit-mode [data-editable]:hover,
            .otp-edit-mode [data-editable]:focus {
                outline: 2px solid #00ffaa;
                background: rgba(0, 255, 170, 0.05);
            }
            .otp-editor-toolbar {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: #111;
                border: 1px solid #333;
                padding: 10px 20px;
                border-radius: 50px;
                display: flex;
                gap: 15px;
                z-index: 99999;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                align-items: center;
            }
            .otp-editor-btn {
                background: transparent;
                color: #fff;
                border: 1px solid #444;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 0.8rem;
                cursor: pointer;
                transition: 0.2s;
            }
            .otp-editor-btn.save { background: #00ffaa; color: #000; border: none; font-weight: bold; }
            .otp-editor-btn:hover { transform: translateY(-2px); }
        `;
        document.head.appendChild(style);

        // Make Editable
        const editables = document.querySelectorAll('[data-editable]');
        editables.forEach(el => {
            el.contentEditable = "true";
        });

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'otp-editor-toolbar';
        toolbar.innerHTML = `
            <span style="color:#666; font-size:0.75rem; font-family:monospace;">LIVE EDITOR</span>
            <button class="otp-editor-btn save" onclick="window.OTP.saveContent()">SAVE CHANGES</button>
            <button class="otp-editor-btn" onclick="window.location.search=''">EXIT</button>
        `;
        document.body.appendChild(toolbar);

        // Save Function (SECURE PROXY)
        window.OTP.saveContent = async function() {
            const btn = document.querySelector('.otp-editor-btn.save');
            btn.textContent = "SAVING...";
            
            const updates = [];
            document.querySelectorAll('[data-editable]').forEach(el => {
                if(el.id) {
                    updates.push({
                        key: el.id,
                        content: el.innerHTML.trim()
                    });
                }
            });

            const token = localStorage.getItem('otp_admin_token');
            if (!token) {
                alert("Session Expired. Please login via Terminal.");
                return;
            }

            try {
                // Use Secure Backend Proxy (Respecting local override)
                let apiBase = localStorage.getItem('otp_api_base') || window.OTP_CONFIG?.apiBase || '';
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    apiBase = window.location.origin;
                }
                const res = await fetch(`${apiBase}/api/content/update`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ updates })
                });

                const result = await res.json();
                if(!result.success) throw new Error(result.message);
                
                btn.textContent = "SAVED!";
                setTimeout(() => btn.textContent = "SAVE CHANGES", 2000);
                
                // 1. Local Feedback
                window.OTP.showBroadcast("SITE CONTENT UPDATED");

                // 2. Network Broadcast (Vice-Versa Sync)
                // We still use the client channel for realtime NOTIFICATION, just not storage
                const channel = client.channel('site_state');
                channel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        channel.send({
                            type: 'broadcast',
                            event: 'command',
                            payload: { type: 'alert', value: 'Global Site Content Updated' }
                        });
                    }
                });
            } catch(e) {
                console.error(e);
                alert("Save Failed: " + e.message);
                btn.textContent = "RETRY";
            }
        };
    }
};

// Initialize Live Editor
setTimeout(window.OTP.initLiveEditor, 500);

function initSite() {

    (function injectThemeToggle() {
        if (window.OTP_THEME_TOGGLE_INJECTED) return;
        // Don't inject on Admin/Dashboard (they handle it manually)
        if (window.location.pathname.includes('otp-terminal.html') || window.location.pathname.includes('portal-gate.html')) return;
        
        window.OTP_THEME_TOGGLE_INJECTED = true;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const currentTheme = isLight ? 'light' : 'dark';
        
        // Helper: Update all toggle buttons on page
        window.OTP.updateAllToggles = (theme) => {
            const icon = window.OTP.getThemeIcon(theme);
            document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
                // Determine if it's the mobile one (has text) or desktop (icon only) based on class
                const isMobileBtn = btn.classList.contains('mobile-theme-toggle');
                
                // Animate
                btn.style.transform = 'scale(0.8) rotate(90deg)';
                setTimeout(() => {
                    if (isMobileBtn) {
                        btn.innerHTML = icon + '<span style="margin-left:10px; font-weight:600; font-size: 0.9rem;">Switch Theme</span>';
                        btn.style.background = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
                    } else {
                        btn.innerHTML = icon;
                    }
                    btn.style.transform = 'scale(1) rotate(0deg)';
                }, 150);
            });
        };

        // Shared Click Handler
        const handleToggle = () => {
            const wasLight = document.documentElement.getAttribute('data-theme') === 'light';
            const newTheme = wasLight ? 'dark' : 'light';
            
            // Passing true for isManual
            window.OTP.setTheme(newTheme, true);
        };

        // Create Main Toggle (Desktop)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'theme-toggle-btn';
        toggleBtn.ariaLabel = 'Toggle Theme';
        toggleBtn.innerHTML = window.OTP.getThemeIcon(currentTheme);
        toggleBtn.addEventListener('click', handleToggle);

        // Inject Desktop
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.appendChild(toggleBtn);
        } else {
             // Fallback
             const nav = document.querySelector('nav') || document.querySelector('header');
             if (nav && !navLinks) nav.appendChild(toggleBtn);
        }

        // Inject Mobile Drawer Toggle
        const navDrawer = document.querySelector('.nav-drawer');
        if (navDrawer) {
            const mobileToggle = document.createElement('button');
            mobileToggle.className = 'theme-toggle-btn mobile-theme-toggle';
            mobileToggle.ariaLabel = 'Toggle Theme';
            // Inline styles for mobile layout
            mobileToggle.style.marginLeft = '0';
            mobileToggle.style.marginTop = '10px';
            mobileToggle.style.width = '100%';
            mobileToggle.style.borderRadius = '12px';
            mobileToggle.style.justifyContent = 'center';
            mobileToggle.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            mobileToggle.innerHTML = window.OTP.getThemeIcon(currentTheme) + '<span style="margin-left:10px; font-weight:600; font-size: 0.9rem;">Switch Theme</span>';
            
            mobileToggle.addEventListener('click', handleToggle);
            navDrawer.appendChild(mobileToggle);
        }
    })();

    // --- SCROLL SPY (Active Link on Scroll) ---
    const sectionIds = ['work', 'services', 'contact'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(el => el);
    const spyLinks = document.querySelectorAll('.nav-links a, .nav-drawer a');
    
    if (sections.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    spyLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        // Match either '#id' or 'index.html#id'
                        if (href === `#${id}` || href === `index.html#${id}`) {
                            spyLinks.forEach(l => l.classList.remove('active'));
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 }); // Trigger when section is in middle
        
        sections.forEach(s => observer.observe(s));
    }
    
    // --- ACTIVE LINK LOGIC & CLICK SCROLL ---
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .nav-drawer a');
    
    // Normalize path (handle root / vs index.html)
    const normalize = (p) => (p === '/' || p.endsWith('index.html')) ? 'index.html' : p;
    const effectivePath = normalize(currentPath);

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Initial Active State
        if (normalize(href) === effectivePath || (effectivePath === 'index.html' && href === 'index.html')) {
             if (!href.startsWith('#')) {
                 navLinks.forEach(l => l.classList.remove('active'));
                 link.classList.add('active');
             }
        }

        // Click Handler for Smooth Scroll & Active State
        link.addEventListener('click', (e) => {
            const currentPath = window.location.pathname;
            const isHome = currentPath === '/' || currentPath.endsWith('index.html');
            let targetId = null;

            // GLOBAL MOBILE FIX: Always unlock body on any drawer link click
            if (document.body.classList.contains('nav-open')) {
                 document.body.classList.remove('nav-open');
                 const drawer = document.querySelector('.nav-drawer');
                 if (drawer) drawer.classList.remove('open');
                 const btn = document.querySelector('.nav-toggle');
                 if (btn) btn.setAttribute('aria-expanded', 'false');
            }

            if (href.startsWith('#')) {
                targetId = href.substring(1);
            } else if (isHome && href.includes('index.html#')) {
                targetId = href.split('#')[1];
            }

            if (targetId) {
                const targetEl = document.getElementById(targetId);
                
                if (targetEl) {
                    e.preventDefault();
                    
                    // Smooth Scroll
                    const offset = 80; // Nav height offset
                    const elementPosition = targetEl.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;

                    setTimeout(() => {
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }, 10); // Tiny delay to ensure layout unlocks

                    // Update Active State
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            }
        });
    });

    // --- IDENTITY CARD & PHYSICS ---
    const card = document.querySelector('.glass-manifesto');
    if (card) {
        let targetX = 0, targetY = 0;
        let currentX = 0, currentY = 0;
        let targetEyeX = 0, targetEyeY = 0;
        let currentEyeX = 0, currentEyeY = 0;
        let bgTargetX = 50, bgTargetY = 50;
        let bgCurrentX = 50, bgCurrentY = 50;
        
        const isMobileDevice = window.matchMedia("(hover: none)").matches;
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

        if (!isMobileDevice) {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                targetX = ((y - centerY) / centerY) * -12; 
                targetY = ((x - centerX) / centerX) * 12;
                bgTargetX = (x / rect.width) * 100;
                bgTargetY = (y / rect.height) * 100;
                const ex = e.clientX - rect.left - centerX;
                const ey = e.clientY - rect.top - centerY;
                targetEyeX = (ex / rect.width) * 20; 
                targetEyeY = (ey / rect.height) * 15;
            });

            card.addEventListener('mouseleave', () => {
                targetX = 0; targetY = 0;
                bgTargetX = 50; bgTargetY = 50;
                targetEyeX = 0; targetEyeY = 0;
            });
        }

        const handleOrientation = (e) => {
            const gamma = e.gamma || 0; 
            const beta = e.beta || 0;
            // REDUCED SENSITIVITY: Divisors increased for calmer feel
            targetX = Math.min(Math.max(beta / 6, -10), 10) * -1; // Was /3, -15
            targetY = Math.min(Math.max(gamma / 6, -10), 10);     // Was /3
            bgTargetX = 50 + (gamma / 90 * 30); // Reduced range
            bgTargetY = 50 + (beta / 90 * 30);
        };

        const enableGyro = async () => {
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') window.addEventListener('deviceorientation', handleOrientation);
                } catch (e) { console.log('Gyro error', e); }
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        };

        if (isMobileDevice) {
            document.body.addEventListener('touchstart', enableGyro, { once: true });
        }

        let startTime = Date.now();
        let animationFrameId = null;
        let isCardVisible = false;

        function update() {
            if (!isCardVisible) return;

            const elapsed = (Date.now() - startTime) / 1000;
            // CALMER FLOAT: Slower frequency, smaller amplitude
            const floatY = Math.sin(elapsed * 1.0) * 8; 
            // SMOOTHER EASING: 0.1 -> 0.05
            currentX = lerp(currentX, targetX, 0.05);
            currentY = lerp(currentY, targetY, 0.05);
            bgCurrentX = lerp(bgCurrentX, bgTargetX, 0.05);
            bgCurrentY = lerp(bgCurrentY, bgTargetY, 0.05);
            currentEyeX = lerp(currentEyeX, targetEyeX, 0.05);
            currentEyeY = lerp(currentEyeY, targetEyeY, 0.05);

            card.style.setProperty('--rotateX', `${currentX}deg`);
            card.style.setProperty('--rotateY', `${currentY}deg`);
            card.style.setProperty('--bgX', `${bgCurrentX}%`);
            card.style.setProperty('--bgY', `${bgCurrentY}%`);
            card.style.setProperty('--floatY', `${floatY}px`);
            card.style.setProperty('--eyeX', `${currentEyeX}px`);
            card.style.setProperty('--eyeY', `${currentEyeY}px`);
            animationFrameId = requestAnimationFrame(update);
        }

        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isCardVisible = entry.isIntersecting;
                if (isCardVisible) {
                    if (!animationFrameId) {
                        startTime = Date.now(); // Reset sync
                        update();
                    }
                } else {
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            });
        }, { threshold: 0.1 });

        cardObserver.observe(card);
    }

    const handleMenuToggle = (e) => {
        const toggle = e.target.closest('.nav-toggle');
        const link = e.target.closest('.nav-drawer a');
        const drawer = document.querySelector('.nav-drawer');
        const btn = document.querySelector('.nav-toggle');

        // 1. Toggle button clicked
        if (toggle && drawer) {
            e.preventDefault();
            e.stopPropagation();

            // Debounce (prevent double-fire from touch + click)
            if (toggle.dataset.processing) return;
            toggle.dataset.processing = "true";
            setTimeout(() => delete toggle.dataset.processing, 300);

            const isOpen = drawer.classList.contains('open');
            if (isOpen) {
                drawer.classList.remove('open');
                document.body.classList.remove('nav-open');
                btn.setAttribute('aria-expanded', 'false');
            } else {
                drawer.classList.add('open');
                document.body.classList.add('nav-open');
                btn.setAttribute('aria-expanded', 'true');
            }
            return; // Don't fall through to close-outside check
        }

        // 2. Drawer link clicked — close menu
        if (link && drawer && drawer.classList.contains('open')) {
            drawer.classList.remove('open');
            document.body.classList.remove('nav-open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            return;
        }

        // 3. Click outside — close if open
        if (drawer && drawer.classList.contains('open')) {
            const clickedInsideDrawer = drawer.contains(e.target);
            const clickedToggle = btn && btn.contains(e.target);
            if (!clickedInsideDrawer && !clickedToggle) {
                drawer.classList.remove('open');
                document.body.classList.remove('nav-open');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        }
    };

    document.body.addEventListener('click', handleMenuToggle);
    // touchstart only for toggle button — passive to avoid blocking scroll
    document.body.addEventListener('touchstart', (e) => {
        if (e.target.closest('.nav-toggle')) {
            handleMenuToggle(e);
        }
    }, { passive: true });

    // Keyboard: close drawer on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const drawer = document.querySelector('.nav-drawer');
            const btn = document.querySelector('.nav-toggle');
            if (drawer && drawer.classList.contains('open')) {
                drawer.classList.remove('open');
                document.body.classList.remove('nav-open');
                if (btn) btn.setAttribute('aria-expanded', 'false');
                btn?.focus();
            }
        }
    });

    // Fix: Close mobile drawer on desktop resize to prevent stuck overflow:hidden
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && document.body.classList.contains('nav-open')) {
            const drawer = document.querySelector('.nav-drawer');
            const btn = document.querySelector('.nav-toggle');
            if (drawer) drawer.classList.remove('open');
            document.body.classList.remove('nav-open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
    });


    // --- BEFORE/AFTER SLIDER ---
    const slider = document.getElementById('baSlider');
    const afterWrap = document.querySelector('.ba-after-wrap');
    const handle = document.querySelector('.ba-handle');
    const container = document.querySelector('.ba-slider');
    if (slider && afterWrap && handle && container) {
        const updateSlider = () => {
            const val = slider.value;
            afterWrap.style.width = `${val}%`;
            handle.style.left = `${val}%`;
            const afterImg = afterWrap.querySelector('img');
            if (afterImg) { 
                afterImg.style.width = `${container.offsetWidth}px`; 
            }
        };

        // Ensure update runs after images load
        const allImages = container.querySelectorAll('img');
        allImages.forEach(img => {
            if (img.complete) updateSlider();
            else img.onload = updateSlider;
        });

        slider.addEventListener('input', updateSlider);
        window.addEventListener('resize', updateSlider);
        setTimeout(updateSlider, 100);
    }

    // --- ARCHIVE HOVER VIDEOS ---
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(pCard => {
        const video = pCard.querySelector('.video-preview');
        if (video) {
            const source = video.querySelector('source');
            // Only enable video behavior if we actually have a source
            if (source && source.src && source.src.trim() !== '' && !source.src.endsWith(window.location.href)) {
                 pCard.classList.add('has-video'); 
            }

            pCard.addEventListener('mouseenter', () => {
                if (pCard.classList.contains('has-video')) {
                     video.play().catch(() => {});
                }
            });
            pCard.addEventListener('mouseleave', () => video.pause());
        }
    });

    // --- INSIGHT CARD CLICKABILITY ---
    const insightCards = document.querySelectorAll('.insight-card');
    insightCards.forEach(iCard => {
        iCard.style.cursor = 'pointer';
        iCard.addEventListener('click', (e) => {
            const link = iCard.querySelector('a.read-more');
            if (link && e.target !== link) { link.click(); }
        });
    });

    // --- MAGNETIC HERO VISION ---
    const heroEye = document.querySelector('.hero-eye-3d');
    const isMobileHero = window.matchMedia("(max-width: 768px)").matches;
    
    if (heroEye && !isMobileHero) {
        let eyeTicking = false;
        window.addEventListener('mousemove', (e) => {
            if (!eyeTicking) {
                window.requestAnimationFrame(() => {
                    const rect = heroEye.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;
                    
                    // Calculate distance and angle
                    const deltaX = (mouseX - centerX) / window.innerWidth;
                    const deltaY = (mouseY - centerY) / window.innerHeight;
                    
                    // Apply subtle tilt and rotation
                    const rotateX = deltaY * 30; 
                    const rotateY = deltaX * 30; 
                    
                    heroEye.style.transform = `rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
                    eyeTicking = false;
                });
                eyeTicking = true;
            }
        });
        
        window.addEventListener('mouseleave', () => {
            heroEye.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
    }


    // --- LOGO SCROLL TO TOP ---
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', (e) => {
            // Only intercept if we are on the homepage (index.html or root)
            const path = window.location.pathname;
            if (path === '/' || path.endsWith('index.html')) {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Backup for GSAP if loaded
                if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
                    gsap.to(window, { scrollTo: 0, duration: 1, ease: "power2.inOut" });
                }
            }
        });
    }

    // --- PACKAGE FILTERING ---
    const pkgTabs = document.querySelectorAll('.pkg-tab-btn');
    const pkgItems = document.querySelectorAll('.package-static');
    const pkgHeaders = document.querySelectorAll('.pkg-group-header');

    if (pkgTabs.length > 0) {
        pkgTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                pkgTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const category = tab.getAttribute('data-tab');

                pkgItems.forEach(item => {
                    item.classList.remove('hidden');
                    if (category === 'all') return;

                    const cat1 = item.getAttribute('data-category');
                    const cat2 = item.getAttribute('data-category-2');
                    const cat3 = item.getAttribute('data-category-3');

                    if (cat1 !== category && cat2 !== category && cat3 !== category) {
                        item.classList.add('hidden');
                    }
                });

                pkgHeaders.forEach(header => {
                    header.classList.remove('hidden');
                    if (category !== 'all' && header.getAttribute('data-category') !== category) {
                        header.classList.add('hidden');
                    }
                });
            });
        });
    }

    // --- PACKAGE SELECTION (CONTACT PRE-FILL) ---
    const pkgButtons = document.querySelectorAll('.pkg-select-btn');
    const contactSection = document.getElementById('contact');
    const serviceSelect = document.getElementById('service');
    const messageInput = document.getElementById('message');

    if (pkgButtons.length > 0 && contactSection && serviceSelect && messageInput) {
        pkgButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pkgName = btn.getAttribute('data-package');
                
                // Direct Mapping (Options now match Package Names)
                const targetValue = pkgName; 
                
                // Fallback check
                const optionExists = Array.from(serviceSelect.options).some(o => o.value === targetValue);
                serviceSelect.value = optionExists ? targetValue : 'Custom Build';

                messageInput.value = `I'm interested in the "${pkgName}" package. \n\nHere are some details about my project:`;

                if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
                    gsap.registerPlugin(ScrollToPlugin);
                    gsap.to(window, {
                        duration: 1,
                        scrollTo: { y: contactSection, offsetY: 80, autoKill: false },
                        ease: "power2.inOut"
                    });
                } else {
                    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // --- CONTACT FORM SUBMISSION (AI AGENT) ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = "SENDING...";
            btn.disabled = true;

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            let apiBase = window.OTP_CONFIG?.apiBase || '';
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                apiBase = window.location.origin;
            }
            try {
                const res = await fetch(`${apiBase}/api/contact/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await res.json();
                
                if (result.success) {
                    // Hide Form, Show Success
                    contactForm.style.display = 'none';
                    const successDiv = document.getElementById('successState');
                    if (successDiv) {
                        successDiv.style.display = 'block';
                        // Animate if GSAP available
                        if (typeof gsap !== 'undefined') {
                            gsap.to(successDiv.querySelector('.success-icon'), { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" });
                            gsap.to(successDiv.querySelector('h3'), { opacity: 1, y: 0, delay: 0.2, duration: 0.5 });
                            gsap.to(successDiv.querySelector('p'), { opacity: 1, y: 0, delay: 0.3, duration: 0.5 });
                        } else {
                            // Fallback simple fade
                            successDiv.style.opacity = 1; 
                        }
                    }
                } else {
                    throw new Error(result.message);
                }

            } catch (err) {
                console.error(err);
                btn.innerText = "ERROR - TRY AGAIN";
                btn.disabled = false;
                setTimeout(() => btn.innerText = originalText, 3000);
                
                const statusDiv = document.getElementById('formStatus');
                if (statusDiv) statusDiv.textContent = "Error: " + err.message;
            }
        });
    }

    // 10. BOOTSTRAP REALTIME & DYNAMIC CONTENT
    if (window.OTP && window.OTP.initRealtimeState) {
        window.OTP.initRealtimeState();
    }
    if (window.OTP && window.OTP.initLiveEditor) {
        window.OTP.initLiveEditor();
    }
    
    // 11. INIT SITE STATUS (PROACTIVE ALERTS)
    (async function initSiteStatus() {
        const statusEl = document.getElementById('siteStatus');
        if (!statusEl || typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
        
        const client = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
        
        try {
            const { data } = await client.from('posts').select('content').eq('slug', 'system-global-state').single();
            if (data && data.content) {
                const config = JSON.parse(data.content);
                if (config.status) {
                    const textEl = statusEl.querySelector('.status-text');
                    if (textEl) textEl.textContent = `SYSTEM: ${config.status.toUpperCase()}`;
                }
            }
        } catch(e) {}

        // Listen for Realtime Updates
        const channel = client.channel('site_status_sync');
        channel.on('broadcast', { event: 'command' }, (msg) => {
            if (msg.payload && msg.payload.type === 'status') {
                const textEl = statusEl.querySelector('.status-text');
                if (textEl) textEl.textContent = `SYSTEM: ${msg.payload.value.toUpperCase()}`;
                
                // Visual Flash for New Update
                gsap.fromTo(statusEl, { opacity: 0.3 }, { opacity: 1, duration: 0.5, repeat: 3, yoyo: true });
            }
        }).subscribe();
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSite);
} else {
    initSite();
}// ==========================================
// 10. MAGNETIC BUTTON EFFECT (High-End Interaction)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    
    magneticBtns.forEach(btn => {
        // Create an inner wrapper for the text if it doesn't exist, to move it slightly more for parallax
        // Actually, we can just move the whole button
        
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            // Calculate distance form center
            const h = rect.width / 2;
            const v = rect.height / 2;
            
            const x = e.clientX - rect.left - h;
            const y = e.clientY - rect.top - v;
            
            // Move button 30% of the distance to the mouse
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.4,
                ease: "power3.out"
            });
        });
        
        btn.addEventListener('mouseleave', () => {
            // Snap back to center
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.7,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });
});

// ==========================================
// 11. 3D CARD TILT EFFECT (Holographic Glare)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Only apply on non-touch devices for performance
    if (window.matchMedia("(hover: none)").matches) return;

    const cards = document.querySelectorAll('.package-static:not(.pkg-icon-bubble)');
    
    cards.forEach(card => {
        // Ensure card can position the glare
        if (getComputedStyle(card).position === 'static') {
            card.style.position = 'relative';
        }

        // Create Glare Element
        const glare = document.createElement('div');
        glare.className = 'card-glare';
        glare.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%);
            opacity: 0;
            mix-blend-mode: overlay; /* Very high-end feel */
            z-index: 10;
            transition: opacity 0.3s;
        `;
        card.appendChild(glare);

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Subtle rotation (max 6 degrees to feel realistic)
            const rotateX = ((y - centerY) / centerY) * -6; 
            const rotateY = ((x - centerX) / centerX) * 6;
            
            // Glare center tracking
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;
            
            if (typeof gsap !== 'undefined') {
                gsap.to(card, {
                    rotationX: rotateX,
                    rotationY: rotateY,
                    transformPerspective: 1200,
                    ease: "power2.out",
                    duration: 0.4
                });
            } else {
                card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            }

            glare.style.opacity = '1';
            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;
        });
        
        card.addEventListener('mouseleave', () => {
             if (typeof gsap !== 'undefined') {
                 gsap.to(card, {
                     rotationX: 0,
                     rotationY: 0,
                     ease: "power2.out",
                     duration: 0.7
                 });
             } else {
                 card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg)`;
             }
             glare.style.opacity = '0';
        });
    });
});

// ==========================================
// 12. UNIVERSAL NEON CONTROLLER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    class NeonController {
        constructor(elementId) {
            this.el = document.getElementById(elementId);
            if (!this.el) return;
            
            // Wait for GSAP intro animation to finish before applying neon effects
            setTimeout(() => {
                this.flashDuration = 80; // Fast electrical flicker
                this.interval = 5000; // Baseline wait time between flickers
                
                this.isActive = localStorage.getItem('otp_neon') !== 'false';
                
                if (this.el.tagName === 'SPAN' || this.el.classList.contains('title')) {
                    this.el.style.cursor = 'pointer';
                    this.el.addEventListener('click', () => this.toggle());
                    this.el.title = "Toggle Neon Uplink";
                }

                // Apply to individual characters generated by SplitType
                const chars = this.el.querySelectorAll('.char');
                chars.forEach(c => c.style.transition = 'text-shadow 0.05s ease, color 0.05s ease, opacity 0.05s ease');

                if (this.isActive) this.start();
                else this.setStaticOff();
            }, 2200); 
        }
        
        toggle() {
            this.isActive = !this.isActive;
            localStorage.setItem('otp_neon', this.isActive);
            if (this.isActive) {
                // Flash once instantly to confirm turn on
                this.setStaticOff();
                setTimeout(() => this.start(), 150);
            }
            else this.stop();
        }
        
        start() {
            this.setStaticOff(); // Default to OFF (hollow text)
            // Randomize first flicker start
            this.timer = setTimeout(() => this.runSequence(), Math.random() * 2000 + 1000);
        }
        
        stop() {
            if (this.timer) clearTimeout(this.timer);
            this.setStaticOff();
        }
        
        setStaticOn() {
            this.el.classList.add('neon-active');
        }
        
        setStaticOff() {
            this.el.classList.remove('neon-active');
        }
        
        async runSequence() {
            if (!this.isActive) return;
            
            // Hardware Glitch Pattern (Flashes ON, then goes OFF)
            this.setStaticOn();
            await this.wait(this.flashDuration);
            this.setStaticOff();
            await this.wait(this.flashDuration * 0.5);
            this.setStaticOn();
            await this.wait(this.flashDuration * 2);
            this.setStaticOff();
            await this.wait(this.flashDuration * 0.5);
            this.setStaticOn();
            await this.wait(this.flashDuration);
            this.setStaticOff(); // <--- LEAVE IT OFF
            
            // Queue next sequence with random delay
            const nextInterval = this.interval + (Math.random() * 4000);
            this.timer = setTimeout(() => this.runSequence(), nextInterval);
        }
        
        wait(ms) {
            return new Promise(r => setTimeout(r, ms));
        }
    }
    
    new NeonController('perspective-neon');
    new NeonController('nav-logo-neon');
    new NeonController('footer-logo-neon');
});
