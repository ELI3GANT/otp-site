(function () {
  'use strict';

  var config = window.BLACKBOX_SIGNAL_CONFIG || {};
  var duration = Number(config.teaserDurationSeconds) || 24;
  var sources = Array.isArray(config.audioSources) ? config.audioSources.slice() : [];
  var body = document.body;
  var playButton = document.getElementById('signal-play-btn');
  var buttonIcon = document.getElementById('signal-btn-icon');
  var buttonLabel = document.getElementById('signal-btn-label');
  var audio = document.getElementById('signal-audio');
  var progress = document.getElementById('signal-progress-bar');
  var progressFill = document.getElementById('signal-progress-fill');
  var timeDisplay = document.getElementById('signal-time-display');
  var statusText = document.getElementById('signal-status-text');
  var errorMessage = document.getElementById('signal-player-error');
  var canvas = document.getElementById('signal-canvas');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var atmosphere = document.querySelector('.signal-atmosphere');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var audioContext = null;
  var mediaSource = null;
  var analyser = null;
  var frameId = 0;
  var glitchTimer = 0;
  var ambientTimer = 0;
  var previousPeak = 0;
  var lastGlitch = 0;
  var playing = false;
  var activeSourceIndex = 0;
  var sourceAssigned = false;
  var pointerSeeking = false;
  var canvasWidth = 900;
  var canvasHeight = 180;
  var timeData = null;
  var GLITCH_AUDIO_COOLDOWN_MS = 4500;

  if (!audio || !playButton || !progress) return;
  audio.preload = 'none';
  audio.playsInline = true;
  if (!sources.length && config.audioSource) sources = [{ src: config.audioSource, type: 'audio/mpeg' }];

  function formatTime(seconds) {
    var safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
  }

  function showTime(current, total) {
    var max = Number.isFinite(total) && total > 0 ? total : duration;
    var value = Math.min(Math.max(0, current || 0), max);
    if (timeDisplay) timeDisplay.textContent = formatTime(value) + ' / ' + formatTime(max);
    progress.setAttribute('aria-valuemax', String(Math.round(max)));
    progress.setAttribute('aria-valuenow', String(Math.round(value)));
    progress.setAttribute('aria-valuetext', formatTime(value) + ' of ' + formatTime(max));
    if (progressFill) progressFill.style.width = (max > 0 ? value / max * 100 : 0) + '%';
    progress.style.setProperty('--signal-progress', (max > 0 ? value / max * 100 : 0) + '%');
  }

  function setStatus(state) {
    var labels = {
      idle: 'SIGNAL READY',
      loading: 'ACQUIRING SIGNAL',
      playing: 'TRANSMITTING',
      paused: 'SIGNAL PAUSED',
      ended: 'TRANSMISSION COMPLETE',
      error: 'SIGNAL UNAVAILABLE'
    };
    body.setAttribute('data-playback', state);
    if (statusText) statusText.textContent = labels[state] || labels.idle;
  }

  function setButtonState(state) {
    playButton.setAttribute('data-state', state);
    if (buttonLabel) {
      var labels = {
        idle: 'PLAY SIGNAL', loading: 'ACQUIRING SIGNAL...', playing: 'PAUSE SIGNAL',
        paused: 'RESUME SIGNAL', ended: 'REPLAY SIGNAL', error: 'RETRY SIGNAL'
      };
      buttonLabel.textContent = labels[state] || labels.idle;
    }
    if (buttonIcon) {
      if (state === 'playing') {
        buttonIcon.innerHTML = '<path d="M6 4v12M14 4v12" fill="none" stroke="currentColor" stroke-width="2.5" />';
      } else if (state === 'ended' || state === 'error') {
        buttonIcon.innerHTML = '<path d="M15.8 7.1A6.1 6.1 0 1 0 16 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.5 4h4v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
      } else {
        buttonIcon.innerHTML = '<path d="M6 3.7v12.6L16 10z" />';
      }
    }
    var names = { idle: 'Play LORE signal', loading: 'Acquiring signal', playing: 'Pause LORE signal', paused: 'Resume LORE signal', ended: 'Replay LORE signal from the beginning', error: 'Retry LORE signal' };
    playButton.setAttribute('aria-label', names[state] || names.idle);
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(1, Math.round(rect.width * dpr));
    canvasHeight = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    drawWave(false);
  }

  function drawWave(reactive) {
    if (!ctx) return;
    var width = canvasWidth;
    var height = canvasHeight;
    var centerY = height / 2;
    var scale = Math.min(window.devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(104, 217, 187, .2)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    ctx.arc(width / 2, centerY, 42 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(216, 255, 91, .16)';
    ctx.beginPath();
    ctx.arc(width / 2, centerY, 58 * scale, 0, Math.PI * 2);
    ctx.stroke();

    if (reactive && analyser && timeData) analyser.getByteTimeDomainData(timeData);
    ctx.beginPath();
    for (var i = 0; i < 180; i += 1) {
      var x = i / 179 * width;
      var y = centerY;
      if (reactive && analyser && timeData) {
        var sample = timeData[Math.floor(i / 179 * (timeData.length - 1))] / 128 - 1;
        y += sample * 27 * scale;
      } else {
        var envelope = .42 + .58 * Math.sin(i / 179 * Math.PI);
        y += Math.sin(i * .155) * 2.4 * scale * envelope;
      }
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(216, 255, 91, .72)';
    ctx.lineWidth = 1.5 * scale;
    ctx.shadowColor = 'rgba(104, 217, 187, .22)';
    ctx.shadowBlur = reactive ? 8 * scale : 0;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function ensureAudioGraph() {
    if (audioContext || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      var Context = window.AudioContext || window.webkitAudioContext;
      audioContext = new Context();
      mediaSource = audioContext.createMediaElementSource(audio);
      mediaSource.connect(audioContext.destination);
      try {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = .83;
        mediaSource.connect(analyser);
        timeData = new Uint8Array(analyser.fftSize);
      } catch (_) {
        analyser = null;
      }
    } catch (_) {
      audioContext = null;
      mediaSource = null;
      analyser = null;
      timeData = null;
    }
  }

  function assignSource() {
    if (sourceAssigned || !sources.length) return;
    activeSourceIndex = 0;
    audio.src = sources[activeSourceIndex].src;
    sourceAssigned = true;
  }

  function triggerGlitch(kind, length) {
    var title = document.getElementById('signal-title');
    if (!title || reducedMotion || document.hidden) return;
    window.clearTimeout(glitchTimer);
    title.setAttribute('data-glitch', kind || 'micro');
    glitchTimer = window.setTimeout(function () { title.removeAttribute('data-glitch'); }, length || 150);
  }

  function scheduleAmbientGlitch() {
    if (reducedMotion || document.hidden || playing) return;
    window.clearTimeout(ambientTimer);
    ambientTimer = window.setTimeout(function () {
      if (!document.hidden && !playing) triggerGlitch('micro', 130);
      scheduleAmbientGlitch();
    }, 6500 + Math.random() * 6500);
  }

  function startVisualizer() {
    if (!ctx || frameId || document.hidden || reducedMotion) return;
    function tick() {
      frameId = 0;
      if (!playing || document.hidden) return;
      drawWave(true);
      if (analyser && timeData) {
        analyser.getByteTimeDomainData(timeData);
        var sum = 0;
        for (var i = 0; i < timeData.length; i += 1) {
          var sample = (timeData[i] - 128) / 128;
          sum += sample * sample;
        }
        var level = Math.sqrt(sum / timeData.length);
        if (atmosphere) {
          var intensity = Math.min(1, level / .32);
          atmosphere.style.setProperty('--signal-audio-pulse', (.18 + intensity * .48).toFixed(3));
          atmosphere.style.setProperty('--signal-code-opacity', (.21 + intensity * .11).toFixed(3));
        }
        if (level > .18 && level - previousPeak > .07 && Date.now() - lastGlitch > GLITCH_AUDIO_COOLDOWN_MS) {
          triggerGlitch('burst', 180);
          lastGlitch = Date.now();
        }
        previousPeak = level;
      }
      frameId = window.requestAnimationFrame(tick);
    }
    frameId = window.requestAnimationFrame(tick);
  }

  function stopVisualizer() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    drawWave(false);
    if (atmosphere) {
      atmosphere.style.setProperty('--signal-audio-pulse', '.24');
      atmosphere.style.setProperty('--signal-code-opacity', '.23');
    }
  }

  function onPlaybackError() {
    if (activeSourceIndex + 1 < sources.length) {
      activeSourceIndex += 1;
      audio.src = sources[activeSourceIndex].src;
      audio.load();
      audio.play().then(onPlaybackStarted).catch(function () { showPlaybackError(); });
      return;
    }
    showPlaybackError();
  }

  function showPlaybackError() {
    playing = false;
    stopVisualizer();
    setStatus('error');
    setButtonState('error');
    if (errorMessage) errorMessage.hidden = false;
  }

  function onPlaybackStarted() {
    if (audio.paused) return;
    playing = true;
    if (errorMessage) errorMessage.hidden = true;
    setStatus('playing');
    setButtonState('playing');
    if (audioContext && audioContext.state === 'suspended') audioContext.resume().catch(function () {});
    startVisualizer();
  }

  function play() {
    assignSource();
    if (!sourceAssigned) { showPlaybackError(); return; }
    ensureAudioGraph();
    if (audioContext && audioContext.state === 'suspended') audioContext.resume().catch(function () {});
    if (audio.ended || audio.currentTime >= duration) audio.currentTime = 0;
    setStatus('loading');
    setButtonState('loading');
    triggerGlitch('burst', 190);
    audio.play().then(onPlaybackStarted).catch(showPlaybackError);
  }

  function pause() {
    audio.pause();
    playing = false;
    stopVisualizer();
    setStatus('paused');
    setButtonState('paused');
  }

  function togglePlayback() {
    if (playing && !audio.paused) pause(); else play();
  }

  function seekTo(clientX) {
    var rect = progress.getBoundingClientRect();
    if (!rect.width) return;
    var fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    var target = fraction * duration;
    assignSource();
    audio.currentTime = target;
    showTime(target, duration);
  }

  playButton.addEventListener('click', togglePlayback);
  audio.addEventListener('loadedmetadata', function () {
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    showTime(audio.currentTime, duration);
  });
  audio.addEventListener('durationchange', function () {
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    showTime(audio.currentTime, duration);
  });
  audio.addEventListener('timeupdate', function () {
    var current = Math.min(audio.currentTime, duration);
    showTime(current, duration);
    if (current >= duration && !audio.ended) {
      audio.pause();
      onEnded();
    }
  });
  audio.addEventListener('playing', onPlaybackStarted);
  audio.addEventListener('pause', function () {
    if (!playing && audio.currentTime > 0 && !audio.ended && body.getAttribute('data-playback') === 'playing') pause();
  });
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', function () {
    if (sourceAssigned && !audio.paused) onPlaybackError();
    else if (sourceAssigned && activeSourceIndex + 1 < sources.length) onPlaybackError();
  });

  function onEnded() {
    playing = false;
    stopVisualizer();
    showTime(duration, duration);
    setStatus('ended');
    setButtonState('ended');
    if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(function () {});
  }

  progress.addEventListener('pointerdown', function (event) {
    pointerSeeking = true;
    if (progress.setPointerCapture) progress.setPointerCapture(event.pointerId);
    seekTo(event.clientX);
  });
  progress.addEventListener('pointermove', function (event) {
    if (pointerSeeking) seekTo(event.clientX);
  });
  progress.addEventListener('pointerup', function () { pointerSeeking = false; });
  progress.addEventListener('pointercancel', function () { pointerSeeking = false; });
  progress.addEventListener('keydown', function (event) {
    var current = audio.currentTime || 0;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); assignSource(); audio.currentTime = Math.min(duration, current + 2); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); assignSource(); audio.currentTime = Math.max(0, current - 2); }
    else if (event.key === 'Home') { event.preventDefault(); assignSource(); audio.currentTime = 0; }
    else if (event.key === 'End') { event.preventDefault(); assignSource(); audio.currentTime = duration; }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      body.setAttribute('data-page-hidden', 'true');
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      window.clearTimeout(ambientTimer);
      var title = document.getElementById('signal-title');
      if (title) title.removeAttribute('data-glitch');
    } else {
      body.removeAttribute('data-page-hidden');
      if (playing) startVisualizer();
      else scheduleAmbientGlitch();
    }
  });
  window.addEventListener('resize', resizeCanvas, { passive: true });
  if (window.ResizeObserver && canvas) new ResizeObserver(resizeCanvas).observe(canvas);

  if (window.matchMedia) {
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener && motionQuery.addEventListener('change', function (event) {
      reducedMotion = event.matches;
      if (reducedMotion) stopVisualizer(); else if (playing) startVisualizer();
    });
  }

  resizeCanvas();
  if (document.hidden) body.setAttribute('data-page-hidden', 'true');
  showTime(0, duration);
  setStatus('idle');
  setButtonState('idle');
  scheduleAmbientGlitch();
})();
