/**
 * stars-v2.js
 * Lightweight OTP atmosphere. Day/night controls intensity; refresh accent controls color.
 */
(function () {
    const canvas = document.getElementById('cursor-canvas');
    const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

    if (!canvas || !ctx) {
        window.updateMouse = () => {};
        window.setAttractor = () => {};
        window.clearAttractor = () => {};
        window.resetStars = () => {};
        return;
    }

    canvas.setAttribute('aria-hidden', 'true');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let lastFrame = 0;
    const mouse = { x: -9999, y: -9999, active: false };
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
        const base = Math.round(area / (isLightMode() ? 26000 : 11500));
        const mobile = window.innerWidth < 700;
        if (isLightMode()) return Math.min(mobile ? 22 : 42, Math.max(14, base));
        return Math.min(mobile ? 54 : 118, Math.max(34, base));
    }

    function makeStar(layer) {
        const depth = layer === 0 ? 0.35 : layer === 1 ? 0.68 : 1;
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            r: (Math.random() * 0.9 + 0.34) * depth,
            depth,
            alpha: Math.random() * 0.42 + 0.22,
            twinkle: Math.random() * Math.PI * 2,
            speed: (0.004 + Math.random() * 0.018) * depth,
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
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rebuildStars();
    }

    function drawAtmosphere(rgb, light) {
        const topGlow = ctx.createRadialGradient(width * 0.52, height * 0.12, 0, width * 0.52, height * 0.12, width * 0.78);
        topGlow.addColorStop(0, rgba(rgb, light ? 0.055 : 0.12));
        topGlow.addColorStop(0.42, rgba(rgb, light ? 0.014 : 0.032));
        topGlow.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = topGlow;
        ctx.fillRect(0, 0, width, height);

        const horizon = ctx.createLinearGradient(0, height * 0.42, 0, height);
        horizon.addColorStop(0, 'rgba(0, 0, 0, 0)');
        horizon.addColorStop(1, light ? 'rgba(255, 255, 255, 0.04)' : 'rgba(3, 3, 5, 0.44)');
        ctx.fillStyle = horizon;
        ctx.fillRect(0, 0, width, height);
    }

    function spawnShootingStar(rgb) {
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

    function draw(time) {
        window.requestAnimationFrame(draw);
        if (document.visibilityState !== 'visible') return;
        if (time - lastFrame < 33) return;
        lastFrame = time;

        const light = isLightMode();
        const accent = activeRgb();
        ctx.clearRect(0, 0, width, height);
        if (prefersReducedMotion.matches) return;

        sky.drift += light ? 0.006 : 0.012;
        drawAtmosphere(accent, light);
        spawnShootingStar(accent);

        for (const star of stars) {
            star.twinkle += star.speed;
            const wave = Math.sin(star.twinkle + sky.drift);
            const baseAlpha = light ? 0.18 : star.alpha;
            const alpha = Math.max(light ? 0.055 : 0.14, baseAlpha + wave * (light ? 0.035 : 0.16));
            const nearMouse = mouse.active ? Math.hypot(mouse.x - star.x, mouse.y - star.y) : 9999;
            const lift = nearMouse < 150 ? (1 - nearMouse / 150) * (light ? 0.12 : 0.28) : 0;
            const x = star.x + Math.sin(sky.drift * star.depth + star.y * 0.003) * star.depth * 3;
            const y = star.y + Math.cos(sky.drift * 0.6 + star.x * 0.002) * star.depth * 1.4;
            const size = star.r + lift;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = star.accent
                ? rgba(accent, alpha + lift)
                : (light ? `rgba(20, 20, 34, ${alpha * 0.8})` : `rgba(255, 250, 236, ${alpha + lift * 0.7})`);
            ctx.fill();

            if (!light && star.depth > 0.9 && alpha > 0.58) {
                ctx.beginPath();
                ctx.arc(x, y, star.r * 2.8, 0, Math.PI * 2);
                ctx.fillStyle = rgba(accent, (alpha - 0.48) * 0.18);
                ctx.fill();
            }
        }

        drawShootingStars();
    }

    function updateMouse(x, y) {
        mouse.x = Number.isFinite(x) ? x : -9999;
        mouse.y = Number.isFinite(y) ? y : -9999;
        mouse.active = Number.isFinite(x) && Number.isFinite(y);
    }

    window.updateMouse = updateMouse;
    window.setAttractor = updateMouse;
    window.clearAttractor = () => updateMouse(null, null);
    window.resetStars = rebuildStars;

    window.addEventListener('mousemove', (event) => updateMouse(event.clientX, event.clientY), { passive: true });
    window.addEventListener('mouseleave', () => updateMouse(null, null), { passive: true });
    window.addEventListener('touchstart', (event) => {
        if (event.touches.length) updateMouse(event.touches[0].clientX, event.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (event) => {
        if (event.touches.length) updateMouse(event.touches[0].clientX, event.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => updateMouse(null, null), { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    prefersReducedMotion.addEventListener?.('change', rebuildStars);

    new MutationObserver(rebuildStars).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-refresh-accent']
    });

    resize();
    window.requestAnimationFrame(draw);
})();
