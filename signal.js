/**
 * BLACKBOX SIGNAL — Audio Engine & Reactive Visualizer
 * OnlyTruePerspective × Vault Experience
 *
 * Supports MP3, M4A/AAC, and WAV inputs with capability detection,
 * dynamic duration discovery, real Web Audio analysis, and graceful offline states.
 */

(function () {
  'use strict';

  // Configuration Fallback
  const DEFAULT_CONFIG = {
    signalNumber: '001',
    signalName: 'SIGNAL 001',
    transmissionStatus: 'TRANSMISSION ACTIVE',
    offlineStatus: 'SIGNAL OFFLINE',
    tagline: 'Signal intercepted from an unreleased session.',
    audioSources: [
      { src: '/assets/audio/blackbox-signal.mp3', type: 'audio/mpeg' },
      { src: '/assets/audio/blackbox-signal.m4a', type: 'audio/mp4' },
      { src: '/assets/audio/blackbox-signal.wav', type: 'audio/wav' }
    ],
    audioSource: '/assets/audio/blackbox-signal.mp3',
    teaserDurationSeconds: null
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
  let duration = 0;
  let activeSourceIndex = 0;

  // Glitch System State
  let glitchTimeoutId = null;
  let lastGlitchTimestamp = 0;
  let prevBassEnergy = 0;
  const GLITCH_AUDIO_COOLDOWN_MS = 2400; // Minimum 2.4s between bass transients
  let ambientGlitchTimer = null;
  let endSequenceTimer = null;

  // Prefers-reduced-motion check
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Format seconds to M:SS
  function formatTime(seconds) {
    if (!seconds || !isFinite(seconds) || seconds <= 0) return '0:00';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Update time display
  function updateTimeDisplay(current, total) {
    if (!timeDisplay) return;
    const currentStr = formatTime(current);
    const totalStr = total > 0 ? formatTime(total) : '--:--';
    timeDisplay.textContent = `${currentStr} / ${totalStr}`;
  }

  // Canvas Setup
  let ctx = null;
  let canvasWidth = 640;
  let canvasHeight = 320;

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
    canvasWidth = rect.width || 600;
    canvasHeight = rect.height || 240;

    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    ctx.scale(dpr, dpr);
  }

  // Ambient Particles for Visualizer
  const particles = [];
  const PARTICLE_COUNT = 24;

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  }

  // Determine normalized list of candidate audio sources
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

  // Audio Engine Initialization with Multi-Source Fallback
  const candidateSources = getCandidateSources();

  function initAudio() {
    if (audio) return;
    if (candidateSources.length === 0) {
      handleAudioUnavailable();
      return;
    }

    audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    // Order candidate sources with browser capability check
    const sortedSources = sortSourcesByBrowserSupport(candidateSources);

    // Attach source elements
    sortedSources.forEach(function (sourceItem) {
      const srcEl = document.createElement('source');
      srcEl.src = sourceItem.src;
      srcEl.type = sourceItem.type;
      audio.appendChild(srcEl);
    });

    // Also set direct src to the highest priority candidate
    audio.src = sortedSources[0].src;

    audio.addEventListener('loadedmetadata', function () {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        if (config.teaserDurationSeconds && config.teaserDurationSeconds < audio.duration) {
          duration = config.teaserDurationSeconds;
        } else {
          duration = audio.duration;
        }
      }
      isLoaded = true;
      isAudioAvailable = true;
      if (progressBar) progressBar.setAttribute('aria-valuemax', String(Math.floor(duration)));
      updateTimeDisplay(audio.currentTime, duration);
      updatePlayButtonState('idle');
      if (badgeStatus) badgeStatus.textContent = config.transmissionStatus || 'TRANSMISSION ACTIVE';
      if (statusBeacon) statusBeacon.removeAttribute('data-state');
    });

    audio.addEventListener('timeupdate', function () {
      if (!audio) return;
      const current = Math.min(audio.currentTime, duration || audio.duration || 0);
      const percent = duration > 0 ? (current / duration) * 100 : 0;

      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.floor(current)));
      updateTimeDisplay(current, duration);

      if (duration > 0 && current >= duration) {
        handlePlaybackEnded();
      }
    });

    audio.addEventListener('ended', handlePlaybackEnded);

    audio.addEventListener('error', function () {
      // Try next candidate source if available
      activeSourceIndex++;
      if (activeSourceIndex < sortedSources.length) {
        audio.src = sortedSources[activeSourceIndex].src;
        audio.load();
      } else {
        handleAudioUnavailable();
      }
    });
  }

  function sortSourcesByBrowserSupport(sources) {
    const temp = document.createElement('audio');
    const supported = [];
    const maybe = [];
    const fallback = [];

    sources.forEach(function (s) {
      if (temp.canPlayType) {
        const can = temp.canPlayType(s.type);
        if (can === 'probably') supported.push(s);
        else if (can === 'maybe') maybe.push(s);
        else fallback.push(s);
      } else {
        supported.push(s);
      }
    });

    return supported.concat(maybe, fallback);
  }

  function handleAudioUnavailable() {
    isAudioAvailable = false;
    isPlaying = false;
    updatePlayButtonState('offline');
    if (badgeStatus) badgeStatus.textContent = config.offlineStatus || 'SIGNAL OFFLINE';
    if (statusBeacon) statusBeacon.setAttribute('data-state', 'offline');
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

    if (!analyser && audioCtx && audio) {
      try {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        // Cross-origin audio or fallback
        analyser = null;
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
      atmosphere.style.setProperty('--tear-y', `${randomY}%`);
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

    // Random interval between 7.5s and 13.5s
    const nextDelay = Math.floor(Math.random() * 6000 + 7500);

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

    // Initiate signal drop glitch burst
    triggerTitleGlitch('burst', 280);
    lastGlitchTimestamp = Date.now();

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(function () {
          isPlaying = true;
          updatePlayButtonState('playing');
          body.setAttribute('data-playback', 'playing');
          startVisualizer();
        })
        .catch(function () {
          if (!isAudioAvailable) {
            updatePlayButtonState('offline');
          } else {
            updatePlayButtonState('idle');
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

    // Brief transmission ended state before replay prompt
    if (endSequenceTimer) clearTimeout(endSequenceTimer);

    if (badgeStatus) badgeStatus.textContent = 'TRANSMISSION ENDED';
    if (btnLabel) btnLabel.textContent = 'TRANSMISSION ENDED';
    if (btnIcon) btnIcon.textContent = '○';
    if (playBtn) {
      playBtn.setAttribute('data-state', 'ended');
      playBtn.setAttribute('aria-label', 'Transmission ended');
    }

    endSequenceTimer = setTimeout(function () {
      updatePlayButtonState('replay');
      if (badgeStatus) badgeStatus.textContent = config.transmissionStatus || 'TRANSMISSION ACTIVE';
      endSequenceTimer = null;
    }, 1200);
  }

  function updatePlayButtonState(state) {
    if (!playBtn) return;
    playBtn.setAttribute('data-state', state);

    if (state === 'playing') {
      if (btnIcon) btnIcon.textContent = '❚❚';
      if (btnLabel) btnLabel.textContent = 'PAUSE SIGNAL';
      playBtn.setAttribute('aria-label', 'Pause transmission');
    } else if (state === 'paused') {
      if (btnIcon) btnIcon.textContent = '▶';
      if (btnLabel) btnLabel.textContent = 'RESUME SIGNAL';
      playBtn.setAttribute('aria-label', 'Resume transmission');
    } else if (state === 'replay') {
      if (btnIcon) btnIcon.textContent = '↺';
      if (btnLabel) btnLabel.textContent = 'REPLAY SIGNAL';
      playBtn.setAttribute('aria-label', 'Replay transmission');
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

  // Scrubbing
  function seekTo(targetSeconds) {
    if (!audio) initAudio();
    if (!isAudioAvailable) return;
    const maxTime = duration > 0 ? duration : (audio ? audio.duration : 0);
    const clamped = Math.max(0, Math.min(targetSeconds, maxTime));
    if (audio) audio.currentTime = clamped;
    const percent = maxTime > 0 ? (clamped / maxTime) * 100 : 0;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.floor(clamped)));
    updateTimeDisplay(clamped, maxTime);
  }

  function handleProgressClick(e) {
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
    const maxTime = duration > 0 ? duration : (audio ? audio.duration : 0);
    seekTo(ratio * maxTime);
  }

  // Keyboard accessibility for progress bar
  if (progressBar) {
    progressBar.addEventListener('click', handleProgressClick);
    progressBar.addEventListener('keydown', function (e) {
      const step = 2; // seek 2 seconds per arrow
      const current = audio ? audio.currentTime : 0;
      const maxTime = duration > 0 ? duration : (audio ? audio.duration : 0);
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
  // Reactive Visualizer Loop
  // ==========================================================================
  let phase = 0;

  function renderVisualizer() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Prefers-reduced-motion: clean, minimal static waveform
    if (prefersReducedMotion) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(213, 181, 108, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(centerX - 160, centerY);
      ctx.lineTo(centerX + 160, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(213, 181, 108, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    // Read real frequency data if playing
    let bassEnergy = 0;
    let avgEnergy = 0;

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

      avgEnergy = sum / (binCount * 255);
      bassEnergy = bassSum / (bassBins * 255);

      // Audio-reactive transient glitch trigger (rare, impactful, cooldown-governed)
      const now = Date.now();
      if (
        bassEnergy > 0.62 &&
        bassEnergy - prevBassEnergy > 0.12 &&
        now - lastGlitchTimestamp > GLITCH_AUDIO_COOLDOWN_MS
      ) {
        triggerTitleGlitch('burst', 240);
        lastGlitchTimestamp = now;
      }
      prevBassEnergy = bassEnergy;

      // Peak state escalation check
      if (avgEnergy > 0.45 || bassEnergy > 0.55) {
        body.setAttribute('data-playback', 'peak');
      } else {
        body.setAttribute('data-playback', 'playing');
      }
    } else {
      // Idle breathing simulation
      phase += 0.025;
      avgEnergy = (Math.sin(phase) + 1) * 0.08;
      bassEnergy = (Math.cos(phase * 0.8) + 1) * 0.06;
    }

    // Draw Particles
    ctx.fillStyle = 'rgba(213, 181, 108, 0.35)';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.speedX * (1 + bassEnergy * 2);
      p.y += p.speedY * (1 + bassEnergy * 2);

      if (p.x < 0) p.x = canvasWidth;
      if (p.x > canvasWidth) p.x = 0;
      if (p.y < 0) p.y = canvasHeight;
      if (p.y > canvasHeight) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 + avgEnergy), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(213, 181, 108, ${p.alpha * (0.6 + avgEnergy)})`;
      ctx.fill();
    }

    // Draw Concentric Breathing Circles
    const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.22;
    const pulseRadius = baseRadius + bassEnergy * 24;

    // Outer Aura Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius * 1.4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.08 + avgEnergy * 0.2})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Main Gold Pulse Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(213, 181, 108, ${0.35 + avgEnergy * 0.55})`;
    ctx.lineWidth = 1.5 + avgEnergy * 2;
    ctx.stroke();

    // Center Core Node
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4 + bassEnergy * 4, 0, Math.PI * 2);
    ctx.fillStyle = isPlaying ? '#00f0ff' : '#d5b56c';
    ctx.shadowBlur = 12 * (1 + avgEnergy);
    ctx.shadowColor = isPlaying ? '#00f0ff' : '#d5b56c';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Horizontal Frequency Transmission Wave
    const wavePoints = 48;
    const waveWidth = Math.min(canvasWidth * 0.85, 480);
    const startX = centerX - waveWidth / 2;
    const step = waveWidth / wavePoints;

    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = `rgba(213, 181, 108, ${0.45 + avgEnergy * 0.5})`;

    for (let i = 0; i <= wavePoints; i++) {
      const x = startX + i * step;
      let amp = 0;

      if (isPlaying && dataArray) {
        const binIndex = Math.floor((i / wavePoints) * (dataArray.length / 2));
        amp = (dataArray[binIndex] / 255) * 44;
      } else {
        amp = Math.sin(phase + i * 0.25) * 6;
      }

      const distFromCenter = Math.abs(i - wavePoints / 2) / (wavePoints / 2);
      const envelope = 1 - Math.pow(distFromCenter, 2);
      const y = centerY + Math.sin(phase * 1.5 + i * 0.4) * amp * envelope;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    animFrameId = requestAnimationFrame(renderVisualizer);
  }

  function startVisualizer() {
    if (!animFrameId) {
      animFrameId = requestAnimationFrame(renderVisualizer);
    }
  }

  // Handle visibility changes to save battery/CPU
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animFrameId && !isPlaying) {
        cancelAnimationFrame(animFrameId);
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
    initCanvas();
    initParticles();
    initAudio();
    scheduleAmbientGlitch();
    startVisualizer();
  });
})();
