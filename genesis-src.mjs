/**
 * OPERATION OTP GENESIS — BEYOND PROTOTYPE ("Beyond the Perspective")
 * Cohesive Futuristic Spacecraft Command Bridge + Multidimensional Traveling Galaxy +
 * Physical Hardware Portfolio Integration + Hybrid Google Flow Visual Architecture.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  ExtrudeGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  RingGeometry,
  Scene,
  Shape,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer
} from 'three';

(function initOtpGenesis(root) {
  'use strict';

  const doc = root.document;
  if (!doc) return;

  const CHAPTERS = [
    {
      index: 0,
      id: 'arrival',
      code: '01',
      label: 'Arrival',
      range: [0.0, 0.2],
      jumpProgress: 0.05,
      statement: 'A quiet horizon before ignition.'
    },
    {
      index: 1,
      id: 'awakening',
      code: '02',
      label: 'Awakening',
      range: [0.2, 0.4],
      jumpProgress: 0.3,
      statement: 'Systems awaken across the hull.'
    },
    {
      index: 2,
      id: 'discovery',
      code: '03',
      label: 'Discovery',
      range: [0.4, 0.62],
      jumpProgress: 0.51,
      statement: 'Command interfaces illuminate.'
    },
    {
      index: 3,
      id: 'creation',
      code: '04',
      label: 'Creation',
      range: [0.62, 0.83],
      jumpProgress: 0.73,
      statement: 'Websites, apps, commerce, and infrastructure.'
    },
    {
      index: 4,
      id: 'beyond',
      code: '05',
      label: 'Beyond',
      range: [0.83, 1.0],
      jumpProgress: 0.94,
      statement: 'OnlyTruePerspective.'
    }
  ];

  const config = Object.assign(
    {
      enabled: true,
      storageKey: 'otp_genesis_disabled',
      galaxyBackdrop: '/assets/flow/genesis/genesis-galaxy.webp',
      fallbackVoidPoster: '/assets/flow/genesis/genesis-void.webp',
      fallbackWorkspacePoster: '/assets/flow/genesis/genesis-workspace.webp',
      fallbackVideo: '/assets/flow/genesis/genesis-fallback.mp4'
    },
    root.OTP_GENESIS_CONFIG || {}
  );

  const section = doc.getElementById('otp-genesis');
  if (!section) return;

  const stage = section.querySelector('.genesis-stage');
  const canvasHost = section.querySelector('.genesis-canvas-host');
  const fallbackWrap = section.querySelector('.genesis-fallback-layer');
  const chapterButtons = Array.from(section.querySelectorAll('[data-genesis-chapter]'));
  const progressBarFill = section.querySelector('.genesis-progress-fill');
  const chapterCodeEl = section.querySelector('[data-genesis-code]');
  const chapterNameEl = section.querySelector('[data-genesis-name]');
  const statementEl = section.querySelector('[data-genesis-statement]');
  const portalCtaRow = section.querySelector('.genesis-end-actions');
  const scrollCueEl = section.querySelector('.genesis-scroll-cue');
  const skipBtn = section.querySelector('[data-genesis-skip]');
  const motionBtn = section.querySelector('[data-genesis-motion-toggle]');

  const prefersReducedMotionQuery = root.matchMedia
    ? root.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: null };

  const state = {
    enabled: false,
    mode: 'idle',
    progress: 0,
    targetProgress: 0,
    chapterIndex: 0,
    isVisible: true,
    userPaused: false,
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
    rafId: 0,
    disposed: false,
    drawCalls: 0,
    theme: 'dark',
    accentHex: '#d97706'
  };

  function isFlagEnabled() {
    if (!config.enabled) return false;
    if (doc.body?.dataset?.genesisEnabled === 'false') return false;
    try {
      const params = new URLSearchParams(root.location?.search || '');
      const param = params.get('genesis');
      if (param === '0' || param === 'false' || param === 'off') return false;
      if (param === '1' || param === 'true' || param === 'on') return true;
    } catch {}
    try {
      if (root.localStorage?.getItem(config.storageKey) === '1') return false;
    } catch {}
    return true;
  }

  function readThemeTokens() {
    const theme = doc.documentElement?.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    let accent = '#d97706';
    try {
      const computed = root.getComputedStyle(doc.documentElement).getPropertyValue('--accent-otp').trim();
      if (computed) accent = computed;
    } catch {}
    state.theme = theme;
    state.accentHex = accent;
    return { theme, accent };
  }

  function smoothstep(edge0, edge1, x) {
    const t = MathUtils.clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function getScrollProgress() {
    const rect = section.getBoundingClientRect();
    const totalScrollable = Math.max(1, section.offsetHeight - root.innerHeight);
    const scrolled = MathUtils.clamp(-rect.top, 0, totalScrollable);
    return scrolled / totalScrollable;
  }

  function chapterForProgress(p) {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (p >= CHAPTERS[i].range[0] - 0.001) return CHAPTERS[i];
    }
    return CHAPTERS[0];
  }

  function updateHud(p) {
    const chapter = chapterForProgress(p);
    if (chapter.index !== state.chapterIndex) {
      state.chapterIndex = chapter.index;
      if (chapterCodeEl) chapterCodeEl.textContent = chapter.code;
      if (chapterNameEl) chapterNameEl.textContent = chapter.label;
      if (statementEl) {
        statementEl.classList.add('is-swapping');
        statementEl.textContent = chapter.statement;
        root.setTimeout(() => statementEl.classList.remove('is-swapping'), 180);
      }
      chapterButtons.forEach((btn, idx) => {
        const active = idx === chapter.index;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-current', active ? 'step' : 'false');
      });
    }
    if (progressBarFill) {
      progressBarFill.style.transform = `scaleY(${Math.max(0.04, p).toFixed(4)})`;
    }
    if (portalCtaRow) {
      portalCtaRow.classList.toggle('is-visible', p >= 0.78);
    }
    if (scrollCueEl) {
      scrollCueEl.classList.toggle('is-hidden', p > 0.14);
    }
    section.dataset.genesisChapter = chapter.id;
    section.style.setProperty('--genesis-progress', p.toFixed(4));
  }

  // Procedural Aerospace Micro-Maps for PBR Metallic Realism
  function createAerospaceDeckBump() {
    const c = doc.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);
    // Subtle aerospace deck plates + beveled panel seams + rivet detents
    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    ctx.strokeStyle = '#9c9c9c';
    ctx.lineWidth = 1;
    for (let i = 64; i < 512; i += 128) {
      ctx.strokeRect(i - 48, 16, 96, 96);
      ctx.strokeRect(i - 48, 272, 96, 96);
    }
    for (let x = 14; x < 512; x += 128) {
      for (let y = 14; y < 512; y += 128) {
        ctx.fillStyle = '#505050';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + 98, y + 98, 4, 4);
      }
    }
    const tex = new CanvasTexture(c);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(8, 10);
    return tex;
  }

  function createBrushedTitaniumBump() {
    const c = doc.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const shade = 114 + ((y * 37) % 28);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
    const tex = new CanvasTexture(c);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  function createExoplanetTexture() {
    const c = doc.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(340, 118, 24, 240, 128, 290);
    g.addColorStop(0, '#5a325c');
    g.addColorStop(0.32, '#2a183b');
    g.addColorStop(0.68, '#130b20');
    g.addColorStop(1, '#06030c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 42; i++) {
      const y = (i * 6.3 + Math.sin(i * 1.7) * 5) % 256;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(217, 70, 239, 0.06)' : 'rgba(139, 92, 246, 0.07)';
      ctx.fillRect(0, y, 512, 2 + (i % 3));
    }
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  function createNebulaCloudTexture(hexInner, rgbaMid) {
    const c = doc.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
    g.addColorStop(0, hexInner);
    g.addColorStop(0.42, rgbaMid);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  function createStarSpriteTexture() {
    const c = doc.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.28, 'rgba(255, 224, 245, 0.72)');
    g.addColorStop(0.65, 'rgba(217, 70, 239, 0.16)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  function createUiFallbackTexture(accentColor) {
    const c = doc.createElement('canvas');
    c.width = 512;
    c.height = 320;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#0d0b16';
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#181428';
    ctx.fillRect(18, 16, 476, 36);
    ctx.fillStyle = accentColor;
    ctx.fillRect(28, 28, 88, 12);
    ctx.fillStyle = 'rgba(244,241,248,0.16)';
    ctx.fillRect(18, 68, 300, 168);
    ctx.fillRect(334, 68, 160, 168);
    ctx.fillStyle = accentColor;
    ctx.fillRect(18, 254, 476, 42);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  function createSpacecraftEnvironment(renderer, energyHex, isLight) {
    const c = doc.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, isLight ? '#2a223a' : '#100c1d');
    g.addColorStop(0.42, '#40184e');
    g.addColorStop(0.7, '#0d0917');
    g.addColorStop(1, '#040308');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);

    const gal = ctx.createRadialGradient(256, 108, 14, 256, 108, 180);
    gal.addColorStop(0, 'rgba(244, 114, 182, 0.72)');
    gal.addColorStop(0.45, 'rgba(168, 85, 247, 0.36)');
    gal.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gal;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(248, 232, 246, 0.56)';
    ctx.fillRect(72, 20, 168, 12);
    ctx.fillRect(272, 20, 168, 12);
    ctx.fillStyle = energyHex;
    ctx.globalAlpha = 0.48;
    ctx.fillRect(24, 96, 86, 48);
    ctx.fillRect(402, 96, 86, 48);
    ctx.globalAlpha = 1;

    const eq = new CanvasTexture(c);
    eq.mapping = EquirectangularReflectionMapping;
    eq.colorSpace = SRGBColorSpace;
    try {
      const pmrem = new PMREMGenerator(renderer);
      const envRT = pmrem.fromEquirectangular(eq);
      eq.dispose();
      pmrem.dispose();
      return envRT.texture;
    } catch {
      return eq;
    }
  }

  function createOrbitalSealTexture() {
    const c = doc.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(255, 244, 252, 0.96)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(64, 256);
    ctx.bezierCurveTo(154, 118, 358, 118, 448, 256);
    ctx.bezierCurveTo(358, 394, 154, 394, 64, 256);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 256, 62, 0, Math.PI * 2);
    ctx.stroke();
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  // Rounded-corner extruded bezel helper (stops sharp-box look on monitors & tablets)
  function createRoundedRectShape(w, h, r) {
    const s = new Shape();
    const hw = w / 2;
    const hh = h / 2;
    s.moveTo(-hw + r, -hh);
    s.lineTo(hw - r, -hh);
    s.quadraticCurveTo(hw, -hh, hw, -hh + r);
    s.lineTo(hw, hh - r);
    s.quadraticCurveTo(hw, hh, hw - r, hh);
    s.lineTo(-hw + r, hh);
    s.quadraticCurveTo(-hw, hh, -hw, hh - r);
    s.lineTo(-hw, -hh + r);
    s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    return s;
  }

  function createDeskWingGeometry() {
    const s = new Shape();
    // Sculpted cockpit horseshoe console top in XZ -> extruded vertically along Y
    s.moveTo(-2.45, 0.55);
    s.quadraticCurveTo(-2.55, -0.35, -1.75, -0.82);
    s.quadraticCurveTo(0, -1.25, 1.75, -0.82);
    s.quadraticCurveTo(2.55, -0.35, 2.45, 0.55);
    s.quadraticCurveTo(2.25, 0.78, 1.55, 0.68);
    s.quadraticCurveTo(0, 0.28, -1.55, 0.68);
    s.quadraticCurveTo(-2.25, 0.78, -2.45, 0.55);
    const geo = new ExtrudeGeometry(s, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.02
    });
    geo.rotateX(Math.PI / 2);
    return geo;
  }

  function activateFallback(reason = 'fallback') {
    state.mode = prefersReducedMotionQuery.matches ? 'reduced-motion' : reason;
    section.dataset.genesisMode = state.mode;
    if (fallbackWrap) {
      fallbackWrap.hidden = false;
      const vid = fallbackWrap.querySelector('video');
      if (vid && state.mode !== 'reduced-motion' && !state.userPaused) {
        vid.muted = true;
        vid.defaultMuted = true;
        vid.playsInline = true;
        vid.loop = true;
        vid.play?.().catch(() => {});
      } else if (vid) {
        vid.pause?.();
      }
    }
    if (canvasHost) canvasHost.hidden = true;
    updateHud(prefersReducedMotionQuery.matches ? 0.94 : getScrollProgress());
  }

  function initWebGLScene() {
    if (!canvasHost || prefersReducedMotionQuery.matches) {
      activateFallback('reduced-motion');
      return null;
    }

    let renderer;
    try {
      renderer = new WebGLRenderer({
        antialias: root.innerWidth >= 768,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      activateFallback('fallback');
      return null;
    }

    const isMobile = () => (root.innerWidth || 1024) < 768;
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, isMobile() ? 1.5 : 2));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = false;

    renderer.domElement.className = 'genesis-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    canvasHost.replaceChildren(renderer.domElement);
    canvasHost.hidden = false;
    if (fallbackWrap) fallbackWrap.hidden = true;

    const scene = new Scene();
    const tokens = readThemeTokens();
    const bgColor = new Color('#04020a');
    const accentColor = new Color(tokens.accent);
    const magentaColor = new Color('#e879f9');
    const pinkColor = new Color('#f472b6');
    const violetColor = new Color('#8b5cf6');
    const computeEnergyColor = (base) => {
      const c = base.clone();
      const luma = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      if (luma < 0.34) c.lerp(magentaColor, 0.55);
      else c.lerp(pinkColor, 0.32);
      return c;
    };
    const energyColor = computeEnergyColor(accentColor);
    scene.background = bgColor.clone();
    scene.fog = new FogExp2(0x05030b, 0.015);

    let envTex = createSpacecraftEnvironment(renderer, `#${energyColor.getHexString()}`, tokens.theme === 'light');
    if (envTex) scene.environment = envTex;

    const camera = new PerspectiveCamera(isMobile() ? 55 : 42, 16 / 9, 0.1, 110);
    const camTarget = new Vector3(0, 1.0, -3.5);

    // Spacecraft Interior & Deep Space Lighting
    const ambient = new AmbientLight(0x7c6f9c, 0.36);
    const keyLight = new DirectionalLight(0xfff1f8, 1.05);
    keyLight.position.set(4.5, 7.2, 5.4);
    const galaxyBounceLight = new DirectionalLight(0xf472b6, 1.45);
    galaxyBounceLight.position.set(0, 4.2, -16.0);
    const violetRimLight = new DirectionalLight(0x8b5cf6, 1.25);
    violetRimLight.position.set(-6.0, 4.5, -3.5);
    const bridgeSpot = new SpotLight(0xffeaf6, 2.8, 22, Math.PI * 0.34, 0.95, 1.35);
    bridgeSpot.position.set(0, 5.4, 1.2);
    bridgeSpot.target.position.set(0, 0.95, -0.35);
    const corridorPoint = new PointLight(0xd946ef, 1.2, 12, 1.5);
    corridorPoint.position.set(0, 2.4, 8.2);
    const consolePoint = new PointLight(0xf472b6, 0.3, 12, 1.4);
    consolePoint.position.set(0, 1.65, 0.5);
    scene.add(ambient, keyLight, galaxyBounceLight, violetRimLight, bridgeSpot, bridgeSpot.target, corridorPoint, consolePoint);

    const texLoader = new TextureLoader();
    const deckBumpTex = createAerospaceDeckBump();
    const metalBumpTex = createBrushedTitaniumBump();
    const starSpriteTex = createStarSpriteTexture();

    // Shared PBR Spacecraft Materials
    const matDeck = new MeshPhysicalMaterial({
      color: 0x0b0913,
      roughness: 0.32,
      metalness: 0.78,
      clearcoat: 0.42,
      clearcoatRoughness: 0.24,
      bumpMap: deckBumpTex,
      bumpScale: 0.015,
      envMapIntensity: 1.2
    });
    const matHullObsidian = new MeshStandardMaterial({
      color: 0x110f1c,
      roughness: 0.28,
      metalness: 0.84,
      bumpMap: metalBumpTex,
      bumpScale: 0.008,
      envMapIntensity: 1.4
    });
    const matTitanium = new MeshStandardMaterial({
      color: 0x6f758c,
      roughness: 0.22,
      metalness: 0.92,
      bumpMap: metalBumpTex,
      bumpScale: 0.006,
      envMapIntensity: 1.65
    });
    const matHardwareBody = new MeshStandardMaterial({
      color: 0x1c1e28,
      roughness: 0.24,
      metalness: 0.88,
      envMapIntensity: 1.5
    });
    const matWindowGlass = new MeshPhysicalMaterial({
      color: 0x241736,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.14,
      clearcoat: 1.0
    });

    // =========================================================================
    // 1. MULTIDIMENSIONAL TRAVELING GALAXY & RINGED EXOPLANET OUTSIDE WINDOWS
    // =========================================================================
    const cosmosGroup = new Group();

    // Layer A: Deep Space Spiral Galaxy Backdrop (z = -38)
    const galaxyMat = new MeshBasicMaterial({
      map: createNebulaCloudTexture('#f472b6', 'rgba(139, 92, 246, 0.2)'),
      color: 0xffffff,
      fog: false
    });
    texLoader.load(
      config.galaxyBackdrop,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        galaxyMat.map = tex;
        galaxyMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    const galGeo = new PlaneGeometry(58, 32.6, 20, 4);
    const galPos = galGeo.attributes.position;
    for (let i = 0; i < galPos.count; i++) {
      const gx = galPos.getX(i);
      galPos.setZ(i, (gx * gx) * 0.008);
    }
    galGeo.computeVertexNormals();
    const galaxyPlane = new Mesh(galGeo, galaxyMat);
    galaxyPlane.position.set(0, 4.2, -38);
    cosmosGroup.add(galaxyPlane);

    // Layer B: Sunlit Ringed Exoplanet & Atmospheric Limb at mid-distance (z = -24) -> strong 3D parallax!
    const planetGroup = new Group();
    planetGroup.position.set(-7.6, 4.25, -23.5);
    const planetMat = new MeshStandardMaterial({
      map: createExoplanetTexture(),
      roughness: 0.72,
      metalness: 0.08,
      fog: false
    });
    const planetSphere = new Mesh(new SphereGeometry(2.1, 40, 32), planetMat);
    const planetRingMat = new MeshBasicMaterial({
      color: 0xd8a8ce,
      transparent: true,
      opacity: 0.15,
      side: DoubleSide,
      fog: false
    });
    const planetRing = new Mesh(new RingGeometry(2.85, 4.45, 72), planetRingMat);
    planetRing.rotation.x = Math.PI * 0.42;
    planetRing.rotation.y = 0.24;
    const planetHaloMat = new MeshBasicMaterial({
      map: createNebulaCloudTexture('rgba(244, 114, 182, 0.36)', 'rgba(139, 92, 246, 0.12)'),
      transparent: true,
      opacity: 0.42,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const planetHalo = new Mesh(new PlaneGeometry(7.8, 7.8), planetHaloMat);
    planetHalo.position.z = -0.35;
    planetGroup.add(planetSphere, planetRing, planetHalo);
    cosmosGroup.add(planetGroup);

    // Layer C: Staggered Volumetric Nebula Depth Clouds (z = -18, -21, -28)
    const nebClouds = [
      { x: 6.2, y: 2.2, z: -21, s: 14, c0: 'rgba(217, 70, 239, 0.22)', c1: 'rgba(124, 58, 237, 0.08)' },
      { x: -5.4, y: 1.6, z: -17, s: 12, c0: 'rgba(244, 114, 182, 0.18)', c1: 'rgba(139, 92, 246, 0.06)' },
      { x: 1.5, y: 5.4, z: -27, s: 16, c0: 'rgba(168, 85, 247, 0.2)', c1: 'rgba(244, 114, 182, 0.06)' }
    ].map((n) => {
      const m = new MeshBasicMaterial({
        map: createNebulaCloudTexture(n.c0, n.c1),
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const mesh = new Mesh(new PlaneGeometry(n.s, n.s * 0.72), m);
      mesh.position.set(n.x, n.y, n.z);
      cosmosGroup.add(mesh);
      return { mesh, baseX: n.x, baseY: n.y };
    });

    // Layer D: Traveling Interstellar Starfield outside viewport (moves toward camera so ship feels cruising!)
    const travelCount = isMobile() ? 280 : 680;
    const travelPos = new Float32Array(travelCount * 3);
    for (let i = 0; i < travelCount; i++) {
      travelPos[i * 3] = (Math.random() - 0.5) * 44;
      travelPos[i * 3 + 1] = -2 + Math.random() * 18;
      travelPos[i * 3 + 2] = -6.5 - Math.random() * 29;
    }
    const travelGeo = new BufferGeometry();
    travelGeo.setAttribute('position', new Float32BufferAttribute(travelPos, 3));
    const travelMat = new PointsMaterial({
      size: isMobile() ? 0.16 : 0.13,
      map: starSpriteTex,
      color: 0xffedf9,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const travelStars = new Points(travelGeo, travelMat);
    cosmosGroup.add(travelStars);

    scene.add(cosmosGroup);

    // =========================================================================
    // 2. BELIEVABLE CURVED SPACECRAFT INTERIOR (CORRIDOR -> PANORAMIC BRIDGE)
    // =========================================================================
    const shipGroup = new Group();

    // Continuous Armored Flight Deck Floor (Corridor + Bridge)
    const mainDeck = new Mesh(new PlaneGeometry(26, 30), matDeck);
    mainDeck.rotation.x = -Math.PI / 2;
    mainDeck.position.set(0, 0, 2.5);
    shipGroup.add(mainDeck);

    // Entrance Corridor Bay Architecture (z: 3.8 -> 12.2) — Canted bulkhead bays + ceiling ribs
    const corridorStripMats = [];
    [11.4, 9.2, 7.0, 4.8].forEach((zPos, idx) => {
      const archCurve = new CatmullRomCurve3([
        new Vector3(-2.35, -0.05, zPos),
        new Vector3(-2.15, 2.25, zPos),
        new Vector3(-1.1, 3.65, zPos),
        new Vector3(0, 3.9, zPos),
        new Vector3(1.1, 3.65, zPos),
        new Vector3(2.15, 2.25, zPos),
        new Vector3(2.35, -0.05, zPos)
      ]);
      const archMesh = new Mesh(new TubeGeometry(archCurve, 28, 0.16, 10, false), matHullObsidian);
      shipGroup.add(archMesh);

      const trimCurve = new CatmullRomCurve3([
        new Vector3(-2.15, 0.2, zPos - 0.12),
        new Vector3(-1.95, 2.2, zPos - 0.12),
        new Vector3(0, 3.68, zPos - 0.12),
        new Vector3(1.95, 2.2, zPos - 0.12),
        new Vector3(2.15, 0.2, zPos - 0.12)
      ]);
      const trimMat = new MeshBasicMaterial({ color: energyColor, transparent: true, opacity: 0.08 });
      corridorStripMats.push({ mat: trimMat, tier: idx });
      shipGroup.add(new Mesh(new TubeGeometry(trimCurve, 24, 0.02, 6, false), trimMat));
    });

    // Corridor Left/Right Canted Acoustic Hull Walls
    [-1, 1].forEach((side) => {
      const wall = new Mesh(new PlaneGeometry(9.6, 4.4), matHullObsidian);
      wall.position.set(side * 2.48, 2.0, 8.2);
      wall.rotation.y = side * -Math.PI / 2;
      wall.rotation.z = side * 0.1;
      shipGroup.add(wall);
    });
    const corridorCeiling = new Mesh(new PlaneGeometry(5.6, 9.8), matHullObsidian);
    corridorCeiling.rotation.x = Math.PI / 2;
    corridorCeiling.position.set(0, 3.95, 8.2);
    shipGroup.add(corridorCeiling);

    // Wide Panoramic Command Bridge Curved Window Arc (z: -5.4, radius = 8.4m)
    const bridgeArcR = 8.4;
    const bridgeHullCurve = new CatmullRomCurve3([
      new Vector3(-6.4, -0.1, -1.8),
      new Vector3(-5.9, 3.2, -2.5),
      new Vector3(-3.4, 5.2, -3.5),
      new Vector3(0, 5.65, -3.8),
      new Vector3(3.4, 5.2, -3.5),
      new Vector3(5.9, 3.2, -2.5),
      new Vector3(6.4, -0.1, -1.8)
    ]);
    shipGroup.add(new Mesh(new TubeGeometry(bridgeHullCurve, 36, 0.24, 10, false), matHullObsidian));

    // Curved Observation Viewport Mullions (sculpted splines converging toward overhead bridge crown)
    const hullStripMats = [];
    [-0.56, -0.26, 0.26, 0.56].forEach((ang) => {
      const xBase = Math.sin(ang) * bridgeArcR;
      const zBase = -Math.cos(ang) * bridgeArcR + 2.4;
      const mullionCurve = new CatmullRomCurve3([
        new Vector3(xBase, 0.48, zBase),
        new Vector3(xBase * 0.98, 2.8, zBase + 0.15),
        new Vector3(xBase * 0.86, 5.4, zBase + 1.05)
      ]);
      const mullion = new Mesh(new TubeGeometry(mullionCurve, 18, 0.085, 8, false), matTitanium);
      shipGroup.add(mullion);

      const mStripMat = new MeshBasicMaterial({ color: magentaColor, transparent: true, opacity: 0.12 });
      hullStripMats.push(mStripMat);
      const mStrip = new Mesh(
        new TubeGeometry(
          new CatmullRomCurve3([
            new Vector3(xBase * 0.99, 0.58, zBase + 0.08),
            new Vector3(xBase * 0.97, 2.8, zBase + 0.22),
            new Vector3(xBase * 0.85, 5.25, zBase + 1.1)
          ]),
          16,
          0.015,
          6,
          false
        ),
        mStripMat
      );
      shipGroup.add(mStrip);
    });

    // Curved Lower Viewport Parapet Sill & Upper Canopy Brow + Subtle Curved Panoramic Glass
    const sillArc = new CylinderGeometry(bridgeArcR + 0.1, bridgeArcR + 0.22, 0.56, 40, 1, true, Math.PI * 0.72, Math.PI * 0.56);
    const sillMesh = new Mesh(sillArc, matHullObsidian);
    sillMesh.position.set(0, 0.26, 2.4);
    const sillRail = new Mesh(new CylinderGeometry(bridgeArcR, bridgeArcR, 0.05, 40, 1, true, Math.PI * 0.72, Math.PI * 0.56), matTitanium);
    sillRail.position.set(0, 0.56, 2.4);
    const windowGlass = new Mesh(new CylinderGeometry(bridgeArcR + 0.05, bridgeArcR + 0.05, 4.9, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56), matWindowGlass);
    windowGlass.position.set(0, 3.0, 2.4);
    const upperCanopy = new Mesh(new CylinderGeometry(bridgeArcR + 0.5, bridgeArcR - 0.6, 1.4, 36, 1, true, Math.PI * 0.7, Math.PI * 0.6), matHullObsidian);
    upperCanopy.position.set(0, 5.45, 2.6);
    shipGroup.add(sillMesh, sillRail, windowGlass, upperCanopy);

    // Bridge Corridor Floor Conduit Ignition Tracks
    const conduitMat = new MeshBasicMaterial({ color: energyColor, transparent: true, opacity: 0.0 });
    const conduits = [
      { x: 0, y: 0.008, z: 6.2, w: 0.032, d: 11.4, alongZ: true },
      { x: -1.45, y: 0.008, z: 6.5, w: 0.022, d: 10.6, alongZ: true },
      { x: 1.45, y: 0.008, z: 6.5, w: 0.022, d: 10.6, alongZ: true }
    ].map((spec) => {
      const m = new Mesh(new CylinderGeometry(spec.w * 0.5, spec.w * 0.5, spec.d, 8), conduitMat);
      m.rotation.x = Math.PI / 2;
      m.position.set(spec.x, spec.y, spec.z);
      m.userData.alongZ = true;
      shipGroup.add(m);
      return m;
    });

    scene.add(shipGroup);

    // =========================================================================
    // 3. PHYSICAL COMMAND CONSOLE & GROUNDED OTP PORTFOLIO HARDWARE
    // =========================================================================
    const bridgeConsole = new Group();
    const daisMesh = new Mesh(new CylinderGeometry(2.55, 2.75, 0.05, 8), matHullObsidian);
    daisMesh.position.set(0, 0.025, 0.05);
    const deskTop = new Mesh(createDeskWingGeometry(), matHullObsidian);
    deskTop.position.set(0, 0.78, 0.0);
    // Machined Titanium Cantilever Pylons supporting horseshoe desk
    [-1.48, 1.48].forEach((px) => {
      const pylon = new Mesh(new CylinderGeometry(0.11, 0.16, 0.72, 16), matTitanium);
      pylon.position.set(px, 0.37, -0.05);
      bridgeConsole.add(pylon);
    });
    const centerColumn = new Mesh(new CylinderGeometry(0.22, 0.32, 0.72, 20), matHardwareBody);
    centerColumn.position.set(0, 0.37, -0.32);
    bridgeConsole.add(daisMesh, deskTop, centerColumn);
    scene.add(bridgeConsole);

    // Helper: Build a Physical Machined Display on Articulated Stand (Zero floating rectangles!)
    function loadScreenMat(url) {
      const mat = new MeshBasicMaterial({
        map: createUiFallbackTexture(tokens.accent),
        color: 0xffffff,
        transparent: true,
        opacity: 0.04
      });
      texLoader.load(
        url,
        (tex) => {
          tex.colorSpace = SRGBColorSpace;
          mat.map = tex;
          mat.needsUpdate = true;
        },
        undefined,
        () => {}
      );
      return mat;
    }

    function buildPhysicalDisplay(opts) {
      const { w, h, screenMat, x, y, z, ry, standH = 0.24, tiltX = -0.04 } = opts;
      const g = new Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;

      // Desk Base + Cylinder Articulated Arm
      const baseFoot = new Mesh(new CylinderGeometry(0.12, 0.15, 0.02, 20), matTitanium);
      baseFoot.position.set(0, 0.01, -0.04);
      const neck = new Mesh(new CylinderGeometry(0.028, 0.034, standH + h * 0.35, 14), matTitanium);
      neck.position.set(0, (standH + h * 0.35) * 0.5, -0.055);
      neck.rotation.x = 0.08;
      g.add(baseFoot, neck);

      // Machined Rounded Bezel Head
      const headPivot = new Group();
      headPivot.position.set(0, standH + h * 0.5, 0);
      headPivot.rotation.x = tiltX;
      const chassisGeo = new ExtrudeGeometry(createRoundedRectShape(w + 0.06, h + 0.06, 0.032), {
        depth: 0.028,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.008,
        bevelThickness: 0.008
      });
      const chassis = new Mesh(chassisGeo, matHardwareBody);
      chassis.position.z = -0.028;

      const screenPlane = new Mesh(new PlaneGeometry(w, h), screenMat);
      screenPlane.position.z = 0.011;
      headPivot.add(chassis, screenPlane);
      g.add(headPivot);

      return { group: g, headPivot, screenMat };
    }

    const matWebMain = loadScreenMat('/assets/case-studies/floivation/after-home.jpg');
    const matEcom = loadScreenMat('/assets/services/ecommerce-experience.webp');
    const matArtist = loadScreenMat('/assets/services/artist-epk.webp');
    const matFloorOps = loadScreenMat('/assets/demos/floorops-dockguard.webp');
    const matMobile = loadScreenMat('/assets/weatheros/screenshots/today-public.webp');
    const matOtpOs = loadScreenMat('/assets/demos/otp-os-desktop.webp');
    const matRedesign = loadScreenMat('/assets/hyh-otp-rebuild.jpg');
    const matDigital = loadScreenMat('/assets/demos/otp-templates-grid.webp');

    const hardwareStationGroup = new Group();

    // 1. Center Master 38" Flagship Studio Monitor — Websites (FLOIVATION)
    const dispCenter = buildPhysicalDisplay({
      w: 1.48, h: 0.84, screenMat: matWebMain, x: 0, y: 0.78, z: -0.45, ry: 0, standH: 0.24, tiltX: -0.03
    });

    // 2. Left Articulated Arm Display — E-Commerce Experiences
    const dispLeft = buildPhysicalDisplay({
      w: 0.86, h: 0.52, screenMat: matEcom, x: -1.48, y: 0.78, z: -0.22, ry: 0.42, standH: 0.34, tiltX: -0.04
    });

    // 3. Right Articulated Arm Display — Creative Production & Artist Platforms
    const dispRight = buildPhysicalDisplay({
      w: 0.86, h: 0.52, screenMat: matArtist, x: 1.48, y: 0.78, z: -0.22, ry: -0.42, standH: 0.34, tiltX: -0.04
    });

    // 4. Outer Left Wing Desk Console Monitor — Architecture & Redesign (HYH)
    const dispWingL = buildPhysicalDisplay({
      w: 0.72, h: 0.44, screenMat: matRedesign, x: -2.05, y: 0.78, z: 0.28, ry: 0.74, standH: 0.16, tiltX: -0.08
    });

    // 5. Outer Right Wing Desk Console Monitor — Business Infrastructure (OTP OS)
    const dispWingR = buildPhysicalDisplay({
      w: 0.72, h: 0.44, screenMat: matOtpOs, x: 2.05, y: 0.78, z: 0.28, ry: -0.74, standH: 0.16, tiltX: -0.08
    });

    // 6. Left Desk Open CNC Aluminum Laptop — Custom Web Apps (FloorOps DockGuard)
    const laptopGroup = new Group();
    laptopGroup.position.set(-0.76, 0.785, 0.18);
    laptopGroup.rotation.y = 0.24;
    const lapChassisGeo = new ExtrudeGeometry(createRoundedRectShape(0.66, 0.44, 0.024), {
      depth: 0.016, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.005, bevelThickness: 0.005
    });
    lapChassisGeo.rotateX(Math.PI / 2);
    const lapBase = new Mesh(lapChassisGeo, matTitanium);
    const lapKeybed = new Mesh(new PlaneGeometry(0.56, 0.24), matHardwareBody);
    lapKeybed.rotation.x = -Math.PI / 2;
    lapKeybed.position.set(0, 0.009, -0.04);
    const lapLidPivot = new Group();
    lapLidPivot.position.set(0, 0.012, -0.21);
    const lapLidGeo = new ExtrudeGeometry(createRoundedRectShape(0.66, 0.43, 0.022), {
      depth: 0.01, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.004, bevelThickness: 0.004
    });
    const lapLid = new Mesh(lapLidGeo, matHardwareBody);
    lapLid.position.set(0, 0.215, -0.01);
    const lapScreen = new Mesh(new PlaneGeometry(0.61, 0.38), matFloorOps);
    lapScreen.position.set(0, 0.215, 0.006);
    lapLidPivot.add(lapLid, lapScreen);
    laptopGroup.add(lapBase, lapKeybed, lapLidPivot);

    // 7. Right Desk Foreground Docked Tablet Pro Slate — Digital Systems (Templates)
    const tabletGroup = new Group();
    tabletGroup.position.set(0.72, 0.785, 0.14);
    tabletGroup.rotation.y = -0.26;
    const tabDock = new Mesh(new CylinderGeometry(0.12, 0.14, 0.022, 20), matTitanium);
    const tabPivot = new Group();
    tabPivot.position.set(0, 0.2, 0);
    tabPivot.rotation.x = -0.32;
    const tabBody = new Mesh(
      new ExtrudeGeometry(createRoundedRectShape(0.46, 0.32, 0.02), { depth: 0.01, bevelEnabled: false }),
      matHardwareBody
    );
    tabBody.position.z = -0.008;
    const tabScreen = new Mesh(new PlaneGeometry(0.43, 0.29), matDigital);
    tabScreen.position.z = 0.006;
    tabPivot.add(tabBody, tabScreen);
    tabletGroup.add(tabDock, tabPivot);

    // 8. Center-Right MagSafe Titanium iPhone — Native Mobile Apps (WeatherOS)
    const phoneGroup = new Group();
    phoneGroup.position.set(1.16, 0.785, 0.34);
    phoneGroup.rotation.y = -0.38;
    const phoneStand = new Mesh(new CylinderGeometry(0.08, 0.1, 0.018, 20), matTitanium);
    const phoneNeck = new Mesh(new CylinderGeometry(0.016, 0.02, 0.18, 12), matTitanium);
    phoneNeck.position.set(0, 0.09, -0.03);
    const phoneHead = new Group();
    phoneHead.position.set(0, 0.24, 0.01);
    phoneHead.rotation.x = -0.18;
    const phoneBody = new Mesh(
      new ExtrudeGeometry(createRoundedRectShape(0.22, 0.43, 0.028), { depth: 0.014, bevelEnabled: false }),
      matHardwareBody
    );
    phoneBody.position.z = -0.012;
    const phoneScreen = new Mesh(new PlaneGeometry(0.195, 0.39), matMobile);
    phoneScreen.position.z = 0.005;
    phoneHead.add(phoneBody, phoneScreen);
    phoneGroup.add(phoneStand, phoneNeck, phoneHead);

    // Center Tactile Aluminum Mechanical Keyboard + Studio Trackpad seated on desk
    const deskKeyboard = new Mesh(new PlaneGeometry(0.48, 0.15), matTitanium);
    deskKeyboard.rotation.x = -Math.PI / 2;
    deskKeyboard.position.set(0, 0.786, 0.22);

    hardwareStationGroup.add(
      dispCenter.group,
      dispLeft.group,
      dispRight.group,
      dispWingL.group,
      dispWingR.group,
      laptopGroup,
      tabletGroup,
      phoneGroup,
      deskKeyboard
    );
    scene.add(hardwareStationGroup);

    // Chapter 5 Subtle Architectural Orbital Emblem above Master Display
    const perspectiveGroup = new Group();
    perspectiveGroup.position.set(0, 2.75, -1.2);
    const ringOuter = new Mesh(new TorusGeometry(0.46, 0.015, 16, 72), matTitanium);
    const ringAccentMat = new MeshBasicMaterial({ color: energyColor, transparent: true, opacity: 0 });
    const ringInner = new Mesh(new TorusGeometry(0.35, 0.012, 16, 64), ringAccentMat);
    const sealMat = new MeshBasicMaterial({
      map: createOrbitalSealTexture(),
      color: 0xfff0fa,
      transparent: true,
      opacity: 0
    });
    const sealPlane = new Mesh(new PlaneGeometry(0.56, 0.56), sealMat);
    perspectiveGroup.add(ringOuter, ringInner, sealPlane);
    scene.add(perspectiveGroup);

    function resize() {
      const w = stage?.clientWidth || root.innerWidth || 1280;
      const h = stage?.clientHeight || root.innerHeight || 720;
      camera.aspect = w / Math.max(1, h);
      camera.fov = isMobile() ? 56 : 42;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, isMobile() ? 1.5 : 2));
    }

    function applyThemeColors() {
      const next = readThemeTokens();
      accentColor.set(next.accent);
      const nextEnergy = computeEnergyColor(accentColor);
      consolePoint.color.copy(nextEnergy);
      ringAccentMat.color.copy(nextEnergy);
      conduitMat.color.copy(nextEnergy);
      corridorStripMats.forEach((c) => c.mat.color.copy(nextEnergy));
      if (envTex) envTex.dispose();
      envTex = createSpacecraftEnvironment(renderer, `#${nextEnergy.getHexString()}`, next.theme === 'light');
      if (envTex) scene.environment = envTex;
    }

    resize();

    let lastClock = performance.now();
    let elapsed = 0;

    function updateScene(p, now) {
      const dt = Math.min(0.05, (now - lastClock) / 1000);
      lastClock = now;
      if (!state.userPaused) elapsed += dt;

      const ch2 = smoothstep(0.18, 0.39, p);
      const ch3 = smoothstep(0.39, 0.61, p);
      const ch4 = smoothstep(0.61, 0.83, p);
      const ch5 = smoothstep(0.83, 0.99, p);

      // 1. Living Multidimensional Space Travel & Celestial Parallax
      const tPos = travelGeo.attributes.position;
      for (let i = 0; i < travelCount; i++) {
        let z = tPos.getZ(i) + (state.userPaused ? 0 : dt * 1.45);
        if (z > -6.0) z = -35.0;
        tPos.setZ(i, z);
      }
      tPos.needsUpdate = true;

      planetGroup.rotation.y = elapsed * 0.035;
      planetGroup.position.x = -7.6 + state.pointerX * -0.55 + p * 0.85;
      planetGroup.position.y = 4.25 + state.pointerY * -0.25 - ch5 * 0.35;

      galaxyPlane.position.x = state.pointerX * -0.25;
      const gScale = 1.0 + p * 0.08;
      galaxyPlane.scale.set(gScale, gScale, 1);

      nebClouds.forEach((nc, idx) => {
        nc.mesh.position.x = nc.baseX + state.pointerX * (-0.35 - idx * 0.14) + Math.sin(elapsed * 0.12 + idx) * 0.35;
        nc.mesh.position.y = nc.baseY + state.pointerY * (-0.18 - idx * 0.08);
      });

      // 2. Awakening Energy Traveling Forward Down Corridor -> Bridge
      conduitMat.opacity = 0.08 + ch2 * 0.86;
      corridorStripMats.forEach((item) => {
        const wave = smoothstep(0.16 + item.tier * 0.045, 0.34 + item.tier * 0.045, p);
        item.mat.opacity = 0.06 + wave * 0.65;
      });
      corridorPoint.intensity = 0.4 + ch2 * 2.1 * (1 - ch4 * 0.6);
      hullStripMats.forEach((m, idx) => {
        m.opacity = 0.08 + ch2 * 0.3 + ch4 * 0.15 * (0.75 + 0.25 * Math.sin(elapsed + idx));
      });
      consolePoint.intensity = 0.25 + ch3 * 1.5 + ch4 * 0.8;

      // 3. Natural Power-On of Grounded Physical Hardware (Zero box stretching)
      const mainPower = smoothstep(0.38, 0.56, p);
      const wingPower = smoothstep(0.55, 0.76, p);

      matWebMain.opacity = MathUtils.lerp(0.05, 1.0, mainPower);
      matFloorOps.opacity = MathUtils.lerp(0.04, 1.0, smoothstep(0.42, 0.58, p));
      lapLidPivot.rotation.x = MathUtils.lerp(-1.42, -0.18, smoothstep(0.42, 0.58, p));

      matEcom.opacity = MathUtils.lerp(0.04, 1.0, smoothstep(0.48, 0.65, p));
      matArtist.opacity = MathUtils.lerp(0.04, 1.0, smoothstep(0.52, 0.69, p));
      matMobile.opacity = MathUtils.lerp(0.04, 1.0, smoothstep(0.54, 0.72, p));
      matDigital.opacity = MathUtils.lerp(0.04, 1.0, wingPower);
      matRedesign.opacity = MathUtils.lerp(0.04, 1.0, smoothstep(0.6, 0.78, p));
      matOtpOs.opacity = MathUtils.lerp(0.04, 1.0, smoothstep(0.62, 0.8, p));

      dispLeft.group.rotation.y = MathUtils.lerp(0.56, 0.4, wingPower);
      dispRight.group.rotation.y = MathUtils.lerp(-0.56, -0.4, wingPower);

      // 4. Chapter 5 Beyond Orbital Seal
      perspectiveGroup.visible = p > 0.75;
      const sealVis = smoothstep(0.76, 0.91, p);
      perspectiveGroup.position.y = MathUtils.lerp(2.25, 2.75, sealVis);
      ringAccentMat.opacity = sealVis * 0.9;
      sealMat.opacity = smoothstep(0.8, 0.93, p);
      ringOuter.rotation.z = elapsed * 0.22;
      ringInner.rotation.y = elapsed * 0.34;
      ringInner.rotation.x = Math.sin(elapsed * 0.5) * 0.14;

      // 5. Continuous Corridor -> Command Deck -> Sweeping Orbit -> Panoramic Beyond Camera
      const mobileShiftZ = isMobile() ? 5.95 : 0;
      const mobileShiftY = isMobile() ? 0.55 : 0;
      let cx = 0;
      let cy = 1.72;
      let cz = 11.4;
      let lookY = 1.45;
      let lookZ = -3.8;

      if (p < 0.25) {
        // Chapter 1 -> 2: Start inside corridor and travel steadily forward
        const t = smoothstep(0.0, 0.25, p);
        cx = 0;
        cy = MathUtils.lerp(1.72, 1.68, t);
        cz = MathUtils.lerp(11.4, 7.6, t);
        lookY = MathUtils.lerp(1.5, 1.4, t);
      } else if (p < 0.56) {
        // Chapter 2 -> 3: Emerge from corridor onto command bridge approaching stations
        const t = smoothstep(0.25, 0.56, p);
        cx = MathUtils.lerp(0.0, -0.95, t);
        cy = MathUtils.lerp(1.68, 1.66, t);
        cz = MathUtils.lerp(7.6, 4.35, t);
        lookY = MathUtils.lerp(1.4, 1.15, t);
      } else if (p < 0.82) {
        // Chapter 4 Creation: Glide smoothly across port -> starboard hardware stations
        const t = smoothstep(0.56, 0.82, p);
        cx = MathUtils.lerp(-0.95, 0.85, t);
        cy = MathUtils.lerp(1.66, 1.76, t);
        cz = MathUtils.lerp(4.35, 4.45, t);
        lookY = MathUtils.lerp(1.15, 1.24, t);
      } else {
        // Chapter 5 Beyond: Centered majestic wide bridge master shot overlooking living galaxy
        const t = smoothstep(0.82, 1.0, p);
        cx = MathUtils.lerp(0.85, 0.0, t);
        cy = MathUtils.lerp(1.76, 1.98, t);
        cz = MathUtils.lerp(4.45, 5.1, t);
        lookY = MathUtils.lerp(1.24, 1.65, t);
        lookZ = MathUtils.lerp(-3.8, -6.0, t);
      }

      state.pointerX = MathUtils.lerp(state.pointerX, state.targetPointerX, 0.08);
      state.pointerY = MathUtils.lerp(state.pointerY, state.targetPointerY, 0.08);
      camera.position.set(
        cx + state.pointerX * 0.4,
        cy + mobileShiftY + state.pointerY * 0.2,
        cz + mobileShiftZ
      );
      camTarget.set(
        state.pointerX * -0.15,
        isMobile() ? MathUtils.lerp(-2.35, -1.95, ch5) : lookY,
        isMobile() ? -2.2 : lookZ
      );
      camera.lookAt(camTarget);

      renderer.render(scene, camera);
      state.drawCalls = renderer.info?.render?.calls || 0;
    }

    function frameLoop(now) {
      if (state.disposed || !state.enabled) {
        state.rafId = 0;
        return;
      }
      if (!state.isVisible || doc.hidden) {
        state.rafId = 0;
        return;
      }
      state.targetProgress = getScrollProgress();
      state.progress = MathUtils.lerp(state.progress, state.targetProgress, 0.16);
      if (Math.abs(state.targetProgress - state.progress) < 0.0004) {
        state.progress = state.targetProgress;
      }
      updateHud(state.progress);
      updateScene(state.progress, now);
      state.rafId = root.requestAnimationFrame(frameLoop);
    }

    function ensureRunning() {
      if (!state.rafId && state.enabled && state.isVisible && !doc.hidden && !state.disposed) {
        lastClock = performance.now();
        state.rafId = root.requestAnimationFrame(frameLoop);
      }
    }

    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      state.disposed = true;
      if (state.rafId) root.cancelAnimationFrame(state.rafId);
      activateFallback('fallback');
    });

    state.mode = 'webgl';
    section.dataset.genesisMode = 'webgl';

    return {
      scene,
      renderer,
      resize,
      applyThemeColors,
      ensureRunning,
      dispose() {
        state.disposed = true;
        if (state.rafId) root.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        try {
          scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((m) => {
                if (m.map) m.map.dispose();
                if (m.bumpMap) m.bumpMap.dispose();
                m.dispose();
              });
            }
          });
          if (envTex) envTex.dispose();
          if (deckBumpTex) deckBumpTex.dispose();
          if (metalBumpTex) metalBumpTex.dispose();
          if (starSpriteTex) starSpriteTex.dispose();
          renderer.dispose();
        } catch {}
        canvasHost.replaceChildren();
      }
    };
  }

  let controller = null;

  function applyEnabledState(enabled) {
    state.enabled = Boolean(enabled);
    if (!state.enabled) {
      section.hidden = true;
      section.classList.add('is-disabled');
      section.dataset.genesisMode = 'disabled';
      doc.body?.classList.remove('has-genesis-intro');
      controller?.dispose?.();
      controller = null;
      return;
    }

    section.hidden = false;
    section.classList.remove('is-disabled');
    doc.body?.classList.add('has-genesis-intro');

    if (prefersReducedMotionQuery.matches) {
      controller?.dispose?.();
      controller = null;
      activateFallback('reduced-motion');
      return;
    }

    if (!controller) {
      controller = initWebGLScene();
    }
    if (controller) {
      state.progress = getScrollProgress();
      updateHud(state.progress);
      controller.ensureRunning();
    }
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      const hero = doc.getElementById('home-hero') || doc.querySelector('.home-hero');
      if (hero) {
        hero.scrollIntoView({ behavior: prefersReducedMotionQuery.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      state.userPaused = !state.userPaused;
      motionBtn.setAttribute('aria-pressed', state.userPaused ? 'true' : 'false');
      motionBtn.textContent = state.userPaused ? 'Resume motion' : 'Pause motion';
      if (state.mode !== 'webgl' && fallbackWrap) {
        const vid = fallbackWrap.querySelector('video');
        if (state.userPaused) vid?.pause?.();
        else vid?.play?.().catch(() => {});
      }
    });
  }

  chapterButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const ch = CHAPTERS[idx];
      if (!ch) return;
      const total = Math.max(1, section.offsetHeight - root.innerHeight);
      const top = section.offsetTop + Math.round(total * ch.jumpProgress);
      root.scrollTo({
        top,
        behavior: prefersReducedMotionQuery.matches ? 'auto' : 'smooth'
      });
    });
  });

  if ('IntersectionObserver' in root) {
    const visObs = new root.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          state.isVisible = entry.isIntersecting;
          if (state.isVisible) controller?.ensureRunning?.();
        });
      },
      { threshold: 0.01 }
    );
    visObs.observe(section);
  }

  root.addEventListener('scroll', () => {
    if (!state.enabled) return;
    if (controller) controller.ensureRunning();
    else updateHud(getScrollProgress());
  }, { passive: true });

  root.addEventListener('resize', () => {
    controller?.resize?.();
    controller?.ensureRunning?.();
  }, { passive: true });

  stage?.addEventListener('pointermove', (e) => {
    if (!state.enabled || state.userPaused) return;
    const w = root.innerWidth || 1280;
    const h = root.innerHeight || 720;
    state.targetPointerX = (e.clientX / w - 0.5) * 2;
    state.targetPointerY = (e.clientY / h - 0.5) * -2;
  }, { passive: true });

  doc.addEventListener('visibilitychange', () => {
    if (!doc.hidden && state.isVisible) {
      controller?.ensureRunning?.();
    }
  });

  const themeObserver = 'MutationObserver' in root
    ? new root.MutationObserver(() => controller?.applyThemeColors?.())
    : null;
  if (themeObserver && doc.documentElement) {
    themeObserver.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette', 'style']
    });
  }
  root.addEventListener('otp:themechange', () => controller?.applyThemeColors?.());
  root.addEventListener('otp:accentchange', () => controller?.applyThemeColors?.());

  if (prefersReducedMotionQuery.addEventListener) {
    prefersReducedMotionQuery.addEventListener('change', () => applyEnabledState(isFlagEnabled()));
  }

  root.OTP_GENESIS = Object.freeze({
    chapters: CHAPTERS,
    setEnabled(next) {
      try {
        if (next) root.localStorage?.removeItem(config.storageKey);
        else root.localStorage?.setItem(config.storageKey, '1');
      } catch {}
      applyEnabledState(Boolean(next));
      return state.enabled;
    },
    skipToHome() {
      skipBtn?.click();
    },
    getState() {
      return {
        enabled: state.enabled,
        mode: state.mode,
        progress: Number(state.progress.toFixed(4)),
        chapter: CHAPTERS[state.chapterIndex]?.id || 'arrival',
        chapterIndex: state.chapterIndex,
        drawCalls: state.drawCalls,
        theme: state.theme,
        accentHex: state.accentHex
      };
    }
  });

  applyEnabledState(isFlagEnabled());
})(typeof window !== 'undefined' ? window : globalThis);
