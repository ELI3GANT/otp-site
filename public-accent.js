(function publicAccent(root) {
  'use strict';
  const palette = ['#dcff5f', '#c6a1ff', '#8dceff', '#ffad96', '#ffd68a', '#ffa9d8'];
  function choose(previous, random) {
    const available = palette.filter(color => color !== previous);
    return available[Math.min(available.length - 1, Math.floor(random * available.length))];
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { palette, choose };
  if (!root.document) return;
  let color;
  try {
    const previous = root.sessionStorage.getItem('otp-public-accent');
    const navigation = root.performance.getEntriesByType('navigation')[0];
    color = palette.includes(previous) && navigation && navigation.type !== 'reload' ? previous : choose(previous, Math.random());
    root.sessionStorage.setItem('otp-public-accent', color);
  } catch (_) { color = choose(null, Math.random()); }
  root.document.documentElement.style.setProperty('--accent-otp', color);
})(typeof window !== 'undefined' ? window : globalThis);
