import { injectSpeedInsights } from '@vercel/speed-insights';

const isLocalHost = typeof window !== 'undefined' && Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.endsWith('.local')
);

if (!isLocalHost) {
  injectSpeedInsights({ framework: 'html', debug: false });
}
