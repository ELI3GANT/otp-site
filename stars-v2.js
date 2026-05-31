/**
 * stars-v2.js
 * Lightweight OTP atmosphere. Day/night controls intensity; refresh accent controls color.
 */
(function () {
    const canvas = document.getElementById('cursor-canvas');
    const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

    if (!canvas || !ctx) {
        document.documentElement.setAttribute('data-stars', 'fallback');
        window.updateMouse = () => {};
        window.setAttractor = () => {};
        window.clearAttractor = () => {};
        window.resetStars = () => {};
        return;
    }

    canvas.setAttribute('aria-hidden', 'true');
    canvas.classList.add('stars-mounted');
    document.documentElement.setAttribute('data-stars', 'mounted');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let lastFrame = 0;
    let performanceMode = false;
    let probeStart = 0;
    let probeAbsoluteStart = 0;
    let probeFrames = 0;
    let probeComplete = false;
    let performanceProbeEnabled = false;
    let lowFpsStreak = 0;
    const PROBE_WINDOW_MS = 2000;
    const PROBE_DELAY_MS = 1200;
    const FPS_TRIGGER = 45;
    const LOW_FPS_SAMPLES_REQUIRED = 1;
    let resizeQueued = false;
    let drawFramePending = false;
    const STARFIELD_BOOT_DELAY_MS = window.innerWidth < 700 ? 1500 : 900;
    const mouse = { x: -9999, y: -9999, active: false, attractor: false };
    const sky = { drift: 0, shooting: [] };

    function isLightMode() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }

    function activeRgb() {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent2-rgb').trim();
        const parts = raw.split(',').map((part) => Number(part.trim()));
        if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return [0, 236, 255];
        return parts.slice(0, 3);
    }

    function rgba(rgb, alpha) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    function starCount() {
        if (prefersReducedMotion.matches) return 0;
        const area = Math.max(1, window.innerWidth * window.innerHeight);
        const base = Math.round(area / (isLightMode() ? 14000 : 6500));
        const mobile = window.innerWidth < 700;
        if (performanceMode) {
            const reduced = Math.round(base * 0.72);
            if (isLightMode()) return Math.min(mobile ? 36 : 64, Math.max(24, reduced));
            return Math.min(mobile ? 58 : 112, Math.max(36, reduced));
        }
        if (isLightMode()) return Math.min(mobile ? 48 : 90, Math.max(28, base));
        return Math.min(mobile ? 86 : 176, Math.max(52, base));
    }

    function makeStar(layer) {
        const depth = layer === 0 ? 0.35 : layer === 1 ? 0.68 : 1;
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            r: (Math.random() * 1.22 + 0.52) * depth,
            depth,
            alpha: Math.random() * 0.52 + 0.34,
            twinkle: Math.random() * Math.PI * 2,
            speed: (0.003 + Math.random() * 0.014) * depth,
            accent: Math.random() > 0.54
        };
    }

    function rebuildStars() {
        const total = starCount();
        stars = Array.from({ length: total }, (_, index) => {
            const layer = index < total * 0.45 ? 0 : index < total * 0.82 ? 1 : 2;
            return makeStar(layer);
        });
        sky.shooting = [];
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(1, Math.round(rect.width || window.innerWidth));
        height = Math.max(1, Math.round(rect.height || window.innerHeight));
        const dprCap = performanceMode ? (window.innerWidth < 700 ? 1.15 : 1.25) : (window.innerWidth < 700 ? 1.5 : 2);
        dpr = Math.min(window.devicePixelRatio || 1, dprCap);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rebuildStars();
    }

    function queueResize() {
        if (resizeQueued) return;
        resizeQueued = true;
        window.requestAnimationFrame(() => {
            resizeQueued = false;
            resize();
        });
    }

    function scheduleDrawFrame() {
        if (drawFramePending) return;
        drawFramePending = true;
        window.requestAnimationFrame(draw);
    }

    function applyStaticLogoFallback(img) {
        if (!img || img.classList.contains('hero-eye-3d')) return;
        if (!img.dataset.animatedSrc) img.dataset.animatedSrc = img.getAttribute('src') || '';
        img.src = '/assets/otp-logo-transparent.png';
        img.classList.add('otp-static-performance-logo');
    }

    function applyHeroLogoFallback(img) {
        if (!img) return;
        if (!img.dataset.animatedSrc) img.dataset.animatedSrc = img.getAttribute('src') || '';
        img.src = '/assets/otp-logo-transparent.png';
        img.classList.add('otp-static-performance-logo');
    }

    function enablePerformanceMode() {
        if (performanceMode) return;
        performanceMode = true;
        document.documentElement.classList.add('stars-performance-mode');
        document.documentElement.setAttribute('data-otp-performance-mode', 'stars');
        resize();
    }

    function beginPerformanceProbe() {
        if (document.visibilityState !== 'visible' || prefersReducedMotion.matches) return;
        performanceProbeEnabled = true;
    }

    function drawAtmosphere(rgb, light) {
        if (performanceMode) {
            const topGlow = ctx.createRadialGradient(width * 0.52, height * 0.12, 0, width * 0.52, height * 0.12, width * 0.72);
            topGlow.addColorStop(0, rgba(rgb, light ? 0.034 : 0.12));
            topGlow.addColorStop(0.42, rgba(rgb, light ? 0.008 : 0.034));
            topGlow.addColorStop(1, rgba(rgb, 0));
            ctx.fillStyle = topGlow;
            ctx.fillRect(0, 0, width, height);

            const horizon = ctx.createLinearGradient(0, height * 0.42, 0, height);
            horizon.addColorStop(0, 'rgba(0, 0, 0, 0)');
            horizon.addColorStop(1, light ? 'rgba(255, 255, 255, 0.022)' : 'rgba(3, 3, 5, 0.22)');
            ctx.fillStyle = horizon;
            ctx.fillRect(0, 0, width, height);
            return;
        }
        const topGlow = ctx.createRadialGradient(width * 0.52, height * 0.12, 0, width * 0.52, height * 0.12, width * 0.78);
        topGlow.addColorStop(0, rgba(rgb, light ? 0.05 : 0.18));
        topGlow.addColorStop(0.42, rgba(rgb, light ? 0.012 : 0.052));
        topGlow.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = topGlow;
        ctx.fillRect(0, 0, width, height);

        const horizon = ctx.createLinearGradient(0, height * 0.42, 0, height);
        horizon.addColorStop(0, 'rgba(0, 0, 0, 0)');
        horizon.addColorStop(1, light ? 'rgba(255, 255, 255, 0.035)' : 'rgba(3, 3, 5, 0.34)');
        ctx.fillStyle = horizon;
        ctx.fillRect(0, 0, width, height);
    }

    function spawnShootingStar(rgb) {
        if (performanceMode) return;
        if (isLightMode() || window.innerWidth < 700 || Math.random() > 0.006) return;
        sky.shooting.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.42,
            length: Math.random() * 72 + 42,
            speed: Math.random() * 7 + 6,
            life: 1,
            rgb
        });
    }

    function drawShootingStars() {
        for (let i = sky.shooting.length - 1; i >= 0; i -= 1) {
            const s = sky.shooting[i];
            s.x -= s.speed;
            s.y += s.speed * 0.46;
            s.life -= 0.024;
            const endX = s.x + s.length;
            const endY = s.y - s.length * 0.46;
            const grad = ctx.createLinearGradient(s.x, s.y, endX, endY);
            grad.addColorStop(0, rgba(s.rgb, Math.max(0, s.life)));
            grad.addColorStop(1, rgba(s.rgb, 0));
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (s.life <= 0 || s.x < -s.length || s.y > height + s.length) sky.shooting.splice(i, 1);
        }
    }

    function drawAttractor(rgb) {
        if (!mouse.active || !mouse.attractor) return;

        const pulse = 0.55 + Math.sin(sky.drift * 5.2) * 0.12;
        const vortexSize = performanceMode ? Math.min(width, 280) : Math.min(width, 520);
        const vortex = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, vortexSize);
        vortex.addColorStop(0, rgba(rgb, (performanceMode ? 0.13 : 0.24) * pulse));
        vortex.addColorStop(0.18, performanceMode ? rgba(rgb, 0.035) : 'rgba(255, 255, 255, 0.055)');
        vortex.addColorStop(0.44, rgba(rgb, (performanceMode ? 0.04 : 0.08) * pulse));
        vortex.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = vortex;
        ctx.fillRect(0, 0, width, height);

        if (performanceMode) return;

        ctx.save();
        ctx.translate(mouse.x, mouse.y);
        ctx.rotate(sky.drift * 0.9);
        for (let i = 0; i < 3; i += 1) {
            ctx.beginPath();
            ctx.ellipse(0, 0, 42 + i * 30, 11 + i * 4, i * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(rgb, 0.20 - i * 0.045);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    function draw(time) {
        drawFramePending = false;
        if (document.visibilityState !== 'visible') return;
        scheduleDrawFrame();
        if (performanceProbeEnabled && !probeComplete && !performanceMode && !prefersReducedMotion.matches) {
            if (!probeAbsoluteStart) probeAbsoluteStart = time;
            if (!probeStart) probeStart = time;
            probeFrames += 1;
            if (time - probeStart >= PROBE_WINDOW_MS) {
                const fps = probeFrames * 1000 / Math.max(1, time - probeStart);
                if (fps < FPS_TRIGGER) {
                    lowFpsStreak += 1;
                } else {
                    lowFpsStreak = 0;
                }
                if (lowFpsStreak >= LOW_FPS_SAMPLES_REQUIRED) {
                    enablePerformanceMode();
                }
                if (performanceMode || time - probeAbsoluteStart >= 12000) {
                    probeComplete = true;
                } else {
                    probeStart = time;
                    probeFrames = 0;
                }
            }
        }
        if (document.visibilityState !== 'visible') return;
        const frameInterval = performanceMode && !mouse.attractor ? 66 : 33;
        if (time - lastFrame < frameInterval) return;
        lastFrame = time;

        const light = isLightMode();
        const accent = activeRgb();
        ctx.clearRect(0, 0, width, height);
        if (prefersReducedMotion.matches) return;

        sky.drift += light ? 0.006 : 0.012;
        drawAtmosphere(accent, light);
        drawAttractor(accent);
        spawnShootingStar(accent);

        for (const star of stars) {
            star.twinkle += star.speed;
            const wave = Math.sin(star.twinkle + sky.drift);
            const baseAlpha = light ? 0.31 : star.alpha;
            const alpha = Math.max(light ? 0.18 : 0.28, baseAlpha + wave * (light ? 0.072 : 0.2));
            let x = star.x + Math.sin(sky.drift * star.depth + star.y * 0.003) * star.depth * 3;
            let y = star.y + Math.cos(sky.drift * 0.6 + star.x * 0.002) * star.depth * 1.4;
            const nearMouse = mouse.active ? Math.hypot(mouse.x - x, mouse.y - y) : 9999;
            const radius = mouse.attractor ? 420 : 150;
            const force = nearMouse < radius ? (1 - nearMouse / radius) : 0;
            const pull = mouse.attractor ? force * force * star.depth * 42 : 0;
            if (pull > 0 && nearMouse > 0.1) {
                x += ((mouse.x - x) / nearMouse) * pull;
                y += ((mouse.y - y) / nearMouse) * pull;
            }
            const lift = force * (mouse.attractor ? (light ? 0.48 : 0.9) : (light ? 0.12 : 0.28));
            const size = star.r + lift;

            const fill = star.accent
                ? rgba(accent, alpha + lift)
                : (light ? `rgba(12, 12, 20, ${alpha})` : `rgba(255, 250, 236, ${alpha + lift * 0.7})`);
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.shadowColor = star.accent
                ? rgba(accent, light ? 0.16 : 0.38)
                : (light ? 'rgba(20, 20, 30, 0.12)' : 'rgba(255, 250, 236, 0.28)');
            ctx.shadowBlur = performanceMode
                ? (star.depth > 0.65 ? (light ? 1.6 : 3.2) : (light ? 0.8 : 1.6))
                : (star.depth > 0.65 ? (light ? 2.5 : 5.5) : (light ? 1 : 2.5));
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.shadowBlur = 0;

            if (!light && star.depth > 0.9 && alpha > 0.58) {
                ctx.beginPath();
                ctx.arc(x, y, star.r * 2.8, 0, Math.PI * 2);
                ctx.fillStyle = rgba(accent, (alpha - 0.48) * 0.18);
                ctx.fill();
            }
        }

        drawShootingStars();
    }

    function updateMouse(x, y, attractor = false) {
        mouse.x = Number.isFinite(x) ? x : -9999;
        mouse.y = Number.isFinite(y) ? y : -9999;
        mouse.active = Number.isFinite(x) && Number.isFinite(y);
        mouse.attractor = mouse.active && Boolean(attractor);
    }

    function trackPointer(x, y) {
        updateMouse(x, y, mouse.attractor);
    }

    window.updateMouse = updateMouse;
    window.setAttractor = (x, y) => updateMouse(x, y, true);
    window.clearAttractor = () => updateMouse(null, null);
    window.resetStars = rebuildStars;

    window.addEventListener('mousemove', (event) => trackPointer(event.clientX, event.clientY), { passive: true });
    window.addEventListener('mouseleave', () => updateMouse(null, null), { passive: true });
    window.addEventListener('touchstart', (event) => {
        if (event.touches.length) trackPointer(event.touches[0].clientX, event.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (event) => {
        if (event.touches.length) trackPointer(event.touches[0].clientX, event.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => updateMouse(null, null), { passive: true });
    window.addEventListener('resize', queueResize, { passive: true });
    prefersReducedMotion.addEventListener?.('change', rebuildStars);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleDrawFrame();
            if (!probeComplete && !performanceMode && !prefersReducedMotion.matches) {
                beginPerformanceProbe();
            }
        }
    }, { passive: true });

    new MutationObserver(rebuildStars).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-refresh-accent']
    });

    // Hero logo block was removed for stability; keep fallback protection for nav/footer marks only.
    const navLogo = document.querySelector('#nav-logo-neon, .nav-logo .otp-mark');
    if (navLogo) {
        navLogo.addEventListener('error', () => applyHeroLogoFallback(navLogo), { once: true });
    }

    if (document.readyState === 'complete') {
        setTimeout(beginPerformanceProbe, PROBE_DELAY_MS);
    } else {
        window.addEventListener('load', () => setTimeout(beginPerformanceProbe, PROBE_DELAY_MS), { once: true });
    }

    function bootStarfield() {
        resize();
        scheduleDrawFrame();
    }
    if ('requestIdleCallback' in window) {
        requestIdleCallback(bootStarfield, { timeout: STARFIELD_BOOT_DELAY_MS + 600 });
    } else {
        setTimeout(bootStarfield, STARFIELD_BOOT_DELAY_MS);
    }
})();
