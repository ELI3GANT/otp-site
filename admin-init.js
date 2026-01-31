
// Admin Logic: Auth, Theme, Mobile
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Theme Logic - Sync with Chrono-Theme
    const html = document.documentElement;
    let savedTheme = localStorage.getItem('theme');
    
    if (!savedTheme) {
        const hour = new Date().getHours();
        savedTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    
    if(savedTheme === 'light') html.setAttribute('data-theme', 'light');
    else html.removeAttribute('data-theme');

    // Inject Theme Toggle
    const header = document.querySelector('.admin-header');
    if(header) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'theme-toggle-btn admin-toggle';
        toggleBtn.innerHTML = getThemeIcon(savedTheme);
        toggleBtn.onclick = () => {
            const isLight = html.getAttribute('data-theme') === 'light';
            const newTheme = isLight ? 'dark' : 'light';
            isLight ? html.removeAttribute('data-theme') : html.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', newTheme);
            toggleBtn.innerHTML = getThemeIcon(newTheme);
        };
        header.appendChild(toggleBtn);
    }

    function getThemeIcon(theme) {
        return theme === 'light' 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }

    // 2. Auth Modal
    if(!sessionStorage.getItem('otp_admin_auth')) {
        createAuthModal();
    }

    function createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.innerHTML = `
            <div class="auth-box">
                <h3>SECURITY CHECK</h3>
                <input type="password" id="authPass" placeholder="Enter Access Code">
                <button id="authBtn">UNLOCK</button>
                <div id="authMsg"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const btn = document.getElementById('authBtn');
        const input = document.getElementById('authPass');
        const msg = document.getElementById('authMsg');

        const check = () => {
            // SECURITY: Hardcoded bypass removed. Use server auth or real terminal login.
            msg.textContent = 'ACCESS DENIED';
            msg.style.color = 'red';
            input.value = '';
        };

        btn.onclick = check;
        input.onkeypress = (e) => { if(e.key === 'Enter') check(); };
    }
});
