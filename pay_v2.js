/**
 * Payment bridge: lead-gen uses #contact; Stripe checkout is server-driven when enabled.
 * Exposes handleDirectPayStatic for legacy onclick handlers.
 */
function showToast(msg, type = 'info') {
    let toast = document.getElementById('pay-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pay-toast';
        toast.style.cssText = [
            'position:fixed', 'bottom:20px', 'right:20px',
            'background:rgba(10,10,18,0.98)', 'color:#fff', 'padding:12px 24px', 'border-radius:8px',
            'border:1px solid rgba(255,255,255,0.1)', 'font-family:Space Grotesk,sans-serif',
            'z-index:100000', 'box-shadow:0 10px 30px rgba(0,0,0,0.5)',
            'transform:translateY(100px)', 'transition:transform 0.3s ease'
        ].join(';');
        document.body.appendChild(toast);
    }
    toast.style.borderColor = type === 'error' ? '#ff0055' : 'var(--accent2)';
    toast.innerHTML = type === 'error' ? `⚠️ ${msg}` : `⚡ ${msg}`;
    toast.style.transform = 'translateY(0)';
    setTimeout(() => { toast.style.transform = 'translateY(100px)'; }, 4000);
}

window.handleDirectPayStatic = function (_title, _btn) {
    showToast('Routing to Contact…', 'info');
    window.location.hash = '#contact';
};
