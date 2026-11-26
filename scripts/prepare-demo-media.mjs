#!/usr/bin/env node
/**
 * Authentic Founder Recording & Product Stills Pipeline (OTP LAUNCH V1.3)
 *
 * Converts raw macOS (Cmd+Shift+5) or iPhone / iOS Simulator recordings and
 * verified product screenshots into compressed, silent, fast-start web loops
 * paired with lightweight WebP poster frames under assets/demos/.
 *
 * Zero dependencies beyond Node built-ins + ffmpeg/ffprobe.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT_DIR = path.join(SITE_ROOT, 'assets', 'demos');

const PRESETS = {
  macbook: { maxWidth: 1200, crf: 27, fps: 30, duration: 10 },
  iphone: { maxWidth: 440, crf: 26, fps: 30, duration: 10 },
  ambient: { maxWidth: 360, crf: 27, fps: 24, duration: 8 },
  landscape: { maxWidth: 1280, crf: 27, fps: 30, duration: 10 },
};

const T7_LIBRARY_ROOT =
  '/Volumes/T7 Shield/02_CREATIVE_ASSETS/OTP_Marketing_Library/2026-11-10_215430_otp-marketing-library/library/projects';

const V13_MANIFEST = {
  videos: [
    {
      name: 'floivation-desktop-loop',
      preset: 'macbook',
      start: 0,
      duration: 10,
      inputs: [
        `${T7_LIBRARY_ROOT}/floivation/recordings/floivation__home-desktop-1440-scroll__1440x900__live__2026-11-10__v002/floivation__home-desktop-1440-scroll__1440x900__live__2026-11-10__v002__delivery-30fps.mp4`,
        `${SITE_ROOT}/assets/case-studies/floivation/after-recordly-web.mp4`,
      ],
    },
    {
      name: 'floivation-mobile-loop',
      preset: 'iphone',
      start: 0,
      duration: 10,
      inputs: [
        `${T7_LIBRARY_ROOT}/floivation/recordings/floivation__home-mobile-scroll__430x932__live__2026-11-10__v002/floivation__home-mobile-scroll__430x932__live__2026-11-10__v002__delivery-30fps.mp4`,
      ],
    },
    {
      name: 'otp-site-desktop-loop',
      preset: 'landscape',
      start: 0,
      duration: 10,
      inputs: [
        `${T7_LIBRARY_ROOT}/otp-site/recordings/otp-site__home-desktop-scroll__1920x1080__live__2026-11-10__v002/otp-site__home-desktop-scroll__1920x1080__live__2026-11-10__v002__delivery-30fps.mp4`,
      ],
    },
    {
      name: 'evehalo-iphone-loop',
      preset: 'iphone',
      start: 6,
      duration: 10,
      inputs: [
        `${T7_LIBRARY_ROOT}/evehalo/derived/cfr30/evehalo__first-run-navigation__simulator-iphone18pro-ios27__portrait__cfr30__v001.mp4`,
      ],
    },
    {
      name: 'otp-studio-iphone-loop',
      preset: 'iphone',
      start: 0,
      duration: 9,
      inputs: [
        `${T7_LIBRARY_ROOT}/otp-studio/derived/cfr30/otp-studio__onboarding-workspace__simulator-iphone18pro-ios27__portrait__cfr30__v001.mp4`,
      ],
    },
    {
      name: 'otp-wizard-ambient',
      preset: 'ambient',
      start: 0,
      duration: 7.8,
      inputs: [
        '/Users/eli/OTP/marketing/100-website-campaign/source/otp_wizard_1080p.mp4',
      ],
    },
  ],
  stills: [
    {
      name: 'floorops-desktop',
      maxWidth: 1200,
      inputs: [
        `${T7_LIBRARY_ROOT}/floorops/captures/floorops__public-landing__1440x900__verified-live__2026-11-10__v001.png`,
      ],
    },
    {
      name: 'floorops-dockguard',
      maxWidth: 1200,
      inputs: [
        `${T7_LIBRARY_ROOT}/floorops/captures/floorops__dockguard-demo__1440x900__verified-live-synthetic-demo__2026-11-10__v001.png`,
        `${SITE_ROOT}/assets/fixline-product-preview.png`,
      ],
    },
    {
      name: 'weatheros-desktop',
      maxWidth: 1200,
      inputs: [
        `${T7_LIBRARY_ROOT}/weatheros/captures/weatheros__public-product-page__1440x900__verified-live-product-page__2026-11-10__v001.png`,
        `${SITE_ROOT}/assets/weatheros/screenshots/today-public.webp`,
      ],
    },
    {
      name: 'vault-nowplaying-iphone',
      maxWidth: 440,
      inputs: ['/Users/eli/OTP/01_PRODUCTS/vault/screenshots/v12_physical_nowplaying_current.png'],
    },
    {
      name: 'vault-foreground-iphone',
      maxWidth: 440,
      inputs: ['/Users/eli/OTP/01_PRODUCTS/vault/screenshots/v12_physical_vault_foreground.png'],
    },
    {
      name: 'otp-studio-iphone-still',
      maxWidth: 440,
      inputs: [
        `${T7_LIBRARY_ROOT}/otp-studio/captures/simulator/otp-studio__workspace__simulator-iphone18pro-ios27__portrait__v001.png`,
        '/Users/eli/OTP/otp-studio/build/creator-song-iphone-home.png',
      ],
    },
  ],
};

function firstExisting(paths) {
  for (const candidate of paths) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function ensureEvenScaleFilter(maxWidth) {
  // Ensure output width/height are always divisible by 2 for H.264 yuv420p.
  return `scale='min(${maxWidth},iw)':-2:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2`;
}

function encodeVideoClip({ input, name, preset = 'macbook', start = 0, duration, crf, fps, outDir }) {
  const cfg = PRESETS[preset] || PRESETS.macbook;
  const targetFps = Number(fps || cfg.fps);
  const targetCrf = Number(crf || cfg.crf);
  const targetDuration = Number(duration || cfg.duration);
  const vf = ensureEvenScaleFilter(cfg.maxWidth);

  const mp4Out = path.join(outDir, `${name}.mp4`);
  const posterOut = path.join(outDir, `${name.replace(/-loop$|-ambient$/, '')}-poster.webp`);

  const commonArgs = [
    '-y',
    '-ss',
    String(start),
    '-i',
    input,
    '-t',
    String(targetDuration),
    '-an',
    '-vf',
    vf,
    '-r',
    String(targetFps),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-crf',
    String(targetCrf),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4Out,
  ];
  execFileSync('ffmpeg', commonArgs, { stdio: 'pipe' });

  const posterSeek = Math.min(Number(start) + 1.5, Number(start) + targetDuration * 0.35);
  const tmpPng = `${posterOut}.tmp.png`;
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      String(posterSeek),
      '-i',
      input,
      '-vframes',
      '1',
      '-vf',
      `scale='min(${cfg.maxWidth},iw)':-1:flags=lanczos`,
      tmpPng,
    ],
    { stdio: 'pipe' }
  );
  execFileSync('cwebp', ['-quiet', '-q', '82', tmpPng, '-o', posterOut], { stdio: 'pipe' });
  fs.rmSync(tmpPng, { force: true });

  const mp4SizeKb = Math.round(fs.statSync(mp4Out).size / 1024);
  const posterSizeKb = Math.round(fs.statSync(posterOut).size / 1024);
  return { name, mp4Out, mp4SizeKb, posterOut, posterSizeKb };
}

function encodeStill({ input, name, maxWidth = 1200, outDir }) {
  const webpOut = path.join(outDir, `${name}.webp`);
  const tmpPng = `${webpOut}.tmp.png`;
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      input,
      '-vframes',
      '1',
      '-vf',
      `scale='min(${maxWidth},iw)':-1:flags=lanczos`,
      tmpPng,
    ],
    { stdio: 'pipe' }
  );
  execFileSync('cwebp', ['-quiet', '-q', '84', tmpPng, '-o', webpOut], { stdio: 'pipe' });
  fs.rmSync(tmpPng, { force: true });
  return { name, webpOut, sizeKb: Math.round(fs.statSync(webpOut).size / 1024) };
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(args['out-dir'] || DEFAULT_OUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  if (args['batch-otp-v13']) {
    const results = { videos: [], stills: [], skipped: [] };
    for (const item of V13_MANIFEST.videos) {
      const src = firstExisting(item.inputs);
      if (!src) {
        results.skipped.push({ name: item.name, reason: 'source not found (connect T7 Shield?)' });
        continue;
      }
      results.videos.push(
        encodeVideoClip({
          input: src,
          name: item.name,
          preset: item.preset,
          start: item.start,
          duration: item.duration,
          outDir,
        })
      );
    }
    for (const still of V13_MANIFEST.stills) {
      const src = firstExisting(still.inputs);
      if (!src) {
        results.skipped.push({ name: still.name, reason: 'still source not found' });
        continue;
      }
      results.stills.push(
        encodeStill({
          input: src,
          name: still.name,
          maxWidth: still.maxWidth,
          outDir,
        })
      );
    }
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (!args.input || !args.name) {
    console.log(`Usage:
  node scripts/prepare-demo-media.mjs --batch-otp-v13
  node scripts/prepare-demo-media.mjs --input <recording.mov> --name <slug> [--preset macbook|iphone|ambient|landscape] [--start 0] [--duration 10] [--crf 26] [--out-dir assets/demos]`);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const result = encodeVideoClip({
    input: inputPath,
    name: String(args.name).replace(/[^a-z0-9-_]/gi, '-').toLowerCase(),
    preset: args.preset || 'macbook',
    start: Number(args.start || 0),
    duration: args.duration ? Number(args.duration) : undefined,
    crf: args.crf ? Number(args.crf) : undefined,
    fps: args.fps ? Number(args.fps) : undefined,
    outDir,
  });
  console.log(JSON.stringify(result, null, 2));
}

run();
