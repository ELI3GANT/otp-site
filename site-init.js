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
    
    if (typeof kursor !== 'undefined' && !isMobile) {
        new kursor({
            type: 1, // Ring
            color: '#00c3ff', // Cyan
            removeDefaultCursor: true
        });
    } else if (isMobile) {
        // Ensure kursor elements are hidden if they were somehow injected
        const kursorNodes = document.querySelectorAll('.kursor, .kursor-child, #cursor-canvas');
        kursorNodes.forEach(n => n.style.display = 'none');
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
})();

// Rare Holo Card Physics
document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.glass-manifesto');
    if (!card) return;

    // Desktop: Mouse Tilt
    if (window.matchMedia("(hover: hover)").matches) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; 
            const y = e.clientY - rect.top;  
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -8; 
            const rotateY = ((x - centerX) / centerX) * 8;
            
            const bgX = ((x / rect.width) * 100);
            const bgY = ((y / rect.height) * 100);

            card.style.setProperty('--rotateX', rotateX + 'deg');
            card.style.setProperty('--rotateY', rotateY + 'deg');
            card.style.setProperty('--bgX', bgX + '%');
            card.style.setProperty('--bgY', bgY + '%');
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--rotateX', '0deg');
            card.style.setProperty('--rotateY', '0deg');
        });
    }

    // Mobile: Gyroscope Tilt
    // We bind a one-time click listener to request permission (iOS 13+)
    const enableGyro = async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    document.body.removeEventListener('click', enableGyro); // Cleanup
                    document.body.removeEventListener('touchstart', enableGyro);
                }
            } catch (e) {
                console.log('Gyro permission failed', e);
            }
        } else {
            // Android / Older iOS (No permission needed usually)
            window.addEventListener('deviceorientation', handleOrientation);
            document.body.removeEventListener('click', enableGyro);
            document.body.removeEventListener('touchstart', enableGyro);
        }
    };

    // Attach permission requester to interaction
    document.body.addEventListener('click', enableGyro, { once: true });
    document.body.addEventListener('touchstart', enableGyro, { once: true });

    const handleOrientation = (e) => {
        // Gamma: Left/Right tilt (-90 to 90)
        // Beta: Front/Back tilt (-180 to 180)
        const gamma = e.gamma || 0; 
        const beta = e.beta || 0;

        // Clamp values to avoid flipping
        const tiltX = Math.min(Math.max(beta / 4, -15), 15); // Inverted axis usually depending on holding
        const tiltY = Math.min(Math.max(gamma / 3, -15), 15);

        // Normalize for background position (0% - 100%)
        // Center (0 tilt) = 50%
        const bgX = 50 + (gamma / 90 * 50);
        const bgY = 50 + (beta / 90 * 50);

        requestAnimationFrame(() => {
             card.style.setProperty('--rotateX', (-tiltX) + 'deg'); // Invert beta for natural feel
             card.style.setProperty('--rotateY', tiltY + 'deg');
             card.style.setProperty('--bgX', bgX + '%');
             card.style.setProperty('--bgY', bgY + '%');
        });
    };
});

// Animated Eye Pupil Tracking
document.addEventListener('DOMContentLoaded', () => {
    // Disable eye tracking on mobile to save battery/perf
    if (window.matchMedia("(hover: none)").matches) return;

    const card = document.querySelector('.glass-manifesto');
    if (!card) return;
    
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - (rect.width / 2);
        const y = e.clientY - rect.top - (rect.height / 2);
        
        const moveX = (x / rect.width) * 20; 
        const moveY = (y / rect.height) * 15;

        card.style.setProperty('--eyeX', `${moveX}px`);
        card.style.setProperty('--eyeY', `${moveY}px`);
    });
    
    card.addEventListener('mouseleave', () => {
         card.style.setProperty('--eyeX', '0px');
         card.style.setProperty('--eyeY', '0px');
    });
});
