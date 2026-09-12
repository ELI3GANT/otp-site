/**
 * BLACKBOX SIGNAL — Audio Engine & Reactive Visualizer
 * OnlyTruePerspective × Vault Experience
 *
 * Supports M4A/AAC and MP3 inputs with WebKit/Safari detection,
 * reliable multi-event duration discovery, real Web Audio FFT analysis,
 * robust playback lifecycle, and battery-conscious performance.
 */

(function () {
  'use strict';

  // Configuration Fallback
  const DEFAULT_CONFIG = {
    signalNumber: '001',
    signalName: 'SIGNAL 001',
    transmissionStatus: 'TRANSMISSION ACTIVE',
    offlineStatus: 'SIGNAL OFFLINE',
    sourceModeLabel: '[ 24 SEC INTERCEPT ]',
    tagline: 'Signal intercepted from an unreleased session.',
    audioSources: [
      { src: '/assets/audio/blackbox-signal.m4a', type: 'audio/mp4' },
      { src: '/assets/audio/blackbox-signal.mp3', type: 'audio/mpeg' },
      { src: '/assets/audio/blackbox-signal.wav', type: 'audio/wav' }
    ],
    audioSource: '/assets/audio/blackbox-signal.mp3',
    teaserDurationSeconds: 24
  };

  const config = (typeof window !== 'undefined' && window.BLACKBOX_SIGNAL_CONFIG) || DEFAULT_CONFIG;

  // DOM Elements
  const playBtn = document.getElementById('signal-play-btn');
  const btnIcon = document.getElementById('signal-btn-icon');
  const btnLabel = document.getElementById('signal-btn-label');
  const progressBar = document.getElementById('signal-progress-bar');
  const progressFill = document.getElementById('signal-progress-fill');
  const timeDisplay = document.getElementById('signal-time-display');
  const badgeStatus = document.getElementById('signal-badge-status');
  const statusBeacon = document.getElementById('signal-status-beacon');
  const modePill = document.getElementById('signal-mode-pill');
  const canvas = document.getElementById('signal-canvas');
  const signalTitle = document.getElementById('signal-title');
  const atmosphere = document.getElementById('signal-atmosphere');
  const body = document.body;

  // State
  let audio = null;
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let dataArray = null;
  let isPlaying = false;
  let isLoaded = false;
  let isAudioAvailable = true;
  let animFrameId = null;
  let duration = (config.teaserDurationSeconds && isFinite(config.teaserDurationSeconds) && config.teaserDurationSeconds > 0)
    ? config.teaserDurationSeconds
    : 24;
  let activeSourceIndex = 0;
  let sortedSources = [];

  // Visualizer Smooth Energy Decay State
  let currentAvgEnergy = 0;
  let currentBassEnergy = 0;

  // Glitch System State
  let glitchTimeoutId = null;
  let lastGlitchTimestamp = 0;
  let prevBassEnergy = 0;
  const GLITCH_AUDIO_COOLDOWN_MS = 2400; // Minimum 2.4s between bass transients
  let ambientGlitchTimer = null;
  let endSequenceTimer = null;

  // Prefers-reduced-motion check
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animation frame fallbacks
  const raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
    ? window.requestAnimationFrame.bind(window)
    : function (cb) { return setTimeout(cb, 1000 / 60); };
  const caf = (typeof window !== 'undefined' && window.cancelAnimationFrame)
    ? window.cancelAnimationFrame.bind(window)
    : function (id) { clearTimeout(id); };

  // Format seconds to M:SS
  function formatTime(seconds) {
    if (!seconds || !isFinite(seconds) || seconds <= 0) return '0:00';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins + ':' + secs.toString().padStart(2, '0');
  }

  // Update time display
  function updateTimeDisplay(current, total) {
    if (!timeDisplay) return;
    const safeTotal = (total && isFinite(total) && total > 0) ? total : duration;
    const currentStr = formatTime(current);
    const totalStr = safeTotal > 0 ? formatTime(safeTotal) : '0:24';
    timeDisplay.textContent = currentStr + ' / ' + totalStr;
  }

  // Set top telemetry status pill
  function setSystemStatus(state) {
    if (!badgeStatus || !statusBeacon) return;
    if (state === 'ready') {
      badgeStatus.textContent = 'SIGNAL READY';
      statusBeacon.setAttribute('data-state', 'ready');
    } else if (state === 'loading') {
      badgeStatus.textContent = 'ACQUIRING SIGNAL';
      statusBeacon.setAttribute('data-state', 'loading');
    } else if (state === 'playing') {
      badgeStatus.textContent = config.transmissionStatus || 'TRANSMISSION ACTIVE';
      statusBeacon.setAttribute('data-state', 'playing');
    } else if (state === 'paused') {
      badgeStatus.textContent = 'SIGNAL PAUSED';
      statusBeacon.setAttribute('data-state', 'paused');
    } else if (state === 'ended') {
      badgeStatus.textContent = 'TRANSMISSION ENDED';
      statusBeacon.setAttribute('data-state', 'ended');
    } else if (state === 'offline') {
      badgeStatus.textContent = config.offlineStatus || 'SIGNAL OFFLINE';
      statusBeacon.setAttribute('data-state', 'offline');
    }
  }

  // Canvas Setup & Hi-DPI Scaling
  let ctx = null;
  let canvasWidth = 520;
  let canvasHeight = 140;

  function initCanvas() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(280, Math.floor(rect.width || 520));
    canvasHeight = Math.max(90, Math.floor(rect.height || 140));

    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    ctx.scale(dpr, dpr);
  }

  // Ambient Particles for Visualizer
  const particles = [];
  const PARTICLE_COUNT = 22;

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: Math.random() * 1.4 + 0.6,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.45 + 0.15
      });
    }
  }

  // Candidate audio source detection
  function getCandidateSources() {
    const list = [];
    if (Array.isArray(config.audioSources) && config.audioSources.length > 0) {
      config.audioSources.forEach(function (item) {
        if (typeof item === 'string') {
          list.push({ src: item, type: getMimeFromUrl(item) });
        } else if (item && item.src) {
          list.push({ src: item.src, type: item.type || getMimeFromUrl(item.src) });
        }
      });
    } else if (config.audioSource) {
      list.push({ src: config.audioSource, type: getMimeFromUrl(config.audioSource) });
    }
    return list;
  }

  function getMimeFromUrl(url) {
    if (/\.m4a(\?.*)?$/i.test(url)) return 'audio/mp4';
    if (/\.wav(\?.*)?$/i.test(url)) return 'audio/wav';
    if (/\.aac(\?.*)?$/i.test(url)) return 'audio/aac';
    if (/\.ogg(\?.*)?$/i.test(url)) return 'audio/ogg';
    return 'audio/mpeg';
  }

  // Browser capability and codec priority determination:
  // - Prefer M4A (AAC 256kbps, 780KB) for WebKit/Safari
  // - Prefer MP3 (320kbps, 940KB) for universal broadcast
  // - WAV (4MB) is only a last resort fallback, NOT downloaded on startup
  function selectOptimalAudioSource(sources) {
    const temp = document.createElement('audio');
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const isSafariOrWebKit = /^((?!chrome|android).)*safari/i.test(ua) ||
      (/AppleWebKit/i.test(ua) && !/chrome/i.test(ua));

    const m4aCandidate = sources.find(function (s) { return s.type === 'audio/mp4' || s.src.endsWith('.m4a'); });
    const mp3Candidate = sources.find(function (s) { return s.type === 'audio/mpeg' || s.src.endsWith('.mp3'); });
    const wavCandidate = sources.find(function (s) { return s.type === 'audio/wav' || s.src.endsWith('.wav'); });

    const prioritized = [];

    if (isSafariOrWebKit && temp.canPlayType && temp.canPlayType('audio/mp4') !== '') {
      if (m4aCandidate) prioritized.push(m4aCandidate);
      if (mp3Candidate) prioritized.push(mp3Candidate);
    } else {
      if (mp3Candidate) prioritized.push(mp3Candidate);
      if (m4aCandidate) prioritized.push(m4aCandidate);
    }

    // WAV is strictly an emergency fallback
    if (wavCandidate) prioritized.push(wavCandidate);

    return prioritized.length > 0 ? prioritized : sources;
  }

  // Audio Engine Initialization
  function initAudio() {
    if (audio) return;
    const candidates = getCandidateSources();
    if (candidates.length === 0) {
      handleAudioUnavailable();
      return;
    }

    sortedSources = selectOptimalAudioSource(candidates);
    activeSourceIndex = 0;

    audio = new Audio();
    audio.preload = 'metadata';

    // Only set crossOrigin if URL is cross-origin to avoid WebKit CORS false positives on same-origin assets
    const primaryUrl = sortedSources[0].src;
    if (typeof window !== 'undefined' && primaryUrl.startsWith('http') && !primaryUrl.startsWith(window.location.origin)) {
      audio.crossOrigin = 'anonymous';
    }

    // Set src directly without redundant <source> children to avoid parallel downloads of WAV
    audio.src = primaryUrl;

    // Immediately display configured teaser duration (0:00 / 0:24)
    updateTimeDisplay(0, duration);
    if (progressBar) {
      progressBar.setAttribute('aria-valuemax', String(Math.floor(duration)));
      progressBar.setAttribute('aria-valuenow', '0');
    }

    // Multi-event duration discovery & sync
    function syncDurationFromMedia() {
      if (!audio) return;
      const mediaDuration = audio.duration;
      if (isFinite(mediaDuration) && mediaDuration > 0) {
        if (config.teaserDurationSeconds && config.teaserDurationSeconds < mediaDuration) {
          duration = config.teaserDurationSeconds;
        } else {
          duration = Math.round(mediaDuration * 10) / 10;
        }
        isLoaded = true;
        isAudioAvailable = true;
        updateTimeDisplay(audio.currentTime, duration);
        if (progressBar) progressBar.setAttribute('aria-valuemax', String(Math.floor(duration)));
      }
    }

    audio.addEventListener('loadedmetadata', syncDurationFromMedia);
    audio.addEventListener('durationchange', syncDurationFromMedia);
    audio.addEventListener('loadeddata', syncDurationFromMedia);
    audio.addEventListener('canplay', syncDurationFromMedia);
    audio.addEventListener('canplaythrough', syncDurationFromMedia);

    audio.addEventListener('timeupdate', function () {
      if (!audio) return;
      const current = Math.min(audio.currentTime, duration || audio.duration || 0);
      const percent = duration > 0 ? (current / duration) * 100 : 0;

      if (progressFill) progressFill.style.width = percent + '%';
      if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.floor(current)));
      updateTimeDisplay(current, duration);

      if (duration > 0 && current >= duration) {
        handlePlaybackEnded();
      }
    });

    audio.addEventListener('ended', handlePlaybackEnded);

    audio.addEventListener('error', function () {
      // Gracefully switch to alternative format if chosen source fails
      activeSourceIndex++;
      if (activeSourceIndex < sortedSources.length) {
        audio.src = sortedSources[activeSourceIndex].src;
        audio.load();
      } else {
        handleAudioUnavailable();
      }
    });

    // Explicitly initiate metadata load
    try {
      audio.load();
    } catch (e) {
      // Ignored in restricted environments
    }
  }

  function handleAudioUnavailable() {
    isAudioAvailable = false;
    isPlaying = false;
    updatePlayButtonState('offline');
    setSystemStatus('offline');
    body.setAttribute('data-playback', 'idle');
  }

  // Web Audio Context Setup (Unlocked on user gesture for iOS Safari)
  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Guard against duplicate createMediaElementSource call (throws InvalidStateError)
    if (!sourceNode && audioCtx && audio) {
      try {
        sourceNode = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        // Fallback to native audio playback without analyser
        analyser = null;
      }
    }
  }

  // ==========================================================================
  // Glitch Transmission System (Controlled, Cinematic, Premium)
  // ==========================================================================
  function triggerTitleGlitch(type, durationMs) {
    type = type || 'burst';
    durationMs = durationMs || 240;
    if (prefersReducedMotion || !signalTitle) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    if (glitchTimeoutId) {
      clearTimeout(glitchTimeoutId);
      glitchTimeoutId = null;
    }

    signalTitle.setAttribute('data-glitch', type);

    if (atmosphere) {
      atmosphere.setAttribute('data-glitch', 'true');
      const randomY = Math.floor(Math.random() * 65 + 18);
      atmosphere.style.setProperty('--tear-y', randomY + '%');
    }

    glitchTimeoutId = setTimeout(function () {
      if (signalTitle) signalTitle.removeAttribute('data-glitch');
      if (atmosphere) atmosphere.removeAttribute('data-glitch');
      glitchTimeoutId = null;
    }, durationMs);
  }

  function scheduleAmbientGlitch() {
    if (prefersReducedMotion) return;
    if (ambientGlitchTimer) clearTimeout(ambientGlitchTimer);

    // Random interval between 8.5s and 14.5s
    const nextDelay = Math.floor(Math.random() * 6000 + 8500);

    ambientGlitchTimer = setTimeout(function () {
      const now = Date.now();
      if (!isPlaying && now - lastGlitchTimestamp > 5000 && !document.hidden) {
        triggerTitleGlitch('micro', 140);
        lastGlitchTimestamp = now;
      }
      scheduleAmbientGlitch();
    }, nextDelay);
  }

  // Playback Controls
  function togglePlay() {
    if (!audio) initAudio();
    if (!isAudioAvailable) return;
    ensureAudioContext();

    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  function playAudio() {
    if (!audio) return;

    if (endSequenceTimer) {
      clearTimeout(endSequenceTimer);
      endSequenceTimer = null;
    }

    if (duration > 0 && audio.currentTime >= duration) {
      audio.currentTime = 0;
    }

    // Tactical button compression feedback
    if (playBtn) {
      playBtn.classList.add('btn-tactile-press');
      setTimeout(function () {
        if (playBtn) playBtn.classList.remove('btn-tactile-press');
      }, 150);
    }

    // Immediate responsiveness
    updatePlayButtonState('loading');
    setSystemStatus('loading');

    // Initiate signal drop glitch burst
    triggerTitleGlitch('burst', 260);
    lastGlitchTimestamp = Date.now();

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(function () {
          isPlaying = true;
          updatePlayButtonState('playing');
          setSystemStatus('playing');
          body.setAttribute('data-playback', 'playing');
          startVisualizer();
        })
        .catch(function () {
          if (!isAudioAvailable) {
            updatePlayButtonState('offline');
            setSystemStatus('offline');
          } else {
            updatePlayButtonState('idle');
            setSystemStatus('ready');
          }
          isPlaying = false;
          body.setAttribute('data-playback', 'idle');
        });
    }
  }

  function pauseAudio() {
    if (!audio) return;
    if (endSequenceTimer) {
      clearTimeout(endSequenceTimer);
      endSequenceTimer = null;
    }
    audio.pause();
    isPlaying = false;
    updatePlayButtonState('paused');
    setSystemStatus('paused');
    body.setAttribute('data-playback', 'idle');
  }

  function handlePlaybackEnded() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    isPlaying = false;
    body.setAttribute('data-playback', 'idle');
    if (progressFill) progressFill.style.width = '0%';
    updateTimeDisplay(0, duration);

    // Final transmission collapse micro-glitch
    triggerTitleGlitch('micro', 180);
    lastGlitchTimestamp = Date.now();

    // Set momentary ended sequence before displaying REPLAY SIGNAL
    if (endSequenceTimer) clearTimeout(endSequenceTimer);

    setSystemStatus('ended');
    updatePlayButtonState('ended');

    endSequenceTimer = setTimeout(function () {
      updatePlayButtonState('replay');
      setSystemStatus('ready');
      endSequenceTimer = null;
    }, 1000);
  }

  function updatePlayButtonState(state) {
    if (!playBtn) return;
    playBtn.setAttribute('data-state', state);

    if (state === 'loading') {
      if (btnIcon) btnIcon.textContent = '◌';
      if (btnLabel) btnLabel.textContent = 'ACQUIRING SIGNAL...';
      playBtn.setAttribute('aria-label', 'Acquiring signal transmission');
    } else if (state === 'playing') {
      if (btnIcon) btnIcon.textContent = '❚❚';
      if (btnLabel) btnLabel.textContent = 'PAUSE SIGNAL';
      playBtn.setAttribute('aria-label', 'Pause transmission');
    } else if (state === 'paused') {
      if (btnIcon) btnIcon.textContent = '▶';
      if (btnLabel) btnLabel.textContent = 'RESUME SIGNAL';
      playBtn.setAttribute('aria-label', 'Resume transmission');
    } else if (state === 'ended') {
      if (btnIcon) btnIcon.textContent = '○';
      if (btnLabel) btnLabel.textContent = 'TRANSMISSION ENDED';
      playBtn.setAttribute('aria-label', 'Transmission ended');
    } else if (state === 'replay') {
      if (btnIcon) btnIcon.textContent = '↺';
      if (btnLabel) btnLabel.textContent = 'REPLAY SIGNAL';
      playBtn.setAttribute('aria-label', 'Replay transmission from start');
    } else if (state === 'offline') {
      if (btnIcon) btnIcon.textContent = '○';
      if (btnLabel) btnLabel.textContent = 'SIGNAL OFFLINE';
      playBtn.setAttribute('aria-label', 'Transmission currently offline');
    } else {
      if (btnIcon) btnIcon.textContent = '▶';
      if (btnLabel) btnLabel.textContent = 'PLAY SIGNAL';
      playBtn.setAttribute('aria-label', 'Play unreleased signal transmission');
    }
  }

  // Scrubbing & Seeking
  function seekTo(targetSeconds) {
    if (!audio) initAudio();
    if (!isAudioAvailable) return;
    const maxTime = duration > 0 ? duration : (audio ? audio.duration : 24);
    const clamped = Math.max(0, Math.min(targetSeconds, maxTime));
    if (audio) audio.currentTime = clamped;
    const percent = maxTime > 0 ? (clamped / maxTime) * 100 : 0;
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.floor(clamped)));
    updateTimeDisplay(clamped, maxTime);
  }

  function handleProgressClick(e) {
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
    const maxTime = duration > 0 ? duration : (audio ? audio.duration : 24);
    seekTo(ratio * maxTime);
  }

  // Keyboard accessibility for progress bar
  if (progressBar) {
    progressBar.addEventListener('click', handleProgressClick);
    progressBar.addEventListener('keydown', function (e) {
      const step = 2;
      const current = audio ? audio.currentTime : 0;
      const maxTime = duration > 0 ? duration : (audio ? audio.duration : 24);
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        seekTo(current + step);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        seekTo(current - step);
      } else if (e.key === 'Home') {
        e.preventDefault();
        seekTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        seekTo(maxTime);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        togglePlay();
      }
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', togglePlay);
  }

  // ==========================================================================
  // Reactive Visualizer Loop (Cinematic Transmission Wave + Sonar Rings)
  // ==========================================================================
  let phase = 0;

  function renderVisualizer() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Prefers-reduced-motion: clean, minimal static telemetry
    if (prefersReducedMotion) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(213, 181, 108, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(centerX - 140, centerY);
      ctx.lineTo(centerX + 140, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(213, 181, 108, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    // Read real frequency data if playing
    let targetAvg = 0;
    let targetBass = 0;

    if (isPlaying && analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      let bassSum = 0;
      const binCount = dataArray.length;
      const bassBins = Math.floor(binCount * 0.2);

      for (let i = 0; i < binCount; i++) {
        sum += dataArray[i];
        if (i < bassBins) bassSum += dataArray[i];
      }

      targetAvg = sum / (binCount * 255);
      targetBass = bassSum / (bassBins * 255);

      // Audio-reactive transient glitch trigger (rare, impactful, cooldown-governed)
      const now = Date.now();
      if (
        targetBass > 0.62 &&
        targetBass - prevBassEnergy > 0.12 &&
        now - lastGlitchTimestamp > GLITCH_AUDIO_COOLDOWN_MS
      ) {
        triggerTitleGlitch('burst', 240);
        lastGlitchTimestamp = now;
      }
      prevBassEnergy = targetBass;

      // Peak state escalation check
      if (targetAvg > 0.45 || targetBass > 0.55) {
        body.setAttribute('data-playback', 'peak');
      } else {
        body.setAttribute('data-playback', 'playing');
      }
    } else {
      // Idle breathing simulation
      phase += 0.028;
      targetAvg = (Math.sin(phase) + 1) * 0.06;
      targetBass = (Math.cos(phase * 0.8) + 1) * 0.05;
    }

    // Smooth exponential energy decay / response
    currentAvgEnergy += (targetAvg - currentAvgEnergy) * 0.14;
    currentBassEnergy += (targetBass - currentBassEnergy) * 0.14;

    const avg = currentAvgEnergy;
    const bass = currentBassEnergy;

    // 1. Draw Ambient Particles
    ctx.fillStyle = 'rgba(213, 181, 108, 0.35)';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.speedX * (1 + bass * 2.5);
      p.y += p.speedY * (1 + bass * 2.5);

      if (p.x < 0) p.x = canvasWidth;
      if (p.x > canvasWidth) p.x = 0;
      if (p.y < 0) p.y = canvasHeight;
      if (p.y > canvasHeight) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 + avg * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(213, 181, 108, ' + (p.alpha * (0.6 + avg)) + ')';
      ctx.fill();
    }

    // 2. Draw Radar Range Rings & Crosshairs
    const ringBase = Math.min(canvasWidth, canvasHeight) * 0.28;
    const ringRadius = ringBase + bass * 18;

    // Outer range ring with subtle telemetry tick marks
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius * 1.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, ' + (0.08 + avg * 0.18) + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Main Gold Pulse Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(213, 181, 108, ' + (0.25 + avg * 0.55) + ')';
    ctx.lineWidth = 1.2 + avg * 2;
    ctx.stroke();

    // Cross-hair ticks at 4 compass points
    const tickLen = 6 + bass * 4;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(213, 181, 108, ' + (0.3 + avg * 0.4) + ')';
    ctx.lineWidth = 1;
    // Top
    ctx.moveTo(centerX, centerY - ringRadius - tickLen);
    ctx.lineTo(centerX, centerY - ringRadius + tickLen);
    // Bottom
    ctx.moveTo(centerX, centerY + ringRadius - tickLen);
    ctx.lineTo(centerX, centerY + ringRadius + tickLen);
    // Left
    ctx.moveTo(centerX - ringRadius - tickLen, centerY);
    ctx.lineTo(centerX - ringRadius + tickLen, centerY);
    // Right
    ctx.moveTo(centerX + ringRadius - tickLen, centerY);
    ctx.lineTo(centerX + ringRadius + tickLen, centerY);
    ctx.stroke();

    // Center Intercept Core Node
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.5 + bass * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isPlaying ? '#00f0ff' : '#d5b56c';
    ctx.shadowBlur = 10 * (1 + avg * 1.5);
    ctx.shadowColor = isPlaying ? '#00f0ff' : '#d5b56c';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Draw Carrier Frequency Waveform (Dual Harmonic Layer)
    const wavePoints = 54;
    const waveWidth = Math.min(canvasWidth * 0.88, 460);
    const startX = centerX - waveWidth / 2;
    const step = waveWidth / wavePoints;

    // Secondary Cyan Harmonic Underlay
    ctx.beginPath();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(0, 240, 255, ' + (0.15 + avg * 0.4) + ')';

    for (let i = 0; i <= wavePoints; i++) {
      const x = startX + i * step;
      let amp = 0;

      if (isPlaying && dataArray) {
        const binIndex = Math.floor((i / wavePoints) * (dataArray.length / 2));
        amp = (dataArray[binIndex] / 255) * 32;
      } else {
        amp = Math.sin(phase * 1.2 + i * 0.28) * 6;
      }

      const distFromCenter = Math.abs(i - wavePoints / 2) / (wavePoints / 2);
      const envelope = 1 - Math.pow(distFromCenter, 2);
      const y = centerY + Math.sin(phase * 1.6 + i * 0.35) * amp * envelope;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Primary Gold Transmission Wave
    ctx.beginPath();
    ctx.lineWidth = 1.6 + avg * 1.2;
    ctx.strokeStyle = 'rgba(213, 181, 108, ' + (0.45 + avg * 0.5) + ')';

    for (let i = 0; i <= wavePoints; i++) {
      const x = startX + i * step;
      let amp = 0;

      if (isPlaying && dataArray) {
        const binIndex = Math.floor((i / wavePoints) * (dataArray.length / 2));
        amp = (dataArray[binIndex] / 255) * 36;
      } else {
        amp = Math.sin(phase + i * 0.22) * 7.5;
      }

      const distFromCenter = Math.abs(i - wavePoints / 2) / (wavePoints / 2);
      const envelope = 1 - Math.pow(distFromCenter, 2);
      const y = centerY + Math.sin(phase * 1.4 + i * 0.3) * amp * envelope;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    animFrameId = raf(renderVisualizer);
  }

  function startVisualizer() {
    if (!animFrameId) {
      animFrameId = raf(renderVisualizer);
    }
  }

  // Handle visibility changes to preserve battery and CPU
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animFrameId && !isPlaying) {
        caf(animFrameId);
        animFrameId = null;
      }
    } else {
      if (!animFrameId) {
        startVisualizer();
      }
    }
  });

  // Page Load Setup
  document.addEventListener('DOMContentLoaded', function () {
    // Synchronize mode badge text with configuration
    if (modePill && config.sourceModeLabel) {
      modePill.textContent = config.sourceModeLabel;
    }

    initCanvas();
    initParticles();
    initAudio();
    scheduleAmbientGlitch();
    startVisualizer();
  });
})();
