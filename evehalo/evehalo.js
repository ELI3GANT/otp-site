/**
 * ============================================================================
 * EVEHALO COSMIC EXPERIENCE — INTERACTIVE CONTROLLER
 * OnlyTruePerspective LLC
 * ============================================================================
 */

(function () {
  'use strict';

  // --- 1. Canvas Starfield & Cosmic Atmosphere ---
  const canvas = document.getElementById('cosmic-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };
  let animationFrameId = null;
  let isPageVisible = true;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initStarfield() {
    if (!canvas || !ctx || prefersReducedMotion) return;

    resizeCanvas();
    window.addEventListener('resize', debounce(resizeCanvas, 150), { passive: true });

    // Desktop: 160 stars; Mobile: 65 stars for peak frame rate on older phones
    const isMobile = window.innerWidth < 768;
    const starCount = isMobile ? 65 : 160;

    stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push(createStar());
    }

    // Mouse & Touch Interaction
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Visibility optimization
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        lastTime = performance.now();
        renderLoop();
      }
    });

    lastTime = performance.now();
    renderLoop();
  }

  function createStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      baseAlpha: Math.random() * 0.7 + 0.2,
      alpha: Math.random() * 0.7 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
      depth: Math.random() * 0.8 + 0.2, // 3D depth layer
      color: pickStarColor()
    };
  }

  function pickStarColor() {
    // EVEHALO palette: electric blue, lavender, gold, pure white
    const colors = [
      'rgba(255, 255, 255, ',
      'rgba(240, 245, 255, ',
      'rgba(77, 148, 255, ',
      'rgba(157, 101, 255, ',
      'rgba(255, 184, 77, '
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (ctx) ctx.scale(dpr, dpr);
  }

  function onMouseMove(e) {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  }

  function onMouseLeave() {
    mouse.active = false;
  }

  function onTouchMove(e) {
    if (e.touches && e.touches[0]) {
      mouse.targetX = e.touches[0].clientX;
      mouse.targetY = e.touches[0].clientY;
      mouse.active = true;
    }
  }

  let lastTime = 0;
  function renderLoop(currentTime) {
    if (!isPageVisible || prefersReducedMotion) return;

    animationFrameId = requestAnimationFrame(renderLoop);

    // Smooth mouse lerping
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.clearRect(0, 0, width, height);

    const time = (currentTime || performance.now()) * 0.001;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      // Twinkle calculation
      const alpha = s.baseAlpha + Math.sin(time * 3 + s.twinkleOffset) * 0.25;
      const clampedAlpha = Math.max(0.05, Math.min(1, alpha));

      // Gentle parallax reaction to mouse
      let posX = s.x;
      let posY = s.y;
      if (mouse.active) {
        const dx = (mouse.x - width / 2) * 0.02 * s.depth;
        const dy = (mouse.y - height / 2) * 0.02 * s.depth;
        posX += dx;
        posY += dy;
      }

      ctx.fillStyle = s.color + clampedAlpha + ')';
      ctx.beginPath();
      ctx.arc(posX, posY, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 2. Interactive Device Gallery Tabs ---
  function initGalleryTabs() {
    const tabButtons = document.querySelectorAll('.gallery-tab-btn');
    const panels = document.querySelectorAll('.gallery-panel');

    if (!tabButtons.length || !panels.length) return;

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab-target');

        tabButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        panels.forEach((p) => {
          p.classList.remove('active');
          p.setAttribute('hidden', 'true');
        });

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        const activePanel = document.getElementById(targetId);
        if (activePanel) {
          activePanel.classList.add('active');
          activePanel.removeAttribute('hidden');
        }
      });

      // Keyboard navigation for tablist
      btn.addEventListener('keydown', (e) => {
        const tabsArray = Array.from(tabButtons);
        const index = tabsArray.indexOf(btn);

        if (e.key === 'ArrowRight') {
          const nextTab = tabsArray[(index + 1) % tabsArray.length];
          nextTab.focus();
          nextTab.click();
        } else if (e.key === 'ArrowLeft') {
          const prevTab = tabsArray[(index - 1 + tabsArray.length) % tabsArray.length];
          prevTab.focus();
          prevTab.click();
        }
      });
    });
  }

  // --- 3. Interactive Atmosphere / Theme Explorer ---
  const THEME_PRESETS = [
    {
      id: 'nocturne',
      name: 'Nocturne',
      subtitle: 'Midnight sky, celestial stars, silver & lavender',
      primaryBg: '#020307',
      secondaryBg: '#050715',
      accent: '#B38CFA',
      accentGlow: 'rgba(179, 140, 250, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #050715, #120e2c)'
    },
    {
      id: 'daybreak',
      name: 'Daybreak',
      subtitle: 'Soft dawn, golden horizon, gentle warmth',
      primaryBg: '#140D17',
      secondaryBg: '#241426',
      accent: '#FFA647',
      accentGlow: 'rgba(255, 166, 71, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #241426, #421c2a)'
    },
    {
      id: 'stillwater',
      name: 'Stillwater',
      subtitle: 'Deep oceanic indigo, serene teal & cyan',
      primaryBg: '#03101A',
      secondaryBg: '#051E2E',
      accent: '#3DD1CA',
      accentGlow: 'rgba(61, 209, 202, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #051E2E, #0a334a)'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      subtitle: 'Restrained obsidian, pure silver, quiet focus',
      primaryBg: '#08080A',
      secondaryBg: '#14141A',
      accent: '#C7D1E6',
      accentGlow: 'rgba(199, 209, 230, 0.35)',
      swatchGradient: 'linear-gradient(135deg, #14141A, #24252e)'
    },
    {
      id: 'aurora',
      name: 'Aurora',
      subtitle: 'Ethereal northern lights, dancing in the sky',
      primaryBg: '#08172E',
      secondaryBg: '#102F54',
      accent: '#52D19E',
      accentGlow: 'rgba(82, 209, 158, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #102F54, #1b4b75)'
    },
    {
      id: 'crimson',
      name: 'Crimson',
      subtitle: 'Mysterious crimson, blood moon intensity',
      primaryBg: '#210B0B',
      secondaryBg: '#3B1414',
      accent: '#FF3B66',
      accentGlow: 'rgba(255, 59, 102, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #3B1414, #661d25)'
    },
    {
      id: 'serenity',
      name: 'Serenity',
      subtitle: 'Peaceful zen garden, natural harmony',
      primaryBg: '#0B1622',
      secondaryBg: '#16283D',
      accent: '#38BDF8',
      accentGlow: 'rgba(56, 189, 248, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #16283D, #22425e)'
    },
    {
      id: 'nebula',
      name: 'Nebula',
      subtitle: 'Cosmic clouds, vibrant celestial energy',
      primaryBg: '#130B29',
      secondaryBg: '#25154D',
      accent: '#876BF0',
      accentGlow: 'rgba(135, 107, 240, 0.45)',
      swatchGradient: 'linear-gradient(135deg, #25154D, #40237a)'
    },
    {
      id: 'solarFlare',
      name: 'Solar Flare',
      subtitle: 'Warm ember, bright amber, sunrise energy',
      primaryBg: '#1A0A05',
      secondaryBg: '#33150A',
      accent: '#FFB84D',
      accentGlow: 'rgba(255, 184, 77, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #33150A, #5e260f)'
    },
    {
      id: 'rosewood',
      name: 'Rosewood',
      subtitle: 'Deep plum, rose light, quiet confidence',
      primaryBg: '#170815',
      secondaryBg: '#2E0F2B',
      accent: '#F066A8',
      accentGlow: 'rgba(240, 102, 168, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #2E0F2B, #52194b)'
    },
    {
      id: 'arcticGlass',
      name: 'Arctic Glass',
      subtitle: 'Glacier blue, crisp ice, clear focus',
      primaryBg: '#061324',
      secondaryBg: '#0E233E',
      accent: '#29B3F5',
      accentGlow: 'rgba(41, 179, 245, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #0E233E, #16375c)'
    },
    {
      id: 'electricGarden',
      name: 'Electric Garden',
      subtitle: 'Forest green, vivid mint, fresh momentum',
      primaryBg: '#041710',
      secondaryBg: '#0A2E20',
      accent: '#52D19E',
      accentGlow: 'rgba(82, 209, 158, 0.4)',
      swatchGradient: 'linear-gradient(135deg, #0A2E20, #134e38)'
    }
  ];

  function initAtmosphereExplorer() {
    const chipCards = document.querySelectorAll('.theme-chip-card');
    const previewStage = document.getElementById('atmosphere-preview-stage');
    const liveThemeName = document.getElementById('live-theme-name');
    const liveThemeDesc = document.getElementById('live-theme-desc');

    if (!chipCards.length) return;

    chipCards.forEach((card) => {
      card.addEventListener('click', () => {
        const themeId = card.getAttribute('data-theme-id');
        const theme = THEME_PRESETS.find((t) => t.id === themeId);
        if (!theme) return;

        chipCards.forEach((c) => c.classList.remove('active'));
        card.classList.add('active');

        // Apply theme variables dynamically to the preview stage or root
        document.documentElement.style.setProperty('--theme-primary-bg', theme.primaryBg);
        document.documentElement.style.setProperty('--theme-secondary-bg', theme.secondaryBg);
        document.documentElement.style.setProperty('--theme-accent', theme.accent);
        document.documentElement.style.setProperty('--theme-accent-glow', theme.accentGlow);

        if (liveThemeName) liveThemeName.textContent = theme.name;
        if (liveThemeDesc) liveThemeDesc.textContent = theme.subtitle;

        if (previewStage) {
          previewStage.style.background = `radial-gradient(circle at center, ${theme.secondaryBg} 0%, ${theme.primaryBg} 100%)`;
          previewStage.style.borderColor = theme.accent;
          previewStage.style.boxShadow = `0 0 40px ${theme.accentGlow}`;
        }
      });
    });
  }

  // --- 4. 3D Tilt on Hero Device Frame ---
  function initHeroDeviceTilt() {
    const heroDevice = document.getElementById('hero-device-frame');
    if (!heroDevice || prefersReducedMotion || window.innerWidth < 1024) return;

    const wrapper = heroDevice.parentElement;
    if (!wrapper) return;

    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const tiltX = (y / (rect.height / 2)) * -10;
      const tiltY = (x / (rect.width / 2)) * 12;

      heroDevice.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    wrapper.addEventListener('mouseleave', () => {
      heroDevice.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  }

  // --- 5. Scroll Emergence Observer ---
  function initScrollEmergence() {
    if (prefersReducedMotion) return;

    const revealElements = document.querySelectorAll('.cosmic-reveal');
    if (!revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  // Helper debounce
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Boot on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    initStarfield();
    initGalleryTabs();
    initAtmosphereExplorer();
    initHeroDeviceTilt();
    initScrollEmergence();
  }
})();
