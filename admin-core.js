/**
 * ADMIN CORE V3.2
 * Centralized logic for the OTP Admin Panel.
 * Handles: Authentication, Supabase Connection, UI State, and Diagnostics.
 */

(function() {
    console.log("🚀 ADMIN CORE: Boot sequence initiated...");

    // 0. CONFIGURATION
    const CONFIG = {
        supabaseUrl: 'https://ckumhowhucbbmpdeqkrl.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdW1ob3dodWNiYm1wZGVxa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ3NjcsImV4cCI6MjA4MzQ1MDc2N30.yIJ1diGLWjtLWm8P2D5flF2nd0xPKn_8x2RR3DlIrag',
        passcode: 'otp2026'
    };

    // 1. STATE
    const state = {
        client: null,
        isConnected: false,
        isUnlocked: false
    };

    // 2. DIAGNOSTICS UI UPDATE
    const updateDiagnostics = (key, status, color) => {
        if(key === 'db') {
            const el = document.getElementById('diagDB');
            if(el) el.innerHTML = `<span>DATABASE:</span> <span style="color: ${color};">${status}</span>`;
        }
        if(key === 'auth') {
            const el = document.getElementById('diagAuth');
            if(el) el.innerHTML = `<span>GATEKEEPER:</span> <span style="color: ${color};">${status}</span>`;
        }
        if(key === 'storage') {
            const el = document.getElementById('diagUpload');
            if(el) el.innerHTML = `<span>STORAGE:</span> <span style="color: ${color};">${status}</span>`;
        }
    };

    // 3. INITIALIZATION
    async function init() {
        // Check for Supabase Library
        if (typeof window.supabase === 'undefined') {
            console.error("❌ CRITICAL: Supabase Library not loaded.");
            updateDiagnostics('db', 'LIB MISSING', '#ff4444');
            return;
        }

        try {
            console.log("🔌 Connecting to Supabase...");
            state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
            window.sb = state.client; // Expose global
            
            // Test Connection
            const { count, error } = await state.client.from('posts').select('*', { count: 'exact', head: true });
            
            if (error) throw error;

            state.isConnected = true;
            console.log(`✅ DATABASE ONLINE. Posts: ${count}`);
            updateDiagnostics('db', `CONNECTED (${count} POSTS)`, 'var(--success)');
            showToast("SYSTEM ONLINE");
            
            // Activate Dot
            const dot = document.getElementById('dbStatusDot');
            if(dot) dot.classList.add('active');

        } catch (e) {
            console.error("🔥 CONNECTION FAILED:", e);
            updateDiagnostics('db', 'CONNECTION FAILED', '#ff4444');
        }
    }

    // 4. AUTH & GATEKEEPER
    window.unlockChannel = function() {
        const input = document.getElementById('gatePass');
        const gate = document.getElementById('gate');
        const check = document.getElementById('gateCheck');

        if (!input) return;

        if (input.value === CONFIG.passcode) {
            console.log("🔓 ACCESS GRANTED");
            state.isUnlocked = true;
            
            // Visuals
            if(check) check.style.display = 'inline';
            showToast("CONNECTION ESTABLISHED");
            updateDiagnostics('auth', 'UNLOCKED', 'var(--success)');

            setTimeout(() => {
                if(gate) gate.classList.add('unlocked');
                document.body.classList.remove('locked');
            }, 800);
        } else {
            console.warn("🔒 ACCESS DENIED");
            const err = document.getElementById('gateError');
            if(err) err.style.display = 'block';
            input.value = '';
        }
    };

    // 5. EVENT LISTENERS & BINDINGS happens when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Init System
        init();

        // Bind Enter Key for Gate
        const passInfo = document.getElementById('gatePass');
        if(passInfo) {
            passInfo.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') window.unlockChannel();
            });
        }
        
        // Re-bind other UI logic here if needed (File Upload, Magic Button)
        // For now, let's keep the other inline script for UI specific logic 
        // OR move it all here. Moving it all here is safer.
    });

    // UTILS
    function showToast(msg) {
        const toast = document.getElementById('toast');
        if(!toast) return;
        toast.querySelector('span').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    // Expose Utils
    window.showToast = showToast;

})();
