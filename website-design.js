(function websiteComparison() {
  'use strict';
  document.querySelectorAll('[data-web-compare]').forEach(comparison => {
    const range = comparison.querySelector('input[type="range"]');
    const controls = comparison.querySelector('.web-compare-controls');
    if (!range || !controls) return;
    function update() {
      const value = range.valueAsNumber;
      comparison.style.setProperty('--compare', value + '%');
      range.setAttribute('aria-valuetext', value + '% of the OTP redesign revealed');
    }
    comparison.classList.add('is-interactive');
    controls.hidden = false;
    range.addEventListener('input', update);
    update();
  });
})();
