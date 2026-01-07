/**
 * site-init.js
 * Centralized initialization for Kursor, Year, and Scroll Progress.
 * Ensures consistent behavior and "dope" connectivity across all pages.
 */

(function() {
    // 1. Footer Year
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

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
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const max = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = max > 0 ? (scrolled / max) * 100 : 0;
        document.body.style.setProperty('--scroll', `${scrollPercent}%`);
    }, { passive: true });

    // 4. Force Scroll Top handling (if history restoration is an issue)
    if (history.scrollRestoration) {
        history.scrollRestoration = 'manual';
    }

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

    // 6. Portal Dropdown Logic removed
})();

// 7. Site-Wide Initialization
document.addEventListener('DOMContentLoaded', () => {
    
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
            targetX = Math.min(Math.max(beta / 3, -15), 15) * -1;
            targetY = Math.min(Math.max(gamma / 3, -15), 15);
            bgTargetX = 50 + (gamma / 90 * 50);
            bgTargetY = 50 + (beta / 90 * 50);
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
            const floatY = Math.sin(elapsed * 1.5) * 10;
            currentX = lerp(currentX, targetX, 0.1);
            currentY = lerp(currentY, targetY, 0.1);
            bgCurrentX = lerp(bgCurrentX, bgTargetX, 0.1);
            bgCurrentY = lerp(bgCurrentY, bgTargetY, 0.1);
            currentEyeX = lerp(currentEyeX, targetEyeX, 0.1);
            currentEyeY = lerp(currentEyeY, targetEyeY, 0.1);

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
            pCard.classList.add('has-video'); // Mark card as having video
            pCard.addEventListener('mouseenter', () => {
                const source = video.querySelector('source');
                if (source && source.src && source.src.length > 5) {
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
    if (heroEye && !isMobile) {
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
            const rotateX = deltaY * 30; // Max 15 deg tilt
            const rotateY = deltaX * 30; // Max 15 deg tilt
            
            // Note: Keep the 15s animation spinning but inject additional rotation
            // We'll use a wrapper or just set custom property for smoother blend
            heroEye.style.transform = `rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        window.addEventListener('mouseleave', () => {
            heroEye.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
    }

});
