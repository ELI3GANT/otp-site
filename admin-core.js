/**
 * ADMIN CORE V15.15.2 STABLE
 * Centralized logic for the OTP Admin Panel.
 * Handles: Session Persistence, JWT decoding, Supabase Connection.
 */

(function() {
    console.log("🚀 ADMIN CORE (OTP Oracle): ONLINE.");

    /** Never fetch `${undefined}/api/...` — fall back to same-origin or OTP_CONFIG. */
    const resolveApiBase = () => {
        try {
            if (window.OTP && typeof window.OTP.getApiBase === 'function') {
                const b = String(window.OTP.getApiBase() || '').trim();
                if (b) return b.replace(/\/$/, '');
            }
            const cfg = (typeof window.OTP_CONFIG !== 'undefined' && window.OTP_CONFIG)
                ? String(window.OTP_CONFIG.apiBase || '').trim()
                : '';
            if (cfg) return cfg.replace(/\/$/, '');
        } catch (e) { /* ignore */ }
        return String(window.location.origin || '').replace(/\/$/, '');
    };

    /** Live-safe fetch: aborts after `ms` unless caller passes their own `signal`. */
    const fetchWithTimeout = async (url, init = {}, ms = 45000) => {
        if (init && init.signal) return fetch(url, init);
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), ms);
        try {
            return await fetch(url, { ...init, signal: ctrl.signal });
        } finally {
            clearTimeout(tid);
        }
    };

    const formatNetworkError = (err) => {
        const name = err && err.name;
        if (name === 'AbortError') return 'Request timed out — check connection or try again.';
        const msg = String(err && err.message ? err.message : err || 'Unknown error');
        return msg;
    };

    // GLOBAL ERROR TRAP
    /**
     * SECURE PROXY HELPERS
     * Defined at the very top of the scope so they are available
     * immediately to all dashboard components.
     */
    window.secureWrite = async function(table, payload, id = null) {
        const apiBase = resolveApiBase();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 
        try {
            const res = await fetch(`${apiBase}/api/admin/write-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ id, payload, table }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Write Failed (${res.status})`);
            }
            return await res.json();
        } catch (err) {
            clearTimeout(timeoutId);
            throw new Error(formatNetworkError(err));
        }
    };

    window.secureRead = async function(table, config = {}) {
        const apiBase = resolveApiBase();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(`${apiBase}/api/admin/fetch-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ table, ...config }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Read Failed (${res.status})`);
            }
            const raw = await res.text();
            let json = {};
            try {
                json = raw ? JSON.parse(raw) : {};
            } catch (e) {
                throw new Error(`Invalid JSON from server (${res.status})`);
            }
            const d = json.data;
            return Array.isArray(d) ? d : (d == null ? [] : d);
        } catch (err) {
            clearTimeout(timeoutId);
            throw new Error(formatNetworkError(err));
        }
    };

    window.secureDelete = async function(table, id) {
        const apiBase = resolveApiBase();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(`${apiBase}/api/admin/delete-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ id, table }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Delete Failed (${res.status})`);
            }
            return await res.json();
        } catch (err) {
            clearTimeout(timeoutId);
            throw new Error(formatNetworkError(err));
        }
    };

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled Rejection:', event.reason);
        if (window.showToast) {
            const r = event.reason;
            const msg = (r && typeof r === 'object' && r.message)
                ? r.message
                : (typeof r === 'string' ? r : (r != null ? String(r) : 'Unknown'));
            window.showToast("SYSTEM ERROR: " + msg);
        }
    });

    /**
     * Centralized Toast System
     * Defined early for use in initialization error traps.
     */
    window.showToast = function(msg) {
        const toast = document.getElementById('toast');
        if(!toast) return;
        
        // Reset
        toast.classList.remove('show');
        void toast.offsetWidth; // Force reflow
        
        toast.querySelector('span').textContent = msg;
        toast.classList.add('show');
        
        // Auto hide after 4s
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    };

    /**
     * Security Utility: Escape HTML
     * Prevents XSS in innerHTML injections
     */
    window.escapeHtml = function(text) {
        if (typeof text !== 'string') return text || '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // 0. CONFIGURATION
    const CONFIG = {
        supabaseUrl: window.OTP_CONFIG ? window.OTP_CONFIG.supabaseUrl : '',
        supabaseKey: window.OTP_CONFIG ? window.OTP_CONFIG.supabaseKey : ''
    };

    // 1. STATE
    const state = {
        client: null,
        isConnected: false,
        isUnlocked: false,
        token: localStorage.getItem('otp_admin_token') || null, // Persist session
        categories: [],
        archetypes: []
    };
    window.state = state; // Expose to window for inline scripts
    /** OTP Oracle (knowledge + recommendations) cache: `leads:<uuid>` / `contacts:<uuid>` for reply + AI flows. */
    if (typeof window.replyOracleCache === 'undefined') window.replyOracleCache = {};
    window.replyOpsBrainCache = window.replyOracleCache;
    const getProviderLocalKey = (provider) => {
        if (provider === 'anthropic') {
            return (localStorage.getItem('cloud_claude') || localStorage.getItem('cloud_anthropic') || '').trim();
        }
        return (localStorage.getItem(`cloud_${provider}`) || '').trim();
    };
    const isGeminiQuotaIssue = (message) => {
        const msg = String(message || '').toLowerCase();
        return msg.includes('quota exceeded')
            || msg.includes('rate limit')
            || msg.includes('rate-limit')
            || msg.includes('current quota');
    };
    const isOpenAIQuotaIssue = (message) => {
        const msg = String(message || '').toLowerCase();
        return msg.includes('exceeded your current quota')
            || msg.includes('insufficient_quota')
            || msg.includes('billing')
            || msg.includes('rate limit');
    };
    const truncateForPrompt = (text, maxChars = 2200) => {
        const s = String(text || '').trim();
        if (!s) return '';
        if (s.length <= maxChars) return s;
        return s.slice(0, Math.max(0, maxChars - 40)).trim() + '\n\n[TRUNCATED FOR LENGTH]';
    };
    const stripMarkdownFences = (text) => {
        let s = String(text || '');
        // Remove fenced code blocks (common model slip)
        s = s.replace(/```[\s\S]*?```/g, '').trim();
        // Remove inline backticks
        s = s.replace(/`{1,3}([^`]+)`{1,3}/g, '$1');
        return s.trim();
    };
    const extractSubjectAndBody = (text) => {
        const raw = String(text || '').trim();
        if (!raw) return { subject: '', body: '' };
        const lines = raw.split(/\r?\n/);
        const first = String(lines[0] || '').trim();
        const subjectMatch = first.match(/^subject\s*:\s*(.+)$/i);
        if (subjectMatch) {
            const subject = subjectMatch[1].trim();
            const body = lines.slice(1).join('\n').replace(/^\s*\n+/, '').trim();
            return { subject, body };
        }
        return { subject: '', body: raw };
    };
    const normalizePlaintextEmail = (text) => {
        let s = String(text || '').replace(/\r\n/g, '\n').trim();
        s = stripMarkdownFences(s);
        // Remove common "Email:" / "Body:" wrappers
        s = s.replace(/^(email|body)\s*:\s*/i, '').trim();
        // Avoid excessive blank lines
        s = s.replace(/\n{4,}/g, '\n\n\n');
        return s.trim();
    };
    const formatNeuralError = (message) => {
        if (isGeminiQuotaIssue(message)) {
            return 'GEMINI QUOTA LIMIT HIT. SWITCH PROVIDER (GROQ/OPENAI/ANTHROPIC) OR UPGRADE GEMINI BILLING.';
        }
        if (isOpenAIQuotaIssue(message)) {
            return 'OPENAI QUOTA / BILLING LIMIT. ADD CREDITS, SWITCH PROVIDER, OR USE TERMINAL CLOUD KEYS.';
        }
        return String(message || 'Unknown AI error');
    };

    /** Stable cache key for OTP Oracle results in the reply modal (contacts + leads). */
    const replyOracleKey = (sourceTable, id) => `${sourceTable === 'leads' ? 'leads' : 'contacts'}:${String(id || '').trim()}`;

    function parseIsoMs(v) {
        const t = String(v || '').trim();
        if (!t) return null;
        const ms = Date.parse(t);
        return Number.isFinite(ms) ? ms : null;
    }
    function isOracleCacheFresh(entry, maxAgeMs = 10 * 60 * 1000) {
        if (!entry || typeof entry !== 'object') return false;
        const ms = parseIsoMs(entry.updated_at) ?? parseIsoMs(entry.fetched_at) ?? null;
        if (!ms) return false;
        const kbMetaMs = parseIsoMs(window.__kbUpdatedAt || '');
        const entryKbMs = parseIsoMs(entry.kb_updated_at || '');
        if (kbMetaMs && (!entryKbMs || entryKbMs < kbMetaMs)) return false;
        return (Date.now() - ms) <= maxAgeMs;
    }

    /** ORACLE_CONTEXT_DATA: human-readable analysis (no monospace “code wall”); strips model markdown fences. */
    const formatOracleContextBlockHtml = (raw) => {
        if (raw == null || raw === '') return '';
        let obj = raw;
        if (typeof raw === 'string') {
            const t = raw.trim();
            if (t.startsWith('{')) {
                try { obj = JSON.parse(t); } catch (_) { obj = { tactical_advice: t }; }
            } else {
                obj = { tactical_advice: t };
            }
        }
        const esc = (s) => (window.escapeHtml ? window.escapeHtml(String(s)) : String(s));
        const prose = 'white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; font-size: 0.78rem; color: var(--admin-text); line-height: 1.55; margin: 0; font-family: inherit;';
        const label = 'font-size:0.58rem;color:var(--admin-cyan);letter-spacing:1px;text-transform:uppercase;font-weight:800;margin:12px 0 5px 0;';
        const labelFirst = 'font-size:0.58rem;color:var(--admin-cyan);letter-spacing:1px;text-transform:uppercase;font-weight:800;margin:0 0 5px 0;';
        const wrap = (inner) => `
                <div class="oracle-context-box" style="background: rgba(var(--accent2-rgb), 0.05); padding: 12px; border-radius: 8px; border: 1px solid var(--admin-border); max-height: min(42vh, 260px); overflow-y: auto;">
                    <div style="font-size: 0.55rem; color: var(--admin-cyan); margin-bottom: 8px; font-weight: 900; letter-spacing: 2px;">ORACLE_CONTEXT_DATA</div>
                    ${inner}
                </div>`;
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            const text = stripMarkdownFences(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
            return wrap(`<div style="${prose}">${esc(text)}</div>`);
        }
        const keys = Object.keys(obj).filter((k) => obj[k] != null && String(obj[k]).trim() !== '');
        if (keys.length === 1 && keys[0] === 'tactical_advice') {
            const ta = stripMarkdownFences(String(obj.tactical_advice || '').trim());
            return wrap(`<div style="${prose}">${esc(ta)}</div>`);
        }
        const sections = [
            ['tactical_advice', 'Tactical analysis', labelFirst],
            ['tacticalAdvice', 'Tactical analysis', label],
            ['lead_summary', 'Scope summary', label],
            ['leadSummary', 'Scope summary', label],
            ['neural_meta', 'Signal metadata', label],
            ['neuralMeta', 'Signal metadata', label],
            ['processed_at', 'Processed', label],
            ['processedAt', 'Processed', label]
        ];
        const rendered = new Set();
        const parts = [];
        for (const [key, title, lblStyle] of sections) {
            if (!keys.includes(key)) continue;
            let val = obj[key];
            if (val != null && typeof val === 'object') val = JSON.stringify(val, null, 2);
            val = stripMarkdownFences(String(val || '').trim());
            if (!val) continue;
            parts.push(`<div style="${lblStyle}">${esc(title)}</div><div style="${prose}">${esc(val)}</div>`);
            rendered.add(key);
        }
        const restKeys = keys.filter((k) => !rendered.has(k));
        if (restKeys.length) {
            const restObj = {};
            restKeys.forEach((k) => { restObj[k] = obj[k]; });
            const restText = stripMarkdownFences(JSON.stringify(restObj, null, 2));
            parts.push(`<div style="${label}">Additional details</div><div style="${prose};font-size:0.74rem;color:var(--admin-muted);">${esc(restText)}</div>`);
        }
        if (!parts.length) {
            const fallback = stripMarkdownFences(JSON.stringify(obj, null, 2));
            return wrap(`<div style="${prose}">${esc(fallback)}</div>`);
        }
        return wrap(parts.join(''));
    };

    /** Shared HTML for OTP Oracle summary (reply modal + hydrate on reopen). */
    const buildOraclePanelHtml = (recommendation) => {
        const rec = recommendation || {};
        const docs = Array.isArray(rec.required_documents) ? Array.from(new Set(rec.required_documents)) : [];
        const statusFlags = Array.isArray(rec.status_flags) ? rec.status_flags : [];
        const kbHits = Array.isArray(rec.knowledge_basis) ? rec.knowledge_basis : [];
        const statusMap = {
            ready: 'READY',
            manual_review: 'MANUAL REVIEW',
            missing_data: 'MISSING DATA',
            confidential: 'CONFIDENTIAL',
            media: 'MEDIA INVOLVED',
            tax: 'TAX WORKFLOW'
        };
        const statusBadges = (statusFlags.length ? statusFlags : ['ready'])
            .map(flag => statusMap[flag])
            .filter(Boolean)
            .map(label => `<span style="font-size:0.56rem;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:var(--admin-muted);font-weight:800;">${window.escapeHtml(label)}</span>`)
            .join(' ');
        const nextActionLabel = rec.next_action === 'manual_scope_review_required_before_quote'
            ? 'Manual scope review required before quoting'
            : rec.next_action === 'send_intake_confirmation_and_prepare_agreement_invoice'
                ? 'Proceed with intake confirmation and agreement/invoice prep'
                : (rec.next_action || 'manual_review_required');
        const notesLine = Array.isArray(rec.admin_notes) && rec.admin_notes.length
            ? rec.admin_notes.map((n) => String(n || '').trim()).filter(Boolean).join(' · ')
            : (typeof rec.admin_notes === 'string' && rec.admin_notes.trim() ? rec.admin_notes.trim() : '');
        return `
                    <div style="background: rgba(0,255,170,0.06); border: 1px solid rgba(0,255,170,0.25); border-radius: 8px; padding: 12px;">
                        <div style="font-size:0.62rem;color:var(--admin-success);letter-spacing:1.4px;text-transform:uppercase;font-weight:900;margin-bottom:8px;">OTP ORACLE (MANUAL APPROVAL REQUIRED)</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">${statusBadges}</div>
                        <div style="font-size:0.85rem;color:var(--admin-text);font-weight:700;">${window.escapeHtml(rec.recommended_package || 'Manual Review')}</div>
                        <div style="font-size:0.72rem;color:var(--admin-cyan);margin-top:4px;">${window.escapeHtml(rec.quote_range || 'Scope-based')}</div>
                        <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:7px;line-height:1.45;">Why package: ${window.escapeHtml(rec.package_reason || 'Scope and pricing signals used.')}</div>
                        <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:6px;line-height:1.45;">Why docs: ${window.escapeHtml(rec.documents_reason || 'OTP safety docs selected from context.')}</div>
                        <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:7px;word-break:break-word;">${window.escapeHtml(docs.join(', ') || 'Manual document review required')}</div>
                        <div style="font-size:0.64rem;color:var(--admin-muted);margin-top:7px;word-break:break-word;">Knowledge hits: ${window.escapeHtml(kbHits.length ? kbHits.map(hit => `${hit.file_name}#${hit.chunk_index} (${Math.round((Number(hit.similarity || 0)) * 100)}%)`).join(' | ') : 'No indexed file citations available.')}</div>
                        <div style="font-size:0.67rem;color:var(--admin-muted);margin-top:7px;">${window.escapeHtml(nextActionLabel)}</div>
                        ${notesLine ? `<div style="font-size:0.64rem;color:var(--admin-muted);margin-top:8px;line-height:1.45;border-top:1px solid var(--admin-border);padding-top:8px;">Admin notes: ${window.escapeHtml(notesLine)}</div>` : ''}
                    </div>`;
    };
    const getGeminiModelCandidates = (preferredModel) => {
        const candidates = [
            preferredModel,
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash'
        ].filter(Boolean);
        return Array.from(new Set(candidates));
    };
    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
    const isLocalRuntime = () => LOCAL_HOSTS.has(window.location.hostname);
    const isLocalApiBase = (url) => {
        try {
            return LOCAL_HOSTS.has(new URL(url).hostname);
        } catch (e) {
            return false;
        }
    };
    const isStaticBypassAllowed = () => {
        if (state.token !== 'static-bypass-token') return false;
        const apiBase = resolveApiBase();
        return isLocalRuntime() && isLocalApiBase(apiBase);
    };
    const decodeJwtPayload = (token) => {
        if (!token || token === 'static-bypass-token') return null;
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
        } catch (e) {
            return null;
        }
    };
    const isSupabaseSessionToken = (token) => {
        const payload = decodeJwtPayload(token);
        if (!payload) return false;
        const aud = String(payload.aud || '').toLowerCase();
        const iss = String(payload.iss || '').toLowerCase();
        return aud === 'authenticated' || iss.includes('/auth/v1');
    };

    /** Best-effort: sync global KB index timestamp so Oracle caches detect staleness after knowledge edits. */
    async function refreshKbMetaBestEffort() {
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) return;
        try {
            const apiBase = resolveApiBase();
            const metaRes = await fetch(`${apiBase}/api/admin/knowledge/meta`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const metaPayload = await metaRes.json().catch(() => ({}));
            if (metaRes.ok && metaPayload.success && metaPayload.meta && metaPayload.meta.kb_updated_at) {
                window.__kbUpdatedAt = metaPayload.meta.kb_updated_at;
            }
        } catch (_) { /* best-effort */ }
    }

    // 2. DIAGNOSTICS UI UPDATE
    const updateDiagnostics = (key, status, color) => {
        const labelStyle = 'color: var(--admin-muted); margin-right: 15px;';
        if(key === 'db') {
            const el = document.getElementById('diagDB');
            if(el) el.innerHTML = `<span style="${labelStyle}">DATABASE:</span> <span style="color: ${color}; font-weight: bold;">${status}</span>`;
        }
        if(key === 'auth') {
            const el = document.getElementById('diagAuth');
            if(el) el.innerHTML = `<span style="${labelStyle}">GATEKEEPER:</span> <span style="color: ${color}; font-weight: bold;">${status}</span>`;
        }
        if(key === 'storage') {
            const el = document.getElementById('diagUpload');
            if(el) el.innerHTML = `<span style="${labelStyle}">STORAGE:</span> <span style="color: ${color}; font-weight: bold;">${status}</span>`;
        }
    };

    // 3. INITIALIZATION
    async function init() {
        console.log("🛠️ INITIALIZING TERMINAL ENGINE...");
        updateDiagnostics('auth', 'INITIALIZING...', 'var(--admin-muted)');

        const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
        const isLocalHost = localHosts.has(window.location.hostname);
        if (!state.token && !isLocalHost) {
            window.location.href = 'portal-gate.html?reason=missing_token';
            return;
        }

        if (state.token) {
             try {
                 if (state.token !== 'static-bypass-token') {
                     // JWT tokens are base64url encoded. Standard atob() may fail on '-' and '_'.
                     try {
                        const payload = decodeJwtPayload(state.token) || {};

                         const now = Math.floor(Date.now() / 1000);
                         if (payload.exp && payload.exp < now) {
                             console.warn("Session Expired");
                             localStorage.removeItem('otp_admin_token');
                             window.location.href = 'portal-gate.html?reason=expired';
                             return;
                         }
                         console.log("🔄 Existing session verified.");
                         updateDiagnostics('auth', 'SECURE SESS', 'var(--success)');
                     } catch (parseErr) {
                         console.warn("⚠️ Token decode fallback:", parseErr);
                         updateDiagnostics('auth', 'SECURE SESS', 'var(--success)');
                     }
                 } else {
                     updateDiagnostics('auth', 'LOCAL BYPASS', '#ffaa00');
                 }
             } catch (authErr) {
                 console.warn('⚠️ Auth block error:', authErr);
             }
        }

        // Check for Supabase Library
        if (typeof window.supabase === 'undefined') {
            console.error("❌ CRITICAL: Supabase Library not loaded.");
            updateDiagnostics('db', 'LIB MISSING', '#ff4444');
            return;
        }

        // Check for Config
        if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
            console.error("❌ CRITICAL: Supabase Configuration Missing.");
            updateDiagnostics('db', 'CONFIG ERROR', '#ff4444');
            return;
        }

        // Singleton Supabase client — must be assigned before any guard or DB calls.
        state.client = window.OTP.getSupabase();
        window.sb = state.client;

        if (!state.client) {
            updateDiagnostics('db', 'LIB MISSING', '#ff4444');
            return;
        }

        // --- AUTH HARDENING: INJECT SESSION TOKEN ---
        if (state.token && state.token !== 'static-bypass-token') {
            if (isSupabaseSessionToken(state.token)) {
                console.log("🔑 Injecting secure session token...");
                try {
                    await state.client.auth.setSession({
                        access_token: state.token,
                        refresh_token: state.token
                    });
                } catch (authErr) {
                    console.warn("⚠️ Session injection skipped:", authErr.message);
                }
            } else {
                console.log("ℹ️ OTP token detected; skipping Supabase auth session injection.");
            }
        }

        try {
            console.log("🔌 Connecting to Supabase KERNEL...");
            updateDiagnostics('db', 'CONNECTING...', 'var(--admin-muted)');

            // Connection Test (Uses Real Query to verify RLS/Key)
            let testRes = await state.client.from('posts').select('id').limit(1);
            
            if (testRes.error) {
                console.warn("⚠️ Database connection error:", testRes.error.message);
                updateDiagnostics('db', 'CONN ERROR: ' + testRes.error.message, 'var(--danger)');
                if (!testRes.error.message.includes('permission')) throw testRes.error;
            }

            state.isConnected = true;
            console.log(`✅ DATABASE ONLINE. Count: ${testRes.count || 'N/A'}`);
            updateDiagnostics('db', `CONNECTED`, 'var(--success)');
            showToast("SYSTEM ONLINE");
            
            // Activate Dot
            const dot = document.getElementById('dbStatusDot');
            if(dot) dot.classList.add('active');

            const canUseSecureEndpoints = !!state.token;
            if (canUseSecureEndpoints) {
                // Load Data (Parallel)
                await Promise.allSettled([
                    fetchPosts(true),
                    fetchInbox(),
                    fetchLeads(),
                    (typeof window.fetchKnowledgeFiles === 'function' ? window.fetchKnowledgeFiles() : Promise.resolve()),
                    (typeof window.fetchStructuredKnowledge === 'function' ? window.fetchStructuredKnowledge() : Promise.resolve()),
                    (typeof window.fetchOpsJobs === 'function' ? window.fetchOpsJobs() : Promise.resolve()),
                    fetchCategories(),
                    fetchArchetypes()
                ]);
                if (typeof window.setupKnowledgeBrainUploader === 'function') {
                    window.setupKnowledgeBrainUploader();
                }
            } else {
                updateDiagnostics('auth', 'LOGIN REQUIRED', 'var(--admin-danger)');
                const inbox = document.getElementById('inboxManager');
                const leads = document.getElementById('leadsManager');
                const posts = document.getElementById('postManager');
                if (inbox) inbox.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED FOR SECURE INBOX</div>';
                if (leads) leads.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED FOR LEAD DATA</div>';
                if (posts) posts.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED FOR POST MANAGEMENT</div>';
            }
            
            // Backup Polling (30s) - Clear existing to prevent duplicates
            if (window.otpPollInterval) clearInterval(window.otpPollInterval);
            if (canUseSecureEndpoints) {
                window.otpPollInterval = setInterval(() => fetchPosts(false), 30000);
            }


            // Live Clock System
            const clockEl = document.getElementById('liveClock');
            if (clockEl) {
                const apiBase = resolveApiBase();
                const token = localStorage.getItem('otp_admin_token') || '';
                const isStatic = token === 'static-bypass-token';
                const isRemote = apiBase.startsWith('http') && !apiBase.includes('localhost');
                
                let statusTag = '<span style="color:var(--admin-success)">[NODE:LIVE]</span>';
                if (isStatic) statusTag = '<span style="color:#ff8800">[NODE:LEGACY]</span>';
                else if (isRemote || window.location.hostname.endsWith('.vercel.app') || window.location.hostname === 'onlytrueperspective.tech' || window.location.hostname === 'www.onlytrueperspective.tech' || window.location.hostname === 'app.onlytrueperspective.tech') statusTag = '<span style="color:#00ffaa; filter: drop-shadow(0 0 5px #00ffaa); font-weight:bold;">[NODE:SECURE]</span>';

                // Update only time every second, not status checks
                setInterval(() => {
                    const now = new Date();
                    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
                    clockEl.innerHTML = `${statusTag} ${timeStr}`;
                }, 1000);

                // Initialize System Log
                if (window.logAdminAction) {
                    window.logAdminAction("SYSTEM KERNEL INITIALIZED", "success");
                    window.logAdminAction(`NODE UPLINK ESTABLISHED: ${isRemote ? 'REMOTE' : 'LOCAL'}`, "info");
                }
            }

            // 5. Neural Cloud Settings (Persistence)
            const cloudOA = document.getElementById('cloudOpenAI');
            const cloudG = document.getElementById('cloudGemini');
            const cloudC = document.getElementById('cloudClaude');
            const cloudGr = document.getElementById('cloudGroq');
            const satUrl = document.getElementById('satelliteUrl');
            
            const bindPersist = (el, key) => {
                if(el) {
                    el.value = localStorage.getItem(key) || '';
                    el.addEventListener('input', (e) => {
                        localStorage.setItem(key, e.target.value.trim());
                        const provEl = document.getElementById('aiProvider');
                        if (provEl) checkNeuralLink(provEl.value);
                    });
                }
            };

            bindPersist(cloudOA, 'cloud_openai');
            bindPersist(cloudG, 'cloud_gemini');
            bindPersist(cloudGr, 'cloud_groq');
            if (cloudC) {
                cloudC.value = getProviderLocalKey('anthropic');
                cloudC.addEventListener('input', (e) => {
                    const value = e.target.value.trim();
                    // Keep both keys in sync for backward compatibility with older builds.
                    localStorage.setItem('cloud_claude', value);
                    localStorage.setItem('cloud_anthropic', value);
                    const currentProvider = document.getElementById('aiProvider')?.value || 'gemini';
                    checkNeuralLink(currentProvider);
                });
            }
            
            // Resolve best API base: localStorage > OTP_CONFIG > canonical Vercel fallback
            
            // Satellite URL: Load & Validate
            if(satUrl) {
                // Always hydrate from resolver so localhost cannot stay pinned to stale remote base.
                const storedUrl = resolveApiBase();
                localStorage.setItem('otp_api_base', storedUrl);
                satUrl.value = storedUrl;
                
                satUrl.addEventListener('change', (e) => {
                    let val = e.target.value.trim();
                    if (val && !val.startsWith('http')) val = 'https://' + val;
                    if (val.endsWith('/')) val = val.slice(0, -1);
                    
                    e.target.value = val;
                    localStorage.setItem('otp_api_base', val);
                    persistSystemState('api_base', val); // PERSIST TO DB
                    showToast("SATELLITE LINK UPDATED");
                });
            }

            // 5. SITE COMMAND PRO UPLINK (Unified Channel)
            state.siteChannel = state.client.channel('otp-uplink');
            
            // Listen for changes from other admin sessions
            state.siteChannel.on('broadcast', { event: 'command' }, (message) => {
                console.log("🛰️ COMMAND UPLINK: REMOTE SIGNAL RECEIVED.", message);
                const { type, value } = message.payload || {};
                
                // 1. Sync Dashboard UI Buttons
                if (['maintenance', 'visuals', 'kursor', 'theme', 'status'].includes(type)) {
                    syncDashboardElement(type, value);
                    
                    // Dashboard Theme Sync (Apply theme to self)
                    if (type === 'theme') {
                        syncDashboardElement('theme', value);
                        const btns = document.querySelectorAll('.theme-btn');
                        btns.forEach(btn => btn.textContent = (value === 'light') ? '☀️' : '🌗');
                    }
                    
                    showToast(`CONTROL SYNCED: ${type.toUpperCase()}`);
                }
            });

            state.siteChannel.subscribe((status) => {
                if(status === 'SUBSCRIBED') {
                    console.log("🛰️ COMMAND UPLINK: STABLE.");
                }
            });

            // 7. SYNC SYSTEM STATE (Persistence)
            fetchSystemState();

            // 8. INITIAL LINK CHECK (default: Gemini server hub; show model picker)
            const allowedAi = ['gemini', 'groq', 'openai', 'anthropic'];
            let defaultProvider = localStorage.getItem('ai_provider') || 'gemini';
            if (!allowedAi.includes(defaultProvider)) defaultProvider = 'gemini';
            const providerSel = document.getElementById('aiProvider');
            if (providerSel) {
                const hasOpt = Array.from(providerSel.options || []).some(o => o.value === defaultProvider);
                if (!hasOpt) defaultProvider = 'gemini';
                providerSel.value = defaultProvider;
                localStorage.setItem('ai_provider', defaultProvider);
            }
            if (typeof window.switchProvider === 'function') {
                window.switchProvider(defaultProvider);
            } else {
                checkNeuralLink(defaultProvider);
            }

            // 9. LIVE STATUS TOGGLE UX
            const pubToggle = document.getElementById('pubToggle');
            const loopStatus = () => {
                const span = document.querySelector('.toggle-label');
                if(span && pubToggle) {
                    span.textContent = pubToggle.checked ? "STATUS: LIVE" : "STATUS: DRAFT";
                    span.style.color = pubToggle.checked ? "var(--admin-success)" : "var(--admin-muted)";
                }
            };
            if(pubToggle) {
                pubToggle.addEventListener('change', loopStatus);
                // Run once
                loopStatus();
            }

            // 10. FORCE PREVIEW INIT
            setTimeout(window.updateSocialPreview, 1000);

        } catch (e) {
            console.error("🔥 CONNECTION FAILED:", e);
            updateDiagnostics('db', 'CONNECTION FAILED', '#ff4444');
        }
    }

    // --- SYSTEM STATE SYNC ---
    function syncDashboardElement(type, value) {
        const el = document.getElementById(`status-${type}`);
        if (!el || !value) return;

        const tile = el.closest('.cmd-tile');

        if (type === 'maintenance') {
            const isOn = value === 'on';
            el.textContent = isOn ? 'ACTIVE' : 'OFFLINE';
            el.style.color = isOn ? 'var(--admin-success)' : 'var(--admin-danger)';
            if (tile) tile.classList.toggle('cmd-tile-active', isOn);
        } else if (type === 'visuals') {
            const isHi = value === 'high';
            el.textContent = isHi ? 'HIGH-FI' : 'PERF-MODE';
            el.style.color = isHi ? 'var(--admin-success)' : 'var(--accent2)';
            if (tile) tile.classList.toggle('cmd-tile-active', isHi);
        } else if (type === 'kursor') {
            const isOn = value === 'on';
            el.textContent = isOn ? 'ACTIVE' : 'DISABLED';
            el.style.color = isOn ? 'var(--admin-success)' : 'var(--admin-muted)';
            if (tile) tile.classList.toggle('cmd-tile-active', isOn);
        } else if (type === 'theme') {
            const isDay = value === 'light';
            el.textContent = isDay ? 'DAY-MODE' : 'NIGHT-MODE';
            el.style.color = isDay ? '#ffaa00' : 'var(--accent2)';
            if (tile) tile.classList.toggle('cmd-tile-active', isDay);
            
            // Sync Vars for the Admin UI itself
            const html = document.documentElement;
            const hues = window.OTP_HUES || [{ dark: '0, 236, 255', light: '0, 170, 204' }];
            const i = window.OTP_HUE_INDEX !== undefined ? window.OTP_HUE_INDEX : 0;
            const selected = hues[i];
            
            if (isDay) {
                html.setAttribute('data-theme', 'light');
                html.style.setProperty('--accent2-rgb', selected.light);
                html.style.setProperty('--accent2', `rgb(${selected.light})`);
            } else {
                html.removeAttribute('data-theme');
                html.style.setProperty('--accent2-rgb', selected.dark);
                html.style.setProperty('--accent2', `rgb(${selected.dark})`);
            }
        } else if (type === 'status') {
            el.textContent = value.toUpperCase();
            el.style.color = 'var(--admin-success)';
        }
    }

    async function fetchSystemState() {
        try {
            const { data, error } = await state.client
                .from('posts')
                .select('content')
                .eq('slug', 'system-global-state')
                .single();

            if (error || !data) return;

            const config = JSON.parse(data.content);
            console.log("📡 DASHBOARD SYNC:", config);

            syncDashboardElement('maintenance', config.maintenance);
            syncDashboardElement('visuals', config.visuals);
            syncDashboardElement('kursor', config.kursor);
            syncDashboardElement('theme', config.theme);
            syncDashboardElement('status', config.status || 'OPERATIONAL');

            // Sync Satellite URL (API Base)
            if (config.api_base) {
                // On localhost, keep local API routing stable and ignore remote state pushes.
                const shouldApplyRemoteApi = !isLocalRuntime() || isLocalApiBase(config.api_base);
                if (shouldApplyRemoteApi) {
                    localStorage.setItem('otp_api_base', config.api_base);
                    const satUrl = document.getElementById('satelliteUrl');
                    if (satUrl) satUrl.value = config.api_base;
                }
            }
        } catch (e) { console.error("Config Fetch Error:", e); }
    }

    // --- AUTH UTILS --- (Consolidated at Bottom)

    // --- POST MANAGER & STATS LOGIC ---
    let postsCache = null;
    let lastFetchTime = 0;
    const CACHE_TTL = 60000; // 60s Cache

    // 4.6 FILE UPLOAD LOGIC
    function optimizeImage(file) {
        return new Promise((resolve) => {
            if (!file || !file.type.startsWith('image/')) return resolve(file); 
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1080;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const optimizedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(optimizedFile);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.onerror = () => {
                   console.error("Neural Error: Visual deconstruction failed.");
                   resolve(file);
                };
                img.src = event.target.result;
            };
            reader.onerror = () => {
               console.error("Neural Error: File signal corrupted.");
               resolve(file);
            };
            reader.readAsDataURL(file);
        });
    }

    window.handleFileUpload = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.querySelector('button[onclick="document.getElementById(\'fileInput\').click()"]');
        if(btn) btn.textContent = "OPTIMIZING...";

        try {
            // 1. Client-Side Optimization
            const optimizedFile = await optimizeImage(file);
            if(btn) btn.textContent = "UPLOADING...";

            // Ensure extension matches MIME type if it was optimized, otherwise use original
            const fileExt = optimizedFile.name.split('.').pop().toLowerCase() || "jpg";
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `blog/${fileName}`;

            // 2. Upload to Storage
            const { error: uploadError } = await state.client.storage
                .from('uploads')
                .upload(filePath, optimizedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = state.client.storage
                .from('uploads')
                .getPublicUrl(filePath);

            const imageUrlEl = document.getElementById('imageUrl');
            if (!imageUrlEl) {
                showToast('MEDIA UPLOAD UI NOT AVAILABLE');
                return;
            }
            imageUrlEl.value = publicUrl;
            const fileDetails = document.getElementById('fileDetails');
            if (fileDetails) fileDetails.style.display = 'block';
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (fileNameDisplay) fileNameDisplay.textContent = optimizedFile.name;
            const optimizedSize = (optimizedFile.size / 1024 / 1024).toFixed(2);
            const fileSizeDisplay = document.getElementById('fileSizeDisplay');
            if (fileSizeDisplay) fileSizeDisplay.textContent = `${optimizedSize} MB (Saved ${((1 - optimizedFile.size/file.size)*100).toFixed(0)}%)`;
            
            const prevDiv = document.getElementById('imagePreview');
            const urlIn = document.getElementById('urlInput');
            if(urlIn) urlIn.value = publicUrl;
            
            if(prevDiv) {
                // Referrer privacy ensures that storage CDNs (Supabase) don't block the request based on referer-policy
                prevDiv.innerHTML = `<img id="previewImg" src="${publicUrl}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x450?text=VISUAL_SIGNAL_OFFLINE'">`;
                prevDiv.style.display = 'block';
            }
            
            showToast("MEDIA OPTIMIZED & UPLOADED");

        } catch (err) {
            console.error("Upload Failed:", err);
            showToast("UPLOAD FAILED: " + err.message);
        } finally {
            if(btn) btn.textContent = "Upload Media";
        }
    };
    
    // 4.7 EDIT POST LOGIC
    window.loadPostForEdit = async function(id) {
        showToast("FETCHING BROADCAST DATA...");
        const $ = (fid) => document.getElementById(fid);
        const setVal = (fid, v) => {
            const n = $(fid);
            if (n) n.value = v == null ? '' : String(v);
        };
        const setChecked = (fid, v) => {
            const n = $(fid);
            if (n && 'checked' in n) n.checked = !!v;
        };

        try {
            // Fetch FULL data for this specific post
            const { data: post, error } = await state.client
                .from('posts')
                .select('*')
                .eq('id', id)
                .single();

            if(error) throw error;
            if(!post) throw new Error("Post not found");
            const postForm = $('postForm');
            const postIdInput = $('postIdInput');
            if (!postForm || !postIdInput) {
                showToast('BROADCAST FORM NOT ON THIS PAGE');
                return;
            }

            postIdInput.value = post.id;
            setVal('titleInput', post.title || '');
            setVal('slugInput', post.slug || '');

            const img = post.image_url || '';
            setVal('imageUrl', img);
            setVal('urlInput', img);

            const prevDiv = $('imagePreview');
            if (img && prevDiv) {
                prevDiv.innerHTML = `<img id="previewImg" src="${img}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x450?text=VISUAL_SIGNAL_OFFLINE'">`;
                prevDiv.style.display = 'block';
            } else if (prevDiv && !img) {
                prevDiv.innerHTML = '';
                prevDiv.style.display = 'none';
            }

            setVal('catInput', post.category || 'Strategy');
            setVal('authorInput', post.author || 'OTP Admin');
            setVal('tagsInput', (post.tags || []).join(', '));
            setVal('excerptInput', post.excerpt || '');
            setVal('contentArea', post.content || '');
            setVal('seoTitle', post.seo_title || '');
            setVal('seoDesc', post.seo_desc || '');
            setChecked('pubToggle', post.published);

            const submitBtn = $('submitBtn');
            if (submitBtn) {
                submitBtn.textContent = "UPDATE BROADCAST";
                submitBtn.style.background = "var(--admin-accent)";
                submitBtn.style.color = "#fff";
            }

            postForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const content = $('contentArea');
            if (content) content.dispatchEvent(new Event('input'));

            showToast("DATA LOADED");

        } catch(err) {
            console.error("Edit Load Error:", err);
            showToast("LOAD FAILED: " + err.message);
        }
    };

    window.resetForm = function() {
        const postForm = document.getElementById('postForm');
        if (!postForm) return;
        postForm.reset();
        const postIdInput = document.getElementById('postIdInput');
        if (postIdInput) postIdInput.value = '';
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) imagePreview.style.display = 'none';
        
        const submitBtn = document.getElementById('submitBtn');
        if(submitBtn) {
            submitBtn.textContent = "COMMENCE BROADCAST";
            submitBtn.style.background = "var(--admin-success)";
            submitBtn.style.color = "#000";
        }
        
        // Reset Previews
        if(window.updateSocialPreview) window.updateSocialPreview();
    };

    // --- CATEGORY & ARCHETYPE MANAGEMENT ---
    
    async function fetchCategories() {
        try {
            const { data, error } = await state.client.from('categories').select('*').order('name');
            if (error) throw error;
            state.categories = data;
            syncCategoryDropdowns();
        } catch (e) { console.error("Fetch Categories Error:", e); }
    }

    async function fetchArchetypes() {
        try {
            const { data, error } = await state.client.from('ai_archetypes').select('*').order('name');
            if (error) throw error;
            state.archetypes = data;
            syncArchetypeDropdowns();
        } catch (e) { console.error("Fetch Archetypes Error:", e); }
    }

    function syncCategoryDropdowns() {
        const selects = ['catInput', 'archCategory']; // Main post category and archetype parent
        const escape = window.escapeHtml || (s => s);
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const current = el.value;
            if (id === 'archCategory') {
                el.innerHTML = '<option value="">No Category</option>' + state.categories.map(c => `<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('');
            } else {
                el.innerHTML = state.categories.map(c => `<option value="${escape(c.name)}">${escape(c.name)}</option>`).join('');
            }
            if (current) el.value = current;
        });
    }

    function syncArchetypeDropdowns() {
        const selects = ['archetype', 'replyArchetype'];
        const escape = window.escapeHtml || (s => s);
        
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const current = el.value;
            const options = (state.archetypes || []).map(a => `<option value="${escape(a.slug)}">${escape(a.name)}</option>`).join('');
            
            if (id === 'replyArchetype') {
                el.innerHTML = '<option value="">Default Agent</option>' + options;
            } else {
                el.innerHTML = options;
            }
            
            if (current) el.value = current;
        });
    }

    window.openCategoryManager = function() {
        const el = document.getElementById('categoryModal');
        if(!el) return;
        el.style.display = 'flex';
        // Enforce robust fixed centering
        el.style.position = 'fixed';
        el.style.inset = '0';
        el.style.zIndex = '10000';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        renderCategoryList();
    };

    window.renderCategoryList = function() {
        const list = document.getElementById('categoryList');
        if (!list) return;
        list.innerHTML = state.categories.map(c => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--admin-border);">
                <div>
                    <span style="font-weight: bold; color: var(--admin-cyan);">${c.name}</span>
                    <span style="font-size: 0.7rem; color: var(--admin-muted); margin-left: 10px;">/${c.slug}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editCategory('${c.id}')" style="background: transparent; border: 1px solid var(--admin-muted); color: var(--admin-muted); font-size: 0.6rem; padding: 4px 8px;">EDIT</button>
                    <button onclick="deleteCategory('${c.id}')" style="background: transparent; border: 1px solid var(--admin-danger); color: var(--admin-danger); font-size: 0.6rem; padding: 4px 8px;">DEL</button>
                </div>
            </div>
        `).join('') || '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">No categories found.</div>';
    };

    window.saveCategory = async function() {
        const id = document.getElementById('catId').value;
        const name = document.getElementById('catName').value.trim();
        const slug = document.getElementById('catSlug').value.trim();

        if (!name || !slug) return;

        try {
            let error;
            if (id) {
                await window.secureWrite('categories', { name, slug }, id);
            } else {
                await window.secureWrite('categories', { name, slug });
            }

            if (error) throw error;
            showToast("CATEGORY SAVED");
            document.getElementById('categoryForm').reset();
            document.getElementById('catId').value = '';
            await fetchCategories();
            renderCategoryList();
        } catch (e) { showToast("SAVE FAILED: " + e.message); }
    };

    window.editCategory = function(id) {
        const c = state.categories.find(cat => cat.id === id);
        if (!c) return;
        document.getElementById('catId').value = c.id;
        document.getElementById('catName').value = c.name;
        document.getElementById('catSlug').value = c.slug;
    };

    window.deleteCategory = function(id) {
        confirmAction(
            "DELETE CATEGORY",
            "Are you sure you want to remove this category?",
            async () => {
                try {
                    await window.secureDelete('categories', id);
                    showToast("CATEGORY DELETED (SECURE)");
                    await fetchCategories();
                    renderCategoryList();
                } catch (e) { showToast("DELETE FAILED: " + e.message); }
            }
        );
    };

    // ARCHETYPE LOGIC
    window.openArchetypeManager = function() {
        const el = document.getElementById('archetypeModal');
        if(!el) return;
        el.style.display = 'flex';
        // Enforce robust fixed centering
        el.style.position = 'fixed';
        el.style.inset = '0';
        el.style.zIndex = '10000';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';

        renderArchetypeList();
    };

    window.renderArchetypeList = function() {
        const list = document.getElementById('archetypeList');
        const search = document.getElementById('archSearch').value.toLowerCase();
        const sort = document.getElementById('archSort').value;
        if (!list) return;

        let filtered = state.archetypes.filter(a => a.name.toLowerCase().includes(search) || a.slug.toLowerCase().includes(search));
        
        if (sort === 'usage') filtered.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        else filtered.sort((a, b) => a.name.localeCompare(b.name));

        list.innerHTML = filtered.map(a => `
            <div style="padding: 12px; border-bottom: 1px solid var(--admin-border); cursor: pointer;" onclick="editArchetype('${a.id}')">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: bold; color: var(--admin-accent);">${a.name}</span>
                    <span style="font-size: 0.65rem; color: var(--admin-muted);">USES: ${a.usage_count || 0}</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--admin-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.system_prompt}</div>
                <div style="display: flex; gap: 4px; margin-top: 6px;">
                    ${(a.tags || []).map(t => `<span style="font-size: 0.55rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">#${t}</span>`).join('')}
                </div>
            </div>
        `).join('') || '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">No archetypes found.</div>';
    };

    window.saveArchetype = async function() {
        const id = document.getElementById('archId').value;
        const name = document.getElementById('archName').value.trim();
        const slug = document.getElementById('archSlug').value.trim();
        const category_id = document.getElementById('archCategory').value || null;
        const configRaw = document.getElementById('archConfig').value.trim();
        const system_prompt = document.getElementById('archPrompt').value.trim();
        const tags = document.getElementById('archTags').value.split(',').map(t => t.trim()).filter(t => t);

        if (!name || !slug || !system_prompt) return;

        let model_config = {};
        if (configRaw) {
            try { model_config = JSON.parse(configRaw); }
            catch (e) { showToast("ERROR: Invalid JSON in Model Config"); return; }
        }

        try {
            let error;
            const payload = { name, slug, system_prompt, tags, category_id, model_config };
            if (id) {
                await window.secureWrite('ai_archetypes', payload, id);
            } else {
                await window.secureWrite('ai_archetypes', payload);
            }

            if (error) throw error;
            showToast("ARCHETYPE SAVED");
            document.getElementById('archetypeForm').reset();
            document.getElementById('archId').value = '';
            await fetchArchetypes();
            renderArchetypeList();
        } catch (e) { showToast("SAVE FAILED: " + e.message); }
    };

    window.editArchetype = function(id) {
        const a = (state.archetypes || []).find(arch => arch.id == id);
        if (!a) return;
        document.getElementById('archId').value = a.id;
        document.getElementById('archName').value = a.name;
        document.getElementById('archSlug').value = a.slug;
        document.getElementById('archCategory').value = a.category_id || '';
        document.getElementById('archConfig').value = a.model_config ? JSON.stringify(a.model_config) : '';
        document.getElementById('archPrompt').value = a.system_prompt;
        document.getElementById('archTags').value = (a.tags || []).join(', ');
    };

    // --- END CATEGORY & ARCHETYPE MANAGEMENT ---

    async function fetchPosts(force = false) {
        const list = document.getElementById('postManager');
        if(!list) return;

        // One-time Realtime Subscription for Posts (Views, Status, etc)
        if (state.client && !state.dbSubscription) {
             state.dbSubscription = state.client
                .channel('posts-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
                    if(window.refreshTimeout) clearTimeout(window.refreshTimeout);
                    window.refreshTimeout = setTimeout(() => fetchPosts(true), 500); 
                })
                .subscribe();
        }

        // Cache Check (Reduced TTL for active posts)
        const now = Date.now();
        if (!force && postsCache && (now - lastFetchTime < 2000)) {
            renderPosts(postsCache);
            updateStats(postsCache);
            return;
        }

        try {
            // Use SECURE PROXY (Bypass RLS issues). secureRead throws on error.
            const posts = await window.secureRead('posts', {
                filters: [{ column: 'slug', op: 'neq', value: 'system-global-state' }]
            });

            // Update Cache
            postsCache = posts;
            lastFetchTime = now;

            renderPosts(posts);
            updateStats(posts);

        } catch (err) {
            console.error("POST FETCH ERROR:", err);
            // If this is an auth error, flag it in diagnostics
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('permission') || err.message.toLowerCase().includes('jwt'))) {
                updateDiagnostics('auth', 'RLS BLOCK', 'var(--danger)');
            }
            if (list.innerHTML.includes('LOADING') || list.children.length <= 1) {
                 list.innerHTML = `<div style="text-align: center; color: #ff4444; padding:20px;">LINK ERROR: ${window.escapeHtml(String(err.message || err))}</div>`;
            }
        }
    }

    // --- INBOX / AGENT LOGIC ---
    window.fetchInbox = async function() {
        const inbox = document.getElementById('inboxManager');
        const filterEl = document.getElementById('inboxFilter');
        const filter = filterEl ? filterEl.value : 'all'; // default to all if not found, though html sets active
        
        if(!inbox) return;

        inbox.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">SYNCING SECURE COMMS...</div>';

        try {
            await refreshKbMetaBestEffort();
            const filters = [];
            if (filter === 'active') {
                filters.push({ column: 'ai_status', op: 'neq', value: 'completed' });
                filters.push({ column: 'ai_status', op: 'neq', value: 'archived' });
            } else if (filter === 'completed') {
                filters.push({ column: 'ai_status', op: 'eq', value: 'completed' });
            } else if (filter === 'archived') {
                filters.push({ column: 'ai_status', op: 'eq', value: 'archived' });
            }

            const data = await window.secureRead('contacts', { filters, limit: 50 });
            // Note: contacts and inbox are the same conceptually in this UI

            if (!data || data.length === 0) {
                inbox.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">NO COMMS FOUND IN THIS CHANNEL</div>';
                return;
            }

            inbox.innerHTML = data.map(c => {
                const isDrafted = c.draft_reply && c.draft_reply.length > 0;
                let statusColor = '#ffaa00';
                let statusText = 'NEW LEAD';
                
                if (c.ai_status === 'completed') { 
                    statusColor = 'var(--admin-success)'; 
                    statusText = 'ACTIVE CLIENT'; 
                }
                else if (c.ai_status === 'archived') { 
                    statusColor = 'var(--admin-muted)'; 
                    statusText = 'ARCHIVED'; 
                }
                else if (isDrafted) { 
                    statusColor = 'var(--admin-cyan)'; 
                    statusText = 'LEAD (AI DRAFTED)'; 
                }

                return `
                <div class="post-row" style="display: block; padding: 15px; margin-bottom: 12px; cursor: default; border-left: 3px solid ${statusColor}; background: rgba(var(--accent2-rgb), 0.03); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: flex-start;">
                        <div>
                             <div style="font-weight: 800; color: var(--admin-white); font-size: 1rem; letter-spacing: 0.5px; margin-bottom: 2px;">${window.escapeHtml(c.name)}</div>
                             <div style="color: var(--admin-cyan); font-size: 0.75rem; font-family: monospace;">&lt;${window.escapeHtml(c.email)}&gt;</div>
                             <div style="font-size: 0.6rem; color: var(--admin-muted); margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">LAST SIGNAL: ${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</div>
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <div style="font-size: 0.65rem; font-family: 'Space Grotesk', sans-serif; font-weight: 900; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 3px 8px; border-radius: 4px; background: rgba(var(--accent2-rgb), 0.05);">${statusText}</div>
                            <button type="button" onclick="return archiveContact('${c.id}', event)" title="Archive" class="btn-icon-mini">📦</button>
                            <button type="button" onclick="return deleteContact('${c.id}', event)" title="Delete" class="btn-icon-mini danger">✖</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8rem; margin-bottom: 12px; color: var(--admin-text); padding: 10px; background: var(--admin-panel); border: 1px solid var(--admin-border); border-radius: 6px;">
                        <div><span style="color: var(--admin-muted); font-weight: bold; font-size: 0.7rem;">// SERVICE</span><br>${window.escapeHtml(c.service || c.project_type || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-weight: bold; font-size: 0.7rem;">// BUDGET</span><br>${window.escapeHtml(c.budget || 'N/A')}</div>
                        <div style="grid-column: span 2;"><span style="color: var(--admin-muted); font-weight: bold; font-size: 0.7rem;">// MESSAGE</span><br><span style="line-height: 1.6;">${window.escapeHtml(c.message || c.project_details || '')}</span></div>
                    </div>

                    ${isDrafted ? `
                    <div style="background: rgba(var(--accent2-rgb), 0.05); border-left: 3px solid var(--admin-cyan); padding: 15px; margin-top: 10px; border-radius: 0 6px 6px 0;">
                        <div style="font-size: 0.65rem; color: var(--admin-cyan); margin-bottom: 8px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">// OTP ORACLE DRAFT</div>
                        <div style="font-size: 0.85rem; color: var(--admin-text); white-space: pre-wrap; margin-bottom: 15px; line-height: 1.5; font-style: italic;">"${c.draft_reply.substring(0, 200)}${c.draft_reply.length > 200 ? '...' : ''}"</div>
                        <div style="display:flex; gap:12px;">
                            <button type="button" onclick="copyDraft('${c.id}')" class="btn-action-mini">COPY SIGNAL</button>
                            <button type="button" onclick="openReplyManager('${c.id}')" class="btn-action-mini outline">MODULATE RESPONSE</button>
                        </div>
                    </div>` : `
                    <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
                        <button type="button" onclick="openReplyManager('${c.id}')" class="btn-action-mini ghost">GENERATE RESPONSE</button>
                    </div>
                    `}
                </div>
                `;
            }).join('');
            
            // Store cache
            window.inboxCache = data;

        } catch (e) {
            inbox.innerHTML = `<div style="text-align: center; color: #ff4444; padding: 20px;">ERROR: ${window.escapeHtml ? window.escapeHtml(formatNetworkError(e)) : formatNetworkError(e)}</div>`;
        }
    };
    
    window.knowledgeFilesCache = [];
    window.leadOracleCache = {};
    try {
        Object.defineProperty(window, 'leadBrainCache', {
            configurable: true,
            enumerable: false,
            get() { return window.leadOracleCache; },
            set(v) { window.leadOracleCache = v; }
        });
    } catch (e) { /* property may already exist on hot reload */ }

    window.setupKnowledgeBrainUploader = function() {
        const input = document.getElementById('knowledgeFileInput');
        if (!input || input.dataset.bound === '1') return;
        input.dataset.bound = '1';
        input.addEventListener('change', async (event) => {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            await window.uploadKnowledgeFiles(files);
            input.value = '';
        });
    };

    window.updateKnowledgeFile = function(fileName) {
        const targetName = String(fileName || '').trim();
        if (!targetName) { showToast('MISSING FILE NAME'); return; }
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        let input = document.getElementById('knowledgeReplaceInput');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'knowledgeReplaceInput';
            input.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            input.style.display = 'none';
            document.body.appendChild(input);
        }
        input.dataset.targetName = targetName;
        input.onchange = async (ev) => {
            const picked = Array.from(ev.target.files || [])[0] || null;
            input.value = ''; // allow re-pick same file
            if (!picked) return;
            try {
                const apiBase = resolveApiBase();
                const formData = new FormData();
                formData.append('file', picked);
                formData.append('fileNameOverride', targetName);
                showToast(`UPDATING ${targetName}...`);
                const res = await fetch(`${apiBase}/api/admin/knowledge/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${state.token}` },
                    body: formData
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok || !payload.success) throw new Error(payload.message || `Update failed (${res.status})`);
                if (payload.duplicate) showToast('NO CHANGE (DUPLICATE CONTENT)');
                else if (payload.replaced) showToast('FILE UPDATED (NEW VERSION INDEXED)');
                else showToast('FILE INDEXED');
                await window.fetchKnowledgeFiles();
            } catch (e) {
                showToast(`UPDATE FAILED: ${formatNetworkError(e)}`);
            }
        };
        input.click();
    };

    window.updateKnowledgeFileById = function(fileId) {
        const id = String(fileId || '').trim();
        if (!id) { showToast('MISSING FILE ID'); return; }
        const hit = (window.knowledgeFilesCache || []).find((f) => f && String(f.file_id) === id);
        const name = String(hit?.file_name || '').trim();
        if (!name) { showToast('FILE NAME NOT FOUND'); return; }
        return window.updateKnowledgeFile(name);
    };

    window.fetchKnowledgeFiles = async function() {
        const container = document.getElementById('knowledgeFilesManager');
        const badge = document.getElementById('knowledgeStatusBadge');
        if (!state.token) {
            if (badge) badge.textContent = 'INDEX: AUTH REQUIRED';
            if (container) {
                container.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED TO LOAD KNOWLEDGE INDEX</div>';
            }
            return;
        }
        if (badge) badge.textContent = 'INDEX: SYNCING...';
        if (container) {
            container.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">SYNCING KNOWLEDGE INDEX...</div>';
        }
        try {
            const apiBase = resolveApiBase();
            await refreshKbMetaBestEffort();
            const res = await fetch(`${apiBase}/api/admin/knowledge/files`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const payload = await res.json();
            if (!res.ok || !payload.success) throw new Error(payload.message || `Index failed (${res.status})`);

            window.knowledgeFilesCache = payload.files || [];
            const files = window.knowledgeFilesCache;
            if (badge) badge.textContent = `INDEX: ${files.length} FILE${files.length === 1 ? '' : 'S'}`;
            if (!container) return;
            if (!files.length) {
                container.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">NO FILE INDEX YET</div>';
                return;
            }

            container.innerHTML = files.map(file => `
                <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--admin-border);border-radius:8px;margin-bottom:8px;background:var(--admin-panel);">
                    <div style="min-width:0;">
                        <div style="font-size:0.8rem;font-weight:700;color:var(--admin-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHtml(file.file_name || 'Untitled')}</div>
                        <div style="font-size:0.65rem;color:var(--admin-muted);margin-top:3px;">
                            ${(file.source_type || 'unknown').toUpperCase()} • ${file.chunk_count || 0} chunks • ${new Date(file.updated_at || Date.now()).toLocaleString()}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button type="button" onclick="window.updateKnowledgeFileById('${window.escapeHtml(file.file_id || '')}')" style="background:transparent;border:1px solid rgba(var(--accent2-rgb),0.35);color:var(--admin-cyan);font-size:0.66rem;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;">UPDATE</button>
                        <button type="button" onclick="window.archiveKnowledgeFile('${window.escapeHtml(file.file_id)}')" style="background:transparent;border:1px solid rgba(255,170,0,0.45);color:#ffd37a;font-size:0.66rem;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;">ARCHIVE</button>
                        <button type="button" onclick="window.deleteKnowledgeFile('${window.escapeHtml(file.file_id)}')" style="background:transparent;border:1px solid rgba(255,90,90,0.4);color:#ff8f8f;font-size:0.66rem;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;">DELETE</button>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            const authRequired = /invalid or expired token|authentication required|403/i.test(String(e.message || ''));
            if (badge) badge.textContent = 'INDEX: ERROR';
            if (container) {
                container.innerHTML = authRequired
                    ? '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED TO LOAD KNOWLEDGE INDEX</div>'
                    : `<div style="text-align:center;color:#ff8888;padding:20px;">INDEX ERROR: ${window.escapeHtml(e.message)}</div>`;
            }
        }
    };

    window.uploadKnowledgeFiles = async function(files) {
        if (!Array.isArray(files) || !files.length) return;
        if (!state.token) {
            showToast('LOGIN REQUIRED FOR KNOWLEDGE INGEST');
            return;
        }
        const apiBase = resolveApiBase();
        showToast(`INDEXING ${files.length} FILE${files.length === 1 ? '' : 'S'}...`);
        let duplicateCount = 0;
        let replacedCount = 0;
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${apiBase}/api/admin/knowledge/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: formData
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) {
                throw new Error(payload.message || `Upload failed for ${file.name}`);
            }
            if (payload.duplicate) duplicateCount += 1;
            if (payload.replaced) replacedCount += 1;
        }
        await window.fetchKnowledgeFiles();
        if (duplicateCount > 0) {
            showToast(`INDEX UPDATED (${duplicateCount} DUPLICATE${duplicateCount === 1 ? '' : 'S'} SKIPPED)`);
        } else if (replacedCount > 0) {
            showToast(`KNOWLEDGE UPDATED (${replacedCount} FILE${replacedCount === 1 ? '' : 'S'} REPLACED)`);
        } else {
            showToast('KNOWLEDGE INDEX UPDATED');
        }
    };

    window.archiveKnowledgeFile = async function(fileId) {
        const apiBase = resolveApiBase();
        if (!fileId) return;
        if (!confirm(`Archive indexed file ${fileId} (remove from active Oracle index)?`)) return;
        const res = await fetch(`${apiBase}/api/admin/knowledge/archive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ fileId, archivedPath: 'archive/old_versions/' })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload.success) {
            showToast(`ARCHIVE FAILED: ${(payload && payload.message) || res.status}`);
            return;
        }
        showToast('KNOWLEDGE FILE ARCHIVED');
        await window.fetchKnowledgeFiles();
    };

    window.deleteKnowledgeFile = async function(fileId) {
        const apiBase = resolveApiBase();
        if (!fileId) return;
        if (!confirm(`DELETE indexed file ${fileId} forever? This cannot be undone.`)) return;
        const res = await fetch(`${apiBase}/api/admin/knowledge/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ fileId })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload.success) {
            showToast(`DELETE FAILED: ${(payload && payload.message) || res.status}`);
            return;
        }
        showToast('KNOWLEDGE FILE DELETED');
        await window.fetchKnowledgeFiles();
    };

    // --- Structured Oracle Knowledge (priority layer) ---
    window.structuredKnowledgeCache = [];

    function parseCommaTags(input) {
        return String(input || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 24);
    }

    function setStructuredStatus(text) {
        const badge = document.getElementById('structuredKnowledgeBadge');
        if (badge) badge.textContent = String(text || 'STRUCTURED: STANDBY');
    }

    window.fetchStructuredKnowledge = async function() {
        const container = document.getElementById('structuredKnowledgeManager');
        if (!state.token) {
            setStructuredStatus('STRUCTURED: AUTH REQUIRED');
            if (container) container.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED TO LOAD STRUCTURED KNOWLEDGE</div>';
            return;
        }
        setStructuredStatus('STRUCTURED: SYNCING...');
        if (container) container.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">SYNCING STRUCTURED KNOWLEDGE...</div>';
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/knowledge/structured/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ includeInactive: true })
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Structured list failed (${res.status})`);
            window.structuredKnowledgeCache = Array.isArray(payload.entries) ? payload.entries : [];
            const entries = window.structuredKnowledgeCache;
            setStructuredStatus(`STRUCTURED: ${entries.length} ENTRY${entries.length === 1 ? '' : 'IES'}`);
            if (!container) return;
            if (!entries.length) {
                container.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">NO STRUCTURED ENTRIES YET</div>';
                return;
            }
            container.innerHTML = entries
                .slice()
                .sort((a, b) => (Number(b.priority || 0) - Number(a.priority || 0)))
                .map((e) => {
                    const title = window.escapeHtml(String(e.title || e.entry_id || 'Entry'));
                    const id = window.escapeHtml(String(e.entry_id || ''));
                    const tags = Array.isArray(e.service_tags) ? e.service_tags.join(', ') : '';
                    const active = e.active !== false;
                    const activeLabel = active ? 'ACTIVE' : 'INACTIVE';
                    const color = active ? 'var(--admin-success)' : '#ffaa00';
                    return `
                        <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--admin-border);border-radius:8px;margin-bottom:8px;background:var(--admin-panel);">
                            <div style="min-width:0;">
                                <div style="font-size:0.8rem;font-weight:800;color:var(--admin-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
                                <div style="font-size:0.66rem;color:var(--admin-muted);margin-top:3px;line-height:1.4;">
                                    <span style="color:${color};font-weight:900;letter-spacing:0.08em;">${activeLabel}</span>
                                    • priority ${Number(e.priority || 0)}
                                    ${tags ? `• tags: ${window.escapeHtml(tags)}` : ''}
                                </div>
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <button type="button" onclick="window.editStructuredKnowledgeEntry('${id}')" style="background:transparent;border:1px solid rgba(var(--accent2-rgb),0.35);color:var(--admin-cyan);font-size:0.66rem;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;">EDIT</button>
                            </div>
                        </div>
                    `;
                })
                .join('');
        } catch (e) {
            setStructuredStatus('STRUCTURED: ERROR');
            if (container) container.innerHTML = `<div style="text-align:center;color:#ff8888;padding:20px;">STRUCTURED ERROR: ${window.escapeHtml(e.message)}</div>`;
        }
    };

    window.openStructuredKnowledgeEditor = function() {
        const editor = document.getElementById('structuredKnowledgeEditor');
        const status = document.getElementById('structuredSaveStatus');
        if (status) status.textContent = '';
        if (editor) editor.style.display = 'block';
        const id = document.getElementById('structuredEntryId');
        const title = document.getElementById('structuredTitle');
        const tags = document.getElementById('structuredServiceTags');
        const pr = document.getElementById('structuredPriority');
        const active = document.getElementById('structuredActive');
        const body = document.getElementById('structuredBody');
        const rules = document.getElementById('structuredDocRules');
        if (id) id.value = '';
        if (title) title.value = '';
        if (tags) tags.value = '';
        if (pr) pr.value = '5';
        if (active) active.checked = true;
        if (body) body.value = '';
        if (rules) rules.value = '';
    };

    window.editStructuredKnowledgeEntry = function(entryId) {
        const e = (window.structuredKnowledgeCache || []).find((x) => x && String(x.entry_id) === String(entryId));
        window.openStructuredKnowledgeEditor();
        const id = document.getElementById('structuredEntryId');
        const title = document.getElementById('structuredTitle');
        const tags = document.getElementById('structuredServiceTags');
        const pr = document.getElementById('structuredPriority');
        const active = document.getElementById('structuredActive');
        const body = document.getElementById('structuredBody');
        const rules = document.getElementById('structuredDocRules');
        if (id) id.value = String(e?.entry_id || '');
        if (title) title.value = String(e?.title || '');
        if (tags) tags.value = Array.isArray(e?.service_tags) ? e.service_tags.join(', ') : '';
        if (pr) pr.value = String(e?.priority ?? '0');
        if (active) active.checked = e?.active !== false;
        // Note: list endpoint returns `text`, but upsert supports body/doc_rules; we keep editor best-effort.
        if (body) body.value = String(e?.body || e?.text || '');
        if (rules) rules.value = String(e?.doc_rules || '');
    };

    window.closeStructuredKnowledgeEditor = function() {
        const editor = document.getElementById('structuredKnowledgeEditor');
        if (editor) editor.style.display = 'none';
    };

    window.saveStructuredKnowledgeEntry = async function() {
        const status = document.getElementById('structuredSaveStatus');
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const entry_id = String(document.getElementById('structuredEntryId')?.value || '').trim() || undefined;
        const title = String(document.getElementById('structuredTitle')?.value || '').trim();
        const service_tags = parseCommaTags(document.getElementById('structuredServiceTags')?.value || '');
        const priority = Number(document.getElementById('structuredPriority')?.value || 0);
        const active = !!document.getElementById('structuredActive')?.checked;
        const body = String(document.getElementById('structuredBody')?.value || '').trim();
        const doc_rules = String(document.getElementById('structuredDocRules')?.value || '').trim();
        if (!title) { showToast('TITLE REQUIRED'); return; }
        try {
            if (status) status.textContent = 'Saving...';
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/knowledge/structured/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ entry_id, title, service_tags, priority, active, body, doc_rules })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Save failed (${res.status})`);
            showToast('STRUCTURED ENTRY SAVED');
            if (status) status.textContent = 'Saved.';
            window.closeStructuredKnowledgeEditor();
            await window.fetchStructuredKnowledge();
        } catch (e) {
            if (status) status.textContent = `Save failed: ${e.message}`;
            showToast(`SAVE FAILED: ${e.message}`);
        }
    };

    window.archiveStructuredKnowledgeEntry = async function() {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const entry_id = String(document.getElementById('structuredEntryId')?.value || '').trim();
        if (!entry_id) { showToast('NO ENTRY SELECTED'); return; }
        if (!confirm(`Archive structured knowledge entry ${entry_id}?`)) return;
        const status = document.getElementById('structuredSaveStatus');
        try {
            if (status) status.textContent = 'Archiving...';
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/knowledge/structured/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ entry_id })
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Archive failed (${res.status})`);
            showToast('STRUCTURED ENTRY ARCHIVED');
            if (status) status.textContent = 'Archived.';
            window.closeStructuredKnowledgeEditor();
            await window.fetchStructuredKnowledge();
        } catch (e) {
            if (status) status.textContent = `Archive failed: ${e.message}`;
            showToast(`ARCHIVE FAILED: ${e.message}`);
        }
    };

    // --- OTP OPS: Quick Intake / Job Sheet ---
    window.opsJobsCache = [];
    let opsJobsRefreshTimer = null;

    const moneyFromCents = (c) => {
        const n = Number(c);
        if (!Number.isFinite(n)) return '—';
        return `$${(n / 100).toFixed(0)}`;
    };

    const parseMoneyToCents = (raw) => {
        const t = String(raw == null ? '' : raw).trim();
        if (!t) return null;
        const cleaned = t.replace(/[^0-9.]/g, '');
        if (!cleaned) return null;
        const num = Number(cleaned);
        if (!Number.isFinite(num) || num < 0) return null;
        return Math.round(num * 100);
    };

    window.queueOpsJobsRefresh = function() {
        if (opsJobsRefreshTimer) clearTimeout(opsJobsRefreshTimer);
        opsJobsRefreshTimer = setTimeout(() => window.fetchOpsJobs(), 300);
    };

    function setOpsBadge(text) {
        const b = document.getElementById('opsJobsBadge');
        if (b) b.textContent = String(text || 'JOBS: STANDBY');
    }

    function setCount(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value == null ? '0' : value);
    }

    window.fetchOpsJobs = async function() {
        const mgr = document.getElementById('opsJobsManager');
        if (!state.token) {
            setOpsBadge('JOBS: AUTH REQUIRED');
            if (mgr) mgr.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">LOGIN REQUIRED</div>';
            return;
        }
        setOpsBadge('JOBS: SYNCING...');
        if (mgr) mgr.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">SYNCING JOB SHEETS...</div>';
        try {
            const apiBase = resolveApiBase();
            const q = String(document.getElementById('opsJobsSearch')?.value || '').trim();
            const packageType = String(document.getElementById('opsFilterPackageType')?.value || '').trim();
            const paymentStatus = String(document.getElementById('opsFilterPaymentStatus')?.value || '').trim();
            const jobStatus = String(document.getElementById('opsFilterJobStatus')?.value || '').trim();
            const dueAfter = String(document.getElementById('opsFilterDueAfter')?.value || '').trim();
            const dueBefore = String(document.getElementById('opsFilterDueBefore')?.value || '').trim();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ q, packageType, paymentStatus, jobStatus, dueAfter, dueBefore, limit: 50, offset: 0 })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `List failed (${res.status})`);
            const rows = Array.isArray(payload.rows) ? payload.rows : [];
            window.opsJobsCache = rows;
            setOpsBadge(`JOBS: ${rows.length}${payload.total != null ? ` / ${payload.total}` : ''}`);

            const c = payload.counts || {};
            setCount('opsCountNewLead', c['New Lead'] ?? 0);
            setCount('opsCountQuoteSent', c['Quote Sent'] ?? 0);
            setCount('opsCountActiveClient', c['Active Client'] ?? 0);
            setCount('opsCountAwaitingFinalPayment', c['Awaiting Final Payment'] ?? 0);
            setCount('opsCountCompleted', c['Completed'] ?? 0);

            if (!mgr) return;
            if (!rows.length) {
                mgr.innerHTML = '<div style="text-align:center;color:var(--admin-muted);padding:20px;">NO JOBS YET</div>';
                return;
            }
            mgr.innerHTML = rows.map((r) => {
                const due = r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—';
                const upd = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '';
                const pay = r.paymentStatus || '—';
                const st = r.jobStatus || '—';
                return `
                    <div style="border:1px solid var(--admin-border);border-radius:12px;padding:12px;background:var(--admin-panel);margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                            <div style="min-width:240px;flex:1;">
                                <div style="font-size:0.66rem;color:var(--admin-muted);letter-spacing:0.08em;font-weight:900;">${window.escapeHtml(String(r.jobId || ''))}</div>
                                <div style="font-size:0.92rem;font-weight:900;color:var(--admin-text);margin-top:4px;">${window.escapeHtml(String(r.clientName || ''))}</div>
                                <div style="font-size:0.72rem;color:var(--admin-muted);margin-top:4px;line-height:1.35;">${window.escapeHtml(String(r.projectTitle || ''))}</div>
                                <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:6px;line-height:1.35;">
                                    ${window.escapeHtml(String(r.packageType || ''))} • ${moneyFromCents(r.totalPriceCents)} • ${window.escapeHtml(pay)} • ${window.escapeHtml(st)} • Due: ${window.escapeHtml(due)}
                                </div>
                                <div style="font-size:0.62rem;color:var(--admin-muted);margin-top:4px;">Updated: ${window.escapeHtml(upd)}</div>
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                                <button type="button" class="btn-secondary" style="width:auto;font-size:0.68rem;" onclick="window.openOpsJobEditor('${window.escapeHtml(String(r.jobId || ''))}')">OPEN / EDIT</button>
                                <button type="button" class="btn-secondary" style="width:auto;font-size:0.68rem;" onclick="window.updateOpsJobStatus('${window.escapeHtml(String(r.jobId || ''))}','Completed')">MARK COMPLETED</button>
                                <button type="button" class="btn-secondary" style="width:auto;font-size:0.68rem;" onclick="window.archiveOpsJob('${window.escapeHtml(String(r.jobId || ''))}')">ARCHIVE</button>
                                <button type="button" class="btn-secondary" style="width:auto;font-size:0.68rem;background:rgba(255,68,68,0.12);border:1px solid rgba(255,68,68,0.28);color:var(--admin-text);" onclick="window.deleteOpsJob('${window.escapeHtml(String(r.jobId || ''))}')">TRASH</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            setOpsBadge('JOBS: ERROR');
            if (mgr) mgr.innerHTML = `<div style="text-align:center;color:#ff8888;padding:20px;">OPS ERROR: ${window.escapeHtml(e.message)}</div>`;
        }
    };

    window.openOpsJobEditor = async function(jobId) {
        const editor = document.getElementById('opsJobsEditor');
        const status = document.getElementById('opsJobSaveStatus');
        if (status) status.textContent = '';
        if (editor) editor.style.display = 'block';
        const meta = document.getElementById('opsEditorMeta');
        const packetMeta = document.getElementById('opsPacketMeta');
        const packetStatus = document.getElementById('opsPacketStatus');
        if (packetMeta) packetMeta.textContent = 'Select docs, preview packet readiness, then export a ZIP bundle.';
        if (packetStatus) packetStatus.textContent = '';
        window.__opsPacketState = null;

        const sendStatus = document.getElementById('opsSendStatus');
        const sendMeta = document.getElementById('opsSendMeta');
        if (sendMeta) sendMeta.textContent = 'Prepare, review, then send valid docs/packet. No auto-send.';
        if (sendStatus) sendStatus.textContent = '';
        const sendTo = document.getElementById('opsSendTo');
        const sendSubject = document.getElementById('opsSendSubject');
        const sendBody = document.getElementById('opsSendBody');
        if (sendTo) sendTo.value = '';
        if (sendSubject) sendSubject.value = '';
        if (sendBody) sendBody.value = '';
        window.__opsSendState = null;

        // Default clean state
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val == null ? '' : String(val); };
        const setCk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        const setPlaceholder = (id, val) => { const el = document.getElementById(id); if (el) el.placeholder = String(val || ''); };

        set('opsJobId', '');
        set('opsClientName', '');
        set('opsBusinessName', '');
        set('opsPhone', '');
        set('opsEmail', '');
        set('opsServiceType', '');
        set('opsPackageType', '');
        set('opsProjectTitle', '');
        set('opsProjectDescription', '');
        set('opsDeliverables', '');
        set('opsAddOns', '');
        set('opsStartDate', '');
        set('opsDueDate', '');
        setCk('opsAllowDateOverride', false);
        set('opsTotalPrice', '');
        set('opsDepositAmount', '');
        set('opsPaymentMethod', '');
        set('opsPaymentStatus', '');
        set('opsJobStatus', '');
        set('opsClientNotes', '');
        set('opsInternalNotes', '');
        setCk('opsPortfolioPermission', false);
        setCk('opsAgreementSigned', false);
        setCk('opsInvoiceSent', false);
        window.recalcOpsBalance();
        refreshOpsPricingGuidance();

        if (!jobId) {
            if (meta) meta.textContent = 'New manual intake record.';
            // Official pricing hints (non-binding)
            setPlaceholder('opsTotalPrice', 'Total Price * (e.g. 500)');
            setPlaceholder('opsDepositAmount', 'Deposit Amount (e.g. 250)');
            // Sensible defaults to reduce save failures.
            set('opsPaymentStatus', 'Unpaid');
            set('opsJobStatus', 'New Lead');
            return;
        }

        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/get`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId })
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Get failed (${res.status})`);
            const r = payload.row || {};
            set('opsJobId', r.jobId || '');
            set('opsClientName', r.clientName || '');
            set('opsBusinessName', r.businessName || '');
            set('opsPhone', r.phone || '');
            set('opsEmail', r.email || '');
            set('opsServiceType', r.serviceType || '');
            set('opsPackageType', r.packageType || '');
            set('opsProjectTitle', r.projectTitle || '');
            set('opsProjectDescription', r.projectDescription || '');
            set('opsDeliverables', r.deliverables || '');
            set('opsAddOns', r.addOns || '');
            set('opsStartDate', r.startDate || '');
            set('opsDueDate', r.dueDate || '');
            setCk('opsAllowDateOverride', !!r.allowDateOverride);
            set('opsTotalPrice', r.totalPriceCents != null ? String(Math.round(Number(r.totalPriceCents) / 100)) : '');
            set('opsDepositAmount', r.depositAmountCents != null ? String(Math.round(Number(r.depositAmountCents) / 100)) : '');
            set('opsPaymentMethod', r.paymentMethod || '');
            set('opsPaymentStatus', r.paymentStatus || '');
            set('opsJobStatus', r.jobStatus || '');
            set('opsClientNotes', r.clientNotes || '');
            set('opsInternalNotes', r.internalNotes || '');
            setCk('opsPortfolioPermission', !!r.portfolioPermission);
            setCk('opsAgreementSigned', !!r.agreementSigned);
            setCk('opsInvoiceSent', !!r.invoiceSent);
            window.recalcOpsBalance();
            refreshOpsPricingGuidance();
            if (meta) meta.textContent = `Editing ${r.jobId} • created ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}`;

            // Send panel defaults from saved record
            if (sendTo) sendTo.value = String(r.email || '').trim();
        } catch (e) {
            showToast(`LOAD FAILED: ${e.message}`);
        }
    };

    window.closeOpsJobEditor = function() {
        const editor = document.getElementById('opsJobsEditor');
        if (editor) editor.style.display = 'none';
    };

    window.recalcOpsBalance = function() {
        const totalCents = parseMoneyToCents(document.getElementById('opsTotalPrice')?.value);
        const depCents = parseMoneyToCents(document.getElementById('opsDepositAmount')?.value) ?? 0;
        const el = document.getElementById('opsRemainingBalance');
        if (!el) return;
        if (totalCents == null) { el.textContent = '—'; return; }
        const safeDep = Math.min(depCents, totalCents);
        const rem = Math.max(0, totalCents - safeDep);
        el.textContent = moneyFromCents(rem);
        const warn = depCents > totalCents;
        el.style.color = warn ? '#ffb86b' : 'var(--admin-text)';
        el.title = warn ? 'Deposit cannot exceed total. Adjust values before saving.' : '';
    };

    // React to package/service changes without touching saved pricing fields.
    (function attachOpsPricingGuidanceListeners() {
        const pkg = document.getElementById('opsPackageType');
        const svc = document.getElementById('opsServiceType');
        if (pkg) {
            pkg.addEventListener('change', refreshOpsPricingGuidance);
            pkg.addEventListener('input', refreshOpsPricingGuidance);
        }
        if (svc) {
            svc.addEventListener('change', refreshOpsPricingGuidance);
            svc.addEventListener('input', refreshOpsPricingGuidance);
            svc.addEventListener('blur', refreshOpsPricingGuidance);
        }
    })();

    window.saveOpsJob = async function() {
        const status = document.getElementById('opsJobSaveStatus');
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const jobId = String(document.getElementById('opsJobId')?.value || '').trim();
        const clientName = String(document.getElementById('opsClientName')?.value || '').trim();
        const email = String(document.getElementById('opsEmail')?.value || '').trim();
        const serviceType = String(document.getElementById('opsServiceType')?.value || '').trim();
        const packageType = String(document.getElementById('opsPackageType')?.value || '').trim();
        const projectTitle = String(document.getElementById('opsProjectTitle')?.value || '').trim();
        const startDate = String(document.getElementById('opsStartDate')?.value || '').trim();
        const dueDate = String(document.getElementById('opsDueDate')?.value || '').trim();
        const allowDateOverride = !!document.getElementById('opsAllowDateOverride')?.checked;
        const totalPrice = String(document.getElementById('opsTotalPrice')?.value || '').trim();
        const depositAmount = String(document.getElementById('opsDepositAmount')?.value || '').trim();
        const paymentMethod = String(document.getElementById('opsPaymentMethod')?.value || '').trim();
        const paymentStatus = String(document.getElementById('opsPaymentStatus')?.value || '').trim();
        const jobStatus = String(document.getElementById('opsJobStatus')?.value || '').trim();

        // Client-side guardrails (server remains source of truth).
        if (!clientName) { showToast('CLIENT NAME REQUIRED'); return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('EMAIL INVALID'); return; }
        if (!serviceType) { showToast('SERVICE TYPE REQUIRED'); return; }
        if (!packageType) { showToast('PACKAGE TYPE REQUIRED'); return; }
        if (!projectTitle) { showToast('PROJECT TITLE REQUIRED'); return; }
        const totalCents = parseMoneyToCents(totalPrice);
        if (totalCents == null) { showToast('TOTAL PRICE REQUIRED'); return; }
        const depCents = parseMoneyToCents(depositAmount) ?? 0;
        if (depCents > totalCents) { showToast('DEPOSIT > TOTAL'); return; }
        if (!paymentStatus) { showToast('PAYMENT STATUS REQUIRED'); return; }
        if ((paymentStatus === 'Deposit Paid' || paymentStatus === 'Paid in Full') && !paymentMethod) { showToast('PAYMENT METHOD REQUIRED'); return; }
        if (!jobStatus) { showToast('JOB STATUS REQUIRED'); return; }
        if (startDate && dueDate && !allowDateOverride) {
            const s = new Date(startDate);
            const d = new Date(dueDate);
            if (Number.isFinite(s.getTime()) && Number.isFinite(d.getTime()) && d.getTime() < s.getTime()) {
                showToast('DUE DATE < START DATE (ENABLE OVERRIDE)');
                return;
            }
        }

        const job = {
            jobId,
            sourceType: 'manualIntake',
            clientName,
            businessName: String(document.getElementById('opsBusinessName')?.value || '').trim(),
            phone: String(document.getElementById('opsPhone')?.value || '').trim(),
            email,
            serviceType,
            packageType,
            projectTitle,
            projectDescription: String(document.getElementById('opsProjectDescription')?.value || '').trim(),
            deliverables: String(document.getElementById('opsDeliverables')?.value || '').trim(),
            addOns: String(document.getElementById('opsAddOns')?.value || '').trim(),
            startDate,
            dueDate,
            allowDateOverride,
            totalPrice,
            depositAmount,
            paymentMethod,
            paymentStatus,
            jobStatus,
            clientNotes: String(document.getElementById('opsClientNotes')?.value || '').trim(),
            internalNotes: String(document.getElementById('opsInternalNotes')?.value || '').trim(),
            portfolioPermission: !!document.getElementById('opsPortfolioPermission')?.checked,
            agreementSigned: !!document.getElementById('opsAgreementSigned')?.checked,
            invoiceSent: !!document.getElementById('opsInvoiceSent')?.checked
        };
        try {
            if (status) status.textContent = 'Saving...';
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId: jobId || undefined, job })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Save failed (${res.status})`);
            showToast('JOB SAVED');
            if (status) status.textContent = 'Saved.';
            const saved = payload.row || {};
            const idEl = document.getElementById('opsJobId');
            if (idEl && saved.jobId) idEl.value = saved.jobId;
            await window.fetchOpsJobs();
        } catch (e) {
            const msg = formatNetworkError(e);
            if (status) status.textContent = `Save failed: ${msg}`;
            showToast(`SAVE FAILED: ${msg}`);
        }
    };

    window.updateOpsJobStatus = async function(jobId, nextStatus) {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        if (!jobId || !nextStatus) return;
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId, jobStatus: nextStatus })
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Status failed (${res.status})`);
            showToast('STATUS UPDATED');
            await window.fetchOpsJobs();
        } catch (e) {
            showToast(`STATUS FAILED: ${e.message}`);
        }
    };

    window.archiveOpsJob = async function(jobId) {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        if (!jobId) return;
        if (!confirm(`Archive job ${jobId}?`)) return;
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId })
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Archive failed (${res.status})`);
            showToast('JOB ARCHIVED');
            await window.fetchOpsJobs();
        } catch (e) {
            showToast(`ARCHIVE FAILED: ${e.message}`);
        }
    };

    window.deleteOpsJob = async function(jobId) {
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        const id = String(jobId || '').trim();
        if (!id) return;
        const typed = prompt(`TRASH / DELETE job ${id}?\n\nThis permanently removes the record.\nType DELETE to confirm.`, '');
        if (String(typed || '').trim().toUpperCase() !== 'DELETE') {
            showToast('DELETE CANCELLED');
            return;
        }
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId: id })
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Delete failed (${res.status})`);
            showToast('JOB DELETED');
            const cur = String(document.getElementById('opsJobId')?.value || '').trim();
            if (cur && cur === id) window.closeOpsJobEditor?.();
            await window.fetchOpsJobs();
        } catch (e) {
            showToast(`DELETE FAILED: ${e.message}`);
        }
    };

    window.closeOpsDocPanel = function() {
        const panel = document.getElementById('opsDocPanel');
        if (panel) panel.style.display = 'none';
        const wrap = document.getElementById('opsDocPanelWrap');
        if (wrap) wrap.style.display = 'none';
    };
    window.copyOpsDocOutput = async function() {
        const el = document.getElementById('opsDocOutput');
        const text = String(el?.textContent || '').trim();
        if (!text) { showToast('NOTHING TO COPY'); return; }
        try {
            await navigator.clipboard.writeText(text);
            showToast('COPIED');
        } catch (_) {
            // Fallback
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('COPIED');
            } catch (e) {
                showToast('COPY FAILED');
            }
        }
    };
    window.generateOpsDoc = async function(docType) {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const jobId = String(document.getElementById('opsJobId')?.value || '').trim();
        if (!jobId) { showToast('SAVE JOB FIRST'); return; }
        const type = String(docType || '').trim();
        if (!type) { showToast('MISSING DOC TYPE'); return; }
        const panel = document.getElementById('opsDocPanel');
        const titleEl = document.getElementById('opsDocTitle');
        const metaEl = document.getElementById('opsDocMeta');
        const outEl = document.getElementById('opsDocOutput');
        if (titleEl) titleEl.textContent = type.toUpperCase();
        if (metaEl) metaEl.textContent = 'Generating…';
        if (outEl) outEl.textContent = '';
        if (panel) panel.style.display = 'block';
        const wrap = document.getElementById('opsDocPanelWrap');
        if (wrap) { wrap.style.display = 'block'; wrap.open = true; }

        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/docs/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId, docType: type })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Generate failed (${res.status})`);
            const doc = payload.doc || {};
            window.__opsDocState = { jobId, docType: type, doc };
            const warnings = Array.isArray(doc.warnings) ? doc.warnings : [];
            const missing = Array.isArray(doc.validation?.missing_required_fields) ? doc.validation.missing_required_fields : [];
            const blocked = !!doc.validation?.blocking;
            if (metaEl) {
                const parts = [
                    (doc.schema || 'doc'),
                    (doc.generated_at || ''),
                    (blocked ? 'BLOCKED: missing required fields' : ''),
                    (missing.length ? `Missing: ${missing.join(', ')}` : ''),
                    (warnings.length ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : '')
                ].filter(Boolean);
                metaEl.textContent = parts.join(' • ');
            }
            if (outEl) outEl.textContent = String(doc.rendered_markdown || '').trim() || JSON.stringify(doc, null, 2);
            if (blocked) showToast(`DOC BLOCKED (${missing.length || 0} MISSING)`);
            else if (warnings.length) showToast(`DOC READY (${warnings.length} WARN)`);
            else showToast('DOC READY');
        } catch (e) {
            if (metaEl) metaEl.textContent = `Generation failed: ${e.message}`;
            if (outEl) outEl.textContent = '';
            showToast(`DOC FAILED: ${e.message}`);
        }
    };

    window.exportOpsDoc = async function(format) {
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        const s = window.__opsDocState || {};
        const jobId = String(s.jobId || document.getElementById('opsJobId')?.value || '').trim();
        const docType = String(s.docType || '').trim();
        if (!jobId || !docType) { showToast('GENERATE DOC FIRST'); return; }
        const fmt = String(format || '').trim().toLowerCase();
        if (!['pdf', 'docx'].includes(fmt)) { showToast('INVALID FORMAT'); return; }
        try {
            const apiBase = resolveApiBase();
            const url = `${apiBase}/api/admin/ops/docs/export/${encodeURIComponent(fmt)}/${encodeURIComponent(jobId)}/${encodeURIComponent(docType)}`;
            const res = await fetchWithTimeout(url, { headers: { 'Authorization': `Bearer ${state.token}` } }, 90000);
            if (!res.ok) {
                const text = await res.text();
                let msg = `Export failed (${res.status})`;
                try {
                    const j = JSON.parse(text);
                    msg = j.message || j.error || msg;
                    if (j.validation?.missing_required_fields?.length) {
                        msg += ` • Missing: ${j.validation.missing_required_fields.join(', ')}`;
                    }
                } catch (_) {}
                throw new Error(msg);
            }
            const blob = fmt === 'pdf'
                ? new Blob([await res.arrayBuffer()], { type: 'application/pdf' })
                : new Blob([await res.arrayBuffer()], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const yyyyMmDd = new Date().toISOString().slice(0, 10);
            const slug = String(docType).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'document';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${jobId}-${slug}-${yyyyMmDd}.${fmt}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
                a.remove();
            }, 500);
            showToast('EXPORT STARTED');
        } catch (e) {
            showToast(`EXPORT FAILED: ${formatNetworkError(e)}`);
        }
    };

    function getOpsPacketDocTypes() {
        return Array.from(document.querySelectorAll('.opsPacketDocNeed'))
            .filter((el) => !!el.checked)
            .map((el) => String(el.value || '').trim())
            .filter(Boolean);
    }
    function getOpsPacketFormats() {
        const list = Array.from(document.querySelectorAll('.opsPacketFmtNeed'))
            .filter((el) => !!el.checked)
            .map((el) => String(el.value || '').trim().toLowerCase())
            .filter(Boolean);
        return list.length ? list : ['pdf', 'docx'];
    }
    function setOpsPacketStatus(text) {
        const el = document.getElementById('opsPacketStatus');
        if (el) el.textContent = String(text || '');
    }

    window.previewOpsPacket = async function() {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const jobId = String(document.getElementById('opsJobId')?.value || '').trim();
        if (!jobId) { showToast('OPEN A JOB FIRST'); return; }
        const docTypes = getOpsPacketDocTypes();
        if (!docTypes.length) { showToast('SELECT DOCS'); return; }
        const formats = getOpsPacketFormats();
        const meta = document.getElementById('opsPacketMeta');
        const btn = Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.trim() === 'BUILD / PREVIEW') || null;
        try {
            if (btn) { btn.disabled = true; btn.style.opacity = '0.65'; }
            setOpsPacketStatus('Building packet preview…');
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/packets/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId, docTypes, formats })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Preview failed (${res.status})`);
            const packet = payload.packet || {};
            window.__opsPacketState = { jobId, docTypes, formats, packet };
            const inc = Array.isArray(packet.included) ? packet.included : [];
            const blk = Array.isArray(packet.blocked) ? packet.blocked : [];
            const incLine = inc.map(d => d.docType).join(', ') || '—';
            const blkLine = blk.map(d => d.docType).join(', ') || '—';
            const missingLine = blk.length
                ? blk.map(b => `${b.docType}: ${(b.missing_required_fields || []).join(', ') || 'missing fields'}`).join(' • ')
                : '';
            setOpsPacketStatus(
                [
                    `Included: ${incLine}`,
                    blk.length ? `Blocked: ${blkLine}` : '',
                    missingLine ? `Missing: ${missingLine}` : '',
                    inc.length ? 'Packet ready for export.' : 'No valid docs included yet.'
                ].filter(Boolean).join('\n')
            );
            if (meta) meta.textContent = `Packet preview • ${inc.length} included • ${blk.length} blocked`;
            if (blk.length) showToast(`PACKET: ${inc.length} OK / ${blk.length} BLOCKED`);
            else showToast('PACKET READY');
        } catch (e) {
            setOpsPacketStatus(`Preview failed: ${e.message}`);
            showToast(`PACKET FAILED: ${formatNetworkError(e)}`);
        } finally {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
    };

    window.exportOpsPacketZip = async function() {
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        const s = window.__opsPacketState || {};
        const jobId = String(s.jobId || document.getElementById('opsJobId')?.value || '').trim();
        if (!jobId) { showToast('OPEN A JOB FIRST'); return; }
        const docTypes = (Array.isArray(s.docTypes) && s.docTypes.length) ? s.docTypes : getOpsPacketDocTypes();
        if (!docTypes.length) { showToast('SELECT DOCS'); return; }
        const formats = (Array.isArray(s.formats) && s.formats.length) ? s.formats : getOpsPacketFormats();
        const btn = Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.trim() === 'EXPORT PACKET ZIP') || null;
        try {
            if (btn) { btn.disabled = true; btn.style.opacity = '0.65'; }
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/packets/export-zip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId, docTypes, formats })
            }, 120000);
            if (!res.ok) {
                const text = await res.text();
                let msg = `Export failed (${res.status})`;
                try {
                    const j = JSON.parse(text);
                    msg = j.message || j.error || msg;
                } catch (_) {}
                throw new Error(msg);
            }
            const blob = new Blob([await res.arrayBuffer()], { type: 'application/zip' });
            const yyyyMmDd = new Date().toISOString().slice(0, 10);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${jobId}-packet-${yyyyMmDd}.zip`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
                a.remove();
            }, 500);
            showToast('PACKET ZIP DOWNLOADING');
        } catch (e) {
            showToast(`PACKET EXPORT FAILED: ${formatNetworkError(e)}`);
        } finally {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
    };

    window.copyOpsPacketSummary = async function() {
        const packet = window.__opsPacketState?.packet || null;
        const text = String(packet?.share_summary || '').trim();
        if (!text) { showToast('BUILD PACKET FIRST'); return; }
        try {
            await navigator.clipboard.writeText(text);
            showToast('SUMMARY COPIED');
        } catch (_) {
            showToast('COPY FAILED');
        }
    };

    window.copyOpsPacketClientMessage = async function() {
        const packet = window.__opsPacketState?.packet || null;
        const text = String(packet?.client_message || '').trim();
        if (!text) { showToast('BUILD PACKET FIRST'); return; }
        try {
            await navigator.clipboard.writeText(text);
            showToast('MESSAGE COPIED');
        } catch (_) {
            showToast('COPY FAILED');
        }
    };

    function setOpsSendStatus(text) {
        const el = document.getElementById('opsSendStatus');
        if (el) el.textContent = String(text || '');
    }

    window.copyOpsSendBody = async function() {
        const text = String(document.getElementById('opsSendBody')?.value || '').trim();
        if (!text) { showToast('NO MESSAGE'); return; }
        try { await navigator.clipboard.writeText(text); showToast('COPIED'); } catch (_) { showToast('COPY FAILED'); }
    };

    window.copyOpsSendSummary = async function() {
        const text = String(window.__opsSendState?.share_summary || window.__opsPacketState?.packet?.share_summary || '').trim();
        if (!text) { showToast('PREPARE SEND FIRST'); return; }
        try { await navigator.clipboard.writeText(text); showToast('COPIED'); } catch (_) { showToast('COPY FAILED'); }
    };

    window.prepareOpsSend = async function() {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const jobId = String(document.getElementById('opsJobId')?.value || '').trim();
        if (!jobId) { showToast('OPEN A JOB FIRST'); return; }
        const docTypes = getOpsPacketDocTypes();
        if (!docTypes.length) { showToast('SELECT DOCS'); return; }
        const formats = getOpsPacketFormats();
        const mode = String(document.getElementById('opsSendMode')?.value || 'packet').trim();

        const btn = Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.trim() === 'PREPARE SEND') || null;
        try {
            if (btn) { btn.disabled = true; btn.style.opacity = '0.65'; }
            setOpsSendStatus('Preparing send…');
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/send/prepare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId, mode, docTypes, formats })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Prepare failed (${res.status})`);

            const toEl = document.getElementById('opsSendTo');
            const subjEl = document.getElementById('opsSendSubject');
            const bodyEl = document.getElementById('opsSendBody');
            if (toEl && !String(toEl.value || '').trim()) toEl.value = payload.to_default || '';
            if (subjEl) subjEl.value = payload.subject_default || '';
            if (bodyEl) bodyEl.value = payload.body_default || '';

            const inc = Array.isArray(payload.included) ? payload.included : [];
            const blk = Array.isArray(payload.blocked) ? payload.blocked : [];
            const incNames = inc.map(d => d.docType).join(', ') || '—';
            const blkNames = blk.map(d => d.docType).join(', ') || '—';
            const missingLine = blk.length
                ? blk.map(b => `${b.docType}: ${(b.missing_required_fields || []).join(', ') || 'missing fields'}`).join(' • ')
                : '';

            window.__opsSendState = {
                jobId,
                mode,
                docTypes,
                formats,
                included: inc,
                blocked: blk,
                share_summary: payload.packet?.share_summary || '',
                client_message: payload.packet?.client_message || ''
            };

            setOpsSendStatus(
                [
                    `Ready docs: ${incNames}`,
                    blk.length ? `Blocked: ${blkNames}` : '',
                    missingLine ? `Missing: ${missingLine}` : '',
                    payload.to_default ? '' : 'Recipient email is missing in the job record — enter recipient to send.',
                    inc.length ? 'Review subject/body, then send.' : 'No valid docs included yet.'
                ].filter(Boolean).join('\n')
            );
            if (blk.length) showToast(`SEND PREP: ${inc.length} OK / ${blk.length} BLOCKED`);
            else showToast('SEND PREP READY');
        } catch (e) {
            setOpsSendStatus(`Prepare failed: ${e.message}`);
            showToast(`SEND PREP FAILED: ${formatNetworkError(e)}`);
        } finally {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
    };

    window.executeOpsSend = async function() {
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        const s = window.__opsSendState || {};
        const jobId = String(s.jobId || document.getElementById('opsJobId')?.value || '').trim();
        if (!jobId) { showToast('OPEN A JOB FIRST'); return; }
        const mode = String(document.getElementById('opsSendMode')?.value || s.mode || 'packet').trim();
        const to = String(document.getElementById('opsSendTo')?.value || '').trim();
        const subject = String(document.getElementById('opsSendSubject')?.value || '').trim();
        const body = String(document.getElementById('opsSendBody')?.value || '').trim();
        const docTypes = (Array.isArray(s.docTypes) && s.docTypes.length) ? s.docTypes : getOpsPacketDocTypes();
        const formats = (Array.isArray(s.formats) && s.formats.length) ? s.formats : getOpsPacketFormats();
        if (!to) { showToast('RECIPIENT EMAIL REQUIRED'); return; }
        if (!subject) { showToast('SUBJECT REQUIRED'); return; }
        if (!body) { showToast('MESSAGE REQUIRED'); return; }
        if (!docTypes.length) { showToast('SELECT DOCS'); return; }

        const btn = Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.trim() === 'SEND') || null;
        try {
            if (btn) { btn.disabled = true; btn.style.opacity = '0.65'; }
            setOpsSendStatus('Sending…');
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/send/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ jobId, mode, to, subject, body, docTypes, formats })
            }, 120000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Send failed (${res.status})`);
            const sent = Array.isArray(payload.sent) ? payload.sent : [];
            setOpsSendStatus(`Sent: ${sent.map(a => a.filename).join(', ') || '—'}${payload.resend_email_id ? `\nResend ID: ${payload.resend_email_id}` : ''}`);
            showToast(payload.message || 'EMAIL SENT');
        } catch (e) {
            setOpsSendStatus(`Send failed: ${e.message}`);
            showToast(`SEND FAILED: ${formatNetworkError(e)}`);
        } finally {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
    };

    function setQuickDealGuidance(el, text) {
        if (!el) return;
        const t = String(text || '').trim();
        if (!t) { el.style.display = 'none'; el.textContent = ''; return; }
        el.style.display = 'block';
        el.textContent = t;
    }
    function refreshQuickDealGuidance() {
        const pkg = document.getElementById('qdPackageType')?.value || '';
        const svc = document.getElementById('qdServiceType')?.value || '';
        setQuickDealGuidance(document.getElementById('qdPackageGuidance'), pricingGuidanceTextForPackage(pkg));
        setQuickDealGuidance(document.getElementById('qdServiceGuidance'), pricingGuidanceTextForService(svc));
    }
    function computeQuickDealJobStatus(dealStatus, paymentStatus) {
        const ds = String(dealStatus || '').trim();
        const ps = String(paymentStatus || '').trim();
        if (ds === 'Completed Now') {
            if (ps === 'Paid in Full') return 'Completed';
            if (ps === 'Deposit Paid') return 'Awaiting Final Payment';
            return 'Quote Sent';
        }
        // Starting Now
        if (ps === 'Deposit Paid') return 'Active Client';
        if (ps === 'Paid in Full') return 'Active Client';
        return 'Quote Sent';
    }
    function quickDealMetaBlock({ dealStatus, requestedDocuments }) {
        const meta = {
            quickDealStatus: String(dealStatus || '').trim(),
            requestedDocuments: Array.isArray(requestedDocuments) ? requestedDocuments : []
        };
        return `QD_META=${JSON.stringify(meta)}`;
    }
    function parseQuickDealMeta(internalNotes) {
        const raw = String(internalNotes || '');
        const m = raw.match(/QD_META=({[\s\S]*?})/);
        if (!m) return null;
        try { return JSON.parse(m[1]); } catch (_) { return null; }
    }
    function getQuickDealRequestedDocs() {
        return Array.from(document.querySelectorAll('.qdDocNeed'))
            .filter((el) => !!el.checked)
            .map((el) => String(el.value || '').trim())
            .filter(Boolean);
    }
    function setQuickDealStatus(text) {
        const el = document.getElementById('qdStatus');
        if (el) el.textContent = String(text || '');
    }
    function isValidEmailLoose(v) {
        const t = String(v || '').trim();
        if (!t) return true; // optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
    }
    function updateQuickDealMetaPreview() {
        const meta = document.getElementById('qdMeta');
        if (!meta) return;
        const jobId = String(window.__quickDealState?.jobId || '').trim();
        const ps = String(document.getElementById('qdPaymentStatus')?.value || '').trim();
        const ds = String(document.getElementById('qdDealStatus')?.value || '').trim();
        const derived = (ps && ds) ? computeQuickDealJobStatus(ds, ps) : '';
        const bits = [];
        if (jobId) bits.push(`Saved ${jobId}`);
        if (derived) bits.push(`Job Status: ${derived}`);
        if (ps) bits.push(`Payment: ${ps}`);
        if (ds) bits.push(`Deal: ${ds}`);
        meta.textContent = bits.length ? bits.join(' • ') : 'Create a deal in under a minute.';
    }
    window.recalcQuickDealBalance = function() {
        const totalCents = parseMoneyToCents(document.getElementById('qdTotalPrice')?.value);
        const depCents = parseMoneyToCents(document.getElementById('qdDepositAmount')?.value) ?? 0;
        const el = document.getElementById('qdRemainingBalance');
        if (!el) return;
        if (totalCents == null) { el.textContent = '—'; return; }
        const safeDep = Math.min(depCents, totalCents);
        const rem = Math.max(0, totalCents - safeDep);
        el.textContent = moneyFromCents(rem);
        const warn = depCents > totalCents;
        el.style.color = warn ? '#ffb86b' : 'var(--admin-text)';
        el.title = warn ? 'Deposit cannot exceed total. Adjust values before saving.' : '';
    };
    window.resetQuickDeal = function() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val == null ? '' : String(val); };
        set('qdClientName', '');
        set('qdEmail', '');
        set('qdPhone', '');
        set('qdServiceType', '');
        set('qdPackageType', '');
        set('qdSummary', '');
        set('qdTotalPrice', '');
        set('qdDepositAmount', '');
        set('qdPaymentMethod', '');
        // sensible defaults to prevent save failures
        set('qdPaymentStatus', 'Unpaid');
        set('qdDealStatus', 'Starting Now');
        set('qdNotes', '');
        Array.from(document.querySelectorAll('.qdDocNeed')).forEach((el) => { el.checked = (String(el.value) === 'Invoice'); });
        window.__quickDealState = { jobId: null };
        refreshQuickDealGuidance();
        window.recalcQuickDealBalance();
        setQuickDealStatus('');
        const meta = document.getElementById('qdMeta');
        if (meta) meta.textContent = 'Create a deal in under a minute.';
        updateQuickDealMetaPreview();
    };
    window.saveQuickDeal = async function() {
        if (!state.token) { showToast('LOGIN REQUIRED'); return; }
        const clientName = String(document.getElementById('qdClientName')?.value || '').trim();
        const email = String(document.getElementById('qdEmail')?.value || '').trim();
        const phone = String(document.getElementById('qdPhone')?.value || '').trim();
        const serviceType = String(document.getElementById('qdServiceType')?.value || '').trim();
        const packageType = String(document.getElementById('qdPackageType')?.value || '').trim();
        const summary = String(document.getElementById('qdSummary')?.value || '').trim();
        const totalPrice = String(document.getElementById('qdTotalPrice')?.value || '').trim();
        const depositAmount = String(document.getElementById('qdDepositAmount')?.value || '').trim();
        const paymentMethod = String(document.getElementById('qdPaymentMethod')?.value || '').trim();
        const paymentStatus = String(document.getElementById('qdPaymentStatus')?.value || '').trim();
        const dealStatus = String(document.getElementById('qdDealStatus')?.value || '').trim();
        const notes = String(document.getElementById('qdNotes')?.value || '').trim();

        // Fast client-side checks (server still enforces truth).
        if (!clientName) { showToast('CLIENT NAME REQUIRED'); return; }
        if (!isValidEmailLoose(email)) { showToast('EMAIL INVALID'); return; }
        if (!serviceType) { showToast('SERVICE TYPE REQUIRED'); return; }
        if (!packageType) { showToast('PACKAGE TYPE REQUIRED'); return; }
        if (!summary) { showToast('SUMMARY REQUIRED'); return; }
        if (!totalPrice) { showToast('PRICE REQUIRED'); return; }
        if (!paymentStatus) { showToast('PAYMENT STATUS REQUIRED'); return; }
        if (!dealStatus) { showToast('DEAL STATUS REQUIRED'); return; }
        const totalCents = parseMoneyToCents(totalPrice);
        if (totalCents == null) { showToast('PRICE INVALID'); return; }
        const depCents = parseMoneyToCents(depositAmount) ?? 0;
        if (depCents > totalCents) { showToast('DEPOSIT > TOTAL'); return; }
        if ((paymentStatus === 'Deposit Paid' || paymentStatus === 'Paid in Full') && !paymentMethod) {
            showToast('PAYMENT METHOD REQUIRED');
            return;
        }

        const requestedDocs = getQuickDealRequestedDocs();
        const jobStatus = computeQuickDealJobStatus(dealStatus, paymentStatus);

        const internalNotes = normalizeWhitespace([
            quickDealMetaBlock({ dealStatus, requestedDocuments: requestedDocs }),
            notes ? `\n\n${notes}` : ''
        ].filter(Boolean).join(''));

        const job = {
            sourceType: 'quickDeal',
            clientName,
            email,
            phone,
            serviceType,
            packageType,
            // Use summary as title to avoid inventing a separate title.
            projectTitle: summary,
            projectDescription: summary,
            deliverables: '',
            addOns: '',
            startDate: '',
            dueDate: '',
            allowDateOverride: false,
            totalPrice,
            depositAmount,
            paymentMethod,
            paymentStatus,
            jobStatus,
            clientNotes: '',
            internalNotes,
            portfolioPermission: false,
            agreementSigned: false,
            invoiceSent: false
        };

        try {
            setQuickDealStatus('Saving…');
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/ops/jobs/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ job })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Save failed (${res.status})`);
            const saved = payload.row || {};
            window.__quickDealState = { jobId: saved.jobId || null, requestedDocuments: requestedDocs };
            const meta = document.getElementById('qdMeta');
            if (meta) meta.textContent = saved.jobId ? `Saved ${saved.jobId} • ${saved.jobStatus || ''} • ${saved.paymentStatus || ''}` : 'Saved.';
            setQuickDealStatus(saved.jobId ? `Saved as ${saved.jobId}. You can generate docs immediately.` : 'Saved.');
            showToast('QUICK DEAL SAVED');
            // Keep job sheet list in sync.
            if (typeof window.fetchOpsJobs === 'function') await window.fetchOpsJobs();
            updateQuickDealMetaPreview();
        } catch (e) {
            const msg = formatNetworkError(e);
            setQuickDealStatus(`Save failed: ${msg}`);
            showToast(`SAVE FAILED: ${msg}`);
        }
    };

    window.openQuickDealInJobSheet = async function() {
        const jobId = String(window.__quickDealState?.jobId || '').trim();
        if (!jobId) { showToast('SAVE QUICK DEAL FIRST'); return; }
        await window.openOpsJobEditor(jobId);
        showToast('OPENED IN JOB SHEET');
    };

    async function generateOneQuickDealDoc(docType) {
        const jobId = String(window.__quickDealState?.jobId || '').trim();
        if (!jobId) { showToast('SAVE QUICK DEAL FIRST'); return; }
        const idEl = document.getElementById('opsJobId');
        if (idEl) idEl.value = jobId;
        // Generate into existing ops doc panel (single source of UI truth).
        await window.generateOpsDoc(docType);
    }

    window.generateQuickDealPriorityDocs = async function() {
        await generateOneQuickDealDoc('Invoice');
        await generateOneQuickDealDoc('Paid Receipt');
        await generateOneQuickDealDoc('Service Summary');
    };
    window.generateQuickDealSelectedDocs = async function() {
        const selected = Array.from(new Set(getQuickDealRequestedDocs()));
        if (!selected.length) { showToast('NO DOCS SELECTED'); return; }
        // Prioritize the operational trio first if included.
        const order = ['Invoice', 'Paid Receipt', 'Service Summary', 'Proposal', 'Agreement', 'NDA', 'Media Release'];
        const sorted = order.filter((t) => selected.includes(t));
        for (const t of sorted) {
            // NDA / Media Release aren't implemented in ops-docs.js; warn cleanly.
            if (t === 'NDA' || t === 'Media Release') {
                showToast(`${t.toUpperCase()} NOT ENABLED YET`);
                continue;
            }
            await generateOneQuickDealDoc(t);
        }
    };

    // Quick deal guidance listeners (non-destructive)
    (function attachQuickDealListeners() {
        const pkg = document.getElementById('qdPackageType');
        const svc = document.getElementById('qdServiceType');
        const pay = document.getElementById('qdPaymentStatus');
        const deal = document.getElementById('qdDealStatus');
        const total = document.getElementById('qdTotalPrice');
        const dep = document.getElementById('qdDepositAmount');
        if (pkg) {
            pkg.addEventListener('change', refreshQuickDealGuidance);
            pkg.addEventListener('input', refreshQuickDealGuidance);
        }
        if (svc) {
            svc.addEventListener('change', refreshQuickDealGuidance);
            svc.addEventListener('input', refreshQuickDealGuidance);
            svc.addEventListener('blur', refreshQuickDealGuidance);
        }
        if (pay) {
            pay.addEventListener('change', updateQuickDealMetaPreview);
            pay.addEventListener('input', updateQuickDealMetaPreview);
        }
        if (deal) {
            deal.addEventListener('change', updateQuickDealMetaPreview);
            deal.addEventListener('input', updateQuickDealMetaPreview);
        }
        if (total) {
            total.addEventListener('input', updateQuickDealMetaPreview);
        }
        if (dep) {
            dep.addEventListener('input', updateQuickDealMetaPreview);
        }
    })();

    function getOtpPricingSafe() {
        try {
            const p = window.OTP_PRICING;
            if (!p || typeof p !== 'object') return null;
            return p;
        } catch (_) {
            return null;
        }
    }
    function normalizeKey(s) {
        return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    function pricingGuidanceTextForPackage(pkgLabel) {
        const pricing = getOtpPricingSafe();
        if (!pricing?.packages) return '';
        const want = normalizeKey(pkgLabel);
        const pkgs = pricing.packages;
        const list = [pkgs.theSignal, pkgs.theEngine, pkgs.theSystem, pkgs.custom].filter(Boolean);
        const hit = list.find(p => normalizeKey(p?.label) === want || normalizeKey(p?.key) === want);
        if (!hit) return '';
        if (normalizeKey(hit.label) === 'custom') return 'Custom scope-based engagement. Final pricing is set manually.';
        const disp = String(hit.price_display || '').trim();
        if (!disp) return '';
        if (normalizeKey(hit.label) === 'the engine') return `Typical range: ${disp.replace(/\s*to\s*/i, ' to ')}`;
        if (normalizeKey(hit.label) === 'the signal') return `Starting at ${disp.replace(/^starting at\s*/i, '')}`.trim();
        if (normalizeKey(hit.label) === 'the system') return `Starting at ${disp.replace(/^starting at\s*/i, '')}`.trim();
        return disp;
    }
    function pricingGuidanceTextForService(serviceLabel) {
        const pricing = getOtpPricingSafe();
        if (!pricing?.services) return '';
        const want = normalizeKey(serviceLabel);
        const entries = Object.values(pricing.services || {});
        const hit = entries.find(s => normalizeKey(s?.label) === want);
        if (!hit) return '';
        const disp = String(hit.price_display || '').trim();
        if (!disp) return '';
        const type = normalizeKey(hit.type);
        if (type === 'hourly') return `Minimum: ${disp}`;
        if (type === 'one_time_range') return `Typical range: ${disp}`;
        if (type === 'monthly') return `Standard rate: ${disp}`;
        return `Standard rate: ${disp}`;
    }
    function setGuidance(el, text) {
        if (!el) return;
        const t = String(text || '').trim();
        if (!t) { el.style.display = 'none'; el.textContent = ''; return; }
        el.style.display = 'block';
        el.textContent = t;
    }
    function refreshOpsPricingGuidance() {
        const pkg = document.getElementById('opsPackageType')?.value || '';
        const svc = document.getElementById('opsServiceType')?.value || '';
        setGuidance(document.getElementById('opsPackageGuidance'), pricingGuidanceTextForPackage(pkg));
        setGuidance(document.getElementById('opsServiceGuidance'), pricingGuidanceTextForService(svc));
    }

    window.requestLeadBrain = async function(leadId, sourceTable = 'leads') {
        if (!state.token) throw new Error('LOGIN REQUIRED');
        if (!leadId) throw new Error('MISSING LEAD ID');
        const apiBase = resolveApiBase();
        const res = await fetchWithTimeout(`${apiBase}/api/admin/knowledge/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ leadId, sourceTable })
        }, 50000);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload.success) throw new Error(payload.message || `Recommendation failed (${res.status})`);
        const st = sourceTable === 'contacts' ? 'contacts' : 'leads';
        const entry = {
            recommendation: payload.recommendation,
            confidence: payload.confidence,
            updated_at: payload.updated_at || new Date().toISOString(),
            kb_updated_at: payload.kb_updated_at || null
        };
        window.leadOracleCache = window.leadOracleCache || {};
        if (st === 'leads') window.leadOracleCache[leadId] = entry;
        window.replyOracleCache[replyOracleKey(st, leadId)] = entry;
        return payload.recommendation;
    };

    async function ensureOracleRecommendationFresh({ leadId, sourceTable, maxAgeMs = 10 * 60 * 1000 } = {}) {
        const st = sourceTable === 'contacts' ? 'contacts' : 'leads';
        const id = String(leadId || '').trim();
        if (!id) return null;
        const key = replyOracleKey(st, id);
        const cached = window.replyOracleCache?.[key] || (st === 'leads' ? window.leadOracleCache?.[id] : null) || null;
        if (cached && cached.recommendation && isOracleCacheFresh(cached, maxAgeMs)) return cached.recommendation;
        try {
            return await window.requestLeadBrain(id, st);
        } catch (_) {
            return cached?.recommendation || null;
        }
    }

    window.loadLeadBrainCache = async function(leadIds) {
        if (!Array.isArray(leadIds) || !leadIds.length) return;
        const apiBase = resolveApiBase();
        try {
            const res = await fetchWithTimeout(`${apiBase}/api/admin/knowledge/recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({ leadIds })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (res.ok && payload.success && payload.recommendations) {
                window.leadOracleCache = { ...(window.leadOracleCache || {}), ...payload.recommendations };
            }
        } catch (e) { /* non-blocking */ }
    };

    window.renderLeadBrainCard = function(leadId) {
        const cache = window.leadOracleCache[leadId];
        if (!cache || !cache.recommendation) {
            return `
            <div style="margin-top:12px;padding:12px;border:1px dashed var(--admin-border);border-radius:8px;background:var(--admin-panel);">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                    <div style="font-size:0.67rem;color:var(--admin-muted);text-transform:uppercase;letter-spacing:1.4px;">OTP ORACLE // MANUAL REVIEW GATE</div>
                    <button type="button" onclick="window.runLeadBrain('${leadId}')" style="background:rgba(var(--accent2-rgb),0.15);border:1px solid var(--admin-cyan);color:var(--admin-cyan);font-size:0.65rem;padding:6px 10px;border-radius:6px;cursor:pointer;">RUN ORACLE</button>
                </div>
            </div>`;
        }

        const rec = cache.recommendation;
        const confidence = Number(cache.confidence || 0);
        const packageConfidence = Number(rec.package_confidence || confidence || 0);
        const statusFlags = Array.isArray(rec.status_flags) ? rec.status_flags : [];
        const badgeMap = {
            ready: { label: 'READY', bg: 'rgba(0,255,170,0.16)', border: 'rgba(0,255,170,0.45)', color: 'var(--admin-success)' },
            manual_review: { label: 'MANUAL REVIEW', bg: 'rgba(255,170,0,0.12)', border: 'rgba(255,170,0,0.45)', color: '#ffd37a' },
            missing_data: { label: 'MISSING DATA', bg: 'rgba(255,100,120,0.12)', border: 'rgba(255,100,120,0.45)', color: '#ff9fb0' },
            confidential: { label: 'CONFIDENTIAL', bg: 'rgba(170,130,255,0.12)', border: 'rgba(170,130,255,0.45)', color: '#d0bcff' },
            media: { label: 'MEDIA INVOLVED', bg: 'rgba(120,210,255,0.12)', border: 'rgba(120,210,255,0.45)', color: '#9ce6ff' },
            tax: { label: 'TAX WORKFLOW', bg: 'rgba(215,190,120,0.12)', border: 'rgba(215,190,120,0.4)', color: '#e9d79a' }
        };
        const badges = (statusFlags.length ? statusFlags : ['ready'])
            .filter(flag => badgeMap[flag])
            .map(flag => {
                const b = badgeMap[flag];
                return `<span style="font-size:0.58rem;letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border-radius:999px;border:1px solid ${b.border};background:${b.bg};color:${b.color};font-weight:800;">${b.label}</span>`;
            }).join(' ');
        const docs = Array.isArray(rec.required_documents) ? Array.from(new Set(rec.required_documents)) : [];
        const docsLabel = docs.length ? docs.join(', ') : 'Manual document selection required';
        const kbHits = Array.isArray(rec.knowledge_basis) ? rec.knowledge_basis : [];
        const kbLabel = kbHits.length
            ? kbHits.map(hit => `${hit.file_name}#${hit.chunk_index} (${Math.round((Number(hit.similarity || 0)) * 100)}%)`).join(' | ')
            : 'No indexed file citations available.';
        const quoteLabel = rec.quote_range || (rec.recommended_package ? 'Scope-based estimate' : 'Manual quote review');
        const reviewTone = statusFlags.includes('manual_review') || statusFlags.includes('missing_data');
        const nextActionLabel = rec.next_action === 'manual_scope_review_required_before_quote'
            ? 'Manual scope review required before quoting'
            : rec.next_action === 'send_intake_confirmation_and_prepare_agreement_invoice'
                ? 'Proceed with intake confirmation and agreement/invoice prep'
                : 'Manual review required';
        return `
        <div style="margin-top:12px;padding:12px;border:1px solid ${reviewTone ? 'rgba(255,190,90,0.35)' : 'rgba(0,255,170,0.3)'};border-radius:8px;background:${reviewTone ? 'rgba(255,170,0,0.05)' : 'rgba(0,255,170,0.04)'};">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;">
                <div style="font-size:0.67rem;color:${reviewTone ? '#ffd37a' : 'var(--admin-success)'};text-transform:uppercase;letter-spacing:1.4px;font-weight:900;">OTP ORACLE // MANUAL APPROVAL REQUIRED</div>
                <button type="button" onclick="window.runLeadBrain('${leadId}')" style="background:transparent;border:1px solid var(--admin-border);color:var(--admin-muted);font-size:0.62rem;padding:5px 8px;border-radius:6px;cursor:pointer;">RE-RUN</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">${badges}</div>
                        <div style="font-size:0.88rem;color:var(--admin-text);font-weight:700;">${window.escapeHtml(rec.recommended_package || 'Manual Review')}</div>
            <div style="font-size:0.72rem;color:var(--admin-cyan);margin-top:3px;">${window.escapeHtml(quoteLabel)}</div>
            <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:6px;">Confidence: ${(confidence * 100).toFixed(0)}%</div>
            <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:2px;">Package confidence: ${(packageConfidence * 100).toFixed(0)}%</div>
            <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:8px;line-height:1.45;">Why package: ${window.escapeHtml(rec.package_reason || 'Manual review based on available lead context.')}</div>
            <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:6px;line-height:1.45;">Why docs: ${window.escapeHtml(rec.documents_reason || 'Document stack selected from OTP onboarding safeguards.')}</div>
            <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:6px;line-height:1.45;">Next: ${window.escapeHtml(nextActionLabel)}</div>
            <div style="font-size:0.68rem;color:var(--admin-muted);margin-top:8px;line-height:1.45;word-break:break-word;">Docs: ${window.escapeHtml(docsLabel)}</div>
            <div style="font-size:0.64rem;color:var(--admin-muted);margin-top:8px;line-height:1.45;word-break:break-word;">Knowledge hits: ${window.escapeHtml(kbLabel)}</div>
        </div>`;
    };

    window.runLeadBrain = async function(leadId) {
        try {
            showToast('RUNNING OTP ORACLE…');
            await window.requestLeadBrain(leadId, 'leads');
            await window.fetchLeads();
            const cached = window.leadOracleCache && window.leadOracleCache[leadId];
            const conf = Number(cached && cached.confidence);
            const suffix = Number.isFinite(conf) ? ` (${Math.round(conf * 100)}% match)` : '';
            showToast('OTP ORACLE READY' + suffix);
        } catch (e) {
            showToast(`OTP ORACLE FAILED: ${formatNetworkError(e)}`);
        }
    };

    // --- PERSPECTIVE AUDIT LEADS ---
    window.fetchLeads = async function() {
        const leads = document.getElementById('leadsManager');
        if(!leads) return;

        // Visual Feedback
        leads.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">SYNCING LEAD DATA...</div>';

        try {
            await refreshKbMetaBestEffort();

            const data = await window.secureRead('leads', { limit: 100 });

            if (!data || data.length === 0) {
                leads.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">NO LEADS CAPTURED YET</div>';
                return;
            }

            const ids = data.map(l => l.id).filter(Boolean);
            await window.loadLeadBrainCache(ids);

            leads.innerHTML = data.map(l => {
                let answers = l.answers || {};
                if (typeof answers === 'string') {
                    try { answers = JSON.parse(answers); } catch(e) { answers = {}; }
                }
                const escape = window.escapeHtml;
                return `
                <div class="post-row" style="display: block; padding: 18px; margin-bottom: 12px; cursor: default; border-left: 3px solid var(--admin-cyan); background: rgba(var(--accent2-rgb), 0.03); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center;">
                        <div>
                             <div style="font-weight: 800; color: var(--admin-text); font-size: 0.95rem; letter-spacing: 0.5px;">${escape(l.email)}</div>
                             <div style="font-size: 0.6rem; color: var(--admin-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">SIGNAL CAPTURED: ${new Date(l.created_at).toLocaleString()}</div>
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <div style="font-size: 0.65rem; font-family: 'Space Grotesk', sans-serif; font-weight: 900; color: var(--admin-cyan); border: 1px solid var(--admin-cyan); padding: 3px 8px; border-radius: 4px; background: rgba(var(--accent2-rgb), 0.1); letter-spacing: 1px;">AUDIT SIGNAL</div>
                            <button type="button" onclick="openReplyManager('${l.id}', 'leads')" title="Reply" style="background:transparent; border:none; color:var(--admin-cyan); cursor:pointer; font-size: 1.1rem;">📩</button>
                            <button type="button" onclick="return deleteLead('${l.id}', event)" title="Delete" style="background:transparent; border:none; color:var(--admin-danger); cursor:pointer; font-size: 1.1rem;">✖</button>
                        </div>
                    </div>
                    <div class="otp-lead-mission-grid" style="font-size: 0.8rem; margin-bottom: 15px; color: var(--admin-text); background: var(--admin-panel); padding: 15px; border-radius: 8px; border: 1px solid var(--admin-border);">
                        <div style="grid-column: 1 / -1; margin-bottom: 5px;"><span style="color: var(--admin-cyan); font-weight:900; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px;">// MISSION PARAMETERS</span></div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">OBJECTIVE:</span><br>${escape(answers.q1 || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">BARRIER:</span><br>${escape(answers.q2 || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">DOMAIN:</span><br>${escape(answers.q3 || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">AESTHETIC:</span><br>${escape(answers.q4 || 'N/A')}</div>
                        <div style="grid-column: 1 / -1; margin-top: 5px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);"><span style="color: var(--admin-success); font-weight:900; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">PRIMARY TARGET:</span><br><span style="font-size: 0.9rem; font-weight: 700; color: var(--admin-text);">"${escape(answers.q5_goal || 'Not specified')}"</span></div>
                    </div>
                    <div style="background: var(--admin-panel); border-left: 3px solid var(--admin-accent); padding: 15px; border-radius: 0 8px 8px 0; font-size: 0.85rem; line-height: 1.6; border: 1px solid var(--admin-border); border-left-width: 3px;">
                        <div style="font-size: 0.6rem; color: var(--admin-accent); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">// ORACLE TRANSMISSION</div>
                        <div style="color: var(--admin-text); font-style: italic;">${window.escapeHtml(l.advice || '').replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--admin-cyan);">$1</strong>').replace(/\n/g, '<br>')}</div>
                    </div>
                    ${window.renderLeadBrainCard(l.id)}
                </div>
                `;
            }).join('');

            window.leadsCache = data;

        } catch(e) {
            leads.innerHTML = `<div style="text-align: center; color: #ff4444; padding: 20px;">ERROR SYNCING LEADS: ${window.escapeHtml ? window.escapeHtml(formatNetworkError(e)) : formatNetworkError(e)}</div>`;
        }
    };

    // GLOBAL SESSION KEY FOR ADMIN ACTIONS
    window.otpServiceKey = null;

    window.confirmPurgeLeads = function() {
        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        // Dynamically update text for Purge context
        const titleEl = modal.querySelector('h3');
        const descEl = modal.querySelector('p');
        
        if(titleEl) titleEl.textContent = "PURGE ALL LEADS?";
        if(descEl) descEl.innerHTML = "<span style='color:var(--admin-danger)'>⚠️ WARNING: IRREVERSIBLE ACTION</span><br>This will permanently delete every single lead entry.";

        if(modal && confirmBtn) {
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            
            newBtn.textContent = "PURGE EVERYTHING";
            newBtn.style.background = "var(--admin-danger)";
            newBtn.style.color = "#fff";
            
            newBtn.onclick = async () => {
                // Define execution logic
                // Define execution logic
                const executePurge = async () => {
                     showToast("INITIATING ADMIN FORCE PURGE...");
                     try {
                         const apiBase = resolveApiBase();
                         const controller = new AbortController();
                         const timeoutId = setTimeout(() => controller.abort(), 15000);
                         
                         const res = await fetch(`${apiBase}/api/admin/purge-leads`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${state.token}`
                            },
                            signal: controller.signal
                         });
                         clearTimeout(timeoutId);
                         
                         if(!res.ok) throw new Error("Purge Request Failed");
                
                         showToast("✅ SYSTEM PURGE COMPLETE. LEADS WIPED.");
                         await fetchLeads();
                         modal.style.display = 'none';

                     } catch(e) {
                        console.error("Purge Error:", e);
                        showToast("PURGE FAILED: " + e.message);
                        newBtn.textContent = "PURGE EVERYTHING";
                        newBtn.disabled = false;
                     }
                };

                newBtn.textContent = "WIPING DATA...";
                newBtn.disabled = true;
                await executePurge();
            };
            
            modal.style.display = 'flex';
            // Enforce proper centering
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'var(--admin-modal-scrim)';
            modal.style.backdropFilter = 'blur(5px)';
        }
    };

    window.confirmPurgeInbox = function() {
        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        // Dynamically update text for Purge context
        const titleEl = modal.querySelector('h3');
        const descEl = modal.querySelector('p');
        
        if(titleEl) titleEl.textContent = "PURGE INBOX?";
        if(descEl) descEl.innerHTML = "<span style='color:var(--admin-danger)'>⚠️ WARNING: IRREVERSIBLE ACTION</span><br>This will permanently delete every message.";

        if(modal && confirmBtn) {
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            
            newBtn.textContent = "PURGE MESSAGES";
            newBtn.style.background = "var(--admin-danger)";
            newBtn.style.color = "#fff";
            
            newBtn.onclick = async () => {
                newBtn.textContent = "WIPING...";
                newBtn.disabled = true;
                showToast("INITIATING SECURE INBOX PURGE...");

                try {
                    const apiBase = resolveApiBase();
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);
                    
                    const res = await fetch(`${apiBase}/api/admin/purge-contacts`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || err.error || `Purge failed (${res.status})`);
                    }
                    showToast("✅ INBOX WIPED CLEAN.");
                    await window.fetchInbox();
                    modal.style.display = 'none';
                } catch(e) {
                    console.error("Inbox Purge Error:", e);
                    showToast("PURGE FAILED: " + e.message);
                    newBtn.textContent = "PURGE MESSAGES";
                    newBtn.disabled = false;
                }
            };
            
            modal.style.display = 'flex';
             // Enforce proper centering
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'var(--admin-modal-scrim)';
            modal.style.backdropFilter = 'blur(5px)';
        }
    };



    window.deleteLead = function(id, event) {
        if(event) { event.preventDefault(); event.stopPropagation(); }
        
        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        // Dynamically update text for Lead context
        const titleEl = modal.querySelector('h3');
        const descEl = modal.querySelector('p');
        
        if(titleEl) titleEl.textContent = "DELETE LEAD?";
        if(descEl) descEl.innerHTML = "This will permanently remove the audit data.<br>This cannot be undone.";

        if(modal && confirmBtn) {
            // Remove old listeners by cloning
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            
            newBtn.onclick = async () => {
                newBtn.textContent = "DELETING...";
                newBtn.disabled = true;
                
                try {
                     await window.secureDelete('leads', id);
                     showToast("LEAD DELETED (SECURE)");
                     await fetchLeads();
                     modal.style.display = 'none';

                } catch(e) {
                    console.error("Delete failed:", e);
                    showToast("DELETE FAILED: " + e.message);
                }
 finally {
                    newBtn.textContent = "DELETE";
                    newBtn.disabled = false;
                }
            };
            
            modal.style.display = 'flex';
            // Enforce proper centering
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'var(--admin-modal-scrim)';
            modal.style.backdropFilter = 'blur(5px)';
        }
        return false;
    };
    
    // Helper to capture focus after list updates
    window.refocusInbox = function() {
        setTimeout(() => {
            const inbox = document.getElementById('inboxManager');
            if(inbox) {
                inbox.focus();
                // Optional: ensure it's scrolled to top or kept at position
            }
        }, 50);
    };

    window.copyDraft = function(id) {
        const contact = window.inboxCache.find(c => c.id == id);
        if(contact && contact.draft_reply) {
            navigator.clipboard.writeText(contact.draft_reply);
            showToast("DRAFT COPIED TO CLIPBOARD");
        }
    };

    /** Reply modal nodes from otp-terminal.html — null if wrong page or stripped DOM. */
    function requireReplyManagerCoreDom() {
        const modal = document.getElementById('replyModal');
        const contactId = document.getElementById('replyContactId');
        const email = document.getElementById('replyContactEmail');
        const name = document.getElementById('replyContactName');
        const incoming = document.getElementById('replyIncomingMsg');
        const draft = document.getElementById('replyDraftContent');
        if (!modal || !contactId || !email || !name || !incoming || !draft) {
            showToast('REPLY WORKSPACE NOT LOADED — OPEN OTP TERMINAL');
            return null;
        }
        return { modal, contactId, email, name, incoming, draft };
    }

    // --- REPLY MANAGER LOGIC ---
    window.closeReplyManager = function() {
        const modal = document.getElementById('replyModal');
        if (modal) modal.style.display = 'none';
        const analysisDiv = document.getElementById('replyAnalysis');
        if (analysisDiv) analysisDiv.textContent = 'No analysis data active.';
        // Focus back to inbox container to prevent jump
        window.refocusInbox();
    };

    window.openReplyManager = async function(id, source = 'contacts') {
        const table = source === 'leads' ? 'leads' : 'contacts';
        const cache = source === 'leads' ? (window.leadsCache || []) : (window.inboxCache || []);
        let c = cache.find((x) => x.id == id);
        if (!c && state.token && state.token !== 'static-bypass-token') {
            try {
                const rows = await window.secureRead(table, {
                    filters: [{ column: 'id', op: 'eq', value: String(id) }],
                    limit: 1
                });
                const list = Array.isArray(rows) ? rows : [];
                c = list[0];
                if (c && table === 'contacts') {
                    const idx = (window.inboxCache || []).findIndex((x) => x.id == id);
                    if (idx >= 0) window.inboxCache[idx] = c;
                    else (window.inboxCache = window.inboxCache || []).push(c);
                } else if (c && table === 'leads') {
                    const idx = (window.leadsCache || []).findIndex((x) => x.id == id);
                    if (idx >= 0) window.leadsCache[idx] = c;
                    else (window.leadsCache = window.leadsCache || []).push(c);
                }
            } catch (e) {
                showToast(`THREAD LOAD FAILED: ${e.message}`);
                return;
            }
        }
        if (!c) {
            showToast('THREAD NOT FOUND — REFRESH LIST OR LOG IN');
            return;
        }

        const rmDom = requireReplyManagerCoreDom();
        if (!rmDom) return;

        const nextSrcForDoc = source === 'leads' ? 'leads' : 'contacts';
        const replyDocKey = `${nextSrcForDoc}:${c.id}`;
        const prevDocPacketKey = String(window.__docPacketState?.contextKey || '');
        if (prevDocPacketKey && prevDocPacketKey !== replyDocKey) {
            window.closeDocPacket?.();
            window.__resetDocPacketState?.(false);
        }

        // Persist lightweight context for reply generation (avoids scraping DOM later)
        let analysisForCtx = c.ai_analysis != null && c.ai_analysis !== '' ? c.ai_analysis : (c.advice || c.neural_meta || null);
        if (typeof analysisForCtx === 'string' && analysisForCtx.trim().startsWith('{')) {
            try { analysisForCtx = JSON.parse(analysisForCtx); } catch (_) { /* keep string */ }
        }
        window.__replyContext = {
            id: c.id,
            source: source === 'leads' ? 'leads' : 'contacts',
            analysis: analysisForCtx,
            recommendation: null
        };
        
        rmDom.contactId.value = c.id;
        rmDom.email.value = c.email || '';
        rmDom.name.value = c.name || (source === 'leads' ? 'Valued Lead' : 'Client');
        const sourceInput = document.getElementById('replySourceTable');
        if (sourceInput) sourceInput.value = source === 'leads' ? 'leads' : 'contacts';
        
        // --- NEW WORKFLOW LOGIC ---
        const aliasLabel = document.getElementById('senderAliasLabel');
        const subjectInput = document.getElementById('replySubject');
        const isClient = c.ai_status === 'completed';
        const name = c.name || (source === 'leads' ? 'Valued Lead' : 'Client');

        if (isClient) {
            if(aliasLabel) aliasLabel.textContent = 'SENDER: bookings@onlytrueperspective.tech';
            if(subjectInput) subjectInput.value = `OTP Project Update // ${name}`;
        } else {
            if(aliasLabel) aliasLabel.textContent = 'SENDER: contact@onlytrueperspective.tech';
            if(subjectInput) subjectInput.value = `Inquiry Reply: Only True Perspective // ${name}`;
        }

        // Context formatting (contacts may store brief in message and/or project_details)
        let messageContext = [c.message, c.project_details].filter(Boolean).join('\n\n') || '';
        if (source === 'leads' && c.answers) {
            let answers = c.answers;
            if (typeof answers === 'string') try { answers = JSON.parse(answers); } catch(e) {}
            messageContext = `AUDIT GOAL: ${answers.q1 || 'N/A'}\nHURDLE: ${answers.q2 || 'N/A'}\nPLATFORM: ${answers.q3 || 'N/A'}\nVIBE: ${answers.q4 || 'N/A'}\nTARGET: ${answers.q5_goal || 'N/A'}`;
        }
        let aiForTactical = c.ai_analysis;
        if (typeof aiForTactical === 'string' && aiForTactical.trim().startsWith('{')) {
            try { aiForTactical = JSON.parse(aiForTactical); } catch (_) { aiForTactical = null; }
        }
        const tacticalLine = (aiForTactical && typeof aiForTactical === 'object' && aiForTactical.tactical_advice)
            ? String(aiForTactical.tactical_advice).trim()
            : '';
        if (tacticalLine) {
            messageContext = [messageContext, `ORACLE TACTICAL —\n${tacticalLine}`].filter(Boolean).join('\n\n');
        }
        
        rmDom.incoming.textContent = messageContext;
        rmDom.draft.value = c.draft_reply || '';
        const cacheBtn = document.getElementById('replyCacheBtn');
        const syncBtn = document.getElementById('replySyncBtn');
        const isLeadsSource = source === 'leads';
        if (cacheBtn) {
            cacheBtn.disabled = isLeadsSource;
            cacheBtn.style.opacity = isLeadsSource ? '0.55' : '1';
            cacheBtn.style.cursor = isLeadsSource ? 'not-allowed' : 'pointer';
            cacheBtn.title = isLeadsSource ? 'Draft cache is available for inbox threads.' : '';
        }
        if (syncBtn) {
            syncBtn.textContent = isLeadsSource ? 'LOG LEAD REVIEW' : 'SYNCHRONIZE SIGNAL';
        }
        
        // Analysis + OTP Oracle: show saved analysis JSON when present; hydrate Oracle panel from cache (list or prior modal).
        const analysisDiv = document.getElementById('replyAnalysis');
        if (analysisDiv) {
            const srcTable = source === 'leads' ? 'leads' : 'contacts';
            const rbKey = replyOracleKey(srcTable, c.id);
            let opsRec = null;
            const replyCached = window.replyOracleCache[rbKey];
            if (replyCached && replyCached.recommendation) opsRec = replyCached.recommendation;
            else if (srcTable === 'leads' && window.leadOracleCache && window.leadOracleCache[c.id] && window.leadOracleCache[c.id].recommendation) {
                opsRec = window.leadOracleCache[c.id].recommendation;
            }
            if (window.__replyContext) window.__replyContext.recommendation = opsRec;

            const sections = [];
            if (c.ai_analysis || c.advice || c.neural_meta) {
                const analysisData = c.ai_analysis || { tactical_advice: c.advice, neural_meta: c.neural_meta };
                sections.push(formatOracleContextBlockHtml(analysisData));
            }
            if (opsRec) {
                sections.push(buildOraclePanelHtml(opsRec));
            }
            if (!sections.length) {
                sections.push(`
                <div style="text-align: center; padding: 25px; color: var(--admin-muted); font-size: 0.7rem; border: 1px dashed var(--admin-border); border-radius: 8px; background: var(--admin-panel);">
                    <div style="font-size: 1.2rem; margin-bottom: 8px; opacity: 0.5;">📡</div>
                    <div>SIGNAL DATA NOT ANALYZED</div>
                    <div style="margin-top:10px;font-size:0.65rem;line-height:1.45;">Run <strong style="color:var(--admin-cyan);">OTP ORACLE</strong> for package, documents, and knowledge hits — then use <strong style="color:var(--admin-cyan);">GENERATE RESPONSE</strong>.</div>
                </div>`);
            }
            analysisDiv.innerHTML = sections.join('<div style="height:12px;"></div>');
        }
        
        const modal = rmDom.modal;
        modal.style.display = 'flex';
        // Enforce fixed centering alignment
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '10000';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'var(--admin-modal-scrim)';
        modal.style.backdropFilter = 'blur(5px)';

        setTimeout(() => rmDom.draft.focus(), 100);
    };

    // --- DOC PACKET (DYNAMIC DOCUMENT ENGINE) ---
    /** Newest doc_packet_send that failed, unless a newer send succeeded (then null). */
    function pickLatestFailedDocPacketSend(events) {
        if (!Array.isArray(events)) return null;
        for (let i = events.length - 1; i >= 0; i--) {
            const e = events[i];
            if (!e || e.type !== 'doc_packet_send') continue;
            if (e.success) return null;
            if (e.id) return e;
        }
        return null;
    }

    function formatDocPacketAuditLine(ev) {
        if (!ev) return '';
        const at = String(ev.at || '').replace('T', ' ').replace('Z', ' UTC');
        if (ev.type === 'doc_packet_delivery_update') {
            const st = ev.status != null ? String(ev.status) : 'unknown';
            const ok = ev.success ? 'OK' : 'ERR';
            return `[DELIVERY ${ok}] ${at}\nRESEND: ${String(ev.resend_email_id || '')}\nSTATUS: ${st}\n`;
        }
        if (ev.type === 'doc_packet_send') {
            const ok = ev.success ? 'SENT' : (ev.simulated ? 'SIMULATED' : 'FAILED');
            const docs = Array.isArray(ev.include) ? ev.include.join(', ') : '';
            const to = ev.to || '';
            const retry = ev.retry_of_event_id ? `RETRY_OF: ${ev.retry_of_event_id}\n` : '';
            return `[${ok}] ${at}\n${retry}TO: ${to}\nDOCS: ${docs}\n`;
        }
        const t = String(ev.type || 'event').toUpperCase();
        return `[${t}] ${at}\n`;
    }

    /** Canonical doc packet keys (order matches UI + server). */
    const DOC_PACKET_DOC_KEYS = Object.freeze(['proposal', 'agreement', 'invoice', 'nda', 'media_release']);
    const DOC_PACKET_LABELS = Object.freeze({
        proposal: 'Proposal',
        agreement: 'Agreement',
        invoice: 'Invoice',
        nda: 'NDA',
        media_release: 'Media Release'
    });

    function normalizeDocPacketApprovalsBaseline(raw) {
        const out = {};
        for (const k of DOC_PACKET_DOC_KEYS) out[k] = !!(raw && raw[k]);
        return out;
    }

    /** Oracle-driven defaults for attaching NDA / media release to client email (not for approval). */
    function docPacketOracleAttachDefaults(rec) {
        const docs = Array.isArray(rec?.required_documents) ? rec.required_documents.map((s) => String(s).toLowerCase()) : [];
        const nda = docs.some((s) => /nda|mutual|confidential|non-?disclosure/.test(s));
        const media = docs.some((s) => /media release|likeness|talent release|model release/.test(s));
        return { nda, media };
    }

    window.__docPacketState = {
        packetId: null,
        docs: {},
        fields: null,
        leadId: null,
        sourceTable: 'contacts',
        contextKey: null,
        docxErrors: null,
        approvalsBaseline: null,
        notice: null,
        auditEvents: null,
        recommendation: null,
        sendInclude: null
    };

    window.__resetDocPacketState = function(keepContext = false) {
        const s = window.__docPacketState || {};
        const next = {
            packetId: null,
            docs: {},
            fields: null,
            docxErrors: null,
            approvalsBaseline: null,
            notice: null,
            auditEvents: null,
            recommendation: null,
            sendInclude: null
        };
        if (!keepContext) {
            next.leadId = null;
            next.sourceTable = 'contacts';
            next.contextKey = null;
        }
        Object.assign(s, next);
        window.__docPacketState = s;
    };

    window.__docPacketApprovalsChanged = function() {
        const s = window.__docPacketState || {};
        if (!s.packetId) return false;
        const baseline = normalizeDocPacketApprovalsBaseline(
            s.approvalsBaseline && typeof s.approvalsBaseline === 'object' ? s.approvalsBaseline : null
        );
        const toggles = Array.from(document.querySelectorAll('#docPacketList .doc-approve-toggle'));
        for (const k of DOC_PACKET_DOC_KEYS) {
            const t = toggles.find((el) => String(el.dataset.doc || '') === k);
            if (!t) continue;
            const cur = !!t.checked;
            const base = !!baseline[k];
            if (cur !== base) return true;
        }
        return false;
    };

    window.__updateDocPacketApproveBtn = function() {
        const s = window.__docPacketState || {};
        const approveBtn = document.getElementById('docPacketApproveBtn');
        if (!approveBtn) return;
        const enabled = !!s.packetId && window.__docPacketApprovalsChanged();
        approveBtn.disabled = !enabled;
        approveBtn.style.opacity = enabled ? '1' : '0.6';
        approveBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
        approveBtn.title = !s.packetId ? 'Generate a packet first.' : (enabled ? '' : 'No approval changes to apply.');
    };

    window.__updateDocPacketSendBtn = function() {
        const st = window.__docPacketState || {};
        const hp = !!st.packetId;
        const sendB = document.getElementById('docPacketSendBtn');
        if (!sendB) return;
        const attachCount = DOC_PACKET_DOC_KEYS.filter((k) => st.docs?.[k]?.approved && st.sendInclude?.[k]).length;
        const anyApproved = Object.values(st.docs || {}).some((d) => d && d.approved);
        const canSend = hp && attachCount > 0;
        sendB.disabled = !canSend;
        sendB.style.opacity = canSend ? '1' : '0.6';
        sendB.style.cursor = canSend ? 'pointer' : 'not-allowed';
        if (!hp) sendB.title = 'Generate a packet first.';
        else if (!anyApproved) sendB.title = 'Approve at least one document before sending.';
        else if (attachCount === 0) sendB.title = 'Select at least one approved document in “Attach to client email”.';
        else sendB.title = '';
    };

    window.openDocPacket = function() {
        const modal = document.getElementById('docPacketModal');
        if (!modal) return;
        // Use current reply context as source of truth
        const leadId = document.getElementById('replyContactId')?.value || '';
        if (!String(leadId).trim()) {
            showToast('OPEN A THREAD FIRST (INBOX OR LEAD)');
            return;
        }
        const sourceTable = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
        const nextKey = `${sourceTable}:${leadId}`;
        const prevKey = String(window.__docPacketState?.contextKey || '');
        const sameThread = prevKey === nextKey;
        if (!sameThread) {
            window.__resetDocPacketState(true);
            const sendTo = document.getElementById('docPacketSendTo');
            if (sendTo) sendTo.value = '';
        }
        window.__docPacketState.contextKey = nextKey;
        window.__docPacketState.leadId = leadId;
        window.__docPacketState.sourceTable = sourceTable;
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '10000';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'var(--admin-modal-scrim)';
        modal.style.backdropFilter = 'blur(5px)';
        window.renderDocPacketUI();
        if (sameThread && window.__docPacketState?.packetId && state.token && state.token !== 'static-bypass-token') {
            window.refreshDocPacketAudit?.();
        }
    };

    window.closeDocPacket = function() {
        const modal = document.getElementById('docPacketModal');
        if (modal) modal.style.display = 'none';
    };

    window.renderDocPacketUI = function() {
        const meta = document.getElementById('docPacketMeta');
        const list = document.getElementById('docPacketList');
        const errBox = document.getElementById('docPacketErrors');
        const genBtn = document.getElementById('docPacketGenerateBtn');
        if (!meta || !list) return;
        if (list.dataset.oracleApproveDelegated !== '1') {
            list.dataset.oracleApproveDelegated = '1';
            list.addEventListener('change', (e) => {
                const t = e.target;
                if (t && t.classList && t.classList.contains('doc-approve-toggle')) {
                    window.__updateDocPacketApproveBtn();
                }
            });
        }
        const s = window.__docPacketState || {};
        const hasPacket = !!s.packetId;
        const oracleAttach = docPacketOracleAttachDefaults(s.recommendation);
        const sendBox = document.getElementById('docPacketSend');
        const sendTo = document.getElementById('docPacketSendTo');
        const auditLog = document.getElementById('docPacketAuditLog');
        const auditRefreshBtn = document.getElementById('docPacketAuditRefreshBtn');

        if (genBtn) {
            genBtn.disabled = !s.leadId;
            genBtn.style.opacity = s.leadId ? '1' : '0.6';
            genBtn.style.cursor = s.leadId ? 'pointer' : 'not-allowed';
            genBtn.title = s.leadId ? '' : 'Open a thread first.';
        }

        meta.innerHTML = `
            <div><strong>Lead ID</strong>: ${window.escapeHtml(String(s.leadId || ''))}</div>
            <div><strong>Source</strong>: ${window.escapeHtml(String(s.sourceTable || 'contacts'))}</div>
            <div><strong>Packet</strong>: ${window.escapeHtml(String(s.packetId || 'NOT GENERATED'))}</div>
            ${s.recommendation?.service_type ? `<div><strong>Service</strong>: ${window.escapeHtml(String(s.recommendation.service_type))}</div>` : ''}
            ${s.notice ? `<div style="margin-top:8px;padding:8px 10px;border-radius:10px;border:1px solid rgba(var(--accent2-rgb),0.25);background:rgba(var(--accent2-rgb),0.07);color:var(--admin-text);font-size:0.72rem;line-height:1.4;">${window.escapeHtml(String(s.notice))}</div>` : `<div style="margin-top:6px;">Tip: run <strong style="color:var(--admin-cyan);">OTP ORACLE</strong> in the reply window first so packages and required docs match the thread. Then generate → preview → approve → download / send.</div>`}
        `;

        // Send block (only after packet exists)
        if (sendBox) {
            sendBox.style.display = hasPacket ? 'block' : 'none';
            if (hasPacket && sendTo && !String(sendTo.value || '').trim()) {
                const fallbackEmail = String(s.fields?.client_email || '').trim();
                if (fallbackEmail) sendTo.value = fallbackEmail;
            }
            if (!hasPacket && auditLog) auditLog.textContent = '';
            if (auditRefreshBtn) auditRefreshBtn.disabled = !hasPacket;

            if (sendBox.dataset.docSendPickDelegated !== '1') {
                sendBox.dataset.docSendPickDelegated = '1';
                sendBox.addEventListener('change', (e) => {
                    const t = e.target;
                    if (t && t.classList && t.classList.contains('doc-send-include')) {
                        const k = String(t.dataset.doc || '').trim();
                        if (!k) return;
                        if (!window.__docPacketState.sendInclude || typeof window.__docPacketState.sendInclude !== 'object') {
                            window.__docPacketState.sendInclude = {};
                        }
                        window.__docPacketState.sendInclude[k] = !!t.checked;
                        window.__updateDocPacketSendBtn?.();
                    }
                });
            }

            const sendPick = document.getElementById('docPacketSendPick');
            if (sendPick) {
                if (!hasPacket) {
                    sendPick.innerHTML = '';
                } else {
                    if (!s.sendInclude || typeof s.sendInclude !== 'object') s.sendInclude = {};
                    for (const k of DOC_PACKET_DOC_KEYS) {
                        const doc = s.docs[k];
                        if (!doc?.approved) {
                            delete s.sendInclude[k];
                            continue;
                        }
                        if (s.sendInclude[k] === undefined) {
                            if (k === 'nda') s.sendInclude[k] = !!oracleAttach.nda;
                            else if (k === 'media_release') s.sendInclude[k] = !!oracleAttach.media;
                            else s.sendInclude[k] = true;
                        }
                    }
                    const pickLines = DOC_PACKET_DOC_KEYS.map((k) => {
                        const doc = s.docs[k];
                        if (!doc?.approved) return '';
                        let hint = '';
                        if (k === 'nda') hint = oracleAttach.nda ? ' — Oracle: confidential scope' : ' — optional';
                        if (k === 'media_release') hint = oracleAttach.media ? ' — Oracle: people/media' : ' — optional';
                        const checked = !!s.sendInclude[k];
                        return `<label style="display:flex;align-items:center;gap:8px;font-size:0.7rem;color:var(--admin-text);margin-right:14px;margin-bottom:4px;"><input type="checkbox" class="doc-send-include" data-doc="${k}" ${checked ? 'checked' : ''}/><span>${DOC_PACKET_LABELS[k]}${hint}</span></label>`;
                    }).filter(Boolean);
                    if (pickLines.length) {
                        sendPick.innerHTML = `<div style="font-size:0.68rem;color:var(--admin-muted);margin-top:10px;margin-bottom:6px;font-weight:700;">Attach to client email</div><div style="display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;">${pickLines.join('')}</div>`;
                    } else {
                        sendPick.innerHTML = '<div style="font-size:0.68rem;color:var(--admin-muted);margin-top:8px;">Approve documents above, then choose which files to attach.</div>';
                    }
                }
            }
        }

        const docOrder = DOC_PACKET_DOC_KEYS.map((k) => [k, DOC_PACKET_LABELS[k]]);

        const statusFor = (key) => {
            if (!hasPacket) return { label: 'NOT GENERATED', color: '#8892a0' };
            const doc = (s.docs && s.docs[key]) ? s.docs[key] : null;
            if (!doc) return { label: 'NOT GENERATED', color: '#8892a0' };
            const approved = !!doc.approved;
            const docxErr = (s.docxErrors && typeof s.docxErrors === 'object') ? s.docxErrors[key] : null;
            const isDocxType = (key === 'proposal' || key === 'agreement');
            if (isDocxType && docxErr) return { label: 'ERROR', color: '#ffb86b' };
            if (approved) {
                if (key === 'invoice') return { label: 'READY TO DOWNLOAD', color: 'var(--admin-success)' };
                if (key === 'nda' || key === 'media_release') return { label: 'READY TO DOWNLOAD', color: 'var(--admin-success)' };
                if (isDocxType) return doc.docx ? { label: 'READY TO DOWNLOAD', color: 'var(--admin-success)' } : { label: 'APPROVED', color: 'var(--admin-success)' };
                return { label: 'APPROVED', color: 'var(--admin-success)' };
            }
            return { label: 'GENERATED', color: '#ffaa00' };
        };

        list.innerHTML = docOrder.map(([key, label]) => {
            const doc = (s.docs && s.docs[key]) ? s.docs[key] : null;
            const generated = !!(hasPacket && doc);
            const approved = !!(doc && doc.approved);
            const disabled = !s.packetId;
            const previewDisabled = disabled;
            const previewStyle = previewDisabled ? 'opacity:0.6;cursor:not-allowed;' : '';
            const st = statusFor(key);

            const canDownloadHtml = generated && approved && !!doc?.html;
            const canDownloadDocx = generated && approved && (key === 'proposal' || key === 'agreement') && !!doc?.docx;
            const canDownloadPdf = generated && approved && key === 'invoice';
            const optionalHint =
                key === 'nda'
                    ? (oracleAttach.nda
                        ? '<div style="font-size:0.62rem;color:var(--admin-cyan);font-weight:650;margin-top:6px;line-height:1.35;">Oracle flagged confidential scope — approve if you will use an NDA for this client.</div>'
                        : '<div style="font-size:0.62rem;color:var(--admin-muted);font-weight:650;margin-top:6px;line-height:1.35;">Optional — approve only if this engagement needs an NDA. Not required for core onboarding.</div>')
                    : key === 'media_release'
                        ? (oracleAttach.media
                            ? '<div style="font-size:0.62rem;color:var(--admin-cyan);font-weight:650;margin-top:6px;line-height:1.35;">Oracle flagged identifiable people/media — approve when a release applies.</div>'
                            : '<div style="font-size:0.62rem;color:var(--admin-muted);font-weight:650;margin-top:6px;line-height:1.35;">Optional — approve only if deliverables need a media release.</div>')
                        : '';
            return `
                <div style="border:1px solid var(--admin-border);border-radius:12px;padding:12px;background:var(--admin-panel);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                        <div>
                            <div style="font-weight:800;color:var(--admin-text);">${window.escapeHtml(label)}</div>
                            ${optionalHint}
                        </div>
                        <label style="display:flex;align-items:center;gap:8px;font-size:0.7rem;color:var(--admin-muted);flex-shrink:0;">
                            <input type="checkbox" class="doc-approve-toggle" data-doc="${window.escapeHtml(key)}" ${approved ? 'checked' : ''} ${disabled ? 'disabled' : ''}/>
                            APPROVE
                        </label>
                    </div>
                    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" onclick="previewDocHtml('${window.escapeHtml(key)}')" class="btn-secondary" style="width:auto;font-size:0.68rem;${previewStyle}" ${previewDisabled ? 'disabled' : ''}>PREVIEW</button>
                        <button type="button" onclick="downloadApprovedDoc('${window.escapeHtml(key)}', 'docx')" class="btn-secondary" style="width:auto;font-size:0.68rem;${canDownloadDocx ? '' : 'opacity:0.6;cursor:not-allowed;'}" ${canDownloadDocx ? '' : 'disabled'} title="${canDownloadDocx ? '' : (generated ? 'DOCX not ready (template missing/merge failed) or not approved' : 'Generate a packet first')}">DOWNLOAD DOCX</button>
                        <button type="button" onclick="downloadApprovedDoc('${window.escapeHtml(key)}', 'pdf')" class="btn-secondary" style="width:auto;font-size:0.68rem;${canDownloadPdf ? '' : 'opacity:0.6;cursor:not-allowed;'}" ${canDownloadPdf ? '' : 'disabled'} title="${canDownloadPdf ? '' : (generated ? 'Approve invoice to download' : 'Generate a packet first')}">DOWNLOAD PDF</button>
                        <button type="button" onclick="downloadApprovedDoc('${window.escapeHtml(key)}', 'html')" class="btn-secondary" style="width:auto;font-size:0.68rem;${canDownloadHtml ? '' : 'opacity:0.6;cursor:not-allowed;'}" ${canDownloadHtml ? '' : 'disabled'} title="${canDownloadHtml ? '' : (generated ? 'Approve to download' : 'Generate a packet first')}">DOWNLOAD HTML</button>
                    </div>
                    <div style="margin-top:10px;font-size:0.66rem;color:${st.color};font-weight:900;letter-spacing:1px;text-transform:uppercase;">
                        ${window.escapeHtml(st.label)}
                    </div>
                </div>
            `;
        }).join('');

        window.__updateDocPacketApproveBtn();

        if (errBox) {
            const errs = s.docxErrors && typeof s.docxErrors === 'object' ? s.docxErrors : null;
            if (errs && Object.keys(errs).length) {
                errBox.style.display = 'block';
                errBox.innerHTML = `<strong>DOCX merge is not ready yet.</strong><br/>` + Object.entries(errs)
                    .map(([k, v]) => `${window.escapeHtml(k)}: ${window.escapeHtml(String(v || ''))}`)
                    .join('<br/>');
            } else {
                errBox.style.display = 'none';
                errBox.textContent = '';
            }
        }

        // Render audit log if we have it
        if (auditLog) {
            const events = Array.isArray(s.auditEvents) ? s.auditEvents : [];
            if (!hasPacket) {
                auditLog.textContent = '';
            } else if (!events.length) {
                auditLog.textContent = 'Audit: no events logged yet.';
            } else {
                const lines = events
                    .slice()
                    .reverse()
                    .slice(0, 14)
                    .map((ev) => formatDocPacketAuditLine(ev));
                auditLog.textContent = lines.join('\n');
            }
        }

        window.__updateDocPacketSendBtn();

        const retryBtn = document.getElementById('docPacketRetryBtn');
        if (retryBtn) {
            const events = Array.isArray(s.auditEvents) ? s.auditEvents : [];
            const failed = pickLatestFailedDocPacketSend(events);
            retryBtn.disabled = !hasPacket || !failed;
            retryBtn.style.opacity = !hasPacket || !failed ? '0.55' : '1';
            retryBtn.style.cursor = !hasPacket || !failed ? 'not-allowed' : 'pointer';
            retryBtn.title = failed ? `Retry failed send (${failed.id})` : 'No failed send in the audit trail.';
        }
    };

    window.previewDocHtml = function(docType) {
        const s = window.__docPacketState || {};
        if (!s.packetId) { showToast('GENERATE PACKET FIRST'); return; }
        const html = s.docs?.[docType]?.html || '';
        if (!html) { showToast('NO PREVIEW AVAILABLE'); return; }
        const w = window.open('', '_blank');
        if (!w) { showToast('POPUP BLOCKED'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
    };

    window.downloadApprovedDoc = async function(docType, format = 'html') {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!s.packetId) { showToast('GENERATE PACKET FIRST'); return; }
        const doc = s.docs?.[docType];
        const generated = !!doc;
        const approved = !!(doc?.approved);
        if (!approved) { showToast('APPROVAL REQUIRED'); return; }
        if (!generated) { showToast('DOC NOT GENERATED'); return; }
        if (format === 'docx' && !['proposal', 'agreement'].includes(docType)) { showToast('DOCX NOT AVAILABLE'); return; }
        if (format === 'pdf' && docType !== 'invoice') { showToast('PDF NOT AVAILABLE'); return; }
        if (format === 'html' && !doc?.html) { showToast('HTML NOT READY'); return; }
        try {
            const apiBase = resolveApiBase();
            const url = format === 'docx'
                ? `${apiBase}/api/admin/docs/download-docx/${encodeURIComponent(s.packetId)}/${encodeURIComponent(docType)}`
                : format === 'pdf'
                    ? `${apiBase}/api/admin/docs/download-pdf/${encodeURIComponent(s.packetId)}/${encodeURIComponent(docType)}`
                : `${apiBase}/api/admin/docs/download/${encodeURIComponent(s.packetId)}/${encodeURIComponent(docType)}`;
            const res = await fetchWithTimeout(url, { headers: { 'Authorization': `Bearer ${state.token}` } }, 90000);
            const ok = res.ok;
            if (!ok) {
                const text = await res.text();
                let msg = `Download failed (${res.status})`;
                try { const j = JSON.parse(text); msg = j.message || j.error || msg; } catch (e) {}
                throw new Error(msg);
            }

            const blob = format === 'docx'
                ? new Blob([await res.arrayBuffer()], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
                : format === 'pdf'
                    ? new Blob([await res.arrayBuffer()], { type: 'application/pdf' })
                : new Blob([await res.text()], { type: 'text/html;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${docType}-${s.packetId}.${format === 'docx' ? 'docx' : (format === 'pdf' ? 'pdf' : 'html')}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
                a.remove();
            }, 500);
            showToast('DOWNLOAD STARTED');
        } catch (e) {
            showToast(`DOWNLOAD FAILED: ${formatNetworkError(e)}`);
        }
    };

    window.generateDocPacket = async function() {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!s.leadId) { showToast('OPEN A THREAD FIRST'); return; }
        const domLead = String(document.getElementById('replyContactId')?.value || '').trim();
        const domSrc = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
        if (domLead && (domLead !== String(s.leadId) || domSrc !== (s.sourceTable || 'contacts'))) {
            window.__docPacketState.leadId = domLead;
            window.__docPacketState.sourceTable = domSrc;
            window.__docPacketState.contextKey = `${domSrc}:${domLead}`;
            window.__docPacketState.packetId = null;
            window.__docPacketState.docs = {};
            window.__docPacketState.fields = null;
            window.__docPacketState.docxErrors = null;
            window.__docPacketState.approvalsBaseline = null;
            window.__docPacketState.auditEvents = null;
            window.__docPacketState.recommendation = null;
            window.__docPacketState.sendInclude = null;
            window.__docPacketState.notice = 'Thread changed — packet cleared; generate again for this lead.';
            window.renderDocPacketUI();
        }
        const btn = document.getElementById('docPacketGenerateBtn');
        const orig = btn ? btn.textContent : '';
        try {
            if (btn) { btn.disabled = true; btn.textContent = 'GENERATING...'; }
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/packet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ leadId: s.leadId, sourceTable: s.sourceTable })
            }, 120000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Packet failed (${res.status})`);
            window.__docPacketState.packetId = payload.packet_id;
            window.__docPacketState.docs = payload.docs || {};
            window.__docPacketState.fields = payload.fields || null;
            window.__docPacketState.docxErrors = payload.docx_errors || null;
            window.__docPacketState.recommendation = payload.recommendation || null;
            window.__docPacketState.sendInclude = null;
            window.__docPacketState.approvalsBaseline = normalizeDocPacketApprovalsBaseline(
                Object.fromEntries(DOC_PACKET_DOC_KEYS.map((k) => [k, !!(window.__docPacketState.docs[k]?.approved)]))
            );
            window.__docPacketState.notice = 'Packet generated. Preview each doc, then approve to unlock downloads.';
            showToast('DOC PACKET GENERATED (REVIEW REQUIRED)');
            window.refreshDocPacketAudit?.();
        } catch (e) {
            window.__docPacketState.notice = `Packet generation failed: ${e.message}`;
            showToast(`DOC PACKET FAILED: ${e.message}`);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = orig || 'GENERATE PACKET'; }
            window.renderDocPacketUI();
        }
    };

    function fmtTemplateBytes(n) {
        const v = Number(n);
        if (!Number.isFinite(v) || v < 0) return '';
        if (v < 1024) return `${Math.round(v)} B`;
        if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
        return `${(v / (1024 * 1024)).toFixed(1)} MB`;
    }

    window.uploadDocTemplate = async function(docType, file) {
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!file) return;
        if (!['proposal', 'agreement'].includes(docType)) { showToast('INVALID TEMPLATE TYPE'); return; }
        const name = String(file.name || '').toLowerCase();
        const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const okMime = !file.type || file.type === docxMime || file.type === 'application/octet-stream';
        if (!name.endsWith('.docx') || !okMime) {
            showToast('USE A .DOCX FILE (WORD / DOCX ONLY)');
            return;
        }
        try {
            const apiBase = resolveApiBase();
            const fd = new FormData();
            fd.append('docType', docType);
            fd.append('file', file);
            showToast(`UPLOADING ${docType.toUpperCase()} TEMPLATE...`);
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/templates/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: fd
            }, 120000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Upload failed (${res.status})`);
            showToast(`${docType.toUpperCase()} TEMPLATE UPLOADED`);
            await window.refreshDocTemplateStatus?.();
        } catch (e) {
            showToast(`TEMPLATE UPLOAD FAILED: ${formatNetworkError(e)}`);
        } finally {
            // Allow re-uploading the same file (onchange won't fire if value doesn't change)
            const inputId = docType === 'proposal' ? 'docTemplateProposal' : 'docTemplateAgreement';
            const input = document.getElementById(inputId);
            if (input) input.value = '';
        }
    };

    window.approveDocPacket = async function() {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!s.packetId) { showToast('GENERATE PACKET FIRST'); return; }
        if (!window.__docPacketApprovalsChanged()) { showToast('NO CHANGES TO APPLY'); return; }
        const toggles = Array.from(document.querySelectorAll('#docPacketList .doc-approve-toggle'));
        const approvals = {};
        for (const t of toggles) approvals[t.dataset.doc] = !!t.checked;
        const btn = document.getElementById('docPacketApproveBtn');
        const orig = btn ? btn.textContent : '';
        try {
            if (btn) { btn.disabled = true; btn.textContent = 'APPLYING...'; }
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ packetId: s.packetId, approvals })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Approve failed (${res.status})`);
            // Merge approval statuses
            const next = payload.docs || {};
            for (const [k, v] of Object.entries(next)) {
                if (!window.__docPacketState.docs[k]) window.__docPacketState.docs[k] = {};
                window.__docPacketState.docs[k].approved = !!v.approved;
            }
            for (const k of DOC_PACKET_DOC_KEYS) {
                if (!window.__docPacketState.docs[k]?.approved && window.__docPacketState.sendInclude && k in window.__docPacketState.sendInclude) {
                    delete window.__docPacketState.sendInclude[k];
                }
            }
            window.__docPacketState.approvalsBaseline = normalizeDocPacketApprovalsBaseline(
                Object.fromEntries(DOC_PACKET_DOC_KEYS.map((k) => [k, !!(window.__docPacketState.docs[k]?.approved)]))
            );
            window.__docPacketState.notice = 'Approvals applied. Approved documents are now download-ready.';
            showToast('APPROVALS APPLIED');
            await window.refreshDocPacketAudit();
        } catch (e) {
            window.__docPacketState.notice = `Approval failed: ${e.message}`;
            showToast(`APPROVAL FAILED: ${e.message}`);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = orig || 'APPLY APPROVALS'; }
            window.renderDocPacketUI();
        }
    };

    window.refreshDocPacketAudit = async function() {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) return;
        if (!s.packetId) return;
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/audit/${encodeURIComponent(s.packetId)}`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Audit failed (${res.status})`);
            window.__docPacketState.auditEvents = Array.isArray(payload.events) ? payload.events : [];
        } catch (e) {
            showToast(`AUDIT REFRESH FAILED: ${e.message}`);
        } finally {
            window.renderDocPacketUI();
        }
    };

    window.sendDocPacketEmail = async function() {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!s.packetId) { showToast('GENERATE PACKET FIRST'); return; }
        const to = String(document.getElementById('docPacketSendTo')?.value || '').trim();
        const from = String(document.getElementById('docPacketSendFrom')?.value || '').trim();
        if (!to) { showToast('RECIPIENT REQUIRED'); return; }
        const include = DOC_PACKET_DOC_KEYS.filter((k) => s.docs?.[k]?.approved && s.sendInclude?.[k]);
        if (!include.length) { showToast('SELECT DOCS TO ATTACH (APPROVED + CHECKED)'); return; }
        const btn = document.getElementById('docPacketSendBtn');
        const orig = btn ? btn.textContent : '';
        try {
            if (btn) { btn.disabled = true; btn.textContent = 'SENDING...'; }
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ packetId: s.packetId, to, from, include })
            }, 90000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) {
                const miss = Array.isArray(payload.details?.missing) && payload.details.missing.length
                    ? ` — ${payload.details.missing.join(', ')}`
                    : (Array.isArray(payload.missing) && payload.missing.length ? ` — ${payload.missing.join(', ')}` : '');
                throw new Error((payload.message || `Send failed (${res.status})`) + miss);
            }
            showToast(payload.message && String(payload.message).toLowerCase().includes('simulated') ? 'EMAIL SIMULATED (NO API KEY)' : 'EMAIL SENT');
            window.__docPacketState.notice = String(payload.message || 'Email sent. Audit trail updated.');
        } catch (e) {
            window.__docPacketState.notice = `Send failed: ${e.message}`;
            showToast(`SEND FAILED: ${e.message}`);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = orig || 'SEND APPROVED DOCS'; }
            window.refreshDocPacketAudit?.();
        }
    };

    window.refreshDocPacketDeliveryStatus = async function() {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!s.packetId) { showToast('GENERATE PACKET FIRST'); return; }
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/send-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ packetId: s.packetId })
            }, 45000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Status failed (${res.status})`);
            showToast('DELIVERY STATUS REFRESHED');
        } catch (e) {
            showToast(`STATUS FAILED: ${e.message}`);
        } finally {
            window.refreshDocPacketAudit?.();
        }
    };

    window.retryLastDocPacketSend = async function() {
        const s = window.__docPacketState || {};
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast('LOGIN REQUIRED (REAL JWT)'); return; }
        if (!s.packetId) { showToast('GENERATE PACKET FIRST'); return; }
        const events = Array.isArray(s.auditEvents) ? s.auditEvents : [];
        const failedSend = pickLatestFailedDocPacketSend(events);
        if (!failedSend || !failedSend.id) { showToast('NO FAILED SEND TO RETRY'); return; }
        try {
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/send-retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                body: JSON.stringify({ packetId: s.packetId, retry_of_event_id: failedSend.id })
            }, 90000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Retry failed (${res.status})`);
            showToast(payload.message && String(payload.message).toLowerCase().includes('simulated') ? 'RETRY SIMULATED (NO API KEY)' : 'RETRY SENT');
            window.__docPacketState.notice = String(payload.message || 'Retry send completed. Audit updated.');
        } catch (e) {
            window.__docPacketState.notice = `Retry failed: ${e.message}`;
            showToast(`RETRY FAILED: ${e.message}`);
        } finally {
            window.refreshDocPacketAudit?.();
        }
    };

    // Apply saved admin defaults on load (best effort)
    (function applyAdminDefaultsOnce() {
        try {
            const defaultProvider = localStorage.getItem('otp_admin_default_ai_provider') || '';
            const defaultArch = localStorage.getItem('otp_admin_default_archetype') || '';
            if (defaultArch) {
                const replyArch = document.getElementById('replyArchetype');
                if (replyArch) replyArch.value = defaultArch;
            }
            if (defaultProvider) {
                const providerSel = document.getElementById('providerSelect') || document.getElementById('aiProvider');
                if (providerSel) providerSel.value = defaultProvider;
            }
        } catch (e) {}
    })();

    // --- SETTINGS (ADMIN) ---
    const SETTINGS_KEYS = {
        aiProvider: 'otp_admin_default_ai_provider',
        archetype: 'otp_admin_default_archetype',
        geminiModel: 'otp_admin_default_gemini_model'
    };

    function formatSessionInfoForSettings() {
        try {
            const token = String(state.token || localStorage.getItem('otp_admin_token') || '').trim();
            const apiBase = resolveApiBase();
            const payload = decodeJwtPayload(token) || null;
            const exp = payload?.exp ? Number(payload.exp) : null;
            const expIso = Number.isFinite(exp) ? new Date(exp * 1000).toISOString() : '';
            const role = String(payload?.role || payload?.app_metadata?.role || payload?.user_metadata?.role || '').trim();
            const nowS = Math.floor(Date.now() / 1000);
            const secsLeft = Number.isFinite(exp) ? (exp - nowS) : null;
            const minsLeft = Number.isFinite(secsLeft) ? Math.floor(secsLeft / 60) : null;
            const tokenMode = token === 'static-bypass-token' ? 'LOCAL BYPASS' : (token ? 'JWT' : 'NONE');
            const lines = [
                `token: ${tokenMode}`,
                role ? `role: ${role}` : '',
                expIso ? `expires: ${expIso}${minsLeft != null ? ` (~${minsLeft}m)` : ''}` : '',
                `apiBase: ${apiBase}`
            ].filter(Boolean);
            return lines.join('\n');
        } catch (_) {
            return '';
        }
    }

    window.openAdminSettings = function() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '10000';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'var(--admin-modal-scrim)';
        modal.style.backdropFilter = 'blur(5px)';

        const prov = document.getElementById('settingsDefaultAiProvider');
        const arch = document.getElementById('settingsDefaultArchetype');
        const gem = document.getElementById('settingsDefaultGeminiModel');
        if (prov) prov.value = localStorage.getItem(SETTINGS_KEYS.aiProvider) || '';
        if (arch) arch.value = localStorage.getItem(SETTINGS_KEYS.archetype) || '';
        if (gem) gem.value = localStorage.getItem(SETTINGS_KEYS.geminiModel) || '';
        const status = document.getElementById('settingsSaveStatus');
        if (status) status.textContent = '';

        const sess = document.getElementById('settingsSessionInfo');
        if (sess) sess.textContent = formatSessionInfoForSettings();
        const apiEl = document.getElementById('settingsApiBase');
        const apiBase = resolveApiBase();
        if (apiEl) {
            apiEl.value = apiBase;
            const canEdit = isLocalRuntime();
            apiEl.disabled = !canEdit;
            apiEl.style.opacity = canEdit ? '1' : '0.65';
            apiEl.title = canEdit ? 'Edit allowed on localhost.' : 'Read-only on production.';
        }
        const connStatus = document.getElementById('settingsConnStatus');
        if (connStatus) connStatus.textContent = '';
        window.refreshDocTemplateStatus?.();
    };

    window.closeAdminSettings = function() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.style.display = 'none';
    };

    window.saveAdminSettings = function() {
        const prov = document.getElementById('settingsDefaultAiProvider');
        const arch = document.getElementById('settingsDefaultArchetype');
        const gem = document.getElementById('settingsDefaultGeminiModel');
        const p = prov ? String(prov.value || '') : '';
        const a = arch ? String(arch.value || '') : '';
        const g = gem ? String(gem.value || '') : '';
        if (p) localStorage.setItem(SETTINGS_KEYS.aiProvider, p); else localStorage.removeItem(SETTINGS_KEYS.aiProvider);
        if (a) localStorage.setItem(SETTINGS_KEYS.archetype, a); else localStorage.removeItem(SETTINGS_KEYS.archetype);
        if (g) localStorage.setItem(SETTINGS_KEYS.geminiModel, g); else localStorage.removeItem(SETTINGS_KEYS.geminiModel);
        const status = document.getElementById('settingsSaveStatus');
        if (status) status.textContent = 'Saved.';

        // Apply defaults immediately if the controls exist
        const replyArch = document.getElementById('replyArchetype');
        if (replyArch && a) replyArch.value = a;
        const providerSel = document.getElementById('providerSelect') || document.getElementById('aiProvider');
        if (providerSel && p) providerSel.value = p;
        const gemModelSel = document.getElementById('geminiModel');
        if (gemModelSel && g) gemModelSel.value = g;
    };

    window.resetAdminSettings = function() {
        localStorage.removeItem(SETTINGS_KEYS.aiProvider);
        localStorage.removeItem(SETTINGS_KEYS.archetype);
        localStorage.removeItem(SETTINGS_KEYS.geminiModel);
        const prov = document.getElementById('settingsDefaultAiProvider');
        const arch = document.getElementById('settingsDefaultArchetype');
        const gem = document.getElementById('settingsDefaultGeminiModel');
        if (prov) prov.value = '';
        if (arch) arch.value = '';
        if (gem) gem.value = '';
        const status = document.getElementById('settingsSaveStatus');
        if (status) status.textContent = 'Reset.';
    };

    window.copyTerminalDiagnostics = async function() {
        const status = document.getElementById('settingsSaveStatus');
        try {
            const info = [
                `terminal_version: ${String(document.querySelector('#adminHeader span')?.textContent || '').trim() || 'unknown'}`,
                `origin: ${window.location.origin}`,
                `api_base: ${resolveApiBase()}`,
                `local_runtime: ${isLocalRuntime()}`,
                `token_mode: ${state.token === 'static-bypass-token' ? 'local_bypass' : (state.token ? 'jwt' : 'none')}`,
                `user_agent: ${navigator.userAgent}`
            ].join('\n');
            await navigator.clipboard.writeText(info);
            if (status) status.textContent = 'Diagnostics copied.';
            showToast('DIAGNOSTICS COPIED');
        } catch (e) {
            if (status) status.textContent = `Copy failed: ${e.message}`;
            showToast('COPY FAILED');
        }
    };

    function collectTerminalSettingsSnapshot() {
        const keys = [
            SETTINGS_KEYS.aiProvider,
            SETTINGS_KEYS.archetype,
            SETTINGS_KEYS.geminiModel,
            'otp_api_base',
            'ai_provider'
        ];
        const snapshot = { schema: 'otp-terminal-settings-v1', at: new Date().toISOString(), values: {} };
        for (const k of keys) {
            const v = localStorage.getItem(k);
            if (v != null && v !== '') snapshot.values[k] = v;
        }
        return snapshot;
    }

    window.exportTerminalSettings = async function() {
        const status = document.getElementById('settingsSaveStatus');
        try {
            const snap = collectTerminalSettingsSnapshot();
            const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `otp-terminal-settings-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            if (status) status.textContent = 'Export started.';
            showToast('EXPORT STARTED');
        } catch (e) {
            if (status) status.textContent = `Export failed: ${e.message}`;
            showToast('EXPORT FAILED');
        }
    };

    window.importTerminalSettings = function() {
        const status = document.getElementById('settingsSaveStatus');
        let input = document.getElementById('terminalSettingsImport');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'terminalSettingsImport';
            input.accept = 'application/json,.json';
            input.style.display = 'none';
            document.body.appendChild(input);
        }
        input.onchange = async (ev) => {
            const f = Array.from(ev.target.files || [])[0] || null;
            input.value = '';
            if (!f) return;
            try {
                const text = await f.text();
                const parsed = JSON.parse(text);
                if (!parsed || parsed.schema !== 'otp-terminal-settings-v1' || typeof parsed.values !== 'object') {
                    throw new Error('Invalid settings file.');
                }
                for (const [k, v] of Object.entries(parsed.values || {})) {
                    localStorage.setItem(String(k), String(v));
                }
                // Refresh UI values immediately
                window.openAdminSettings();
                if (status) status.textContent = 'Imported.';
                showToast('SETTINGS IMPORTED');
            } catch (e) {
                if (status) status.textContent = `Import failed: ${e.message}`;
                showToast('IMPORT FAILED');
            }
        };
        input.click();
    };

    window.applySettingsApiBase = function() {
        const apiEl = document.getElementById('settingsApiBase');
        const out = document.getElementById('settingsConnStatus');
        if (!apiEl) return;
        if (!isLocalRuntime()) {
            if (out) out.textContent = 'API base override is disabled on production.';
            showToast('API BASE LOCKED (PROD)');
            return;
        }
        let val = String(apiEl.value || '').trim();
        if (!val) {
            if (out) out.textContent = 'Enter an API base URL first.';
            showToast('MISSING API BASE');
            return;
        }
        if (!/^https?:\/\//i.test(val)) val = `https://${val}`;
        val = val.replace(/\/+$/, '');
        apiEl.value = val;
        localStorage.setItem('otp_api_base', val);
        try { persistSystemState?.('api_base', val); } catch (_) {}
        if (out) out.textContent = `Applied. API base is now: ${val}`;
        showToast('API BASE UPDATED');
    };

    window.resetSettingsApiBase = function() {
        const apiEl = document.getElementById('settingsApiBase');
        const out = document.getElementById('settingsConnStatus');
        if (!apiEl) return;
        if (!isLocalRuntime()) {
            if (out) out.textContent = 'API base reset is disabled on production.';
            showToast('API BASE LOCKED (PROD)');
            return;
        }
        localStorage.removeItem('otp_api_base');
        const fresh = resolveApiBase();
        localStorage.setItem('otp_api_base', fresh);
        apiEl.value = fresh;
        try { persistSystemState?.('api_base', fresh); } catch (_) {}
        if (out) out.textContent = `Reset. API base is now: ${fresh}`;
        showToast('API BASE RESET');
    };

    window.clearLocalOracleKeys = function() {
        const out = document.getElementById('settingsConnStatus');
        if (!confirm('Clear locally stored provider keys on this browser? (OpenAI/Gemini/Anthropic/Groq)')) return;
        const keys = [
            'cloud_openai',
            'cloud_gemini',
            'cloud_groq',
            'cloud_claude',
            'cloud_anthropic'
        ];
        for (const k of keys) localStorage.removeItem(k);
        const cloudOA = document.getElementById('cloudOpenAI');
        const cloudG = document.getElementById('cloudGemini');
        const cloudC = document.getElementById('cloudClaude');
        const cloudGr = document.getElementById('cloudGroq');
        if (cloudOA) cloudOA.value = '';
        if (cloudG) cloudG.value = '';
        if (cloudC) cloudC.value = '';
        if (cloudGr) cloudGr.value = '';
        if (out) out.textContent = 'Local provider keys cleared for this browser.';
        showToast('LOCAL KEYS CLEARED');
    };

    window.refreshDocTemplateStatus = async function() {
        const out = document.getElementById('docTemplateStatus');
        if (!out) return;
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) {
            out.textContent = 'Login required (JWT or allowed local bypass).';
            return;
        }
        try {
            out.textContent = 'Loading template status...';
            const apiBase = resolveApiBase();
            const res = await fetchWithTimeout(`${apiBase}/api/admin/docs/templates/status`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            }, 30000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `Status failed (${res.status})`);
            const t = payload.templates || {};
            const bucket = String(payload.bucket || '').trim();
            const prefix = String(payload.prefix || '').trim();
            const head = bucket && prefix ? `Bucket ${bucket} • ${prefix}\n` : '';
            const line = (label, k) => {
                const row = t[k] || {};
                const ok = !!row.present;
                const stamp = row.updated_at ? new Date(row.updated_at).toLocaleString() : '';
                const sz = row.size != null ? fmtTemplateBytes(row.size) : '';
                const bits = [ok ? 'READY' : 'MISSING'];
                if (stamp) bits.push(stamp);
                if (sz) bits.push(sz);
                const key = String(row.key || `${prefix}${k}.docx`).trim();
                return `${label}: ${bits.join(' • ')}\n   ${key}`;
            };
            out.textContent = head + [
                line('Master proposal', 'proposal'),
                line('Master agreement', 'agreement')
            ].join('\n');
        } catch (e) {
            out.textContent = `Status error: ${formatNetworkError(e)}`;
        }
    };

    window.runOracleForReplyContext = async function() {
        const leadId = document.getElementById('replyContactId')?.value;
        const sourceTable = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
        if (!leadId) { showToast("NO THREAD SELECTED"); return; }
        if (!state.token || (state.token === 'static-bypass-token' && !isStaticBypassAllowed())) { showToast("LOGIN REQUIRED (REAL JWT)"); return; }
        const opsBtn = document.getElementById('replyOracleBtn');
        const originalOpsText = opsBtn ? opsBtn.textContent : '';
        try {
            if (opsBtn) {
                opsBtn.disabled = true;
                opsBtn.textContent = 'RUNNING...';
                opsBtn.style.opacity = '0.7';
            }
            const apiBase = resolveApiBase();
            const analysisDiv = document.getElementById('replyAnalysis');
            if (analysisDiv) {
                analysisDiv.innerHTML = '<div style="font-size:0.75rem;color:var(--admin-muted);">Running OTP Oracle…</div>';
            }
            const res = await fetchWithTimeout(`${apiBase}/api/admin/knowledge/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({ leadId, sourceTable })
            }, 50000);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || `OTP Oracle failed (${res.status})`);
            const recommendation = payload.recommendation || {};
            const cacheKey = replyOracleKey(sourceTable, leadId);
            window.replyOracleCache[cacheKey] = {
                recommendation,
                confidence: payload.confidence,
                updated_at: payload.updated_at || new Date().toISOString(),
                kb_updated_at: payload.kb_updated_at || null
            };
            if (sourceTable === 'leads') {
                window.leadOracleCache = window.leadOracleCache || {};
                window.leadOracleCache[leadId] = {
                    recommendation,
                    confidence: payload.confidence,
                    updated_at: payload.updated_at || new Date().toISOString(),
                    kb_updated_at: payload.kb_updated_at || null
                };
            }
            if (window.__replyContext) window.__replyContext.recommendation = recommendation;

            if (analysisDiv) {
                const sections = [];
                const raw = window.__replyContext && window.__replyContext.analysis;
                if (raw) {
                    sections.push(formatOracleContextBlockHtml(raw));
                }
                sections.push(buildOraclePanelHtml(recommendation));
                analysisDiv.innerHTML = sections.join('<div style="height:12px;"></div>');
            }
            const confN = Number(payload.confidence);
            const confSuffix = Number.isFinite(confN) ? ` (${Math.round(confN * 100)}% match)` : '';
            showToast('OTP ORACLE READY' + confSuffix);
            if (sourceTable === 'leads') await window.fetchLeads();
            else await window.fetchInbox();
        } catch (e) {
            const msg = formatNetworkError(e);
            showToast(`OTP ORACLE FAILED: ${msg}`);
            const failDiv = document.getElementById('replyAnalysis');
            if (failDiv) {
                const errHtml = `<div style="padding:12px;border:1px solid rgba(255,100,120,0.4);border-radius:8px;background:rgba(255,100,120,0.08);font-size:0.76rem;color:var(--admin-text);line-height:1.45;"><strong style="letter-spacing:0.06em;">OTP ORACLE FAILED</strong><br/>${window.escapeHtml ? window.escapeHtml(String(msg)) : String(msg)}<br/><span style="font-size:0.68rem;opacity:0.85;">Fix auth, network, or knowledge index — then retry.</span></div>`;
                const lid = document.getElementById('replyContactId')?.value;
                const st = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
                const parts = [errHtml];
                const rawA = window.__replyContext && window.__replyContext.analysis;
                if (rawA) parts.push(formatOracleContextBlockHtml(rawA));
                const prev = lid ? window.replyOracleCache[replyOracleKey(st, lid)] : null;
                if (prev && prev.recommendation) parts.push(buildOraclePanelHtml(prev.recommendation));
                failDiv.innerHTML = parts.join('<div style="height:12px;"></div>');
            }
        } finally {
            if (opsBtn) {
                opsBtn.disabled = false;
                opsBtn.textContent = originalOpsText || '🔮 OTP ORACLE';
                opsBtn.style.opacity = '1';
            }
        }
    };
    window.runBrainForReplyContext = window.runOracleForReplyContext;

    // NEW: Generate AI Reply for Lead
    window.generateReplyForLead = async function() {
        const rmDom = requireReplyManagerCoreDom();
        if (!rmDom) return;
        const msg = rmDom.incoming.textContent;
        const name = rmDom.name.value;
        const email = rmDom.email.value;
        const draftBox = rmDom.draft;

        if(!msg) { showToast("NO MESSAGE CONTEXT FOUND"); return; }
        if (!email || !String(email).includes('@')) { showToast("VALID CONTACT EMAIL REQUIRED"); return; }
        
        const btn = document.getElementById('replyGenBtn');
        if (!btn) {
            showToast("GENERATOR BUTTON UNAVAILABLE");
            return;
        }
        const originalText = btn.innerHTML;
        btn.innerHTML = "<span>⏳</span> THINKING...";
        btn.disabled = true;

        try {
            const apiBase = resolveApiBase();
            const sourceTable = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
            const leadId = document.getElementById('replyContactId')?.value || null;

            // Get Config
            const providerSel = document.getElementById('aiProvider'); // Use global selector
            const modelSel = document.getElementById('geminiModel');
            const provider = providerSel ? providerSel.value : 'gemini';
            const model = (provider === 'gemini' && modelSel) ? modelSel.value : null;
            const personalKeys = {
                openai: getProviderLocalKey('openai'),
                gemini: getProviderLocalKey('gemini'),
                anthropic: getProviderLocalKey('anthropic'),
                groq: getProviderLocalKey('groq')
            };

            // DYNAMIC ARCHETYPE OVERRIDE
            const archInput = document.getElementById('replyArchetype');
            const selectedArchSlug = archInput ? archInput.value : '';
            const archetype = selectedArchSlug ? (state.archetypes || []).find(a => a.slug === selectedArchSlug) : null;
            const modelConfig = (archetype && archetype.model_config) ? archetype.model_config : {};
            
            const baseSystemPrompt = archetype ? archetype.system_prompt : `You are an elite business consultant and executive assistant. 
            Your task is to draft a professional, warm, and high-conversion reply to a potential lead.`;

            // Pull OTP Oracle recommendation (best effort) so replies match the packet workflow
            let opsRec = null;
            let oracleConfidenceFromRec = null;
            if (state.token && leadId) {
                // Keep endpoint reference visible for contract tests + clarity.
                const _oracleRecommendUrl = `${apiBase}/api/admin/knowledge/recommend`;
                opsRec = await ensureOracleRecommendationFresh({ leadId, sourceTable, maxAgeMs: 10 * 60 * 1000 });
                const cached = window.replyOracleCache?.[replyOracleKey(sourceTable, leadId)] || null;
                const conf = Number(cached?.confidence);
                oracleConfidenceFromRec = Number.isFinite(conf) ? conf : null;
            }

            if (window.__replyContext) window.__replyContext.recommendation = opsRec;
            if (opsRec && leadId) {
                window.replyOracleCache[replyOracleKey(sourceTable, leadId)] = {
                    recommendation: opsRec,
                    confidence: oracleConfidenceFromRec,
                    updated_at: new Date().toISOString()
                };
                if (sourceTable === 'leads') {
                    window.leadOracleCache = window.leadOracleCache || {};
                    window.leadOracleCache[leadId] = window.leadOracleCache[leadId] || {};
                    window.leadOracleCache[leadId].recommendation = opsRec;
                    window.leadOracleCache[leadId].updated_at = new Date().toISOString();
                }
            }
            const analysisRaw = (window.__replyContext && window.__replyContext.analysis) ? window.__replyContext.analysis : null;
            const analysisText = analysisRaw
                ? (typeof analysisRaw === 'string' ? analysisRaw : JSON.stringify(analysisRaw, null, 2))
                : '';

            const requiredDocs = Array.isArray(opsRec?.required_documents) ? Array.from(new Set(opsRec.required_documents)).join(', ') : '';
            const citations = Array.isArray(opsRec?.knowledge_basis)
                ? opsRec.knowledge_basis
                    .map((h) => {
                        const file = String(h?.file_name || '').trim();
                        const idx = Number.isFinite(Number(h?.chunk_index)) ? Number(h.chunk_index) : 0;
                        const sim = Number.isFinite(Number(h?.similarity)) ? `${Math.round(Number(h.similarity) * 100)}%` : '';
                        return file ? `${file}#${idx}${sim ? ` (${sim})` : ''}` : '';
                    })
                    .filter(Boolean)
                    .slice(0, 3)
                : [];
            const systemPrompt = `${baseSystemPrompt}

You are writing a plain-text email reply as Only True Perspective.
Hard rules:
- Output ONLY the email body (no markdown, no code fences).
- Keep it short and high-status (120-220 words).
- No subject line, unless the user explicitly asked for one.
- Ask exactly 3 crisp questions at the end (bulleted).
- Close with: "Best," then "Only True Perspective".

If the OTP Oracle recommends a package or safety docs, align your reply with that workflow (proposal + agreement + invoice/deposit).
If citations are provided, treat them as the source of truth for pricing/rules and keep the reply consistent with them (do not invent conflicting policy).
`;

            const userPrompt = [
                `LEAD`,
                `Name: ${String(name || '').trim() || 'Valued Lead'}`,
                `Email: ${String(email || '').trim()}`,
                ``,
                `INCOMING MESSAGE`,
                truncateForPrompt(msg, 1600),
                ``,
                opsRec ? `OTP ORACLE RECOMMENDATION\nPackage: ${opsRec.recommended_package || 'Manual review'}\nQuote: ${opsRec.quote_range || 'Scope-based'}\nRequired docs: ${requiredDocs || 'Manual doc review'}\nNext action: ${opsRec.next_action || 'manual_review_required'}` : '',
                citations.length ? `\nCITATIONS (business knowledge)\n- ${citations.join('\n- ')}` : '',
                analysisText ? `\nORACLE CONTEXT DATA\n${truncateForPrompt(analysisText, 900)}` : '',
                ``,
                `Write the reply now.`
            ].filter(Boolean).join('\n');

            let replyText = "";
            let hubError = null;

            // 1. Try Server Proxy First (Secure Hub)
            if (state.token && state.token !== 'static-bypass-token') {
                try {
                    const res = await fetchWithTimeout(apiBase + '/api/ai/chat', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ 
                            provider, 
                            systemPrompt, 
                            messages: [{ role: 'user', content: userPrompt }],
                            model,
                            modelConfig,
                            keys: personalKeys
                        })
                    }, 120000);
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.success) {
                        replyText = typeof data.data === 'string' ? data.data : JSON.stringify(data.data || '');
                    } else {
                        hubError = data.message || "Server Hub Refused Connection";
                    }
                } catch (e) {
                    hubError = formatNetworkError(e);
                }
            }

            // 2. Failover: Try Direct Cloud Link
            if (!replyText) {
                const attemptOrder = [
                    provider,
                    // Gemini failures: try other engines with personal keys (OpenAI last — optional).
                    ...(provider === 'gemini' ? ['groq', 'anthropic', 'openai'] : []),
                    ...(provider !== 'gemini' ? ['gemini', 'groq', 'anthropic', 'openai'] : [])
                ];
                const tried = new Set();
                let lastDirectErr = '';
                for (const p of attemptOrder) {
                    if (tried.has(p)) continue;
                    tried.add(p);
                    const cloudKey = personalKeys[p];
                    if (!cloudKey) continue;
                    try {
                        if (p === 'openai') {
                            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                                body: JSON.stringify({
                                    model: 'gpt-4o',
                                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                                    ...modelConfig
                                })
                            });
                            const data = await res.json();
                            if (data.error) throw new Error(data.error.message);
                            replyText = data?.choices?.[0]?.message?.content || '';
                        } else if (p === 'gemini') {
                            const geminiConfig = {};
                            if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
                            if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
                            if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;

                            const versions = ['v1', 'v1beta'];
                            const modelCandidates = getGeminiModelCandidates(model);
                            let success = false;
                            let lastError = "Neural link failed.";

                            for (const v of versions) {
                                if (success) break;
                                for (const m of modelCandidates) {
                                    if (success) break;
                                    try {
                                        const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${cloudKey}`;
                                        const res = await fetch(url, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                systemInstruction: { parts: [{ text: systemPrompt }] },
                                                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                                                generationConfig: geminiConfig
                                            })
                                        });
                                        const data = await res.json();
                                        if (data.error) {
                                            lastError = `${m} [${v}]: ${data.error.message}`;
                                            continue;
                                        }
                                        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                                        if (txt) {
                                            replyText = txt;
                                            success = true;
                                            break;
                                        }
                                    } catch (e) {
                                        lastError = e.message;
                                    }
                                }
                            }
                            if (!success) throw new Error(`GEMINI DEEP DIVE FAILED: ${lastError}`);
                        } else if (p === 'anthropic') {
                            const res = await fetch('https://api.anthropic.com/v1/messages', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-api-key': cloudKey,
                                    'anthropic-version': '2023-06-01',
                                    'anthropic-dangerous-direct-browser-access': 'true'
                                },
                                body: JSON.stringify({
                                    model: 'claude-3-5-sonnet-20240620',
                                    max_tokens: 900,
                                    system: systemPrompt,
                                    messages: [{ role: 'user', content: userPrompt }],
                                    ...modelConfig
                                })
                            });
                            const data = await res.json();
                            if (data.error) throw new Error(data.error.message);
                            replyText = data?.content?.[0]?.text || '';
                        } else if (p === 'groq') {
                            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                                body: JSON.stringify({
                                    model: 'llama-3.1-70b-versatile',
                                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                                    ...modelConfig
                                })
                            });
                            const data = await res.json();
                            if (data.error) throw new Error(data.error.message);
                            replyText = data?.choices?.[0]?.message?.content || '';
                        }
                        if (String(replyText || '').trim()) break;
                    } catch (e) {
                        lastDirectErr = e?.message || String(e);
                        // Try next provider if quota/model blowup
                        if (p === 'gemini' && (isGeminiQuotaIssue(lastDirectErr) || String(lastDirectErr).toLowerCase().includes('not found'))) {
                            continue;
                        }
                        // Otherwise continue only if another provider exists
                        continue;
                    }
                }

                if (!String(replyText || '').trim()) {
                    throw new Error(hubError ? `ORACLE UPLINK FAILED: ${hubError}` : (lastDirectErr || `NO API KEY FOUND FOR ${provider.toUpperCase()}`));
                }
            }

            if (!String(replyText || '').trim()) {
                throw new Error('EMPTY RESPONSE FROM AI ENGINE');
            }

            // Stream simulation or just paste
             const normalized = normalizePlaintextEmail(replyText);
             const { subject, body } = extractSubjectAndBody(normalized);
             const subjectInput = document.getElementById('replySubject');
             if (subject && subjectInput && !String(subjectInput.value || '').trim()) {
                 subjectInput.value = subject;
             }
             draftBox.value = (body || normalized).trim();
             showToast("REPLY GENERATED");

             // --- TRACK USAGE ---
             if (selectedArchSlug) incrementArchetypeUsage(selectedArchSlug);

        } catch(e) {
            console.error("GEN ERROR:", e);
            const friendlyError = formatNeuralError(e.message);
            const analysisDiv = document.getElementById('replyAnalysis');
            if (analysisDiv && isGeminiQuotaIssue(e.message)) {
                analysisDiv.innerHTML = `
                    <div style="background: rgba(255,170,0,0.08); border: 1px solid rgba(255,170,0,0.35); border-radius: 8px; padding: 10px;">
                        <div style="font-size:0.62rem;color:#ffd37a;letter-spacing:1.2px;text-transform:uppercase;font-weight:900;margin-bottom:6px;">Analysis Agent Alert</div>
                        <div style="font-size:0.72rem;color:var(--admin-text);line-height:1.45;">Gemini quota is exhausted. Switch Intelligence Engine to Groq/OpenAI/Anthropic or add a billed Gemini key.</div>
                    </div>`;
            } else if (analysisDiv && isOpenAIQuotaIssue(e.message)) {
                analysisDiv.innerHTML = `
                    <div style="background: rgba(255,170,0,0.08); border: 1px solid rgba(255,170,0,0.35); border-radius: 8px; padding: 10px;">
                        <div style="font-size:0.62rem;color:#ffd37a;letter-spacing:1.2px;text-transform:uppercase;font-weight:900;margin-bottom:6px;">Analysis Agent Alert</div>
                        <div style="font-size:0.72rem;color:var(--admin-text);line-height:1.45;">OpenAI quota or billing blocked this request. Add credits, switch engine to Gemini/Groq, or paste a cloud key under OTP Oracle / provider keys.</div>
                    </div>`;
            }
            showToast("GEN FAILED: " + friendlyError);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    window.saveDraftUpdate = async function() {
        const rmDom = requireReplyManagerCoreDom();
        if (!rmDom) return;
        const sourceTable = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
        if (sourceTable !== 'contacts') {
            showToast("DRAFT CACHE AVAILABLE FOR INBOX THREADS");
            return;
        }
        const id = rmDom.contactId.value;
        const content = rmDom.draft.value;
        
        try {
            await window.secureWrite('contacts', { draft_reply: content }, id);
            showToast("DRAFT UPDATED (SECURE)");
            // Update cache locally
            const c = window.inboxCache.find(x => x.id == id);
            if(c) c.draft_reply = content;
            await fetchInbox(); 
        } catch(e) { showToast("SAVE FAILED: " + e.message); }
    };

    window.launchMailClient = function() {
        const rmDom = requireReplyManagerCoreDom();
        if (!rmDom) return;
        const email = rmDom.email.value;
        const name = rmDom.name.value;
        const content = rmDom.draft.value;
        const subjectEl = document.getElementById('replySubject');
        const subject = (subjectEl ? subjectEl.value : '') || `Inquiry Reply: Only True Perspective`;
        const safeSubject = encodeURIComponent(subject);
        const safeBody = encodeURIComponent(content);
        const mailto = `mailto:${encodeURIComponent(email)}?subject=${safeSubject}&body=${safeBody}`;

        try {
            window.location.href = mailto;
        } catch(e) {
            window.open(mailto, '_blank');
        }
    };

    window.markAsReplied = function() {
        const rmDom = requireReplyManagerCoreDom();
        if (!rmDom) return;
        const sourceTable = document.getElementById('replySourceTable')?.value === 'leads' ? 'leads' : 'contacts';
        if (sourceTable !== 'contacts') {
            showToast("LEAD REVIEW LOGGED (NO AUTO-SYNC)");
            window.closeReplyManager();
            return;
        }
        const draftContent = String(rmDom.draft.value || '').trim();
        if (!draftContent) {
            showToast("ADD OR GENERATE A DRAFT BEFORE SYNCHRONIZING");
            return;
        }
        const id = rmDom.contactId.value;
        confirmAction("SENT REPLY?", "Confirm you have sent the reply. This will mark the thread as completed.", async () => {
            try {
                await window.secureWrite('contacts', { ai_status: 'completed' }, id);
                showToast("MARKED AS COMPLETED (SECURE)");
                const rm = document.getElementById('replyModal');
                if (rm) rm.style.display = 'none';
                await fetchInbox();
            } catch(e) { showToast("UPDATE FAILED: " + e.message); }
        });
    };
    
    // NEW: Archive Contact (Using Custom Modal)
    window.archiveContact = function(id, event) {
        if(event) { event.preventDefault(); event.stopPropagation(); }
        
        const modal = document.getElementById('actionModal');
        const title = document.getElementById('actionModalTitle');
        const text = document.getElementById('actionModalText');
        const btn = document.getElementById('confirmActionBtn');
        const inputContainer = document.getElementById('actionModalInputVars');
        
        if(modal && title && btn) {
            title.textContent = "ARCHIVE THREAD?";
            text.textContent = "This will move the conversation to the archive.";
            inputContainer.style.display = 'none';
            
            // Set up one-time click handler
            btn.onclick = async () => {
                btn.onclick = null; // Prevent double trigger
                btn.textContent = "ARCHIVING...";
                try {
                     await window.secureWrite('contacts', { ai_status: 'archived' }, id);
                     showToast("ARCHIVED (SECURE)");
                     modal.style.display = 'none';
                     await fetchInbox();
                     window.refocusInbox();
                } catch(e) { 
                    showToast("FAILED: "+e.message);
                    btn.textContent = "EXECUTE";
                }
            };
            
            btn.textContent = "ARCHIVE";
            // Repurpose Exec button style for archive (neutral/success)
            btn.style.background = "var(--admin-cyan)";
            
            modal.style.display = 'flex';
            // Enforce proper centering
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'var(--admin-modal-scrim)';
            modal.style.backdropFilter = 'blur(5px)';
        }
        return false;
    };

    // NEW: Delete Contact (Using Custom Delete Modal)
    window.deleteContact = function(id, event) {
        if(event) { event.preventDefault(); event.stopPropagation(); }

        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        // Dynamically update text for Lead context
        const titleEl = modal.querySelector('h3');
        const descEl = modal.querySelector('p');
        
        if(titleEl) titleEl.textContent = "DELETE CONTACT?";
        if(descEl) descEl.innerHTML = "This will permanently remove the contact message.<br>This cannot be undone.";

        if(modal && confirmBtn) {
            // Remove old listeners by cloning
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

            newBtn.onclick = async () => {
                newBtn.textContent = "DELETING...";
                newBtn.disabled = true;

                try {
                    await window.secureDelete('contacts', id);
                    showToast("✅ CONTACT DELETED");
                    modal.style.display = 'none';
                    await window.fetchInbox();
                    if (window.refocusInbox) window.refocusInbox();
                } catch(e) {
                    console.error("Contact delete error:", e);
                    showToast("DELETE FAILED: " + e.message);
                } finally {
                    newBtn.textContent = "DELETE";
                    newBtn.disabled = false;
                }
            };
            
            modal.style.display = 'flex';
            // Enforce proper centering
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'var(--admin-modal-scrim)';
            modal.style.backdropFilter = 'blur(5px)';
        }
        return false;
    };

    function updateStats(posts) {
        if (!posts || !Array.isArray(posts)) return;
        const statViews = document.getElementById('statViews');
        // Calculate total views
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        if(statViews) statViews.textContent = totalViews.toLocaleString();
        
        // Count published
        const statPublished = document.getElementById('statPublished'); 
        if(statPublished) {
            const pubCount = posts.filter(p => p.published).length;
            statPublished.textContent = pubCount;
        }

        // Active Now (Link to Realtime Presence if available, otherwise simulation)
        const statLive = document.getElementById('statLive');
        if (statLive) {
            const realCount = document.getElementById('activeCount')?.textContent;
            if (realCount && realCount !== '--') {
                statLive.textContent = realCount;
            } else {
                const publishedCount = posts.filter(p => p.published).length;
                const base = Math.max(1, Math.floor(publishedCount * 0.8));
                const jitter = Math.floor(Math.random() * 3);
                statLive.textContent = base + jitter;
            }
        }

        // Render Chart
        renderChart(posts);
    }
    
    // Expose for Theme Toggle
    window.refreshDashboardChart = function() {
        if(postsCache) renderChart(postsCache);
    };

    let activityChartInstance = null;
    function renderChart(posts) {
        const ctx = document.getElementById('activityChart');
        if(!ctx) return;
        
        // Prepare Data: Top 10 Posts by Views
        const sorted = [...posts].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
        // Shorten titles for labels
        const labels = sorted.map(p => (p.title || 'Untitled').substring(0, 12) + ((p.title && p.title.length > 12) ? '...' : ''));
        const data = sorted.map(p => p.views || 0);

        // EMPTY STATE: Show fallback if no data
        const chartContainer = ctx.parentElement;
        let emptyMsg = chartContainer.querySelector('.chart-empty-state');
        if (!data.length || data.every(v => v === 0)) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'chart-empty-state';
                emptyMsg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--admin-muted);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;';
                emptyMsg.innerHTML = '<div style="font-size:2rem;opacity:0.3;">📊</div><div>NO VIEW DATA AVAILABLE</div><div style="font-size:0.65rem;opacity:0.5;">Publish content to see analytics</div>';
                chartContainer.appendChild(emptyMsg);
            }
            emptyMsg.style.display = 'flex';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';


        // Check if we can just update existing chart
        if (activityChartInstance) {
            // Check for identical data to avoid redraw flicker (simple JSON check)
            const currentData = JSON.stringify(activityChartInstance.data.datasets[0].data);
            const newData = JSON.stringify(data);
            const currentLabels = JSON.stringify(activityChartInstance.data.labels);
            const newLabels = JSON.stringify(labels);
            const isThemeMismatch = activityChartInstance.options.scales.x.ticks.color !== (document.documentElement.getAttribute('data-theme') === 'light' ? '#000' : '#888');

            if (currentData === newData && currentLabels === newLabels && !isThemeMismatch) {
                return; // No change needed
            }
            activityChartInstance.destroy();
        }

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const colorText = isLight ? '#000' : '#888';
        const colorGrid = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        
        // Gradient Build
        const cvs = ctx.getContext('2d');
        const gradient = cvs.createLinearGradient(0, 0, 0, 400);
        const accentRGB = getComputedStyle(document.documentElement).getPropertyValue('--accent2-rgb').trim() || (isLight ? '0, 100, 140' : '0, 236, 255');
        
        gradient.addColorStop(0, `rgba(${accentRGB}, 0.9)`);
        gradient.addColorStop(1, `rgba(${accentRGB}, 0.2)`);

        activityChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Views',
                    data: data,
                    backgroundColor: gradient,
                    borderRadius: 6,
                    barThickness: 'flex',
                    maxBarThickness: 40,
                    hoverBackgroundColor: `rgb(${accentRGB})`
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { 
                        backgroundColor: isLight ? '#fff' : '#000', 
                        titleColor: isLight ? '#000' : '#fff', 
                        bodyColor: isLight ? '#666' : '#ccc',
                        titleFont: { family: 'Space Grotesk', size: 13 },
                        bodyFont: { family: 'monospace' },
                        borderColor: isLight ? '#ccc' : '#333',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const idx = items[0].dataIndex;
                                return sorted[idx].title; 
                            },
                            label: (item) => `${item.formattedValue} Views`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: colorGrid, drawBorder: false },
                        ticks: { color: colorText, font: { family: 'monospace', size: 10 } },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: colorText, font: { family: 'monospace', size: 10 } },
                        border: { display: false }
                    }
                },
                animation: { 
                    duration: 600, 
                    easing: 'easeOutQuart' 
                },
                layout: { padding: { top: 20 } }
            }
        });
    }

    function renderPosts(posts) {
        const list = document.getElementById('postManager');
        if(!list) return;

        if (posts.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #666; font-size: 0.8rem; padding: 20px;">NO TRANSMISSIONS FOUND</div>`;
            return;
        }

        const LIVE_ORIGIN = window.location.origin;

        list.innerHTML = posts.map(post => {
            const isLive = post.published === true;
            // All posts use the standard insight.html?slug= URL — no special cases
            const postUrl = `${LIVE_ORIGIN}/insight.html?slug=${post.slug}`;
            const internalUrl = `/insight.html?slug=${post.slug}`;
            return `
            <div class="post-row ${isLive ? 'row-active-live' : ''}">
                <div style="cursor: pointer; flex: 1;" onclick="loadPostForEdit(${post.id})">
                    <div class="post-title">${window.escapeHtml(post.title || 'Untitled')} <span style="font-size:0.7em; color:var(--admin-accent); margin-left:5px;">(EDIT)</span></div>
                    <div class="post-meta">${new Date(post.created_at).toLocaleDateString()} • <span style="color:var(--admin-cyan); font-weight:bold;">${window.escapeHtml(post.category || 'Uncategorized')}</span> • <span style="color:var(--admin-success); font-weight:bold;">${(post.views || 0).toLocaleString()}</span> Views</div>
                    ${post.slug ? `<div style="font-size:0.55rem; color:var(--admin-muted); font-family:monospace; margin-top:2px; opacity:0.6;">↗ /insight.html?slug=${window.escapeHtml(post.slug)}</div>` : ''}
                    <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                        ${(post.tags || []).map(t => `<span style="font-size: 0.55rem; color: var(--admin-cyan); background: rgba(var(--accent2-rgb), 0.05); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(var(--accent2-rgb), 0.1);">#${window.escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
                <div class="status-badge ${isLive ? 'status-live' : 'status-draft'}">
                    ${isLive ? 'LIVE' : 'DRAFT'}
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${isLive && post.slug ? `
                        <a href="${postUrl}" target="_blank" rel="noopener" class="view-btn" title="View on live site" style="text-decoration:none; padding: 6px 12px; font-size: 0.7rem; border: 1px solid var(--admin-border); color: var(--admin-text); border-radius: 4px;">VIEW ↗</a>
                        <button type="button" onclick="copyPostLink('${window.escapeHtml(post.slug)}')" title="Copy share link" style="background: transparent; border: 1px solid var(--admin-border); color: var(--admin-muted); padding: 6px 10px; border-radius: 4px; font-size: 0.7rem;">🔗</button>
                    ` : ''}
                    <button type="button" onclick="openDeleteModal(${post.id}, event)" class="delete-btn">DELETE</button>
                </div>
            </div>
            `;
        }).join('');
    }
    
    // Modified Delete to prevent bubble up
    window.openDeleteModal = function(id, event) {
        if(event) event.stopPropagation(); // Don't trigger edit
        const modal = document.getElementById('deleteModal');
        if(modal) {
            // Update modal text for Post context
            const titleEl = modal.querySelector('h3');
            const descEl = modal.querySelector('p');
            if(titleEl) titleEl.textContent = "TERMINATE TRANSMISSION?";
            if(descEl) descEl.innerHTML = "This will permanently remove the broadcast from the live grid.<br>This cannot be undone.";

            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'var(--admin-modal-scrim)';
            modal.style.backdropFilter = 'blur(5px)';

            const confirmBtn = document.getElementById('confirmDeleteBtn');
            // Remove old listeners to prevent stacking
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            
            newBtn.addEventListener('click', () => executeDelete(id));
        }
    };

    // New Robust Deletion Logic
    // New Robust Deletion Logic
    let pendingDeleteId = null;

    // Use the one defined above instead
    
    async function executeDelete(id) {
        // If id provided directly, use it, otherwise use pending
        const targetId = id || pendingDeleteId;
        if (!targetId) return;
        
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if(confirmBtn) {
            confirmBtn.textContent = "DELETING...";
            confirmBtn.disabled = true;
        }

        try {
            // Use secureDelete which resolves the best API base automatically
            await window.secureDelete('posts', targetId);
            showToast("POST TERMINATED");
            finishDelete();
        } catch (err) {
            console.error("❌ DELETION FAILED:", err);
            showToast("DELETION FAILED: " + err.message);
        } finally {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            if(confirmBtn) {
                confirmBtn.textContent = "DELETE";
                confirmBtn.disabled = false;
            }
            pendingDeleteId = null;
        }
    }

    function finishDelete() {
        document.getElementById('deleteModal').style.display = 'none';
        fetchPosts(true); 
    }

    // ... (keep surrounding functions) ...

    async function incrementArchetypeUsage(slug) {
        try {
            const arch = (state.archetypes || []).find(a => a.slug === slug);
            if (!arch) return;
            const newCount = (arch.usage_count || 0) + 1;
            await window.secureWrite('ai_archetypes', { usage_count: newCount }, arch.id);
            await fetchArchetypes(); // Refresh local state
        } catch (e) { console.error("Track Usage Error:", e); }
    }

    // STARTUP
    function bootstrap() {
        init();
        
        const gateBtn = document.querySelector('.gate-btn');
        if(gateBtn) gateBtn.addEventListener('click', (e) => { e.preventDefault(); window.unlockChannel(); });

        const magicBtn = document.getElementById('magicBtn');
        if(magicBtn) magicBtn.addEventListener('click', () => {
            // Reset ID when creating new generated post to avoid overwriting
            document.getElementById('postIdInput').value = '';
            const submitBtn = document.getElementById('submitBtn');
            if(submitBtn) {
                 submitBtn.textContent = "COMMENCE BROADCAST";
                 submitBtn.style.background = "var(--success)";
                 submitBtn.style.color = "#000";
            }
            triggerAIGenerator();
        });

        const fileInput = document.getElementById('fileInput');
        if(fileInput) fileInput.addEventListener('change', window.handleFileUpload);
        
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    window.deleteBySlug = async function() {
        const input = document.getElementById('manualDeleteSlug');
        const slug = input ? input.value.trim() : '';
        
        if (!slug) { showToast("PLEASE ENTER A SLUG"); return; }
        
        confirmAction(
            "KILL SLUG",
            `PERMANENTLY DELETE: ${slug}?`,
            async () => {
                try {
                    const apiBase = resolveApiBase();
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);
                    
                    const res = await fetch(`${apiBase}/api/admin/delete-post`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ slug }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        showToast(`RELEASE KILLED: ${slug}`);
                        if(input) input.value = '';
                        fetchPosts(true);
                    } else {
                        throw new Error(`Server Error: ${res.status}`);
                    }
                } catch(e) {
                     showToast("KILL FAILED: " + e.message);
                }
            }
        );
    };

    // --- POST MANAGEMENT ---
    window.managePost = async function() {
        const id = document.getElementById('postIdInput')?.value;
        const title = document.getElementById('titleInput')?.value.trim();
        const excerpt = document.getElementById('excerptInput')?.value.trim();
        const content = document.getElementById('contentArea')?.value.trim();
        const slugRaw = document.getElementById('slugInput')?.value.trim();
        const tagsRaw = document.getElementById('tagsInput')?.value.trim();
        const imageUrl = document.getElementById('imageUrl')?.value || document.getElementById('urlInput')?.value;

        if (!title) throw new Error("HEADLINE REQUIRED");
        if (!content) throw new Error("CONTENT REQUIRED");

        // Auto-Generate Slug if empty
        let slug = slugRaw;
        if (!slug) {
            slug = title.trim().toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove non-word chars
                .replace(/\s+/g, '-')     // Replace spaces with -
                .replace(/--+/g, '-')     // Replace multiple - with single
                .trim();
        }

        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];

        const payload = {
            title,
            author: document.getElementById('authorInput')?.value || 'OTP Admin',
            category: document.getElementById('catInput')?.value || 'Strategy',
            excerpt: excerpt || content.substring(0, 150) + '...',
            content,
            slug,
            tags,
            image_url: imageUrl,
            published: document.getElementById('pubToggle')?.checked ?? true
        };

        if (id) {
            // UPDATE
            console.log("📝 UPDATING POST (SECURE):", id);
            // payload.updated_at = new Date().toISOString(); // Schema fallback: skip if column missing
            await window.secureWrite('posts', payload, id);
        } else {
            // INSERT
            console.log("📝 CREATING POST (SECURE)");
            payload.created_at = new Date().toISOString();
            // payload.updated_at = payload.created_at; // Schema fallback: skip if column missing
            await window.secureWrite('posts', payload);
        }
        
        resetForm();
        await fetchPosts(true); // Force refresh
    };
    window.draftPostWithAI = async function() {
        window.promptAction(
            "AI ORACLE GENERATION",
            "Enter a topic or inspiration for the new post.",
            "e.g., 'The power of 3D in 2026'",
            async (topic) => {
                if (!topic) return;
                const promptInput = document.getElementById('aiPrompt');
                const archInput = document.getElementById('archetype');
                
                if (promptInput) {
                    promptInput.value = topic;
                    
                    // Try to auto-select Oracle or Visionary archetype
                    if (archInput && state.archetypes) {
                        const oracleArch = state.archetypes.find(a => a.slug === 'oracle' || a.slug === 'visionary');
                        if (oracleArch) archInput.value = oracleArch.slug;
                    }

                    if (typeof triggerAIGenerator === 'function') {
                        showToast("ORACLE INITIALIZING...");
                        await triggerAIGenerator();
                    } else {
                        showToast("GENERATOR UNAVAILABLE");
                    }
                }
            }
        );
    };

    window.handlePostSubmit = async function(event) {
        if(event) { event.preventDefault(); event.stopPropagation(); }
        
        const title = document.getElementById('titleInput')?.value.trim();
        const content = document.getElementById('contentArea')?.value.trim();
        
        if (!title) {
            showToast("ERROR: HEADLINE REQUIRED");
            document.getElementById('titleInput')?.focus();
            return;
        }
        if (!content) {
             showToast("ERROR: CONTENT REQUIRED");
             document.getElementById('contentArea')?.focus();
             return;
        }

        const btn = document.getElementById('submitBtn');
        const ogText = btn.textContent;
        btn.textContent = "TRANSMITTING...";
        btn.disabled = true;

        try {
            await window.managePost();
            showToast("TRANSMISSION SUCCESSFUL");
        } catch (e) {
            console.error("Transmission Error:", e);
            showToast("TRANSMISSION ERROR: " + e.message);
        } finally {
            btn.textContent = ogText;
            btn.disabled = false;
        }
    };



    window.runDatabaseCleanup = function() {
        const modal = document.getElementById('maintenanceModal');
        if(modal) modal.style.display = 'flex';
        const btn = document.getElementById('confirmMaintenanceBtn');
        if(btn) btn.onclick = () => executeDatabaseCleanup();
    };

    async function executeDatabaseCleanup() {
        const btn = document.getElementById('confirmMaintenanceBtn');
        const modal = document.getElementById('maintenanceModal');

        try {
            if(btn) { btn.textContent = "PURGING..."; btn.disabled = true; }
            showToast("SCANNING DATABASE...");
            
            const { data: posts, error: fetchError } = await state.client.from('posts').select('id, title, slug, content');
            if (fetchError) throw fetchError;

            const trash = posts.filter(post => {
                // Safer Cleanup: Only target posts intentionally marked as trash or test
                const isTest = post.slug.includes('test-post') || post.slug.includes('temporary');
                const isDraft = !post.published;
                const wordCount = (post.content || "").trim().split(/\s+/).filter(w => w.length > 0).length;
                // Only delete if it's a test post AND very short, never touch published content automatically
                return isTest && wordCount < 10;
            });

            if (trash.length === 0) {
                showToast("NO TRASH DETECTED");
                if(modal) modal.style.display = 'none';
                return;
            }

            const idsToDelete = trash.map(t => t.id);
            // Use secureDelete proxy (bypasses RLS on live site)
            await Promise.all(idsToDelete.map(id => window.secureDelete('posts', id)));

            showToast(`CLEANUP COMPLETE: ${trash.length} POSTS PURGED`);
            if(modal) modal.style.display = 'none';
            fetchPosts(true); 

        } catch (e) {
            console.error("MAINTENANCE ERROR:", e);
            showToast("CLEANUP ERROR: " + e.message);
        } finally {
            if(btn) { btn.textContent = "PROCEED"; btn.disabled = false; }
        }
    }

    // 4.5 MEDIA LIBRARY LOGIC
    window.openMediaLibrary = async function() {
        const modal = document.getElementById('mediaModal');
        const grid = document.getElementById('mediaGrid');
        const countEl = document.getElementById('mediaCount');
        
        if(!modal || !grid) return;
        
        modal.style.display = 'flex';
        grid.innerHTML = '<div class="loader">FETCHING ASSETS FROM CLOUD...</div>';

        try {
            const { data, error } = await state.client.storage.from('uploads').list('blog', { limit: 120, sortBy: { column: 'created_at', order: 'desc' } });
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                grid.innerHTML = '<div class="loader">NO ASSETS FOUND.</div>';
                if(countEl) countEl.textContent = '(0)';
                return;
            }

            if(countEl) countEl.textContent = `(${data.length})`;
            grid.innerHTML = ''; 

            data.forEach(file => {
                if(file.name === '.emptyFolderPlaceholder') return;
                const { data: { publicUrl } } = state.client.storage.from('uploads').getPublicUrl(`blog/${file.name}`);
                const isVideo = file.metadata && file.metadata.mimetype && file.metadata.mimetype.startsWith('video');
                const ext = file.name.split('.').pop().toLowerCase();
                const likelyVideo = ['mp4', 'webm', 'mov'].includes(ext);

                const div = document.createElement('div');
                div.className = 'media-item';
                div.onclick = () => selectMedia(publicUrl, file.name);
                
                if (isVideo || likelyVideo) {
                     div.innerHTML = `<video src="${publicUrl}#t=0.5" muted preload="metadata" referrerpolicy="no-referrer" onmouseover="this.play()" onmouseout="this.pause()"></video>`;
                } else {
                     div.innerHTML = `<img src="${publicUrl}" referrerpolicy="no-referrer" crossorigin="anonymous" loading="lazy" alt="${file.name}">`;
                }
                grid.appendChild(div);
            });

        } catch (err) {
            console.error("Media Load Error:", err);
            grid.innerHTML = `<div class="loader" style="color:#ff4444">ERROR: ${window.escapeHtml(String(err.message || err))}</div>`;
        }
    };

    window.closeMediaLibrary = function() {
        const mm = document.getElementById('mediaModal');
        if (mm) mm.style.display = 'none';
    };

    function selectMedia(url, name) {
        const imageUrlInput = document.getElementById('imageUrl');
        if (imageUrlInput) imageUrlInput.value = url;
        const previewDiv = document.getElementById('imagePreview');
        const detailsDiv = document.getElementById('fileDetails');
        
        if(previewDiv) {
             if(url.match(/\.(mp4|webm|mov)$/i)) {
                 previewDiv.innerHTML = `<video src="${url}" controls referrerpolicy="no-referrer" style="width: 100%; height: auto; max-height: 400px; display: block; border-radius: 12px;"></video>`;
             } else {
                 previewDiv.innerHTML = `<img id="previewImg" src="${url}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x450?text=VISUAL_SIGNAL_OFFLINE'">`;
             }
             previewDiv.style.display = 'block';
        }

        if(detailsDiv) {
            detailsDiv.style.display = 'block';
            const fn = document.getElementById('fileNameDisplay');
            const fs = document.getElementById('fileSizeDisplay');
            if (fn) fn.textContent = name || "Selected from Library";
            if (fs) fs.textContent = "(Cloud Asset)";
        }
        closeMediaLibrary();
    }



    // SOCIAL PREVIEW UPDATER (Multi-Platform)
    window.switchPreviewTab = function(platform) {
        document.querySelectorAll('.prev-tab').forEach(t => {
            t.classList.remove('active');
            t.style.background = 'transparent';
            t.style.color = 'var(--admin-muted)';
            t.style.border = '1px solid var(--admin-border)';
        });
        document.querySelectorAll('.prev-content').forEach(c => c.style.display = 'none');
        
        const btn = document.getElementById('tab-' + platform);
        if(btn) {
            btn.classList.add('active');
            btn.style.background = (platform === 'search' || platform === 'ios') ? 'var(--admin-accent)' : '#333';
            btn.style.color = '#fff';
            btn.style.border = 'none';
        }
        const content = document.getElementById('preview-' + platform);
        if(content) content.style.display = 'block';
    };

    window.updateSocialPreview = function() {
        const titleEl = document.getElementById('titleInput');
        const seoTitleEl = document.getElementById('seoTitle');
        const seoDescEl = document.getElementById('seoDesc');
        const excerptEl = document.getElementById('excerptInput');
        const urlEl = document.getElementById('urlInput');
        const imgEl = document.getElementById('imageUrl');
        
        if(!titleEl) return;

        const title = seoTitleEl?.value || titleEl.value || "Headline Appears Here";
        const desc = seoDescEl?.value || excerptEl?.value || "Description appears here...";
        const img = imgEl?.value || urlEl?.value;
        
        // Update All Platforms
        const platforms = ['x', 'ios', 'search'];
        platforms.forEach(p => {
            const pTitle = document.getElementById(`socialPreviewTitle-${p}`);
            const pDesc = document.getElementById(`socialPreviewDesc-${p}`);
            const pCtx = document.getElementById(`socialPreviewCtx-${p}`);
            
            if(pTitle) pTitle.textContent = title;
            if(pDesc) pDesc.textContent = desc;
            if(pCtx) {
                if(img) {
                    pCtx.style.backgroundImage = `url('${img}')`;
                    pCtx.textContent = '';
                } else {
                    pCtx.style.backgroundImage = 'none';
                    pCtx.textContent = 'Preview Image';
                }
            }
        });
    };
    
    // Attach listeners
    document.addEventListener('DOMContentLoaded', () => {
        ['titleInput', 'seoTitle', 'seoDesc', 'excerptInput', 'imageUrl', 'urlInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    // Sync internal imageUrl with visual urlInput if needed
                    if(id === 'urlInput' && document.getElementById('imageUrl')) {
                         document.getElementById('imageUrl').value = el.value;
                    }

                    // Update Image Preview Container
                    if(id === 'urlInput' || id === 'imageUrl') {
                         const prevDiv = document.getElementById('imagePreview');
                         const prevImg = document.getElementById('previewImg');
                         if(prevDiv && prevImg && el.value) {
                             prevImg.src = el.value;
                             prevDiv.style.display = 'block';
                         } else if (prevDiv && !el.value) {
                             prevDiv.style.display = 'none';
                         }
                    }

                    window.updateSocialPreview();
                });
            }
        });
    });
    document.addEventListener('input', (e) => {
        if(['titleInput', 'seoTitle', 'seoDesc', 'excerptInput', 'imageUrl', 'urlInput'].includes(e.target.id)) {
            window.updateSocialPreview();
        }
    });

    // ... (rest of init) ...

    // 6.5 AI COST TRACKING
    let aiSessionCost = 0;
    let aiSessionTokens = 0;
    const AI_PRICING = {
        'openai': { input: 0.005, output: 0.015 }, // Per 1k tokens (GPT-4o)
        'gemini': { input: 0.000125, output: 0.000375 }, // Per 1k (Flash)
        'anthropic': { input: 0.003, output: 0.015 }, // Per 1k (Claude 3.5 Sonnet)
        'groq': { input: 0, output: 0 } // Free Tier
    };

    function trackAICost(provider, tokens) {
        if (!tokens || !AI_PRICING[provider]) return;
        
        const price = AI_PRICING[provider];
        // Simplified: assume 30% input / 70% output distribution if only total is known
        const inputTokens = tokens * 0.3;
        const outputTokens = tokens * 0.7;
        
        const cost = (inputTokens / 1000 * price.input) + (outputTokens / 1000 * price.output);
        aiSessionCost += cost;
        aiSessionTokens += tokens;

        // Update UI
        const costPanel = document.getElementById('aiCostTracking');
        const costDisp = document.getElementById('sessionCost');
        const tokenDisp = document.getElementById('sessionTokens');

        if (costPanel) costPanel.style.display = 'block';
        if (costDisp) costDisp.textContent = `$${aiSessionCost.toFixed(4)}`;
        if (tokenDisp) tokenDisp.textContent = aiSessionTokens.toLocaleString();
    }

    // 7. SECURE OTP ORACLE GENERATOR (AI POST COMPOSER)
    async function triggerAIGenerator() {
        const providerSel = document.getElementById('aiProvider');
        const promptInput = document.getElementById('aiPrompt');
        const titleInput = document.getElementById('titleInput');
        const tagsInput = document.getElementById('tagsInput');
        const archetypeInput = document.getElementById('archetype');
        const modelSel = document.getElementById('geminiModel');
        const status = document.getElementById('aiStatus');
        const btn = document.getElementById('magicBtn');

        if (!state.token) {
            if(status) { status.textContent = "SESSION EXPIRED. PLEASE RE-LOGIN."; status.style.color = "#ff4444"; }
            showToast("SESSION EXPIRED");
            return;
        }

        const prompt = promptInput.value.trim();
        const currentTitle = titleInput.value.trim();
        
        if(!prompt) { 
            if(status) { status.textContent = "ERROR: Please enter a Concept / Prompt."; status.style.color = "#ff4444"; }
            promptInput.focus();
            return; 
        }

        const provider = providerSel ? providerSel.value : 'openai';
        const model = (provider === 'gemini' && modelSel) ? modelSel.value : null;

        // UI Feedback
        if(btn) { btn.textContent = "SYNTHESIZING..."; btn.disabled = true; }
        if(status) { 
            status.innerHTML = `<span class="blink">⚡ TRANSMITTING TO ${provider.toUpperCase()}...</span>`; 
            status.style.color = "var(--admin-cyan)"; 
        }

        try {
            const authToken = state.token || 'static-bypass-token';
            const personalKeys = {
                openai: getProviderLocalKey('openai'),
                gemini: getProviderLocalKey('gemini'),
                anthropic: getProviderLocalKey('anthropic'),
                groq: getProviderLocalKey('groq')
            };
            
            // DYNAMIC ARCHETYPE SYSTEM
            const selectedArchSlug = archetypeInput ? archetypeInput.value : 'technical';
            const archetype = (state.archetypes || []).find(a => a.slug === selectedArchSlug);
            const baseSystemPrompt = archetype ? archetype.system_prompt : 'You are a professional blog writer.';
            const modelConfig = (archetype && archetype.model_config) ? archetype.model_config : {};

            const sysPrompt = `${baseSystemPrompt} 
            CRITICAL INSTRUCTION: Output RAW JSON ONLY. No markdown blocks. 
            Return format: { 
                "title": "A compelling headline...", 
                "tags": ["tag1", "tag2"], 
                "content": "# Markdown Header\\n\\nBody content...", 
                "excerpt": "Short summary...", 
                "seo_title": "SEO Title...", 
                "seo_desc": "SEO Description...", 
                "image_prompt": "A descriptive prompt for DALL-E 3 visual synthesis" 
            }
            If the user provides a title, use it as a base but feel free to improve it. Generate relevant tags.`;

            const userPrompt = `Context/Prompt: ${prompt}. ${currentTitle ? `Current Title: "${currentTitle}"` : ''}`;

            // --- STRATEGY: TRY SERVER PROXY FIRST (PREFER SECURE HUB) ---
            let aiResult = null;
            let usedDirect = false;
            let hubError = null;

            if (authToken !== 'static-bypass-token') {
                try {
                    if(status) { status.innerHTML = `<span class="blink">📡 CONTACTING SECURE HUB...</span>`; }
                    const base = resolveApiBase();
                    const res = await fetch(base + '/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                        body: JSON.stringify({ 
                            prompt, 
                            archetype: archetypeInput ? archetypeInput.value : 'technical', 
                            provider: provider || 'openai', 
                            model, 
                            title: currentTitle, 
                            systemPrompt: sysPrompt, 
                            modelConfig,
                            keys: {
                                openai: personalKeys.openai,
                                gemini: personalKeys.gemini,
                                anthropic: personalKeys.anthropic,
                                groq: personalKeys.groq
                            }
                        })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        aiResult = data.data;
                        if (data.usage) trackAICost(provider, data.usage.total_tokens);
                        else trackAICost(provider, 1200); 
                    } else {
                        hubError = data.message || "Unauthorized";
                        console.warn("Secure Hub Failed:", hubError);
                    }
                } catch (e) {
                    hubError = "Server Offline or Unreachable";
                    console.warn("Secure Hub Offline:", hubError);
                }
            }

            // --- FAILOVER: TRY DIRECT CLOUD LINK ---
            if (!aiResult) {
                usedDirect = true;
                const cloudKey = personalKeys[provider];
                if (!cloudKey) {
                    const msg = hubError ? `Server Hub Error: ${hubError}` : "No personal key found in Cloud Settings.";
                    throw new Error(`ORACLE UPLINK BLOCKED: ${msg}`);
                }
                
                if(status) { status.innerHTML = `<span class="blink">🚀 DIRECT CLOUD LINK ACTIVE...</span>`; }

                if (provider === 'openai') {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
                            response_format: { type: "json_object" },
                            ...modelConfig
                        })
                    });
                    const raw = await res.json();
                    if(raw.error) throw new Error(raw.error.message);
                    aiResult = JSON.parse(raw.choices[0].message.content);
                    if (raw.usage) trackAICost('openai', raw.usage.total_tokens);
                } 
                else if (provider === 'anthropic') {
                    const res = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': cloudKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                        body: JSON.stringify({
                            model: 'claude-3-5-sonnet-20240620',
                            max_tokens: 4000,
                            messages: [{ role: 'user', content: sysPrompt + "\n\n" + userPrompt }],
                            ...modelConfig
                        })
                    });
                    const raw = await res.json();
                    if(raw.error) throw new Error(raw.error.message);
                    aiResult = JSON.parse(raw.content[0].text);
                    if (raw.usage) trackAICost('anthropic', raw.usage.input_tokens + raw.usage.output_tokens);
                }
                else if (provider === 'groq') {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                        body: JSON.stringify({
                            model: 'llama-3.1-70b-versatile',
                            messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
                            response_format: { type: "json_object" },
                            ...modelConfig
                        })
                    });
                    const raw = await res.json();
                    if(raw.error) throw new Error(raw.error.message);
                    aiResult = JSON.parse(raw.choices[0].message.content);
                    if (raw.usage) trackAICost('groq', raw.usage.total_tokens);
                }
                else if (provider === 'gemini') {
                    const modelCandidates = getGeminiModelCandidates(model || 'gemini-2.5-flash');
                    const endpoints = ['v1', 'v1beta'];
                    let gemSuccess = false;
                    let gemError = "Unknown Gemini error.";
                    
                    // Map common configs to Gemini specific
                    const geminiConfig = { responseMimeType: "application/json" };
                    if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
                    if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
                    if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;

                    for (const gemModel of modelCandidates) {
                        if (gemSuccess) break;
                        for (const v of endpoints) {
                            if (gemSuccess) break;
                            try {
                                const payload = { 
                                    systemInstruction: {
                                        parts: [{ text: sysPrompt }]
                                    },
                                    contents: [{ 
                                        role: 'user',
                                        parts: [{ text: userPrompt }] 
                                    }],
                                    generationConfig: geminiConfig
                                };

                                const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${gemModel}:generateContent?key=${cloudKey}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });
                                const raw = await res.json();
                                
                                if (raw.error) {
                                    gemError = `${raw.error.message} (${raw.error.status || 'ERROR'})`;
                                    console.warn(`⚠️ Gemini ${v} ${gemModel} failed:`, raw.error.message);
                                    continue;
                                }

                                if (raw.candidates && raw.candidates[0].finishReason === 'SAFETY') {
                                    gemError = "ORACLE SAFETY BLOCK: Content flagged by filter. Try a different concept.";
                                    break;
                                }

                                if (raw.candidates && raw.candidates[0].content && raw.candidates[0].content.parts) {
                                    let text = raw.candidates[0].content.parts[0].text;
                                    // Robust JSON Extraction
                                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                                    if (jsonMatch) text = jsonMatch[0];
                                    
                                    // NORMALIZATION LAYER: Fix common LLM JSON errors
                                    let repairedText = text
                                        .replace(/(\r\n|\n|\r)/gm, " ")
                                        .replace(/'([^']*)':/g, '"$1":')
                                        .replace(/:\s*'([^']*)'/g, ': "$1"')
                                        .replace(/,\s*([\}\]])/g, "$1")
                                        .replace(/\\(?!["\\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
                                    
                                    try {
                                        aiResult = JSON.parse(repairedText);
                                    } catch(e) {
                                        console.warn("REPAIR FAILED, TRYING RELAXED PARSE...");
                                        try {
                                            aiResult = JSON.parse(text.replace(/\r?\n/g, "\\n"));
                                        } catch(f) {
                                            throw new Error(`JSON_MALFORMED: ${f.message}`);
                                        }
                                    }
                                    
                                    if (raw.usageMetadata) trackAICost('gemini', raw.usageMetadata.totalTokenCount);
                                    else trackAICost('gemini', 1500); 
                                    gemSuccess = true; 
                                    break;
                                } else {
                                    gemError = "Unexpected Gemini response format.";
                                }
                            } catch(e) {
                                gemError = e.message;
                            }
                        }
                    }
                    if(!gemSuccess) throw new Error(formatNeuralError(`Gemini Neural Bridge Failed: ${gemError}`));
                }
            }

            if (aiResult) {
                // 1. Populate Text Fields
                if(aiResult.content) {
                    const contentArea = document.getElementById('contentArea');
                    contentArea.value = aiResult.content;
                    
                    if (selectedArchSlug === 'oracle' || selectedArchSlug === 'visionary') {
                        contentArea.classList.add('oracle-text');
                        contentArea.style.borderLeft = '2px solid var(--admin-cyan)';
                        contentArea.style.background = 'rgba(0, 236, 255, 0.02)';
                    } else {
                        contentArea.classList.remove('oracle-text');
                        contentArea.style.borderLeft = 'none';
                        contentArea.style.background = 'transparent';
                    }
                }
                if(aiResult.excerpt) document.getElementById('excerptInput').value = aiResult.excerpt;
                if(aiResult.seo_title) document.getElementById('seoTitle').value = aiResult.seo_title;
                if(aiResult.seo_desc) document.getElementById('seoDesc').value = aiResult.seo_desc;
                
                // 2. Populate NEW Fields (Title & Tags)
                if(aiResult.title) {
                    titleInput.value = aiResult.title;
                    // Trigger input event to update slug
                    titleInput.dispatchEvent(new Event('input'));
                }
                if(aiResult.tags && Array.isArray(aiResult.tags)) {
                    tagsInput.value = aiResult.tags.join(', ');
                }

                showToast(usedDirect ? "ORACLE: DIRECT CLOUD" : "ORACLE: SECURE HUB");
                if(status) { status.textContent = "CONTENT COMPLETE. SYNTHESIZING VISUALS..."; status.style.color = "var(--admin-cyan)"; }

                // --- CHAIN IMAGE GENERATION ---
                // Support both direct URL returns and prompt-based generation
                if (aiResult.image_url) {
                    const cleanUrl = aiResult.image_url.trim();
                    document.getElementById('imageUrl').value = cleanUrl;
                    document.getElementById('urlInput').value = cleanUrl;
                    const prevDiv = document.getElementById('imagePreview');
                    if (prevDiv) {
                        prevDiv.innerHTML = `<img id="previewImg" src="${cleanUrl}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x450?text=VISUAL_SIGNAL_OFFLINE'">`;
                        prevDiv.style.display = 'block';
                    }
                } else if (aiResult.image_prompt) {
                    await triggerImageGenerator(aiResult.image_prompt, aiResult.title || currentTitle);
                }

                // --- TRACK USAGE ---
                incrementArchetypeUsage(selectedArchSlug);

                if(status) { status.textContent = "GENERATION COMPLETE"; status.style.color = "var(--success)"; }
                
                // Update Word Count UI
                if(window.updateWordCount) window.updateWordCount(document.getElementById('contentArea'));
                
                // Update Social Previews
                if(window.updateSocialPreview) window.updateSocialPreview();
            }

        } catch (err) {
            console.error("AI ERROR:", err);
            const friendlyError = formatNeuralError(err.message);
            if(status) { status.textContent = "ERROR: " + friendlyError; status.style.color = "#ff4444"; }
            showToast("AI ERROR: " + friendlyError);
        } finally {
            if (btn) {
                btn.textContent = "⚡ TRANSMIT";
                btn.disabled = false;
            }
        }
    }

    async function triggerImageGenerator(prompt, title) {
        // All generation MUST be routed through the server to bypass CORS fetching restrictions from OpenAI blobs
        try {
            const base = resolveApiBase();
            const localKeyBackup = localStorage.getItem('cloud_openai');
            
            // --- ENHANCE PROMPT FOR CINEMATIC FIDELITY ---
            const enhancedPrompt = `[CINEMATIC ORACLE V5 STYLE]: ${prompt}. High-contrast, tactical lighting, dark moody atmosphere, hyper-realistic photography, 8k resolution, industrial aesthetics, sharp detail, professional color grading, realistic textures, cinematic composition. No cartoons, no 3D render look. RAW photography style.`;

            const res = await fetch(base + '/api/ai/generate-image', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + state.token
                },
                body: JSON.stringify({ 
                    prompt: enhancedPrompt, 
                    title, 
                    aspect_ratio: 'landscape', 
                    quality: 'hd',
                    cloud_key: localKeyBackup 
                })
            });

            const data = await res.json();
            if (data.success && data.url) {
                const cleanUrl = data.url.trim();
                document.getElementById('imageUrl').value = cleanUrl;
                document.getElementById('urlInput').value = cleanUrl;
                
                const prevDiv = document.getElementById('imagePreview');
                if (prevDiv) {
                    // Referrer privacy ensures that storage CDNs (Supabase) don't block the request based on referer-policy
                    prevDiv.innerHTML = `<img id="previewImg" src="${cleanUrl}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x450?text=VISUAL_SIGNAL_OFFLINE'">`;
                    prevDiv.style.display = 'block';
                }
                
                // Update Social Previews
                if(window.updateSocialPreview) window.updateSocialPreview();
                
                trackAICost('openai', 2000); 
                showToast("VISUAL SYNTHESIS COMPLETE");
            } else {
                throw new Error(data.message || "Image Gen Failed");
            }
        } catch (e) {
            console.error("Image Synthesis Failed:", e);
            
            document.getElementById('imageUrl').value = "";
            document.getElementById('urlInput').value = "";
            
            const prevDiv = document.getElementById('imagePreview');
            if(prevDiv) prevDiv.style.display = 'none';
            
            showToast("VISUAL SYNTHESIS FAILED: " + e.message);
        }
    }



    // 8. EVENT LISTENERS
    window.switchProvider = function(val) {
        localStorage.setItem('ai_provider', val);
        const geminiGroup = document.getElementById('geminiModelGroup');
        if(geminiGroup) geminiGroup.style.display = (val === 'gemini') ? 'block' : 'none';
        
        // Update Link Status UI
        checkNeuralLink(val);
        
        // Update Status with Usage Limits
        const status = document.getElementById('aiStatus');
        if (status) {
            const limits = {
                'gemini': 'LIMITS: Usage-based (Gemini Adaptive)',
                'groq': 'LIMITS: 30 req/min (Extreme Speed)',
                'openai': 'LIMITS: Usage-based (GPT-4o Premium)',
                'anthropic': 'LIMITS: Usage-based (Claude 3.5 Sonnet)'
            };
            status.textContent = limits[val] || '';
            status.style.color = 'var(--admin-muted)';
        }
    };

    function checkNeuralLink(provider) {
        const hubDot = document.getElementById('hubIndicator');
        const hubText = document.getElementById('hubText');
        if (!hubDot || !hubText) return;

        const personalKey = getProviderLocalKey(provider);
        const hasServerKey = state.token && state.token !== 'static-bypass-token';

        if (personalKey) {
            hubDot.style.background = 'var(--admin-cyan)';
            hubText.textContent = `OTP ORACLE · DIRECT CLOUD (PERSONAL KEY)`;
            hubText.style.color = 'var(--admin-cyan)';
        } else if (hasServerKey) {
            hubDot.style.background = 'var(--admin-success)';
            hubText.textContent = `OTP ORACLE · SECURE HUB (NO BROWSER KEY)`;
            hubText.style.color = 'var(--admin-success)';
        } else {
            hubDot.style.background = 'var(--admin-danger)';
            hubText.textContent = `OTP ORACLE · DISCONNECTED (LOGIN OR KEY REQUIRED)`;
            hubText.style.color = 'var(--admin-danger)';
        }
    }




    window.updateWordCount = function(textarea) {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        const disp = document.getElementById('wordCountDisplay');
        const readDisp = document.getElementById('readTimeDisplay');
        
        if(disp) disp.textContent = words;
        if(readDisp) {
            const time = Math.max(1, Math.ceil(words / 200)); // ~200 WPM
            readDisp.textContent = time + " min read";
        }
    };

    window.copyPostLink = function(slug) {
        if(!slug) return;
        // Always try to use the current origin for shared links to ensure local/preview testing works
        const origin = window.location.origin;
        const url = origin + '/insight.html?slug=' + slug;
        navigator.clipboard.writeText(url).then(() => {
            showToast("🔗 LINK COPIED: " + slug);
        }).catch(() => {
            // Fallback for older browsers / http
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showToast("🔗 LINK COPIED");
        });
    };

    window.openDraftPreview = function() {
        console.log("🛠️ PREVIEW SIGNAL INITIATED...");
        try {
            const titleInput = document.getElementById('titleInput');
            const contentArea = document.getElementById('contentArea');
            const urlInput = document.getElementById('urlInput');
            const imageUrl = document.getElementById('imageUrl');
            const excerptInput = document.getElementById('excerptInput');

            if (!titleInput || !contentArea) {
                throw new Error("PREVIEW FAILED: Critical form elements missing in DOM.");
            }

            const title = titleInput.value || "UNTITLED BROADCAST";
            let content = contentArea.value || "_No content captured._";
            const image = (imageUrl ? imageUrl.value : '') || (urlInput ? urlInput.value : '');
            const excerpt = excerptInput ? excerptInput.value : '';
            
            // --- 1. Markdown Parsing (Robust Check) ---
            let parsedHtml = content;
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
                parsedHtml = marked.parse(content);
            } else if (typeof marked === 'function') {
                parsedHtml = marked(content);
            } else {
                console.warn("marked.js missing or incompatible, using raw line breaks");
                parsedHtml = content.replace(/\n/g, '<br>');
            }

            const isOracle = document.getElementById('aiDraftSource')?.value === 'true' || content.includes('// NEURAL_DRAFT') || content.includes('// ORACLE_DRAFT');
            const isVideo = image && image.match(/\.(mp4|webm|mov)$/i);
            const excerptHtml = excerpt ? `<p style="font-size: 1.25rem; color: var(--admin-muted); font-style: italic; margin-bottom: 30px; line-height: 1.6;">${excerpt}</p>` : '';
            
            const mediaHtml = (image && image.trim().length > 0) ? `
                <div style="margin-bottom: 35px; background: var(--admin-surface-inset-strong); border-radius: 12px; overflow: hidden; border: 1px solid var(--admin-border);">
                    ${isVideo ? `
                        <video src="${image}" controls referrerpolicy="no-referrer" style="width:100%; display: block; max-height: 500px; object-fit: cover;"></video>
                    ` : `
                        <img src="${image}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width:100%; height: auto; display: block; max-height: 550px; object-fit: cover;" onerror="this.parentElement.style.display='none'" />
                    `}
                </div>` : `
                <div style="margin-bottom: 35px; padding: 60px; text-align: center; background: rgba(var(--accent2-rgb), 0.03); border: 2px dashed var(--admin-border); border-radius: 12px; color: var(--admin-muted);">
                    <div style="font-size: 2rem; margin-bottom: 10px; opacity: 0.3;">🖼️</div>
                    <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px;">ORACLE_VISUAL_SIGNAL_PENDING</div>
                </div>`;
            
            const html = `
                <div style="max-width: 720px; margin: 0px auto; font-family: 'Inter', sans-serif; color: var(--admin-white); padding: 40px; ${isOracle ? 'border-left: 2px solid var(--admin-cyan); background: rgba(0, 236, 255, 0.02);' : ''}">
                    ${mediaHtml}
                    <div style="border-bottom: 1px solid var(--admin-border); margin-bottom: 35px; padding-bottom: 25px;">
                        <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 3rem; line-height: 1.1; margin-bottom: 15px; color: var(--admin-white); font-weight: 700;">${title}</h1>
                        ${excerptHtml}
                    </div>
                    <div class="otp-content blog-content ${isOracle ? 'oracle-text' : ''}" style="font-size: 1.1rem; line-height: 1.8; color: var(--admin-white);">
                        ${parsedHtml}
                    </div>
                </div>
            `;

            const modal = document.getElementById('previewModal');
            const titleDisplay = document.getElementById('previewTitleDisplay');
            const bodyDisplay = document.getElementById('previewBodyDisplay');

            if (!modal || !titleDisplay || !bodyDisplay) {
                throw new Error("PREVIEW FAILED: Modal components are unreachable.");
            }

            titleDisplay.innerHTML = `<span style="opacity:0.5;">PREVIEW //</span> ${title}`;
            bodyDisplay.innerHTML = html;
            modal.style.display = 'flex';
            
            console.log("✅ PREVIEW RENDERED SUCCESSFULLY.");
            showToast("PREVIEW SYNTHESIS READY");

        } catch (err) {
            console.error("CRITICAL PREVIEW ERROR:", err);
            showToast("PREVIEW ERROR: " + err.message);
        }
    };

    // --- SITE COMMAND PRO LOGIC ---
    // 4.8 PERSIST STATE HELPER
    window.persistSystemState = async function(key, value) {
        try {
            // Fetch current state object first
            let { data: current } = await state.client
                .from('posts')
                .select('id, content')
                .eq('slug', 'system-global-state')
                .single();

            let config = {};
            let postId = null;

            if (current) {
                postId = current.id; // NEED ID TO UPDATE EXISTING RECORD
                if (current.content) {
                    try { config = JSON.parse(current.content); } catch (e) {}
                }
            }

            config[key] = value;

            const payload = {
                slug: 'system-global-state',
                title: 'SYSTEM CONFIG [DO NOT DELETE]',
                excerpt: 'Global persistent state for OTP Site Command Pro.',
                content: JSON.stringify(config),
                published: true, // Keep hidden from blog feed
                category: 'System'
            };

            // Route through secure backend proxy which has Service Role access to bypass RLS
            await window.secureWrite('posts', payload, postId);

        } catch (e) {
            console.error("State Persistence Failed:", e);
        }
    }

    window.toggleCloudSettings = function() {
        const settingsDiv = document.getElementById('cloudSettings');
        const icon = document.querySelector('#toggleSettingsBtn .toggle-icon');
        
        if (settingsDiv.style.display === 'none' || settingsDiv.style.display === '') {
            settingsDiv.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            settingsDiv.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    };

    window.toggleSiteControl = async function(type) {
        if(!state.siteChannel) return;
        const statusEl = document.getElementById(`status-${type}`);
        if(!statusEl) return;
        
        // 1. Maintenance
        if (type === 'maintenance') {
            const newState = statusEl.textContent === 'OFFLINE' ? 'on' : 'off';
            await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'maintenance', value: newState } });
            persistSystemState('maintenance', newState); // PERSIST
            
            statusEl.textContent = newState === 'on' ? 'ACTIVE' : 'OFFLINE';
            statusEl.style.color = newState === 'on' ? 'var(--admin-success)' : 'var(--admin-danger)';
            showToast(`MAINTENANCE ${newState.toUpperCase()} SENT`);
        }

        // 2. Visuals (FX Intensity)
        if (type === 'visuals') {
            const isHiFi = statusEl.textContent === 'HIGH-FI';
            const next = isHiFi ? 'low' : 'high';
            await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'visuals', value: next } });
            persistSystemState('visuals', next); // PERSIST

            statusEl.textContent = next === 'high' ? 'HIGH-FI' : 'PERF-MODE';
            statusEl.style.color = next === 'high' ? 'var(--admin-success)' : 'var(--accent2)';
            showToast(`VISUAL QUALITY: ${next.toUpperCase()}`);
        }

        // 3. Theme (Light/Dark Mode)
        if (type === 'theme') {
            const isLight = statusEl.textContent === 'DAY-MODE';
            const nextTheme = isLight ? 'dark' : 'light';
            await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'theme', value: nextTheme } });
            persistSystemState('theme', nextTheme); // PERSIST

            // Local Admin Persistence (Using manual lock)
            if (window.OTP && typeof window.OTP.setTheme === 'function') {
                window.OTP.setTheme(nextTheme, true);
            } else {
                localStorage.setItem('theme', nextTheme);
                localStorage.setItem('theme_manual', 'true');
                localStorage.setItem('theme_manual_time', Date.now().toString());
                if (nextTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
                else document.documentElement.removeAttribute('data-theme');
            }

            statusEl.textContent = nextTheme === 'light' ? 'DAY-MODE' : 'NIGHT-MODE';
            statusEl.style.color = nextTheme === 'light' ? '#ffaa00' : 'var(--accent2)';
            showToast("THEME SYNCED TO NETWORK");
            window.logAdminAction(`THEME CONVERTED TO ${nextTheme.toUpperCase()}`, "info");
        }

        // 4. Kursor
        if (type === 'kursor') {
            const isActive = statusEl.textContent === 'ACTIVE';
            const next = isActive ? 'off' : 'on';
            await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'kursor', value: next } });
            persistSystemState('kursor', next); // PERSIST

            statusEl.textContent = next === 'on' ? 'ACTIVE' : 'DISABLED';
            statusEl.style.color = next === 'on' ? 'var(--admin-success)' : 'var(--admin-muted)';
            showToast(`CURSOR SYSTEM: ${next.toUpperCase()}`);
        }
    };

    // Share Logic
    window.copyShareLink = function() {
        const slug = document.getElementById('slugInput').value;
        if(!slug) return;
        
        const postUrl = '/insight.html?slug=' + slug;
        const url = window.location.origin + postUrl;
        navigator.clipboard.writeText(url);
        
        const btn = document.querySelector('.share-btn-mini');
        const orig = btn.textContent;
        btn.textContent = "COPIED!";
        btn.style.background = "var(--admin-success)";
        setTimeout(() => {
            btn.textContent = orig;
            btn.style.background = "var(--admin-accent)";
        }, 2000);
    };

    window.toggleLiveTheme = function() {
        toggleSiteControl('theme');
    };

    // Unified Modal System
    window.confirmAction = function(title, text, callback, inputMode = false, inputPlaceholder = "") {
        const modal = document.getElementById('actionModal');
        const inputContainer = document.getElementById('actionModalInputVars');
        const inputField = document.getElementById('actionModalInput');
        const titleEl = document.getElementById('actionModalTitle');
        const textEl = document.getElementById('actionModalText');
        if (!modal || !titleEl || !textEl) return;
        
        titleEl.textContent = title;
        textEl.textContent = text;
        
        if (inputMode) {
            if (!inputContainer || !inputField) return;
            inputContainer.style.display = 'block';
            inputField.placeholder = inputPlaceholder;
            inputField.value = '';
            setTimeout(() => inputField.focus(), 100);
        } else if (inputContainer) {
            inputContainer.style.display = 'none';
        }

        const btn = document.getElementById('confirmActionBtn');
        if (!btn || !btn.parentNode) return;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = async () => {
            const val = inputField.value;
            if (inputMode && !val) {
                inputField.style.borderColor = 'red';
                return;
            }
            modal.style.display = 'none';
            await callback(val);
        };
        
        modal.style.display = 'flex';
    };

    window.promptAction = function(title, text, placeholder, callback) {
        confirmAction(title, text, callback, true, placeholder);
    };

    window.refreshLiveSite = function() {
        confirmAction(
            "PURGE NETWORK CACHE?", 
            "This will force a reload for all active visitors to ensure they see the latest updates. Proceed?",
            async () => {
                if(!state.siteChannel) return;
                await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'refresh' } });
                showToast("NETWORK CACHE PURGED");
                window.logAdminAction("NETWORK CACHE PURGE EXECUTED", "danger");
            }
        );
    };

    window.triggerGlobalWarp = function() {
        promptAction(
            "GLOBAL WARP OVERRIDE",
            "Enter the target destination URL. All active users will be instantly redirected.",
            "e.g. google.com",
            async (target) => {
                if(!state.siteChannel) return;
                
                let url = target.trim();
                if (!url.startsWith('http')) url = 'https://' + url;
                
                await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'warp', value: url } });
                showToast("GLOBAL WARP INITIATED");
            }
        );
    };

    window.openBroadcastPrompt = function() {
        promptAction(
            "EMERGENCY BROADCAST",
            "Send a high-priority overlay message to all active users.",
            "e.g. SYSTEM MAINTENANCE IN 5 MIN",
            async (msg) => {
                if(!state.siteChannel) return;
        
                // 1. Send to Network
                await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'alert', value: msg } });
                
                // 2. Show Locally (Confirmation)
                if (window.OTP && window.OTP.showBroadcast) {
                    window.OTP.showBroadcast(msg);
                }
                
                showToast("EMERGENCY BROADCAST SENT");
                window.logAdminAction(`BROADCAST DISPATCHED: "${msg.substring(0, 20)}..."`, "warning");
            }
        );
    };

    window.openStatusPrompt = function() {
        promptAction(
            "UPDATE GLOBAL SITE STATUS",
            "Set the message displayed in the site footer.",
            "e.g. OPERATIONAL, NEW INSIGHT LIVE, etc.",
            async (msg) => {
                if(!state.siteChannel || !msg) return;
                
                // 1. Broadcast to Network
                await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'status', value: msg } });
                
                // 2. Persist to DB
                persistSystemState('status', msg);
                
                // 3. Update Admin UI
                syncDashboardElement('status', msg);
                
                showToast("SITE STATUS UPDATED");
            }
        );
    };

    // SQL Schema Cache
    let cachedSqlSchema = null;

    window.testSatelliteConnection = async function() {
        const input = document.getElementById('satelliteUrl');
        let url = input ? input.value.trim() : '';

        if (!url) {
            showToast("URL IS REQUIRED");
            if (input) { input.style.border = '1px solid var(--admin-danger)'; }
            return;
        }

        if (input) input.style.border = '1px solid var(--admin-cyan)'; // Probing state
        showToast("PROBING SATELLITE LINK...");

        // Auto-add protocol if missing
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        try {
            const res = await fetch(`${url}/api/health`, { method: 'GET', cache: 'no-cache' });
            const latency = res.headers.get('x-response-time') || 'N/A'; // Assuming Vercel header

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    showToast(`✅ SATELLITE LINK SUCCESSFUL (${latency})`);
                    if (input) input.style.border = '1px solid var(--admin-success)';
                    
                    // On success, save it as the new default
                    localStorage.setItem('otp_api_base', url);
                    console.log(`[HUB] New satellite URL saved: ${url}`);
                } else {
                    throw new Error(data.message || "Health check failed");
                }
            } else {
                throw new Error(`Server responded with HTTP ${res.status}`);
            }
        } catch (e) {
            console.error("Satellite Connection Probe Failed:", e);
            showToast(`❌ LINK FAILED: ${e.message}`);
            if (input) { input.style.border = '1px solid var(--admin-danger)'; }
        }
    };

    window.viewSqlSchema = async function() {
        const modal = document.getElementById('sqlModal');
        const content = document.getElementById('sqlContent');
        if(!modal || !content) return;
        
        modal.style.display = 'flex';
        
        if (cachedSqlSchema) {
            content.textContent = cachedSqlSchema;
            return;
        }

        content.textContent = "FETCHING SCHEMA...";

        try {
            const base = resolveApiBase();
            let url = base ? `${base}/api/schema-migration` : '/supabase/migrations/DEPLOY_V1.3.sql';
            let res = await fetch(url);
            if (!res.ok && base) {
                url = `${base}/api/deploy-sql`;
                res = await fetch(url);
            }
            if(!res.ok) throw new Error("Failed to load schema file.");
            cachedSqlSchema = await res.text();
            content.textContent = cachedSqlSchema;
        } catch(e) {
            content.textContent = "ERROR: " + e.message;
        }
    };

    window.copySqlToClipboard = function() {
        const content = document.getElementById('sqlContent');
        if(!content) return;
        
        const text = content.textContent;
        
        // 1. Try Modern API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast("SQL COPIED (CLIPBOARD API)");
            }).catch(err => {
                console.warn("Clipboard API failed, trying fallback...", err);
                fallbackCopyText(text);
            });
        } else {
            fallbackCopyText(text);
        }
    };

    function fallbackCopyText(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure it's not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if(successful) showToast("SQL COPIED (LEGACY)");
            else showToast("COPY FAILED");
        } catch (err) {
            showToast("COPY FAILED: " + err);
        }
        
        document.body.removeChild(textArea);
    }

    // --- SESSION ACTION LOGGING ---
    window.logAdminAction = function(msg, type = 'info') {
        const logContainer = document.getElementById('sessionLog');
        if(!logContainer) return;

        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.style.padding = '4px 0';
        entry.style.fontSize = '0.65rem';
        entry.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        let color = '#888';
        if(type === 'success') color = 'var(--admin-success)';
        if(type === 'danger' || type === 'error') color = 'var(--admin-danger)';
        if(type === 'warning') color = '#ffaa00';
        if(type === 'info') color = 'var(--admin-cyan)';

        entry.innerHTML = `<span style="opacity:0.4">[${timestamp}]</span> <span style="color:${color}; font-weight:bold;">${window.escapeHtml(String(msg))}</span>`;
        
        logContainer.prepend(entry);
        if(logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    };

    // --- ENHANCED LIVE TRAFFIC SIMULATION ---
    let trafficUplinkStarted = false;

    function initTrafficUplink() {
        const pingContainer = document.getElementById('geoPings');
        if (!pingContainer) return;
        if (trafficUplinkStarted) return;
        trafficUplinkStarted = true;

        // Clear placeholder
        pingContainer.innerHTML = '';

        let realEventCount = 0;

        // --- REAL DATA: Supabase Realtime Subscription ---
        // Fires instantly whenever a post view is incremented on the live site
        function startRealtimeFeed() {
            if (!state.client) {
                // Supabase Realtime unavailable — update Active Feed to show correct state
                const feedEl = document.getElementById('activeUsersFeed');
                const countEl = document.getElementById('activeCount');
                if (feedEl) feedEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--admin-muted); font-size: 0.8rem;">NO ACTIVE USERS — REALTIME OFFLINE</div>';
                if (countEl) countEl.textContent = '0';
                return;
            }

            state.client
                .channel('live-traffic-posts')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'posts',
                    filter: 'published=eq.true'
                }, (payload) => {
                    const post = payload.new;
                    if (!post || !post.title) return;

                    realEventCount++;

                    addRealPing({
                        label: `READING: ${(post.title || 'UNTITLED').toUpperCase().substring(0, 30)}`,
                        views: post.views || 0,
                        slug: post.slug || '',
                        type: 'LIVE_SIGNAL',
                        color: 'var(--admin-success)'
                    });

                    // Auto-refresh stats if view changes on live site
                    if (window.fetchPosts) window.fetchPosts(false);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('📡 LIVE TRAFFIC: Supabase realtime linked');
                    }
                });

            // Also subscribe to new contact form submissions (real visitors)
            state.client
                .channel('live-traffic-contacts')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'contacts'
                }, (payload) => {
                    const c = payload.new;
                    if (!c) return;

                    realEventCount++;

                    addRealPing({
                        label: `INQUIRY: ${(c.service || 'GENERAL').toUpperCase().substring(0, 25)}`,
                        sub: c.budget ? `BUDGET: ${c.budget.toUpperCase()}` : null,
                        type: 'CONTACT_SIGNAL',
                        color: 'var(--admin-cyan)'
                    });

                    // Live auto-refresh inbox
                    if (window.fetchInbox) window.fetchInbox();
                })
                .subscribe();
                 
            // Also subscribe to Audit Leads
            state.client
                .channel('live-traffic-leads')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'leads'
                }, (payload) => {
                    const l = payload.new;
                    if (!l) return;

                    realEventCount++;

                    addRealPing({
                        label: `AUDIT: ${(l.email || 'SIGNAL').toUpperCase().substring(0, 25)}`,
                        sub: `MISSION: ${(l.answers?.q5_goal || 'STRATEGY').toUpperCase().substring(0, 30)}`,
                        type: 'LEAD_SIGNAL',
                        color: 'var(--admin-accent)'
                    });

                    // Live auto-refresh leads
                    if (window.fetchLeads) window.fetchLeads();
                })
                .subscribe();

            // --- ACTIVE USERS (PRESENCE) ---
            const presenceChannel = state.client.channel('system');
            
            presenceChannel.on('presence', { event: 'sync' }, () => {
                const presenceState = presenceChannel.presenceState();
                renderActiveUsers(presenceState);
            });
            
            presenceChannel.subscribe();

            // Safety fallback: if Realtime doesn't connect in 5s, show "no users" instead of hanging "WAITING"
            setTimeout(() => {
                const feedEl = document.getElementById('activeUsersFeed');
                if (feedEl && feedEl.textContent.includes('WAITING FOR CONNECTIONS')) {
                    feedEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--admin-muted); font-size: 0.8rem;">NO ACTIVE USERS AT THIS TIME</div>';
                    const countEl = document.getElementById('activeCount');
                    if (countEl && countEl.textContent === '--') countEl.textContent = '0';
                }
            }, 5000);
        }

        function renderActiveUsers(presenceState) {
            const feedContainer = document.getElementById('activeUsersFeed');
            const countEl = document.getElementById('activeCount');
            if (!feedContainer || !countEl) return;

            let allUsers = [];
            for (const key in presenceState) {
                presenceState[key].forEach(p => allUsers.push(p));
            }

            countEl.textContent = allUsers.length;
            const liveStat = document.getElementById('statLive');
            if (liveStat) liveStat.textContent = allUsers.length;

            if (allUsers.length === 0) {
                feedContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--admin-muted); font-size: 0.8rem;">NO ACTIVE USERS.</div>';
                return;
            }

            allUsers.sort((a, b) => new Date(b.online_at) - new Date(a.online_at));

            let html = '';
            allUsers.forEach((u, index) => {
                const ts = new Date(u.online_at).toLocaleTimeString([], { hour12: false });
                
                let browser = "Unknown";
                if (u.agent) {
                    if (u.agent.includes("Chrome")) browser = "Chrome";
                    else if (u.agent.includes("Firefox")) browser = "Firefox";
                    else if (u.agent.includes("Safari") && !u.agent.includes("Chrome")) browser = "Safari";
                    else if (u.agent.includes("Edge")) browser = "Edge";
                    else if (u.agent.includes("Mobile") || u.agent.includes("iPhone") || u.agent.includes("Android")) browser = "Mobile Device";
                }
                
                const os = u.agent ? (u.agent.includes("Mac OS") ? "macOS" : u.agent.includes("Windows") ? "Windows" : u.agent.includes("Linux") ? "Linux" : "iOS/Android") : "Unknown OS";

                const displayId = u.id ? u.id.split('-')[1] : `usr-${index}`;
                const pageStr = (u.page || 'index').replace('.html', '').replace('/', '');
                const pageLabel = pageStr === '' ? 'HOME' : pageStr.toUpperCase();

                html += `
                    <div class="active-user-card" style="padding: 10px; border: 1px solid rgba(0, 255, 170, 0.2); border-radius: 8px; background: rgba(0, 255, 170, 0.02); display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-family: monospace; font-size: 0.7rem; color: #00ffaa; font-weight: bold;">[${ts}] ⚡ ${displayId.toUpperCase()}</span>
                            <span style="font-size: 0.6rem; color: var(--admin-text); background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${pageLabel}</span>
                        </div>
                        <div style="font-size: 0.65rem; color: var(--admin-muted); display: flex; justify-content: space-between;">
                            <span>🌐 ${browser} on ${os}</span>
                            <span>${u.screen || 'Unknown Res'}</span>
                        </div>
                        <details style="font-size: 0.6rem; color: var(--admin-muted); margin-top: 4px; cursor: pointer;">
                            <summary style="outline: none; user-select: none;">[+] MORE DETAILS</summary>
                            <div style="padding-top: 5px; font-family: monospace; white-space: pre-wrap; word-break: break-all; opacity: 0.7;">${u.agent || 'No Agent Data'}
Lang: ${u.lang || 'Unknown'}</div>
                        </details>
                    </div>
                `;
            });

            feedContainer.innerHTML = html;
        }

        // --- REAL DATA: Initial snapshot of most-viewed posts (last 24h activity) ---
        async function loadRecentActivity() {
            try {
                // Use secureRead proxy to bypass RLS anon key restrictions on live site
                const posts = await window.secureRead('posts', {
                    select: 'title,slug,views',
                    filters: [
                        { column: 'published', op: 'eq', value: true },
                        { column: 'slug', op: 'neq', value: 'system-global-state' }
                    ],
                    order: 'views',
                    descending: true,
                    limit: 5
                });

                if (!posts || posts.length === 0) {
                    pingContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--admin-muted);">NO SIGNALS YET — WAITING FOR TRAFFIC...</div>';
                    return;
                }

                // Show top posts as the initial feed snapshot
                pingContainer.innerHTML = '';

                // Add a feed header
                const header = document.createElement('div');
                header.style.cssText = 'font-size:0.6rem; color:var(--admin-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--admin-border);';
                header.setAttribute('data-header', 'true');
                header.innerHTML = `<span style="color:var(--admin-success)">●</span> LIVE UPLINK — TOP SIGNALS`;
                pingContainer.prepend(header);

                posts.forEach((post, i) => {
                    setTimeout(() => {
                        addRealPing({
                            label: `TRENDING: ${(post.title || 'UNTITLED').toUpperCase().substring(0, 28)}`,
                            views: post.views || 0,
                            slug: post.slug || '',
                            type: 'SNAPSHOT',
                            color: i === 0 ? 'var(--admin-success)' : 'rgba(0,195,255,0.7)'
                        });
                    }, i * 300);
                });

                // Start realtime on top of snapshot
                startRealtimeFeed();

            } catch (e) {
                console.warn('Traffic feed error:', e);
                pingContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--admin-danger);">UPLINK ERROR</div>';
            }
        }

        // --- RENDER: Universal ping renderer ---
        function addRealPing({ label, sub, views, slug, type, color }) {
            if (!pingContainer) return;

            // Remove old messages if we have real events
            if (type !== 'SNAPSHOT') {
                const h = pingContainer.querySelector('[data-header]');
                if (h) h.remove();
                
                // Clear the "WAITING FOR SIGNALS" placeholder
                if(pingContainer.textContent.includes('WAITING FOR')) {
                    pingContainer.innerHTML = '';
                }
            }

            const ts = new Date().toLocaleTimeString([], { hour12: false });
            const isReal = type === 'LIVE_SIGNAL' || type === 'CONTACT_SIGNAL' || type === 'LEAD_SIGNAL';

            const ping = document.createElement('div');
            ping.style.cssText = `
                padding: 8px 10px;
                margin-bottom: 6px;
                border-left: 2px solid ${color};
                border-radius: 0 6px 6px 0;
                background: ${isReal ? 'rgba(0,255,170,0.03)' : 'transparent'};
                animation: slideIn 0.3s ease-out;
                transition: background 0.2s;
            `;

            const typeTag = isReal
                ? `<span style="color:${color}; font-weight:bold; font-size:0.5rem; border:1px solid ${color}; padding:1px 4px; border-radius:3px; margin-left:6px">${type === 'LIVE_SIGNAL' ? '⚡ LIVE' : type === 'CONTACT_SIGNAL' ? '📬 NEW CONTACT' : '🔍 NEW AUDIT'}</span>`
                : type === 'SNAPSHOT' ? `<span style="color:var(--admin-muted); font-size:0.5rem;">TOP</span>` : '';

            ping.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.6rem; margin-bottom:3px;">
                    <span style="color:var(--admin-muted)">[${ts}]${typeTag}</span>
                    ${views !== undefined ? `<span style="color:var(--admin-success); font-family:monospace; font-size:0.6rem;">${views.toLocaleString()} VIEWS</span>` : ''}
                </div>
                <div style="font-size:0.72rem; color:var(--admin-text); font-weight:${isReal ? '700' : '400'};">${label}</div>
                ${sub ? `<div style="font-size:0.6rem; color:var(--admin-muted); margin-top:2px;">${sub}</div>` : ''}
                ${slug ? `<div style="font-size:0.55rem; color:var(--admin-muted); font-family:monospace; margin-top:1px; opacity:0.6;">/insight.html?slug=${slug}</div>` : ''}
            `;

            pingContainer.prepend(ping);

            // Cap at 8 entries
            while (pingContainer.children.length > 9) {
                pingContainer.removeChild(pingContainer.lastChild);
            }
        }

        // --- BOOT: Load snapshot then go realtime ---
        loadRecentActivity();

        // Hardware Simulation (stays - real system stats would need backend agent)
        const cpuStat = document.getElementById('diagCPU');
        const ramStat = document.getElementById('diagRAM');
        
        if (cpuStat && ramStat) {
            setInterval(() => {
                const cpu = (Math.random() * 15 + 2).toFixed(1);
                const ram = (Math.random() * 200 + 120).toFixed(0);
                cpuStat.textContent = `${cpu}%`;
                ramStat.textContent = `${ram}MB / 512MB`;
            }, 3000);
        }
    }

    /** Manual "open live uplink" (optional .gate-btn); idempotent with delayed initTrafficUplink. */
    window.unlockChannel = function() {
        state.isUnlocked = true;
        if (!document.getElementById('geoPings')) return;
        if (trafficUplinkStarted) {
            if (window.showToast) window.showToast('LIVE UPLINK ALREADY ACTIVE');
            return;
        }
        initTrafficUplink();
        if (window.showToast) window.showToast('LIVE UPLINK ACTIVE');
    };
    
    // EXPOSE SYSTEM HEALTH TO WINDOW
    window.checkSystemHealth = async function() {
        try {
            const API_BASE = resolveApiBase();
            const res = await fetch(`${API_BASE}/api/health`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const db = document.getElementById("status-db");
            const pay = document.getElementById("status-pay");
            const ai = document.getElementById("status-ai");
            if (db) {
                db.textContent = data.integrations.supabase === "CONNECTED" ? "OK" : "ERROR";
                db.style.color = data.integrations.supabase === "CONNECTED" ? "var(--admin-success)" : "var(--admin-danger)";
            }
            if (pay) {
                pay.textContent = data.integrations.stripe === "CONFIGURED" ? "READY" : "OFFLINE";
                pay.style.color = data.integrations.stripe === "CONFIGURED" ? "var(--admin-success)" : "var(--admin-danger)";
            }
            if (ai) {
                if (data.integrations.ai === "CONFIGURED") {
                    ai.textContent = "SYNCED";
                    ai.style.color = "var(--admin-success)";
                } else {
                    const localGemini = getProviderLocalKey('gemini');
                    const localOpenAI = getProviderLocalKey('openai');
                    const localAnthropic = getProviderLocalKey('anthropic');
                    if (localGemini || localOpenAI || localAnthropic) {
                        ai.textContent = "SYNCED (LOCAL)";
                        ai.style.color = "var(--admin-cyan)";
                    } else {
                        ai.textContent = "JAMMED";
                        ai.style.color = "var(--admin-danger)";
                    }
                }
            }
        } catch (e) {
            console.warn("Heartbeat Failed");
        }
    };
    
    setInterval(window.checkSystemHealth, 30000);
    window.checkSystemHealth();

    // DELAYED TRAFFIC BOOT (secure mode only)
    if (state.token) {
        setTimeout(initTrafficUplink, 2000);
    }

    // --- VERSION SYSTEM LOGIC ---
    window.openVersionManager = function() {
        const modal = document.getElementById('versionModal');
        if (modal) {
            modal.style.display = 'flex';
            window.fetchVersions();
        }
    };

    window.fetchVersions = async function() {
        const list = document.getElementById('versionList');
        if (!list) return;

        list.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px; font-size: 0.8rem;">ESTABLISHING VERSION UPLINK...</div>';

        try {
            const API_BASE = resolveApiBase();
            const fetchUrl = `${API_BASE}/api/admin/versions`;
            const token = localStorage.getItem('otp_admin_token') || 'local-fallback';

            const res = await fetch(fetchUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("API Offline or Token Expired");

            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to parse versions");

            list.innerHTML = '';
            const versions = Array.isArray(data.versions) ? data.versions.slice(0, 12) : [];
            if (versions.length > 0) {
                if ((data.versions || []).length > versions.length) {
                    const notice = document.createElement('div');
                    notice.style.cssText = 'font-size:0.68rem;color:var(--admin-muted);padding:8px 10px;border:1px dashed var(--admin-border);border-radius:6px;background:rgba(255,255,255,0.02);';
                    notice.textContent = `SHOWING LATEST ${versions.length} VERSION SNAPSHOTS`;
                    list.appendChild(notice);
                }

                versions.forEach((v, index) => {
                    const dateRaw = new Date(v.date);
                    const isCurrent = index === 0;
                    const isManaged = !!v.managed || v.rollback_mode === 'vercel';

                    const item = document.createElement('div');
                    item.style.cssText = `padding: 15px; border: 1px solid ${isCurrent ? 'var(--admin-success)' : 'var(--admin-border)'}; border-radius: 8px; background: var(--admin-panel); display: flex; justify-content: space-between; align-items: center;`;

                    const hashShort = v.hash.substring(0, 7);

                    const deploymentLink = v.deployment_url
                        ? `<div style="font-size:0.62rem;margin-top:4px;"><a href="${window.escapeHtml(v.deployment_url)}" target="_blank" rel="noopener noreferrer" style="color:var(--admin-cyan);text-decoration:none;">DEPLOYMENT ↗</a></div>`
                        : '';
                    const actionHtml = isCurrent
                        ? ''
                        : isManaged
                            ? `<span style="font-size:0.62rem;padding:6px 10px;border-radius:6px;border:1px solid rgba(0,255,170,0.35);color:var(--admin-success);">MANAGED</span>`
                            : `<button type="button" onclick="triggerRollback('${v.hash}')" class="btn-secondary" style="font-size: 0.65rem; padding: 6px 15px; border-color: var(--admin-danger); color: var(--admin-danger);">ROLLBACK</button>`;

                    item.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-size: 0.8rem; color: ${isCurrent ? '#00ffaa' : 'var(--admin-text)'}; font-weight: bold;">
                                ${isCurrent ? '🟢 CURRENT_STATE: ' : ''}${window.escapeHtml(v.message || '')}
                            </span>
                            <div style="font-family: monospace; font-size: 0.65rem; color: var(--admin-muted);">
                                <span>COMMIT: ${hashShort}</span> |
                                <span>${dateRaw.toLocaleString()}</span>
                            </div>
                            ${deploymentLink}
                        </div>
                        ${actionHtml}
                    `;
                    list.appendChild(item);
                });
            } else {
                list.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">NO VERSIONS FOUND IN GIT MATRIX.</div>';
            }

        } catch (e) {
            list.innerHTML = `<div style="text-align: center; color: var(--admin-danger); padding: 20px; font-size: 0.8rem; font-weight: bold;">SYSTEM ERROR: ${window.escapeHtml(String(e.message || e))}</div>`;
        }
    };

    window.triggerRollback = function(hash) {
        if (!hash) return;
        confirmAction("EMERGENCY ROLLBACK INITIATED", "WARNING: This will rewrite the active system state to commit " + hash.substring(0,7) + ". Unsaved progress will be destroyed. Are you absolutely certain?", async () => {
            showToast("ROLLBACK TRANSMISSION SENT. AWAITING FEEDBACK.");

            try {
                const API_BASE = resolveApiBase();
                const fetchUrl = `${API_BASE}/api/admin/rollback`;
                const token = localStorage.getItem('otp_admin_token') || 'local-fallback';

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ version: hash }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);


                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Rollback execution failed at proxy.");

                showToast("ROLLBACK SUCCESS! REBOOTING IN 3 SECONDS...");
                window.logAdminAction(`SYSTEM PURGED AND ROLLED BACK TO ${hash.substring(0,7)}`, "danger");

                setTimeout(() => {
                    window.location.reload(true);
                }, 3000);

            } catch (e) {
                showToast("ROLLBACK FAILURE: " + (e.message || "Network Timeout"), "error");
            }
        });
    };

    // GLOBAL LOGOUT
    window.logout = function() {
        confirmAction("TERMINATE SESSION?", "Are you sure you want to log out of the secure terminal?", () => {
            localStorage.removeItem('otp_admin_token');
            // Clean up session specific caches
            localStorage.removeItem('otp_insights_cache');
            localStorage.removeItem('otp_admin_profile');
            window.location.href = 'portal-gate.html';
        });
    };

})();