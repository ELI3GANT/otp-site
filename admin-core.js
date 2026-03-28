/**
 * ADMIN CORE V15.0.0 (FORCE-DATA)
 * Centralized logic for the OTP Admin Panel.
 * Handles: Session Persistence, JWT decoding, Supabase Connection.
 */

(function() {
    console.log("🚀 ADMIN CORE V14.5.0 RELEASE (ORACLE_MASTER_BUILD): ONLINE.");

    // GLOBAL ERROR TRAP
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled Rejection:', event.reason);
        if (window.showToast) {
            window.showToast("SYSTEM ERROR: " + (event.reason ? event.reason.message : "Unknown"));
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
        if (!text) return '';
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
        console.log("🛠️ INITIALIZING TERMINAL ENGINE...");
        updateDiagnostics('auth', 'INITIALIZING...', 'var(--admin-muted)');
        
        if (!state.token && window.location.hostname !== 'localhost') {
            window.location.href = 'portal-gate.html?reason=missing_token';
            return;
        }

        if (state.token) {
             try {
                 if (state.token !== 'static-bypass-token') {
                     // JWT tokens are base64url encoded. Standard atob() may fail on '-' and '_'.
                     try {
                         const base64Url = state.token.split('.')[1];
                         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                         const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));

                         const now = Math.floor(Date.now() / 1000);
                         if (payload.exp && payload.exp < now) {
                             console.warn("Session Expired");
                             window.logout();
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

        // ---[ CORE BUGFIX: MULTIPLE SUPABASE CLIENTS ]---
        if (window.OTP && window.OTP.supabase) {
            console.warn("[AUTH_FIX] Detected and neutralizing conflicting Supabase client.");
            // Overwrite the conflicting client's methods to be inert.
            window.OTP.supabase.from = () => ({
                select: () => Promise.resolve({ error: { message: "Client Neutralized" } }),
                insert: () => Promise.resolve({ error: { message: "Client Neutralized" } }),
                update: () => Promise.resolve({ error: { message: "Client Neutralized" } }),
                delete: () => Promise.resolve({ error: { message: "Client Neutralized" } }),
            });
            window.OTP.supabase.channel = () => ({
                on: () => ({ subscribe: () => {} }),
            });
        }
        // ---[ END BUGFIX ]---


            // ═══════════════════════════════════════════════════════
            // SECURE PROXY HELPERS — defined before try block so they
            // are always available even if Supabase connection fails.
            // ═══════════════════════════════════════════════════════
                        // SECURE WRITE PROXY HELPER
                        window.secureWrite = async function(table, payload, id = null) {
                            const apiBase = window.OTP.getApiBase();
                            const res = await fetch(`${apiBase}/api/admin/write-data`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ id, payload, table })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || `Write Failed (${res.status})`);
                }
                return await res.json();
            };

            // SECURE READ PROXY HELPER (Bypass browser-blockages/RLS mismatch)
            window.secureRead = async function(table, config = {}) {
                const apiBase = window.OTP.getApiBase();
                const res = await fetch(`${apiBase}/api/admin/fetch-data`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ table, ...config })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || `Read Failed (${res.status})`);
                }
                const json = await res.json();
                return json.data;
            };

            // SECURE DELETE PROXY HELPER
            window.secureDelete = async function(table, id) {
                const apiBase = window.OTP.getApiBase();
                const res = await fetch(`${apiBase}/api/admin/delete-post`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ id, table })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || `Delete Failed (${res.status})`);
                }
                return await res.json();
            };

        try {
            console.log("🔌 Connecting to Supabase KERNEL...");
            updateDiagnostics('db', 'CONNECTING...', 'var(--admin-muted)');
            
            state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
            window.sb = state.client; 

            // --- AUTH HARDENING: INJECT SESSION TOKEN ---
            if (state.token && state.token !== 'static-bypass-token') {
                console.log("🔑 Injecting secure session token...");
                try {
                    state.client.auth.setSession({
                        access_token: state.token,
                        refresh_token: state.token 
                    });
                } catch (authErr) {
                    console.warn("⚠️ Session injection skipped:", authErr.message);
                }
            }
            
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

            // Load Data (Parallel)
            await Promise.allSettled([
                fetchPosts(true),
                fetchInbox(),
                fetchLeads(),
                fetchCategories(),
                fetchArchetypes()
            ]);
            
            // Backup Polling (30s) - Realtime handles immediate updates
            setInterval(() => fetchPosts(false), 30000);

            // Live Clock System
            const clockEl = document.getElementById('liveClock');
            if (clockEl) {
                const apiBase = localStorage.getItem('otp_api_base') || '';
                const token = localStorage.getItem('otp_admin_token') || '';
                const isStatic = token === 'static-bypass-token';
                const isRemote = apiBase.startsWith('http') && !apiBase.includes('localhost');
                
                let statusTag = '<span style="color:var(--admin-success)">[NODE:LIVE]</span>';
                if (isStatic) statusTag = '<span style="color:#ff8800">[NODE:LEGACY]</span>';
                else if (isRemote || window.location.hostname.endsWith('.vercel.app') || window.location.hostname === 'onlytrueperspective.tech') statusTag = '<span style="color:#00ffaa; filter: drop-shadow(0 0 5px #00ffaa); font-weight:bold;">[NODE:SECURE]</span>';

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
                        const currentProvider = document.getElementById('aiProvider').value;
                        checkNeuralLink(currentProvider);
                    });
                }
            };

            bindPersist(cloudOA, 'cloud_openai');
            bindPersist(cloudG, 'cloud_gemini');
            bindPersist(cloudC, 'cloud_claude');
            bindPersist(cloudGr, 'cloud_groq');
            
            // Resolve best API base: localStorage > OTP_CONFIG > canonical Vercel fallback
            
            // Satellite URL: Load & Validate
            if(satUrl) {
                let storedUrl = localStorage.getItem('otp_api_base');
                
                // If nothing stored yet, resolve from site-config.js logic
                if (!storedUrl) {
                    storedUrl = window.OTP.getApiBase();
                    localStorage.setItem('otp_api_base', storedUrl);
                }
                
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
                        const html = document.documentElement;
                        const isLight = value === 'light';
                        if (isLight) html.setAttribute('data-theme', 'light');
                        else html.removeAttribute('data-theme');
                        
                        const btns = document.querySelectorAll('.theme-btn');
                        btns.forEach(btn => btn.textContent = isLight ? '☀️' : '🌗');
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

            // 8. INITIAL LINK CHECK
            const defaultProvider = localStorage.getItem('ai_provider') || 'groq';
            const providerSel = document.getElementById('aiProvider');
            if (providerSel) providerSel.value = defaultProvider;
            checkNeuralLink(defaultProvider);

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
                localStorage.setItem('otp_api_base', config.api_base);
                const satUrl = document.getElementById('satelliteUrl');
                if (satUrl) satUrl.value = config.api_base;
            }
        } catch (e) { console.error("Config Fetch Error:", e); }
    }

    // --- AUTH UTILS --- (Consolidated at Bottom)

    // --- POST MANAGER & STATS LOGIC ---
    let postsCache = null;
    let lastFetchTime = 0;
    const CACHE_TTL = 60000; // 60s Cache

    // 4.6 FILE UPLOAD LOGIC
    async function optimizeImage(file) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) return resolve(file); // Don't optimize non-images
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
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
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        const optimizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(optimizedFile);
                    }, 'image/jpeg', 0.8);
                };
            };
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

            document.getElementById('imageUrl').value = publicUrl;
            document.getElementById('fileDetails').style.display = 'block';
            document.getElementById('fileNameDisplay').textContent = optimizedFile.name;
            
            const originalSize = (file.size / 1024 / 1024).toFixed(2);
            const optimizedSize = (optimizedFile.size / 1024 / 1024).toFixed(2);
            document.getElementById('fileSizeDisplay').textContent = `${optimizedSize} MB (Saved ${((1 - optimizedFile.size/file.size)*100).toFixed(0)}%)`;
            
            const prevImg = document.getElementById('previewImg');
            if(prevImg) {
                prevImg.src = publicUrl;
                document.getElementById('imagePreview').style.display = 'block';
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
        
        try {
            // Fetch FULL data for this specific post
            const { data: post, error } = await state.client
                .from('posts')
                .select('*')
                .eq('id', id)
                .single();

            if(error) throw error;
            if(!post) throw new Error("Post not found");

            // Populate Form
            document.getElementById('postIdInput').value = post.id;
            document.getElementById('titleInput').value = post.title || '';
            document.getElementById('slugInput').value = post.slug || '';
            
            // Handle Image - Populate both fields for flexibility
            const img = post.image_url || '';
            document.getElementById('imageUrl').value = img;
            document.getElementById('urlInput').value = img;
            
            // Show Preview if image exists
            const prevImg = document.getElementById('previewImg');
            const prevDiv = document.getElementById('imagePreview');
            if(img && prevImg && prevDiv) {
                 prevImg.src = img;
                 prevDiv.style.display = 'block';
            }

            document.getElementById('catInput').value = post.category || 'Strategy';
            document.getElementById('authorInput').value = post.author || 'OTP Admin';
            document.getElementById('tagsInput').value = (post.tags || []).join(', ');
            document.getElementById('excerptInput').value = post.excerpt || '';
            document.getElementById('contentArea').value = post.content || '';
            
            // SEO
            document.getElementById('seoTitle').value = post.seo_title || '';
            document.getElementById('seoDesc').value = post.seo_desc || '';
            // Views handled strictly by DB now
            document.getElementById('pubToggle').checked = post.published;

            // Update UI State
            const submitBtn = document.getElementById('submitBtn');
            if(submitBtn) {
                submitBtn.textContent = "UPDATE BROADCAST";
                submitBtn.style.background = "var(--admin-accent)"; 
                submitBtn.style.color = "#fff";
            }
            
            document.getElementById('postForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Update Word Count
            const content = document.getElementById('contentArea');
            if(content) {
                 content.dispatchEvent(new Event('input')); 
            }

            showToast("DATA LOADED");

        } catch(err) {
            console.error("Edit Load Error:", err);
            showToast("LOAD FAILED: " + err.message);
        }
    };

    window.resetForm = function() {
        document.getElementById('postForm').reset();
        document.getElementById('postIdInput').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        
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
            if (list.children.length === 0) {
                 list.innerHTML = `<div style="text-align: center; color: #ff4444; padding:20px;">LINK ERROR: ${err.message}</div>`;
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
                    statusColor = '#666'; 
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
                             <div style="font-size: 0.6rem; color: var(--admin-muted); margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">LAST SIGNAL: ${new Date(c.created_at).toLocaleString()}</div>
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <div style="font-size: 0.65rem; font-family: 'Space Grotesk', sans-serif; font-weight: 900; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 3px 8px; border-radius: 4px; background: rgba(var(--accent2-rgb), 0.05);">${statusText}</div>
                            <button type="button" onclick="return archiveContact('${c.id}', event)" title="Archive" class="btn-icon-mini">📦</button>
                            <button type="button" onclick="return deleteContact('${c.id}', event)" title="Delete" class="btn-icon-mini danger">✖</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8rem; margin-bottom: 12px; color: var(--admin-text); padding: 10px; background: rgba(0,0,0,0.15); border-radius: 6px;">
                        <div><span style="color: var(--admin-muted); font-weight: bold; font-size: 0.7rem;">// SERVICE</span><br>${window.escapeHtml(c.service || c.project_type || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-weight: bold; font-size: 0.7rem;">// BUDGET</span><br>${window.escapeHtml(c.budget || 'N/A')}</div>
                        <div style="grid-column: span 2;"><span style="color: var(--admin-muted); font-weight: bold; font-size: 0.7rem;">// MESSAGE</span><br><span style="line-height: 1.6;">${window.escapeHtml(c.message || c.project_details || '')}</span></div>
                    </div>

                    ${isDrafted ? `
                    <div style="background: rgba(var(--accent2-rgb), 0.05); border-left: 3px solid var(--admin-cyan); padding: 15px; margin-top: 10px; border-radius: 0 6px 6px 0;">
                        <div style="font-size: 0.65rem; color: var(--admin-cyan); margin-bottom: 8px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">// AI NEURAL DRAFT</div>
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

        } catch(e) {
            inbox.innerHTML = `<div style="text-align: center; color: #ff4444; padding: 20px;">ERROR: ${e.message}</div>`;
        }
    };
    
    // --- PERSPECTIVE AUDIT LEADS ---
    window.fetchLeads = async function() {
        const leads = document.getElementById('leadsManager');
        if(!leads) return;

        // Visual Feedback
        leads.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">SYNCING LEAD DATA...</div>';

        try {
            const data = await window.secureRead('leads', { limit: 100 });

            if (!data || data.length === 0) {
                leads.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">NO LEADS CAPTURED YET</div>';
                return;
            }

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
                             <div style="font-weight: 800; color: #fff; font-size: 0.95rem; letter-spacing: 0.5px;">${escape(l.email)}</div>
                             <div style="font-size: 0.6rem; color: var(--admin-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">SIGNAL CAPTURED: ${new Date(l.created_at).toLocaleString()}</div>
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <div style="font-size: 0.65rem; font-family: 'Space Grotesk', sans-serif; font-weight: 900; color: var(--admin-cyan); border: 1px solid var(--admin-cyan); padding: 3px 8px; border-radius: 4px; background: rgba(var(--accent2-rgb), 0.1); letter-spacing: 1px;">AUDIT SIGNAL</div>
                            <button type="button" onclick="openReplyManager('${l.id}', 'leads')" title="Reply" style="background:transparent; border:none; color:var(--admin-cyan); cursor:pointer; font-size: 1.1rem;">📩</button>
                            <button type="button" onclick="return deleteLead('${l.id}', event)" title="Delete" style="background:transparent; border:none; color:var(--admin-danger); cursor:pointer; font-size: 1.1rem;">✖</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 0.8rem; margin-bottom: 15px; color: var(--admin-text); background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="grid-column: 1 / -1; margin-bottom: 5px;"><span style="color: var(--admin-cyan); font-weight:900; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px;">// MISSION PARAMETERS</span></div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">OBJECTIVE:</span><br>${escape(answers.q1 || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">BARRIER:</span><br>${escape(answers.q2 || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">DOMAIN:</span><br>${escape(answers.q3 || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted); font-size: 0.7rem; font-weight: bold;">AESTHETIC:</span><br>${escape(answers.q4 || 'N/A')}</div>
                        <div style="grid-column: 1 / -1; margin-top: 5px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);"><span style="color: var(--admin-success); font-weight:900; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">PRIMARY TARGET:</span><br><span style="font-size: 0.9rem; font-weight: 700; color: #fff;">"${escape(answers.q5_goal || 'Not specified')}"</span></div>
                    </div>
                    <div style="background: rgba(0,0,0,0.5); border-left: 3px solid var(--admin-accent); padding: 15px; border-radius: 0 8px 8px 0; font-size: 0.85rem; line-height: 1.6; border: 1px solid rgba(112,0,255,0.1); border-left-width: 3px;">
                        <div style="font-size: 0.6rem; color: var(--admin-accent); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">// ORACLE TRANSMISSION</div>
                        <div style="color: #eee; font-style: italic;">${window.escapeHtml(l.advice || '').replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--admin-cyan);">$1</strong>').replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
                `;
            }).join('');

            window.leadsCache = data;

        } catch(e) {
            leads.innerHTML = `<div style="text-align: center; color: #ff4444; padding: 20px;">ERROR SYNCING LEADS: ${e.message}</div>`;
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
                         const apiBase = window.OTP ? window.OTP.getApiBase() : '';
                         const res = await fetch(`${apiBase}/api/admin/purge-leads`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${state.token}`
                            }
                         });
                         
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
            modal.style.background = 'rgba(0,0,0,0.85)';
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
                    const apiBase = window.OTP.getApiBase();
                    const res = await fetch(`${apiBase}/api/admin/purge-contacts`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        }
                    });
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
            modal.style.background = 'rgba(0,0,0,0.85)';
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
            modal.style.background = 'rgba(0,0,0,0.85)';
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

    // --- REPLY MANAGER LOGIC ---
    window.closeReplyManager = function() {
        const modal = document.getElementById('replyModal');
        modal.style.display = 'none';
        // Focus back to inbox container to prevent jump
        window.refocusInbox();
    };

    window.openReplyManager = function(id, source = 'contacts') {
        const cache = source === 'leads' ? (window.leadsCache || []) : (window.inboxCache || []);
        const c = cache.find(x => x.id == id);
        if(!c) return;
        
        document.getElementById('replyContactId').value = c.id;
        document.getElementById('replyContactEmail').value = c.email || '';
        document.getElementById('replyContactName').value = c.name || (source === 'leads' ? 'Valued Lead' : 'Client');
        
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

        // Context formatting
        let messageContext = c.message || '';
        if (source === 'leads' && c.answers) {
            let answers = c.answers;
            if (typeof answers === 'string') try { answers = JSON.parse(answers); } catch(e) {}
            messageContext = `AUDIT GOAL: ${answers.q1}\nHURDLE: ${answers.q2}\nPLATFORM: ${answers.q3}\nVIBE: ${answers.q4}\nTARGET: ${answers.q5_goal}`;
        }
        
        document.getElementById('replyIncomingMsg').textContent = messageContext;
        document.getElementById('replyDraftContent').value = c.draft_reply || '';
        
        // Render Analysis if present
        // Render Analysis Agent (High-Density View)
        const analysisDiv = document.getElementById('replyAnalysis');
        if(c.ai_analysis || c.advice || c.neural_meta) {
             const analysisData = c.ai_analysis || { tactical_advice: c.advice, neural_meta: c.neural_meta };
             const analysisText = typeof analysisData === 'string' ? analysisData : JSON.stringify(analysisData, null, 2);
             analysisDiv.innerHTML = `
                <div style="background: rgba(var(--accent2-rgb), 0.05); padding: 12px; border-radius: 8px; border: 1px solid var(--admin-border); max-height: 160px; overflow-y: auto;">
                    <div style="font-size: 0.55rem; color: var(--admin-cyan); margin-bottom: 8px; font-weight: 900; letter-spacing: 2px;">NEURAL_ANALYSIS_DATA</div>
                    <pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.72rem; color: var(--admin-text); line-height: 1.4; margin: 0;">${window.escapeHtml ? window.escapeHtml(analysisText) : analysisText}</pre>
                </div>`;
        } else {
             analysisDiv.innerHTML = `
                <div style="text-align: center; padding: 25px; color: var(--admin-muted); font-size: 0.7rem; border: 1px dashed var(--admin-border); border-radius: 8px; background: rgba(0,0,0,0.02);">
                    <div style="font-size: 1.2rem; margin-bottom: 8px; opacity: 0.5;">📡</div>
                    SIGNAL DATA NOT ANALYZED
                </div>`;
        }
        
        const modal = document.getElementById('replyModal');
        modal.style.display = 'flex'; 
        // Enforce fixed centering alignment
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '10000';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.backdropFilter = 'blur(5px)';

    // Focus the first actionable button or input
        setTimeout(() => document.getElementById('replyDraftContent').focus(), 100);
    };

    // NEW: Generate AI Reply for Lead
    window.generateReplyForLead = async function() {
        const msg = document.getElementById('replyIncomingMsg').textContent;
        const name = document.getElementById('replyContactName').value;
        const email = document.getElementById('replyContactEmail').value;
        const draftBox = document.getElementById('replyDraftContent');
        
        if(!msg) { showToast("NO MESSAGE CONTEXT FOUND"); return; }
        
        const btn = document.querySelector('button[onclick="generateReplyForLead()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = "<span>⏳</span> THINKING...";
        btn.disabled = true;

        try {
            // Get Config
            const providerSel = document.getElementById('aiProvider'); // Use global selector
            const provider = providerSel ? providerSel.value : 'openai';
            const personalKeys = {
                openai: localStorage.getItem('cloud_openai'),
                gemini: localStorage.getItem('cloud_gemini'),
                anthropic: localStorage.getItem('cloud_claude'),
                groq: localStorage.getItem('cloud_groq')
            };

            // DYNAMIC ARCHETYPE OVERRIDE
            const archInput = document.getElementById('replyArchetype');
            const selectedArchSlug = archInput ? archInput.value : '';
            const archetype = selectedArchSlug ? (state.archetypes || []).find(a => a.slug === selectedArchSlug) : null;
            const modelConfig = (archetype && archetype.model_config) ? archetype.model_config : {};
            
            const baseSystemPrompt = archetype ? archetype.system_prompt : `You are an elite business consultant and executive assistant. 
            Your task is to draft a professional, warm, and high-conversion reply to a potential lead.`;

            const systemPrompt = `${baseSystemPrompt}
            
            Lead Name: ${name}
            Lead Email: ${email}
            Incoming Message: "${msg}"
            
            Guidelines:
            - Tone: Professional, Confident, Welcoming, Premium.
            - Focus: Acknowledge their specific request, offer to schedule a discovery call, and express excitement about potentially working together.
            - Format: Plain text email body. Do not include subject line unless asked. Do not include placeholders like "[Your Name]" - sign off as "The Team" or just "Best,".
            `;

            let replyText = "";
            let hubError = null;

            // 1. Try Server Proxy First (Secure Hub)
            if (state.token && state.token !== 'static-bypass-token') {
                try {
                    const apiBase = window.OTP ? window.OTP.getApiBase() : (window.OTP_CONFIG?.apiBase || window.location.origin);
                    const res = await fetch(apiBase + '/api/ai/chat', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ 
                            provider, 
                            systemPrompt, 
                            messages: [{ role: 'user', content: `Lead Name: ${name}. Context: ${msg}. Draft Reply.` }],
                            modelConfig 
                        })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        replyText = data.data;
                    } else {
                        hubError = data.message || "Server Hub Refused Connection";
                    }
                } catch (e) {
                    hubError = "Secure Hub Offline";
                }
            }

            // 2. Failover: Try Direct Cloud Link
            if (!replyText) {
                const cloudKey = personalKeys[provider];
                if (!cloudKey && provider !== 'groq') {
                    throw new Error(hubError ? `NEURAL LINK FAILED: ${hubError}` : `NO API KEY FOUND FOR ${provider.toUpperCase()}`);
                }

                if (provider === 'openai') {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [{ role: 'system', content: "You represent a high-end agency." }, { role: 'user', content: systemPrompt }],
                            ...modelConfig
                        })
                    });
                    const data = await res.json();
                    if(data.error) throw new Error(data.error.message);
                    replyText = data.choices[0].message.content;
                } 
                else if (provider === 'gemini') {
                    const geminiConfig = {};
                    if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
                    if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
                    if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;

                    const versions = ['v1', 'v1beta'];
                    const modelCandidates = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
                    let success = false;
                    let lastError = "Neural link failed.";

                    for (const v of versions) {
                        if(success) break;
                        for (const m of modelCandidates) {
                            if(success) break;
                            try {
                                const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${cloudKey}`;
                                const res = await fetch(url, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: systemPrompt }] }],
                                        generationConfig: geminiConfig
                                    })
                                });
                                const data = await res.json();
                                if(data.error) {
                                    lastError = `${m} [${v}]: ${data.error.message}`;
                                    console.warn(`⚠️ Deep Dive Probe Fail [${v}] [${m}]:`, data.error.message);
                                    continue;
                                }
                                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                                    replyText = data.candidates[0].content.parts[0].text;
                                    success = true;
                                    break;
                                }
                            } catch (e) {
                                lastError = e.message;
                            }
                        }
                    }
                    if(!success) throw new Error(`GEMINI DEEP DIVE FAILED: ${lastError}`);
                }
                else if (provider === 'groq') {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                        body: JSON.stringify({
                            model: 'llama-3.1-70b-versatile',
                            messages: [{ role: 'system', content: "You are a professional assistant." }, { role: 'user', content: systemPrompt }],
                            ...modelConfig
                        })
                    });
                    const data = await res.json();
                    if(data.error) throw new Error(data.error.message);
                    replyText = data.choices[0].message.content;
                }
            }

            // Stream simulation or just paste
             draftBox.value = replyText.trim();
             showToast("REPLY GENERATED");

             // --- TRACK USAGE ---
             if (selectedArchSlug) incrementArchetypeUsage(selectedArchSlug);

        } catch(e) {
            console.error("GEN ERROR:", e);
            showToast("GEN FAILED: " + e.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    window.saveDraftUpdate = async function() {
        const id = document.getElementById('replyContactId').value;
        const content = document.getElementById('replyDraftContent').value;
        
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
    const email = document.getElementById('replyContactEmail').value;
    const name = document.getElementById('replyContactName').value;
    const content = document.getElementById('replyDraftContent').value;
    const subject = document.getElementById('replySubject').value || `Inquiry Reply: Only True Perspective`;
    
    // Ensure content is safe for URL
    const safeSubject = encodeURIComponent(subject);
    const safeBody = encodeURIComponent(content);
    
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${safeSubject}&body=${safeBody}`;
    
    // Use window.location for better protocol handling in some browsers, fallback to window.open
    try {
        window.location.href = mailto;
    } catch(e) {
        window.open(mailto, '_blank');
    }
};

    window.markAsReplied = function() {
        const id = document.getElementById('replyContactId').value;
        confirmAction("SENT REPLY?", "Confirm you have sent the reply. This will mark the thread as completed.", async () => {
            try {
                await window.secureWrite('contacts', { ai_status: 'completed' }, id);
                showToast("MARKED AS COMPLETED (SECURE)");
                document.getElementById('replyModal').style.display = 'none';
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
            modal.style.background = 'rgba(0,0,0,0.85)';
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
            modal.style.background = 'rgba(0,0,0,0.85)';
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
        if(isLight) {
            gradient.addColorStop(0, 'rgba(88, 86, 214, 0.9)');
            gradient.addColorStop(1, 'rgba(88, 86, 214, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(112, 0, 255, 0.9)');
            gradient.addColorStop(1, 'rgba(112, 0, 255, 0.2)');
        }

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
                    hoverBackgroundColor: isLight ? '#5856d6' : '#9d4dff'
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
            modal.style.display = 'flex';
            // Enforce proper centering for posts as well
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'rgba(0,0,0,0.85)';
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
                    const apiBase = (function() {
                        const stored = localStorage.getItem('otp_api_base');
                        if (stored && stored.startsWith('http') && !stored.includes('localhost')) return stored;
                        return window.OTP_CONFIG?.apiBase || '';
                    })();
                    const res = await fetch(`${apiBase}/api/admin/delete-post`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ slug })
                    });
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
            payload.updated_at = new Date().toISOString();
            await window.secureWrite('posts', payload, id);
        } else {
            // INSERT
            console.log("📝 CREATING POST (SECURE)");
            payload.created_at = new Date().toISOString();
            payload.updated_at = payload.created_at;
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
                     div.innerHTML = `<video src="${publicUrl}#t=0.5" muted preload="metadata" onmouseover="this.play()" onmouseout="this.pause()"></video>`;
                } else {
                     div.innerHTML = `<img src="${publicUrl}" loading="lazy" alt="${file.name}">`;
                }
                grid.appendChild(div);
            });

        } catch (err) {
            console.error("Media Load Error:", err);
            grid.innerHTML = `<div class="loader" style="color:#ff4444">ERROR: ${err.message}</div>`;
        }
    };

    window.closeMediaLibrary = function() {
        document.getElementById('mediaModal').style.display = 'none';
    };

    function selectMedia(url, name) {
        document.getElementById('imageUrl').value = url;
        const previewDiv = document.getElementById('imagePreview');
        const detailsDiv = document.getElementById('fileDetails');
        
        if(previewDiv) {
             if(url.match(/\.(mp4|webm|mov)$/i)) {
                 previewDiv.innerHTML = `<video src="${url}" controls style="width: 100%; height: auto; max-height: 400px; display: block; border-radius: 12px;"></video>`;
             } else {
                 previewDiv.innerHTML = `<img id="previewImg" src="${url}" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;">`;
             }
             previewDiv.style.display = 'block';
        }

        if(detailsDiv) {
            detailsDiv.style.display = 'block';
            document.getElementById('fileNameDisplay').textContent = name || "Selected from Library";
            document.getElementById('fileSizeDisplay').textContent = "(Cloud Asset)";
        }
        closeMediaLibrary();
    }

    // 7. SECURE AI NEURAL GENERATOR
    // 3. UTILITIES
    window.escapeHtml = function(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

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

    // 7. SECURE AI NEURAL GENERATOR
    async function triggerAIGenerator() {
        const providerSel = document.getElementById('aiProvider');
        const promptInput = document.getElementById('aiPrompt');
        const titleInput = document.getElementById('titleInput');
        const tagsInput = document.getElementById('tagsInput');
        const archetypeInput = document.getElementById('archetype');
        const modelSel = document.getElementById('geminiModel');
        const status = document.getElementById('aiStatus');
        const btn = document.getElementById('magicBtn');

        if(!state.token && state.token !== 'static-bypass-token') {
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
                openai: localStorage.getItem('cloud_openai'),
                gemini: localStorage.getItem('cloud_gemini'),
                anthropic: localStorage.getItem('cloud_claude'),
                groq: localStorage.getItem('cloud_groq')
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
                    const base = window.OTP ? window.OTP.getApiBase() : (window.OTP_CONFIG?.apiBase || window.location.origin);
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
                    throw new Error(`NEURAL LINK BLOCKED: ${msg}`);
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
                    const gemModel = model || 'gemini-2.0-flash';
                    const endpoints = ['v1', 'v1beta'];
                    let gemSuccess = false;
                    let gemError = "Unknown Gemini error.";
                    
                    // Map common configs to Gemini specific
                    const geminiConfig = { response_mime_type: "application/json" };
                    if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
                    if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
                    if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;

                    for (const v of endpoints) {
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
                                console.warn(`⚠️ Gemini ${v} failed:`, raw.error.message);
                                continue;
                            }

                            if (raw.candidates && raw.candidates[0].finishReason === 'SAFETY') {
                                gemError = "NEURAL BLOCK: Content flagged by safety filter. Try a different concept.";
                                break;
                            }

                            if (raw.candidates && raw.candidates[0].content && raw.candidates[0].content.parts) {
                                let text = raw.candidates[0].content.parts[0].text;
                                // Robust JSON Extraction
                                const jsonMatch = text.match(/\{[\s\S]*\}/);
                                if (jsonMatch) text = jsonMatch[0];
                                
                                aiResult = JSON.parse(text);
                                // Gemini token tracking
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
                    if(!gemSuccess) throw new Error(`Gemini Neural Bridge Failed: ${gemError}`);
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

                showToast(usedDirect ? "NEURAL BRIDGE: DIRECT CLOUD" : "NEURAL BRIDGE: SECURE HUB");
                if(status) { status.textContent = "CONTENT COMPLETE. SYNTHESIZING VISUALS..."; status.style.color = "var(--admin-cyan)"; }

                // --- CHAIN IMAGE GENERATION ---
                // Only generate if we have a prompt AND logic dictates (e.g. if we want to change it)
                if (aiResult.image_prompt) {
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
            if(status) { status.textContent = "ERROR: " + err.message; status.style.color = "#ff4444"; }
            showToast("AI ERROR: " + err.message);
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
            const base = window.OTP ? window.OTP.getApiBase() : (window.OTP_CONFIG?.apiBase || window.location.origin);
            const localKeyBackup = localStorage.getItem('cloud_openai');
            
            const res = await fetch(base + '/api/ai/generate-image', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + state.token
                },
                body: JSON.stringify({ prompt, title, aspect_ratio: 'landscape', cloud_key: localKeyBackup })
            });

            const data = await res.json();
            if (data.success && data.url) {
                document.getElementById('imageUrl').value = data.url;
                document.getElementById('urlInput').value = data.url;
                
                const prevImg = document.getElementById('previewImg');
                const prevDiv = document.getElementById('imagePreview');
                if (prevImg && prevDiv) {
                    prevImg.src = data.url;
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
                'gemini': 'LIMITS: 15 req/min (Oracle V2.5 Tier)',
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

        const personalKey = localStorage.getItem(`cloud_${provider}`);
        const hasServerKey = state.token && state.token !== 'static-bypass-token';

        if (personalKey) {
            hubDot.style.background = 'var(--admin-cyan)';
            hubText.textContent = `UPLINK: DIRECT CLOUD (USING PERSONAL KEY)`;
            hubText.style.color = 'var(--admin-cyan)';
        } else if (hasServerKey) {
            hubDot.style.background = 'var(--admin-success)';
            hubText.textContent = `UPLINK: SECURE SERVER HUB (NO KEY REQUIRED)`;
            hubText.style.color = 'var(--admin-success)';
        } else {
            hubDot.style.background = 'var(--admin-danger)';
            hubText.textContent = `UPLINK: DISCONNECTED (KEY REQUIRED)`;
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

            // --- 2. Construct Preview HTML ---
            const imageHtml = image ? `<div style="margin-bottom: 30px;"><img src="${image}" style="width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.3);" /></div>` : '';
            const excerptHtml = excerpt ? `<p style="font-size: 1.2rem; color: var(--admin-muted); font-style: italic; margin-bottom: 30px; line-height: 1.6;">${excerpt}</p>` : '';
            
            const html = `
                <div style="max-width: 720px; margin: 0 auto; font-family: 'Inter', sans-serif; color: var(--admin-text);">
                    ${imageHtml}
                    <div style="border-bottom: 1px solid var(--admin-border); margin-bottom: 35px; padding-bottom: 25px;">
                        <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 3rem; line-height: 1.1; margin-bottom: 15px; color: #fff; font-weight: 700;">${title}</h1>
                        ${excerptHtml}
                    </div>
                    <div class="otp-content blog-content" style="font-size: 1.1rem; line-height: 1.8;">
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
        if(!modal) return;
        
        document.getElementById('actionModalTitle').textContent = title;
        document.getElementById('actionModalText').textContent = text;
        
        if (inputMode) {
            inputContainer.style.display = 'block';
            inputField.placeholder = inputPlaceholder;
            inputField.value = '';
            setTimeout(() => inputField.focus(), 100);
        } else {
            inputContainer.style.display = 'none';
        }

        const btn = document.getElementById('confirmActionBtn');
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
            const res = await fetch('/DEPLOY_V1.3.sql');
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

        entry.innerHTML = `<span style="opacity:0.4">[${timestamp}]</span> <span style="color:${color}; font-weight:bold;">${msg}</span>`;
        
        logContainer.prepend(entry);
        if(logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    };

    // --- ENHANCED LIVE TRAFFIC SIMULATION ---
    function initTrafficUplink() {
        const pingContainer = document.getElementById('geoPings');
        if (!pingContainer) return;

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
                            <span style="font-size: 0.6rem; color: #fff; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${pageLabel}</span>
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
                <div style="font-size:0.72rem; color:${isReal ? '#fff' : 'var(--admin-text)'}; font-weight:${isReal ? '700' : '400'};">${label}</div>
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
    
    // EXPOSE SYSTEM HEALTH TO WINDOW
    window.checkSystemHealth = async function() {
        try {
            const API_BASE = window.OTP ? window.OTP.getApiBase() : (window.OTP_CONFIG?.apiBase || '');
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
                    const localGemini = localStorage.getItem('cloud_gemini');
                    const localOpenAI = localStorage.getItem('cloud_openai');
                    const localAnthropic = localStorage.getItem('cloud_anthropic');
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

    // DELAYED TRAFFIC BOOT
    setTimeout(initTrafficUplink, 2000);

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