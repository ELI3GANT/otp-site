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

  const handleMove = (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.
    
    // Calculate rotation (max 10deg)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -8; // Invert axis for natural tilt
    const rotateY = ((x - centerX) / centerX) * 8;
    
    // Calculate sheen position (inverted movement)
    const bgX = ((x / rect.width) * 100);
    const bgY = ((y / rect.height) * 100);

    card.style.setProperty('--rotateX', rotateX + 'deg');
    card.style.setProperty('--rotateY', rotateY + 'deg');
    card.style.setProperty('--bgX', bgX + '%');
    card.style.setProperty('--bgY', bgY + '%');
  };

  const handleLeave = () => {
    // Reset to center but keep a slight 'alive' drift if desired, 
    // or just snap back smoothly.
    card.style.setProperty('--rotateX', '0deg');
    card.style.setProperty('--rotateY', '0deg');
  };

  card.addEventListener('mousemove', handleMove);
  card.addEventListener('mouseleave', handleLeave);
});

// Animated Eye Pupil Tracking
document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.glass-manifesto');
    if (!card) return;
    
    // We already have a mousemove listener on the card from the Tilt logic.
    // However, the previous implementation was an inline overwrite in run_command.
    // Ideally, we should integrate it or add a new listener.
    // The previous listener sets --rotateX/Y. We can add another listener for the eye
    // or assume the CSS will handle it if we set global vars, but scoping to the card is better.

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        // Mouse relative to card center
        const x = e.clientX - rect.left - (rect.width / 2);
        const y = e.clientY - rect.top - (rect.height / 2);
        
        // Limit movement range for the pupil (e.g., +/- 10px)
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
