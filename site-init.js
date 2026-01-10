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

    // 1.5 Lenis Smooth Scroll REMOVED for native feel.


    // 2. Kursor.js Initialization
    // Check if we are on desktop. Kursor typically hinders mobile touch.
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    
    // STRICT CHECK: Only init Kursor if NOT mobile.
    if (typeof kursor !== 'undefined' && !isMobile) {
        new kursor({
            type: 1, // Ring
            color: '#00c3ff', // Cyan
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

    // 3. Scroll Progress Logic (Moved from inline)
    // 3. Scroll Progress Logic (Moved from inline)
    window.addEventListener('scroll', () => {
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
    }, { passive: true });

    // 4. Force Scroll To Top on Refresh (Fix for Mobile jumping to Services)
    if (history.scrollRestoration) {
        history.scrollRestoration = 'manual'; // Keep manual to avoid browser fighting
    }
    window.scrollTo(0, 0); // Explicitly warp to top
    setTimeout(() => window.scrollTo(0, 0), 10); // Double-tap for race conditions

    // 5. Black Hole Effect for "Enter Archive"
    const warpBtn = document.querySelector('.cool-work-link');
    if (warpBtn && typeof window.setAttractor === 'function') {
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
    }

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

window.OTP.setTheme = function(theme) {
    const html = document.documentElement;
    if (theme === 'light') {
        html.setAttribute('data-theme', 'light');
    } else {
        html.removeAttribute('data-theme');
    }
    // Only save if it's an explicit user action? 
    // Usually standard practice is to save any state the user is currently "in" if they toggle.
    // But for auto-switch, we don't save to LS so it can auto-switch next time.
    // We'll handle LS saving in the toggle event listener, not here.
};

window.OTP.initTheme = function() {
    const savedTheme = localStorage.getItem('theme');
    let targetTheme;

    if (savedTheme) {
        // User Override
        targetTheme = savedTheme;
        console.log(`[OTP] Theme initialized: ${targetTheme} (User Override)`);
    } else {
        // Chrono-Logic (Local Time)
        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour < 18; // 6:00 AM to 5:59 PM
        targetTheme = isDaytime ? 'light' : 'dark';
        console.log(`[OTP] Theme initialized: ${targetTheme} (Auto-Chrono: ${hour}:00)`);
    }
    
    window.OTP.setTheme(targetTheme);
    return targetTheme;
};

// Run init immediately
window.OTP.initTheme();

// 8. REALTIME SITE STATE (Sync Dashboard Controls)
window.OTP.initRealtimeState = function() {
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    const client = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
    
    // Listen for Site Commands (Broadcast/Maintenance/Theme)
    const channel = client.channel('site_state');
    
    channel.on('broadcast', { event: 'command' }, (message) => {
        console.log("📡 INCOMING COMMAND:", message);
        const { type, value } = message.payload || {};
        
        if (type === 'maintenance') {
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

        if (type === 'theme') window.OTP.setTheme(value);
        if (type === 'refresh') location.reload();
        if (type === 'alert') window.OTP.showBroadcast(value);
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

// 8.1 CUSTOM BROADCAST UI
window.OTP.showBroadcast = function(message) {
    // Remove existing if any
    const old = document.querySelector('.otp-broadcast-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = 'otp-broadcast-toast';
    toast.innerHTML = `
        <button class="otp-broadcast-close" onclick="this.parentElement.classList.remove('show'); setTimeout(()=>this.parentElement.remove(), 600)">&times;</button>
        <div class="otp-broadcast-header">
            <div class="otp-broadcast-dot"></div>
            <span>Transmission Received</span>
        </div>
        <div class="otp-broadcast-body">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 600);
        }
    }, 8000);
};

// Init Realtime (Non-blocking)
setTimeout(window.OTP.initRealtimeState, 1000);

// --- VIEW TRACKING LOGIC ---
window.OTP.trackView = async function(slug) {
    if (!slug) return;
    
    // 1. Check LocalStorage (Session Deduping)
    const storageKey = `otp_view_${slug}`;
    const lastView = localStorage.getItem(storageKey);
    const now = Date.now();
    const isDebug = window.location.search.includes('debug=true');
    
    // Only count if never viewed or viewed > 30 minutes ago (Session-ish)
    if (!isDebug && lastView && (now - parseInt(lastView)) < 30 * 60 * 1000) {
        console.log(`[OTP] View deduped for: ${slug}`);
        return;
    }

    // 2. Call Supabase RPC
    if (window.supabase) {
        const CONFIG = window.OTP_CONFIG || {}; // Ensure config is available
        const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        
        try {
            console.log(`[OTP] Incrementing view for: ${slug}`);
            const { error } = await client.rpc('increment_view_count', { post_slug: slug });
            
            if (error) throw error;
            
            // 3. Mark as viewed
            localStorage.setItem(storageKey, now.toString());
            
        } catch(e) {
            console.warn("[OTP] Analytics Error:", e);
        }
    } else {
        console.warn("[OTP] Analytics Skipped: Supabase not loaded.");
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // --- THEME TOGGLE UI ---
    (function injectThemeToggle() {
        if (window.OTP_THEME_TOGGLE_INJECTED) return;
        // Don't inject on Admin/Dashboard (they handle it manually)
        if (window.location.pathname.includes('otp-terminal.html') || window.location.pathname.includes('portal-gate.html')) return;
        
        window.OTP_THEME_TOGGLE_INJECTED = true;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const currentTheme = isLight ? 'light' : 'dark';
        
        // Helper: Update all toggle buttons on page
        const updateAllToggles = (theme) => {
            const icon = window.OTP.getThemeIcon(theme);
            document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
                // Determine if it's the mobile one (has text) or desktop (icon only) based on class
                const isMobileBtn = btn.classList.contains('mobile-theme-toggle');
                
                // Animate
                btn.style.transform = 'scale(0.8) rotate(90deg)';
                setTimeout(() => {
                    if (isMobileBtn) {
                        btn.innerHTML = icon + '<span style="margin-left:10px; font-weight:600; font-size: 0.9rem;">Switch Theme</span>';
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
            
            window.OTP.setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            updateAllToggles(newTheme);
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
            mobileToggle.style.background = 'rgba(255,255,255,0.05)';
            mobileToggle.innerHTML = window.OTP.getThemeIcon(currentTheme) + '<span style="margin-left:10px; font-weight:600; font-size: 0.9rem;">Switch Theme</span>';
            
            mobileToggle.addEventListener('click', handleToggle);
            navDrawer.appendChild(mobileToggle);
        }
    })();
    
    // --- ACTIVE LINK LOGIC ---
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .nav-drawer a');
    
    // Normalize path (handle root / vs index.html)
    const normalize = (p) => (p === '/' || p.endsWith('index.html')) ? 'index.html' : p;
    const effectivePath = normalize(currentPath);

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Simple exact match logic for static pages
        if (normalize(href) === effectivePath || (effectivePath === 'index.html' && href === 'index.html')) {
             // For anchors on index (e.g. #work), this might clash if we want scroll spy. 
             // But request just wants "subtle active-page indicator".
             // We'll trust the hardcoded HTML .active for index.html anchors for now, 
             // but ensure cross-page navigation sets it correctly.
             // Actually, if we are on archive.html, we want "Archive" active.
             if (!href.startsWith('#')) {
                 navLinks.forEach(l => l.classList.remove('active'));
                 link.classList.add('active');
             }
        }
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
        function update() {
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
            requestAnimationFrame(update);
        }
        update();
    }

    // --- MOBILE MENU ---
    const navToggle = document.querySelector('.nav-toggle');
    const navDrawer = document.querySelector('.nav-drawer');
    const drawerLinks = document.querySelectorAll('.nav-drawer a');
    if (navToggle && navDrawer) {
        navToggle.addEventListener('click', () => {
            const isOpen = navDrawer.classList.contains('open');
            navDrawer.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', !isOpen);
        });
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                navDrawer.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
        window.addEventListener('scroll', () => {
            if (navDrawer.classList.contains('open')) {
                navDrawer.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        }, { passive: true });
    }

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
        window.addEventListener('mousemove', (e) => {
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
                
                let category = 'Custom';
                if (pkgName.includes('Visualizer') || pkgName.includes('Video') || pkgName.includes('Rollout')) category = 'Music Video';
                if (pkgName.includes('Identity') || pkgName.includes('Rebrand')) category = 'Brand Identity';
                if (pkgName.includes('Digital HQ')) category = 'Web & Digital';
                if (pkgName.includes('Drop') || pkgName.includes('Stack')) category = 'Content & Growth';
                if (pkgName.includes('Partner')) category = 'Full Retainer';

                const optionExists = Array.from(serviceSelect.options).some(o => o.value === category);
                serviceSelect.value = optionExists ? category : 'Custom';

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
});
