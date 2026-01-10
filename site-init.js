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

window.OTP.trackView = async function(slug) {
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    const client = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
    
    try {
        // 1. Check if it's a Post (Primary)
        // We check existence first because the RPC generally returns void/success even on 0 updates.
        const { count } = await client.from('posts').select('*', { count: 'exact', head: true }).eq('slug', slug);
        
        if (count && count > 0) {
            // It exists in Posts, call the RPC
            const { error } = await client.rpc('increment_view_count', { post_slug: slug });
            if (error) console.warn('[OTP] RPC Error:', error);
        } else {
            // 2. Fallback to Broadcasts Table
            // Fetch current count to increment (Native RPC for broadcasts pending)
            const { data: bData } = await client.from('broadcasts').select('views').eq('slug', slug).single();
            
            if (bData) {
                const currentViews = parseInt(bData.views) || 0;
                await client.from('broadcasts').update({ views: currentViews + 1 }).eq('slug', slug);
            }
        }
    } catch (e) {
        console.warn("[OTP] Analytics Tracking Offline", e);
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
                if (config.theme) window.OTP.setTheme(config.theme);
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

        if (type === 'theme') window.OTP.setTheme(value);
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
            setTimeout(() => { window.location.href = dest; }, 3000);
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

        // Save Function
        window.OTP.saveContent = async function() {
            const btn = document.querySelector('.otp-editor-btn.save');
            btn.textContent = "SAVING...";
            
            const updates = [];
            document.querySelectorAll('[data-editable]').forEach(el => {
                if(el.id) {
                    updates.push({
                        key: el.id,
                        content: el.innerHTML.trim(),
                        updated_by: 'admin'
                    });
                }
            });

            try {
                const { error } = await client.from('site_content').upsert(updates);
                if(error) throw error;
                
                btn.textContent = "SAVED!";
                setTimeout(() => btn.textContent = "SAVE CHANGES", 2000);
                window.OTP.showBroadcast("SITE CONTENT UPDATED");
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

document.addEventListener('DOMContentLoaded', () => {

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
    
    // --- ACTIVE LINK LOGIC & SMOOTH SCROLL ---
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
            if (href.startsWith('#')) {
                const targetId = href.substring(1);
                const targetEl = document.getElementById(targetId);
                
                if (targetEl) {
                    e.preventDefault();
                    
                    // Smooth Scroll
                    const offset = 80; // Nav height offset
                    const elementPosition = targetEl.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // Update Active State
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    // If in mobile drawer, it will be closed by the drawer listener below
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
            navToggle.setAttribute('aria-expanded', (!isOpen).toString());
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

    // 10. BOOTSTRAP REALTIME & DYNAMIC CONTENT
    if (window.OTP && window.OTP.initRealtimeState) {
        window.OTP.initRealtimeState();
    }
    if (window.OTP && window.OTP.initLiveEditor) {
        window.OTP.initLiveEditor();
    }
});
