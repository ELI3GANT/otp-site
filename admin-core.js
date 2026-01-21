/**
 * ADMIN CORE V10.5 (RELEASE)
 * Centralized logic for the OTP Admin Panel.
 * Handles: Server-side Auth, Secure API Proxy, Supabase Connection.
 */

(function() {
    console.log("🚀 ADMIN CORE V10.5 RELEASE: Boot sequence initiated...");

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
        // Auto-login check
        if (state.token) {
             // Simple JWT Expiry Check
             try {

                 if (state.token !== 'static-bypass-token') {
                     const payload = JSON.parse(atob(state.token.split('.')[1]));
                     const now = Math.floor(Date.now() / 1000);
                     if (payload.exp && payload.exp < now) {
                         console.warn("Session Expired");
                         window.logout();
                         return;
                     }
                 } else {
                     // SECURITY: Only allow static bypass on localhost
                     if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                         console.warn("⚠️ STATIC TOKEN INVALID IN PRODUCTION");
                         window.logout();
                         return;
                     }
                 }
                 console.log("🔄 Found existing session token.");
                 updateDiagnostics('auth', 'SECURE SESS', 'var(--success)');
             } catch(e) {
                 console.warn("Token Parse Error:", e);
                 // Don't logout immediately on parse error to allow legacy tokens, but warn
             }
        }

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
            updateDiagnostics('db', `CONNECTED`, 'var(--success)');
            showToast("SYSTEM ONLINE");
            
            // Activate Dot
            const dot = document.getElementById('dbStatusDot');
            if(dot) dot.classList.add('active');

            // Load Posts for Manager & Stats
            fetchPosts();
            fetchCategories();
            fetchArchetypes();
            fetchInbox();
            fetchLeads();
            
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
                else if (isRemote) statusTag = '<span style="color:#00ffaa; filter: drop-shadow(0 0 5px #00ffaa); font-weight:bold;">[NODE:SECURE]</span>';

                // Update only time every second, not status checks
                setInterval(() => {
                    const now = new Date();
                    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
                    clockEl.innerHTML = `${statusTag} ${timeStr}`;
                }, 1000);
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
            
            // Satellite URL: Load & Validate
            if(satUrl) {
                // Force default secure URL if not set
                let storedUrl = localStorage.getItem('otp_api_base');
                if (!storedUrl || storedUrl === 'http://localhost:3000') {
                    storedUrl = 'https://otp-site.vercel.app';
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

            // 6. SITE COMMAND UPLINK (Realtime & Vice-Versa Sync)
            state.siteChannel = state.client.channel('site_state');
            
            state.siteChannel.on('broadcast', { event: 'command' }, (message) => {
                console.log("📡 REMOTE COMMAND RECEIVED:", message);
                const { type, value } = message.payload || {};
                
                // 1. Show Broadcast Alerts (Cinematic Sync)
                if (type === 'alert') {
                    if (window.OTP && window.OTP.showBroadcast) {
                        window.OTP.showBroadcast(value);
                    } else {
                        showToast(`BROADCAST: ${value}`);
                    }
                }
                
                // 2. Sync Dashboard UI Buttons
                if (['maintenance', 'visuals', 'kursor', 'theme'].includes(type)) {
                    syncDashboardElement(type, value);
                    
                    // Dashboard Theme Sync (Apply theme to self)
                    if (type === 'theme') {
                        const html = document.documentElement;
                        if (value === 'light') html.setAttribute('data-theme', 'light');
                        else html.removeAttribute('data-theme');
                        
                        const btns = document.querySelectorAll('.theme-btn');
                        btns.forEach(btn => btn.textContent = value === 'light' ? '☀️' : '🌗');
                    }
                    
                    showToast(`CONTROL SYNCED: ${type.toUpperCase()}`);
                }
            });

            state.siteChannel.subscribe((status) => {
                console.log("📡 SITE COMMAND UPLINK:", status);
                if(status === 'SUBSCRIBED') {
                    const centerDot = document.getElementById('aiStatusDot');
                    if(centerDot) centerDot.style.background = 'var(--admin-success)';
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

        if (type === 'maintenance') {
            const isOn = value === 'on';
            el.textContent = isOn ? 'ACTIVE' : 'OFFLINE';
            el.style.color = isOn ? 'var(--admin-success)' : 'var(--admin-danger)';
        } else if (type === 'visuals') {
            const isHi = value === 'high';
            el.textContent = isHi ? 'HIGH-FI' : 'PERF-MODE';
            el.style.color = isHi ? 'var(--admin-success)' : 'var(--accent2)';
        } else if (type === 'kursor') {
            const isOn = value === 'on';
            el.textContent = isOn ? 'ACTIVE' : 'DISABLED';
            el.style.color = isOn ? 'var(--admin-success)' : 'var(--admin-muted)';
        } else if (type === 'theme') {
            const isDay = value === 'light';
            el.textContent = isDay ? 'DAY-MODE' : 'NIGHT-MODE';
            el.style.color = isDay ? '#ffaa00' : 'var(--accent2)';
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

    // --- AUTH UTILS ---
    window.logout = function() {
        localStorage.removeItem('otp_admin_token');
        window.location.href = 'portal-gate.html?reason=logout';
    };

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

            // Ensure extension matches MIME type (jpeg)
            const fileExt = "jpg"; // optimizedImage returns image/jpeg
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
        const el = document.getElementById('archetype');
        if (!el) return;
        const current = el.value;
        const escape = window.escapeHtml || (s => s);
        el.innerHTML = state.archetypes.map(a => `<option value="${escape(a.slug)}">${escape(a.name)}</option>`).join('');
        if (current) el.value = current;
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
                ({ error } = await state.client.from('categories').update({ name, slug }).eq('id', id));
            } else {
                ({ error } = await state.client.from('categories').insert([{ name, slug }]));
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
                    const { error } = await state.client.from('categories').delete().eq('id', id);
                    if (error) throw error;
                    showToast("CATEGORY DELETED");
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
                ({ error } = await state.client.from('ai_archetypes').update(payload).eq('id', id));
            } else {
                ({ error } = await state.client.from('ai_archetypes').insert([payload]));
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
        const a = state.archetypes.find(arch => arch.id == id);
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
            // Fetch ALL posts (no date filter, no status filter so we see drafts too)
            const { data: posts, error } = await state.client
                .from('posts')
                .select('id, title, created_at, published, views, slug')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Update Cache
            postsCache = posts;
            lastFetchTime = now;

            renderPosts(posts);
            updateStats(posts);

        } catch (err) {
            console.error("POST FETCH ERROR:", err);
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
            let query = state.client
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Performance cap

            // Apply Filters
            if (filter === 'active') {
                // 'new', 'processing', 'drafted', 'pending' - basically anything not completed/archived
                 query = query.not('ai_status', 'in', '("completed","archived")');
            } else if (filter === 'completed') {
                query = query.eq('ai_status', 'completed');
            } else if (filter === 'archived') {
                query = query.eq('ai_status', 'archived');
            }
            
            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                inbox.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">NO COMMS FOUND IN THIS CHANNEL</div>';
                return;
            }

            inbox.innerHTML = data.map(c => {
                const isDrafted = c.draft_reply && c.draft_reply.length > 0;
                let statusColor = '#ffaa00';
                let statusText = 'PENDING';
                
                if (c.ai_status === 'completed') { statusColor = 'var(--admin-success)'; statusText = 'COMPLETED'; }
                else if (c.ai_status === 'archived') { statusColor = '#666'; statusText = 'ARCHIVED'; }
                else if (isDrafted) { statusColor = 'var(--admin-cyan)'; statusText = 'DRAFT READY'; }

                return `
                <div class="post-row" style="display: block; padding: 15px; margin-bottom: 10px; cursor: default; border-left: 2px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                             <span style="font-weight: bold; color: var(--admin-accent); font-size: 0.9rem;">${window.escapeHtml(c.name)}</span>
                             <span style="color: var(--admin-muted); font-size: 0.8rem;"> &lt;${window.escapeHtml(c.email)}&gt;</span>
                             <span style="font-size: 0.65rem; color: var(--admin-muted); margin-left: 10px;">${new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <div style="font-size: 0.7rem; font-family: monospace; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 2px 6px; border-radius: 4px;">${statusText}</div>
                            <button type="button" onclick="return archiveContact('${c.id}', event)" title="Archive" style="background:transparent; border:none; color:var(--admin-muted); cursor:pointer;">📦</button>
                            <button type="button" onclick="return deleteContact('${c.id}', event)" title="Delete" style="background:transparent; border:none; color:var(--admin-danger); cursor:pointer;">✖</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem; margin-bottom: 10px; color: var(--admin-text);">
                        <div><span style="color: var(--admin-muted);">SERVICE:</span> ${window.escapeHtml(c.service || 'N/A')}</div>
                        <div><span style="color: var(--admin-muted);">BUDGET:</span> ${window.escapeHtml(c.budget || 'N/A')}</div>
                        <div style="grid-column: span 2;"><span style="color: var(--admin-muted);">MSG:</span> ${window.escapeHtml(c.message || '')}</div>
                    </div>

                    ${isDrafted ? `
                    <div style="background: rgba(0,0,0,0.3); border-left: 2px solid var(--admin-cyan); padding: 10px; margin-top: 10px;">
                        <div style="font-size: 0.65rem; color: var(--admin-cyan); margin-bottom: 5px; text-transform: uppercase;">// AI GENERATED RESPONSE</div>
                        <div style="font-size: 0.8rem; color: var(--admin-muted); white-space: pre-wrap; margin-bottom: 10px;">${c.draft_reply.substring(0, 150)}...</div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" onclick="copyDraft('${c.id}')" style="background: var(--admin-cyan); color: #000; border: none; padding: 5px 10px; font-size: 0.7rem; cursor: pointer; border-radius: 4px; font-weight: bold;">COPY DRAFT</button>
                            <button type="button" onclick="openReplyManager('${c.id}')" style="background: transparent; border: 1px solid var(--admin-cyan); color: var(--admin-cyan); padding: 5px 10px; font-size: 0.7rem; cursor: pointer; border-radius: 4px; font-weight: bold;">REVIEW & SEND</button>
                        </div>
                    </div>` : ''}
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
            const { data, error } = await state.client
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            if (!data || data.length === 0) {
                leads.innerHTML = '<div style="text-align: center; color: var(--admin-muted); padding: 20px;">NO LEADS CAPTURED YET</div>';
                return;
            }

            leads.innerHTML = data.map(l => {
                let answers = l.answers || {};
                if (typeof answers === 'string') {
                    try { answers = JSON.parse(answers); } catch(e) { answers = {}; }
                }
                return `
                <div class="post-row" style="display: block; padding: 15px; margin-bottom: 10px; cursor: default; border-left: 2px solid var(--admin-cyan);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                             <span style="font-weight: bold; color: var(--admin-accent); font-size: 0.9rem;">${l.email}</span>
                             <span style="font-size: 0.65rem; color: var(--admin-muted); margin-left: 10px;">${new Date(l.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <div style="font-size: 0.7rem; font-family: monospace; color: var(--admin-cyan); border: 1px solid var(--admin-cyan); padding: 2px 6px; border-radius: 4px;">AUDIT</div>
                            <button type="button" onclick="return deleteLead('${l.id}', event)" title="Delete" style="background:transparent; border:none; color:var(--admin-danger); cursor:pointer;">✖</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem; margin-bottom: 15px; color: var(--admin-text); background: rgba(0,0,0,0.1); padding: 10px; border-radius: 8px;">
                        <div><span style="color: var(--admin-muted);">GOAL:</span> ${answers.q1 || 'N/A'}</div>
                        <div><span style="color: var(--admin-muted);">HURDLE:</span> ${answers.q2 || 'N/A'}</div>
                        <div><span style="color: var(--admin-muted);">PLATFORM:</span> ${answers.q3 || 'N/A'}</div>
                        <div><span style="color: var(--admin-muted);">VIBE:</span> ${answers.q4 || 'N/A'}</div>
                        <div style="grid-column: 1 / -1; margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.1);"><span style="color: var(--accent2); font-weight:700;">TARGET:</span> ${answers.q5_goal || 'Not specified'}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.6); border-left: 2px solid var(--admin-accent); padding: 15px; border-radius: 4px; font-size: 0.85rem; line-height: 1.6;">
                        <div style="font-size: 0.6rem; color: var(--admin-accent); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">TACTICAL RESPONSE</div>
                        <div style="color: #ffffff;">${(l.advice || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
                `;
            }).join('');

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
                const executePurge = async (key) => {
                     showToast("INITIATING ADMIN FORCE PURGE...");
                     try {
                         const adminClient = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, key);
                         const { error } = await adminClient.from('leads').delete().gt('created_at', '1970-01-01');

                         if(error) throw error;
                
                         showToast("✅ SYSTEM PURGE COMPLETE. LEADS WIPED.");
                         await fetchLeads();
                         // Close modal if still open (cached key case)
                         modal.style.display = 'none';

                     } catch(e) {
                        console.error("Purge Error:", e);
                        if(e.message.includes('JWT')) {
                            window.otpServiceKey = null; 
                            showToast("ERROR: KEY INVALID");
                        } else {
                            showToast("PURGE FAILED: " + e.message);
                        }
                        // Reset button if modal still open
                        if(modal.style.display === 'flex') {
                            newBtn.textContent = "PURGE EVERYTHING";
                            newBtn.disabled = false;
                        }
                     }
                };

                // Logic Flow
                if (!window.otpServiceKey) {
                    modal.style.display = 'none'; // Close primary modal to show prompt
                    promptAction(
                        "SECURITY LOCK",
                        "Enter SUPABASE_SERVICE_KEY (starts with eyJ...) to bypass database locks:",
                        "eyJ...",
                        async (key) => {
                            if(!key) { showToast("PURGE CANCELLED"); return; }
                            window.otpServiceKey = key;
                            await executePurge(key);
                        }
                    );
                } else {
                    newBtn.textContent = "WIPING DATA...";
                    newBtn.disabled = true;
                    await executePurge(window.otpServiceKey);
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
                
                showToast("WIPING SECURE COMMS...");
        
                try {
                    const { error } = await state.client.from('contacts').delete().not('id', 'is', null);
                    if(error) throw error;
                    
                    showToast("✅ INBOX WIPED CLEAN.");
                    await fetchInbox();
                    modal.style.display = 'none';
                } catch(e) {
                    console.error("Purge Error:", e);
                    showToast("PURGE FAILED: " + e.message);
                    modal.style.display = 'none';
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

    // Cache Purge / Refresh Command
    window.refreshLiveSite = async function() {
        if(!state.siteChannel) return showToast("OFFLINE: CANNOT SYNC");
        
        await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'refresh', value: Date.now() } });
        showToast("🔄 CACHE PURGE COMMAND SENT");
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
                     // 1. Try Standard Delete first
                     const { error } = await state.client.from('leads').delete().eq('id', id);
                     if(error) throw error;
                     showToast("LEAD DELETED");
                     await fetchLeads();
                     modal.style.display = 'none';

                } catch(e) {
                    console.warn("Standard delete failed, attempting Admin Override...", e);
                    
                    // 2. Fallback to Service Key logic
                    let serviceKey = window.otpServiceKey;
                    
                    if (!serviceKey) {
                        serviceKey = prompt("⚠️ PERMISSION DENIED. Enter SUPABASE_SERVICE_KEY to force delete:");
                        if(!serviceKey) {
                            showToast("DELETE CANCELLED");
                            modal.style.display = 'none';
                            return;
                        }
                        window.otpServiceKey = serviceKey;
                    }

                    try {
                        const adminClient = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, serviceKey);
                        const { error: adminError } = await adminClient.from('leads').delete().eq('id', id);
                        
                        if(adminError) throw adminError;
                        
                        showToast("LEAD DELETED (ADMIN OVERRIDE)");
                        await fetchLeads();
                        modal.style.display = 'none';

                    } catch (finalErr) {
                         console.error("Force Delete Failed:", finalErr);
                         if(finalErr.message.includes('JWT')) window.otpServiceKey = null;
                         showToast("DELETE FAILED: " + finalErr.message);
                    }
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

    window.openReplyManager = function(id) {
        const c = window.inboxCache.find(x => x.id == id);
        if(!c) return;
        
        document.getElementById('replyContactId').value = c.id;
        document.getElementById('replyContactEmail').value = c.email;
        document.getElementById('replyContactName').value = c.name;
        document.getElementById('replyIncomingMsg').textContent = c.message;
        document.getElementById('replyDraftContent').value = c.draft_reply || '';
        
        // Render Analysis if present
        const analysisDiv = document.getElementById('replyAnalysis');
        if(c.ai_analysis) {
             analysisDiv.innerHTML = '<pre style="white-space:pre-wrap; font-family:monospace; font-size:0.7em;">' + JSON.stringify(c.ai_analysis, null, 2) + '</pre>';
        } else {
             analysisDiv.textContent = "No analysis data.";
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

            const systemPrompt = `You are an elite business consultant and executive assistant. 
            Your task is to draft a professional, warm, and high-conversion reply to a potential lead.
            
            Lead Name: ${name}
            Lead Email: ${email}
            Incoming Message: "${msg}"
            
            Guidelines:
            - Tone: Professional, Confident, Welcoming, Premium.
            - Focus: Acknowledge their specific request, offer to schedule a discovery call, and express excitement about potentially working together.
            - Format: Plain text email body. Do not include subject line unless asked. Do not include placeholders like "[Your Name]" - sign off as "The Team" or just "Best,".
            `;

            let replyText = "";
            let usedDirect = false;

            // 1. Try Server Proxy (if available) - Reusing /api/ai/generate endpoint logic if it supports generic completion?
            // Actually, /api/ai/generate is strictly JSON for posts. Let's use direct keys for Speed/Reliability on this specific tool or a simple chat completion.
            // For now, let's implement the DIRECT CLOUD LINK primarily for this "Quick Action" to avoid schema validation issues with the blog generator.
            
            const cloudKey = personalKeys[provider];
            if (!cloudKey && provider !== 'groq') throw new Error(`NO API KEY FOUND FOR ${provider.toUpperCase()}`);

            if (provider === 'openai') {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [{ role: 'system', content: "You represent a high-end agency." }, { role: 'user', content: systemPrompt }]
                    })
                });
                const data = await res.json();
                if(data.error) throw new Error(data.error.message);
                replyText = data.choices[0].message.content;
            } 
            else if (provider === 'gemini') {
                 // Google Gen AI REST
                 const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cloudKey}`;
                 const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt }] }]
                    })
                });
                const data = await res.json();
                if(data.error) throw new Error(data.error.message);
                replyText = data.candidates[0].content.parts[0].text;
            }
            else {
                // Fallback / Groq / Anthropic (Simple impl)
                throw new Error("Only OpenAI / Gemini supported for Quick Reply currently.");
            }

            // Stream simulation or just paste
             draftBox.value = replyText.trim();
             showToast("REPLY GENERATED");

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
            const { error } = await state.client.from('contacts').update({ draft_reply: content }).eq('id', id);
            if(error) throw error;
            showToast("DRAFT UPDATED");
            // Update cache locally to reflect change immediately without refetch
            const c = window.inboxCache.find(x => x.id == id);
            if(c) c.draft_reply = content;
            await fetchInbox(); 
        } catch(e) { showToast("SAVE FAILED: " + e.message); }
    };

    window.launchMailClient = function() {
    const email = document.getElementById('replyContactEmail').value;
    const name = document.getElementById('replyContactName').value;
    const content = document.getElementById('replyDraftContent').value;
    
    // Clean and Professional Subject
    const subjectName = name ? ` // ${name}` : '';
    const subject = `Inquiry Reply: Only True Perspective${subjectName}`;
    
    // Ensure content is safe for URL
    const safeSubject = encodeURIComponent(subject);
    const safeBody = encodeURIComponent(content);
    
    const mailto = `mailto:${email}?subject=${safeSubject}&body=${safeBody}`;
    
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
                const { error } = await state.client.from('contacts').update({ ai_status: 'completed' }).eq('id', id);
                if(error) throw error;
                showToast("MARKED AS COMPLETED");
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
                     const { error } = await state.client.from('contacts').update({ ai_status: 'archived' }).eq('id', id);
                     if(error) throw error;
                     showToast("ARCHIVED");
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
        
        if(titleEl) titleEl.textContent = "DELETE LEAD?";
        if(descEl) descEl.innerHTML = "This will permanently remove the contact.<br>This cannot be undone.";

        if(modal && confirmBtn) {
            // Remove old listeners by cloning
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            
            newBtn.onclick = async () => {
                newBtn.textContent = "DELETING...";
                newBtn.disabled = true;
                
                try {
                     // Try Server Delete first
                     const res = await fetch('/api/admin/delete-post', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ id: id, table: 'contacts' }) 
                    });
                    const data = await res.json();
                    
                    if(data.success) {
                         showToast("CONTACT DELETED");
                         modal.style.display = 'none';
                         await fetchInbox();
                         window.refocusInbox();
                    } else {
                         throw new Error(data.message);
                    }
                } catch(e) {
                     console.warn("Server delete failed, trying direct...", e);
                     const { error } = await state.client.from('contacts').delete().eq('id', id);
                     if(error) { showToast("DELETE FAILED: " + error.message); }
                     else { 
                         showToast("CONTACT DELETED");
                         modal.style.display = 'none';
                         await fetchInbox();
                         window.refocusInbox();
                     }
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
            list.innerHTML = `<div style="text-align: center; color: #666; font-size: 0.8rem; padding: 20px;">NO POSTS FOUND</div>`;
            return;
        }

        list.innerHTML = posts.map(post => {
            const isLive = post.published === true;
            return `
            <div class="post-row ${isLive ? 'row-active-live' : ''}">
                <div style="cursor: pointer; flex: 1;" onclick="loadPostForEdit(${post.id})">
                    <div class="post-title">${window.escapeHtml(post.title || 'Untitled')} <span style="font-size:0.7em; color:var(--admin-accent); margin-left:5px;">(EDIT)</span></div>
                    <div class="post-meta">${new Date(post.created_at).toLocaleDateString()} • <span class="theme-active" style="color:var(--admin-success); font-weight:bold;">${post.views || 0}</span> Views</div>
                    <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                        ${(post.tags || []).map(t => `<span style="font-size: 0.55rem; color: var(--admin-cyan); background: rgba(0, 195, 255, 0.05); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(0, 195, 255, 0.1);">#${window.escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
                <div class="status-badge ${isLive ? 'status-live' : 'status-draft'}">
                    ${isLive ? 'LIVE' : 'DRAFT'}
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${isLive && post.slug ? (() => {
                        let postUrl = `/insight.html?slug=${post.slug}`;
                        if (post.slug === 'spooky-luh-ooky') postUrl = '/spooky-luh-ooky.html';
                        return `
                            <a href="${postUrl}" target="_blank" class="view-btn" title="View Live" style="text-decoration:none; padding: 6px 12px; font-size: 0.7rem; border: 1px solid var(--admin-border); color: var(--admin-text); border-radius: 4px;">VIEW</a>
                            <button type="button" onclick="copyPostLink('${post.slug}')" title="Copy Link" style="background: transparent; border: 1px solid var(--admin-border); color: var(--admin-muted); padding: 6px 10px; border-radius: 4px; font-size: 0.7rem;">🔗</button>
                        `;
                    })() : ''}
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
            // 1. Try Secure Server Delete
            try {
                const res = await fetch('/api/admin/delete-post', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ id: targetId, table: 'posts' }) // Explicitly tell server to use posts
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                         showToast("POST TERMINATED (SECURE)");
                         finishDelete();
                         return;
                    }
                }
            } catch(serverErr) {
                console.warn("Server delete failed, trying client-side fallback...");
            }

            // 2. Static Fallback (Client-Side)
            const { error } = await state.client.from('posts').delete().eq('id', targetId);
            if (error) throw error;
            
            showToast("POST TERMINATED (CLIENT)");
            finishDelete();

        } catch (err) {
            console.error("❌ DELETION FAILED:", err);
            showToast("DELETION FAILED: " + err.message);
        } finally {
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
            const arch = state.archetypes.find(a => a.slug === slug);
            if (!arch) return;
            const newCount = (arch.usage_count || 0) + 1;
            await state.client.from('ai_archetypes').update({ usage_count: newCount }).eq('slug', slug);
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
                    const res = await fetch('/api/admin/delete-post', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ slug: slug })
                    });
                     // (Fetch continuation is handled by original code flow if I match correctly)
                    // Wait, I need to include the rest of the function because I replaced the top block.
                    // The original code had the try/catch AFTER the confirm.
                    if (res.ok) {
                        showToast(`RELEASE KILLED: ${slug}`);
                        const inputFn = document.getElementById('manualDeleteSlug');
                        if(inputFn) inputFn.value = '';
                        fetchPosts(true);
                    } else {
                        throw new Error("Deletion Failed");
                    }
                } catch(e) {
                     showToast("KILL FAILED: " + e.message);
                }
            }
        );
    };

    // NEW: Manual Form Submission Handler (since form is now a div)
    // --- POST MANAGEMENT ---
    window.managePost = async function() {
        const id = document.getElementById('postIdInput')?.value;
        const title = document.getElementById('titleInput')?.value.trim();
        const content = document.getElementById('descInput')?.value.trim();
        const slugRaw = document.getElementById('slugInput')?.value.trim();
        const tagsRaw = document.getElementById('tagsInput')?.value.trim();
        const imageUrl = document.getElementById('imageUrl')?.value;

        if (!title) throw new Error("HEADLINE REQUIRED");

        // Auto-Generate Slug if empty
        let slug = slugRaw;
        if (!slug) {
            slug = title.toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove non-word chars
                .replace(/\s+/g, '-')     // Replace spaces with -
                .replace(/--+/g, '-')     // Replace multiple - with single
                .trim();
        }

        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];

        const payload = {
            title,
            content,
            slug,
            tags,
            image_url: imageUrl,
            published: true, // "Commence Broadcast" = Live
            updated_at: new Date().toISOString()
        };

        if (id) {
            // UPDATE
            console.log("📝 UPDATING POST:", id);
            const { error } = await state.client.from('posts').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            // INSERT
            console.log("📝 CREATING POST");
            payload.created_at = new Date().toISOString();
            const { error } = await state.client.from('posts').insert([payload]);
            if (error) throw error;
        }
        
        resetForm();
        await fetchPosts(true); // Force refresh
    };

    window.handlePostSubmit = async function(event) {
        if(event) { event.preventDefault(); event.stopPropagation(); }
        
        // Manual Validation
        const title = document.getElementById('titleInput')?.value.trim();
        const desc = document.getElementById('descInput')?.value.trim();
        
        if (!title) {
            showToast("ERROR: HEADLINE REQUIRED");
            document.getElementById('titleInput')?.focus();
            return;
        }
        if (!desc) {
             showToast("ERROR: BRIEFING REQUIRED");
             document.getElementById('descInput')?.focus();
             return;
        }

        // Show loading state
        const btn = document.getElementById('submitBtn');
        const ogText = btn.textContent;
        btn.textContent = "TRANSMITTING...";
        btn.disabled = true;

        try {
            await window.managePost();
            showToast("TRANSMISSION SUCCESSFUL");
        } catch (e) {
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
                const isSpooky = post.slug.includes('spooky');
                const isElegant = post.slug.includes('eli3gant');
                const wordCount = (post.content || "").trim().split(/\s+/).filter(w => w.length > 0).length;
                return !isSpooky && !isElegant && wordCount < 50;
            });

            if (trash.length === 0) {
                showToast("NO TRASH DETECTED");
                if(modal) modal.style.display = 'none';
                return;
            }

            const idsToDelete = trash.map(t => t.id);
            const { error: deleteError } = await state.client.from('posts').delete().in('id', idsToDelete);
            if (deleteError) throw deleteError;

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
            const { data, error } = await state.client.storage.from('uploads').list('blog', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
            
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
            t.style.background = 'transparent';
            t.style.color = 'var(--admin-muted)';
            t.style.border = '1px solid var(--admin-border)';
        });
        document.querySelectorAll('.prev-content').forEach(c => c.style.display = 'none');
        
        const btn = document.getElementById('tab-' + platform);
        if(btn) {
            btn.style.background = platform === 'x' ? '#333' : 'var(--admin-accent)';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.display = 'flex'; // Preserve flex for icons
        }
        const content = document.getElementById('preview-' + platform);
        if(content) content.style.display = 'block';
    };

    window.updateSocialPreview = function() {
        const title = document.getElementById('titleInput').value || "Headline Appears Here";
        const desc = document.getElementById('seoDesc').value || document.getElementById('excerptInput').value || "Description appears here...";
        const img = document.getElementById('imageUrl').value || document.getElementById('urlInput').value;
        
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
    document.addEventListener('input', (e) => {
        if(['titleInput', 'seoDesc', 'excerptInput', 'imageUrl', 'urlInput'].includes(e.target.id)) {
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
        btn.textContent = "SYNTHESIZING...";
        btn.disabled = true;
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
            const archetype = state.archetypes.find(a => a.slug === selectedArchSlug);
            const baseSystemPrompt = archetype ? archetype.system_prompt : 'You are a professional blog writer.';

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

            if (authToken !== 'static-bypass-token') {
                try {
                    if(status) { status.innerHTML = `<span class="blink">📡 CONTACTING SECURE HUB...</span>`; }
                    const base = localStorage.getItem('otp_api_base') || window.location.origin;
                    const res = await fetch(base + '/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                        body: JSON.stringify({ prompt, archetype: archetypeInput ? archetypeInput.value : 'technical', provider: provider || 'openai', model, title: currentTitle, systemPrompt: sysPrompt })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        aiResult = data.data;
                        if (data.usage) trackAICost(provider, data.usage.total_tokens);
                        else trackAICost(provider, 1200); // Estimate if usage missing from proxy
                    } else {
                        console.warn("Secure Hub Failed/Unauthorized. Checking Cloud Failover.");
                    }
                } catch (e) {
                    console.warn("Secure Hub Offline. Checking Cloud Failover.");
                }
            }

            // --- FAILOVER: TRY DIRECT CLOUD LINK ---
            if (!aiResult) {
                usedDirect = true;
                const cloudKey = personalKeys[provider];
                if (!cloudKey) throw new Error(`Neural Link Blocked: Server Hub is offline and no personal key found for ${provider.toUpperCase()} in Cloud Settings.`);
                
                if(status) { status.innerHTML = `<span class="blink">🚀 DIRECT CLOUD LINK ACTIVE...</span>`; }

                if (provider === 'openai') {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudKey}` },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
                            response_format: { type: "json_object" }
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
                            messages: [{ role: 'user', content: sysPrompt + "\n\n" + userPrompt }]
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
                            response_format: { type: "json_object" }
                        })
                    });
                    const raw = await res.json();
                    if(raw.error) throw new Error(raw.error.message);
                    aiResult = JSON.parse(raw.choices[0].message.content);
                    if (raw.usage) trackAICost('groq', raw.usage.total_tokens);
                }
                else if (provider === 'gemini') {
                    const gemModel = model || 'gemini-2.5-flash';
                    const endpoints = ['v1beta', 'v1'];
                    let gemSuccess = false;
                    for (const v of endpoints) {
                        try {
                            const payload = { 
                                contents: [{ parts: [{ text: sysPrompt + "\n\n" + userPrompt }] }] 
                            };
                            // Add Native JSON Mode for v1beta
                            if (v === 'v1beta') {
                                payload.generationConfig = { response_mime_type: "application/json" };
                            }

                            const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${gemModel}:generateContent?key=${cloudKey}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                            const raw = await res.json();
                            if(!raw.error) {
                                const text = raw.candidates[0].content.parts[0].text;
                                aiResult = JSON.parse(text.replace(/```json|```/g, '').trim());
                                // Gemini token tracking
                                if (raw.usageMetadata) trackAICost('gemini', raw.usageMetadata.totalTokenCount);
                                else trackAICost('gemini', 1000); 
                                gemSuccess = true; break;
                            }
                        } catch(e) {}
                    }
                    if(!gemSuccess) throw new Error("Gemini Neural Bridge Failed. Check key permissions.");
                }
            }

            if (aiResult) {
                // 1. Populate Text Fields
                if(aiResult.content) document.getElementById('contentArea').value = aiResult.content;
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
            }

        } catch (err) {
            console.error("AI ERROR:", err);
            if(status) { status.textContent = "ERROR: " + err.message; status.style.color = "#ff4444"; }
            showToast("AI ERROR: " + err.message);
        } finally {
            btn.textContent = "⚡ TRANSMIT";
            btn.disabled = false;
        }
    }

    async function triggerImageGenerator(prompt, title) {
        // VERCEL HOBBY FIX: Prioritize Client-Side Generation if Key Exists
        // This bypasses the 10s Serverless Function Timeout limit on free tiers.
        const localKey = localStorage.getItem('cloud_openai');
        
        if (localKey) {
            try {
                console.log("🚀 USING CLIENT-SIDE GENERATION (BYPASS SERVER TIME LIMIT)...");
                const res = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localKey}`
                    },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: `High-tech, cinematic, professional photography/render for a brand called 'Only True Perspective'. Subject: ${prompt}. Style: Dark, futuristic, minimal, deep purples and cyans. High resolution, 4k. Title reference: ${title}`,
                        n: 1,
                        size: "1024x1024",
                        quality: "hd"
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                
                // Success - Use the URL directly (Note: OpenAI URLs expire, but for instant preview/upload it works)
                // ideally we would upload this to Supabase here, but for now we just show it.
                // To make it permanent, we trigger an upload from URL if possible, or just let the user save it.
                // BETTER: We can download the blob client side and use handleFileUpload logic!
                
                const tempUrl = data.data[0].url;
                
                // Auto-Upload to preserve it (since we have the URL)
                // We'll reuse the handleFileUpload logic by fetching the blob
                const imgRes = await fetch(tempUrl);
                const blob = await imgRes.blob();
                const file = new File([blob], `gen-${Date.now()}.png`, { type: 'image/png' });
                
                // Mock an event for handleFileUpload
                handleFileUpload({ target: { files: [file] } });
                
                trackAICost('openai', 2000);
                showToast("CLIENT-SIDE SYNTHESIS COMPLETE");
                return; // Exit, don't try server

            } catch (clientErr) {
                console.warn("Client Gen Failed:", clientErr);
                showToast("CLIENT GEN FAILED: " + clientErr.message);
                // Fallthrough to server attempt just in case
            }
        }

        try {
            const base = localStorage.getItem('otp_api_base') || window.location.origin;
            const res = await fetch(base + '/api/ai/generate-image', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + state.token
                },
                body: JSON.stringify({ prompt, title, aspect_ratio: 'landscape' })
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
                
                trackAICost('openai', 2000); 
                showToast("VISUAL SYNTHESIS COMPLETE");
            } else {
                throw new Error(data.message || "Image Gen Failed");
            }
        } catch (e) {
            console.warn("Image Synthesis Failed, using fallback visual.", e);
            // Fallback to rotator of nice tech images
            const fallbacks = [
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop", // Space
                "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop", // Chip
                "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1920&auto=format&fit=crop", // Cyberpunk City
                "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?q=80&w=1920&auto=format&fit=crop"  // Nebula
            ];
            const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            
            document.getElementById('imageUrl').value = fallback;
            document.getElementById('urlInput').value = fallback;
            showToast("IMAGE GEN FAILED: USING FALLBACK");
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
                'groq': 'LIMITS: ~30 requests / min (FREE)',
                'gemini': 'LIMITS: 15 requests / min (FREE TIER)',
                'openai': 'LIMITS: Usage-based (PAID)',
                'anthropic': 'LIMITS: Usage-based (PAID)'
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
        let postUrl = '/insight.html?slug=' + slug;
        if (slug === 'spooky-luh-ooky') postUrl = '/spooky-luh-ooky.html';
        if (slug.startsWith('insight-post-')) postUrl = `/${slug}.html`;

        const url = window.location.origin + postUrl;
        navigator.clipboard.writeText(url);
        showToast("LINK COPIED TO CLIPBOARD");
    };

    window.openDraftPreview = function() {
        const title = document.getElementById('titleInput').value || "UNTITLED BROADCAST";
        let content = document.getElementById('contentArea').value || "_No content captured._";
        const image = document.getElementById('imageUrl').value;
        
        // --- 1. Basic Markdown Parsing ---
        // Headers
        content = content.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        content = content.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        content = content.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        // Bold/Italic
        content = content.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
        content = content.replace(/\*(.*)\*/gim, '<i>$1</i>');
        // Lists
        content = content.replace(/^\s*-\s+(.*)/gm, '<li>$1</li>');
        content = content.replace(/^\s*\d+\.\s+(.*)/gm, '<li>$1</li>'); // Numbered handled locally
        // Wrap lists (Simplistic)
        content = content.replace(/(<li>.*<\/li>)/gsm, '<ul>$1</ul>');
        // Links
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        // Line Breaks
        content = content.replace(/\n/g, '<br>');

        // --- 2. Construct Preview HTML ---
        const imageHtml = image ? `<img src="${image}" style="width:100%; border-radius:12px; margin-bottom:20px; border:1px solid #333;" />` : '';
        const html = `
            <div style="max-width: 680px; margin: 0 auto; font-family: 'Georgia', serif; font-size: 1.1rem; line-height: 1.8;">
                ${imageHtml}
                <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; line-height: 1.1; margin-bottom: 30px; border-bottom: 1px solid #333; padding-bottom: 20px;">${title}</h1>
                <div class="otp-content">${content}</div>
            </div>
        `;

        document.getElementById('previewTitleDisplay').textContent = "DEEP PREVIEW // " + title;
        document.getElementById('previewBodyDisplay').innerHTML = html;
        document.getElementById('previewModal').style.display = 'flex';
    };

    // --- SITE COMMAND PRO LOGIC ---
    // 4.8 PERSIST STATE HELPER
    async function persistSystemState(key, value) {
        try {
            // Fetch current state object first
            let { data: current } = await state.client
                .from('posts')
                .select('content')
                .eq('slug', 'system-global-state')
                .single();

            let config = {};
            if (current && current.content) {
                try { config = JSON.parse(current.content); } catch (e) {}
            } else {
                // If it doesn't exist, we must create it (first time run)
                // We'll handle creation via upsert logic below if needed, 
                // but for now let's assume we just need to get the object to update it.
            }

            config[key] = value;

            // Updated Upsert logic specifically for the config post
            const { error } = await state.client
                .from('posts')
                .upsert({ 
                    slug: 'system-global-state',
                    title: 'SYSTEM CONFIG [DO NOT DELETE]',
                    excerpt: 'Global persistent state for OTP Site Command Pro.',
                    content: JSON.stringify(config),
                    published: false, // Keep hidden from blog feed
                    category: 'System'
                }, { onConflict: 'slug' });

            if (error) console.error("Persist Error:", error);

        } catch (e) {
            console.error("State Persistence Failed:", e);
        }
    }

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

            // Local Admin Persistence
            localStorage.setItem('theme', nextTheme);
            if (nextTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
            else document.documentElement.removeAttribute('data-theme');

            statusEl.textContent = nextTheme === 'light' ? 'DAY-MODE' : 'NIGHT-MODE';
            statusEl.style.color = nextTheme === 'light' ? '#ffaa00' : 'var(--accent2)';
            showToast("THEME SYNCED TO NETWORK");
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
        
        let postUrl = '/insight.html?slug=' + slug;
        if (slug === 'spooky-luh-ooky') postUrl = '/spooky-luh-ooky.html';
        if (slug.startsWith('insight-post-')) postUrl = `/${slug}.html`;

        const url = `https://onlytrueperspective.tech${postUrl}`;
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

    window.triggerGlobalWarp = async function() {
        promptAction(
            "INITIATE GLOBAL WARP",
            "ENTER TARGET URL (e.g. google.com):",
            "https://",
            (target) => {
                if(!target) return;
                // Auto-fix URL
                target = target.trim();
                if (!target.startsWith('http')) target = 'https://' + target;

                confirmAction(
                    "CONFIRM WARP JUMP",
                    `REDIRECT ALL ACTIVE VISITORS TO: ${target}?`,
                    async () => {
                         if(!state.siteChannel) return;
                         await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'warp', value: target } });
                         showToast("GLOBAL WARP INITIATED");
                    }
                );
            }
        );
    };
    
    window.toggleLiveTheme = function() {
        toggleSiteControl('theme');
    };

    window.openBroadcastPrompt = async function() {
        promptAction(
            "EMERGENCY BROADCAST",
            "ENTER MESSAGE TO TRANSMIT:",
            "SYSTEM ALERT: ...",
            async (msg) => {
                if(!msg || !state.siteChannel) return;
                
                await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'alert', value: msg } });
                
                if (window.OTP && window.OTP.showBroadcast) {
                    window.OTP.showBroadcast(msg);
                }
                showToast("EMERGENCY BROADCAST SENT");
            }
        );
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
        
        if(!url) { 
            showToast("ENTER URL FIRST"); 
            if(input) input.style.borderColor = 'var(--admin-danger)';
            return; 
        }
        
        // Robust URL Regex Validation (Handles localhost and standard URLs)
        const urlPattern = /^(https?:\/\/)?(localhost|[\da-z.-]+\.[a-z.]{2,6})(:[\d]+)?([\/\w .-]*)*\/?$/;
        if (!urlPattern.test(url)) {
            showToast("INVALID URL FORMAT");
            if(input) input.style.borderColor = 'var(--admin-danger)';
            return;
        }

        if(input) input.style.borderColor = 'var(--admin-border)';
        
        // Auto-fix URL for test (Ensure protocol)
        if (!url.startsWith('http')) url = 'https://' + url;
        if (url.endsWith('/')) url = url.slice(0, -1);
        
        const healthUrl = url + '/api/health';
        showToast("PROBING SATELLITE...");
        console.log(`📡 Probing: ${healthUrl}`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for mobile

            const start = Date.now();
            
            // 1. Try Standard Check
            try {
                const res = await fetch(healthUrl, { 
                    method: 'GET', 
                    cache: 'no-cache',
                    signal: controller.signal 
                });
                
                clearTimeout(timeoutId);
                const latency = Date.now() - start;

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        showToast(`SATELLITE ONLINE (${latency}ms)`);
                        if(input) input.style.borderColor = 'var(--admin-success)';
                        return;
                    } 
                } 
                
                // If we get here, response wasn't 'success' but we did connect
                showToast(`SATELLITE REACHABLE (HTTP ${res.status})`);
                
            } catch (networkErr) {
                // 2. Fallback: Try NO-CORS (Opaque check)
                // This handles cases where server is up but CORS blocks the specific health check from this client origin
                console.warn("Standard probe failed, attempting opaque probe...", networkErr);
                
                try {
                    const modeRes = await fetch(healthUrl, { 
                        method: 'GET', 
                        mode: 'no-cors',
                        cache: 'no-cache',
                        signal: controller.signal 
                    });
                     clearTimeout(timeoutId);
                     showToast("LINK ESTABLISHED (OPAQUE)");
                     if(input) input.style.borderColor = 'var(--admin-success)';
                     return;
                } catch (opaqueErr) {
                    throw opaqueErr; // Real network failure
                }
            }
        } catch(e) {
            console.error("Link Test Failed:", e);
            if (e.name === 'AbortError') {
                showToast("PROBE TIMEOUT (15s) - CHECK SIGNAL");
            } else {
                showToast("LINK FAILED: CHECK URL / WIFI");
            }
            if(input) input.style.borderColor = 'var(--admin-danger)';
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

    // Presence Sync for Dashboard
    function initDashboardPresence() {
        if(!state.client) return;
        const room = state.client.channel('system');
        room.on('presence', { event: 'sync' }, () => {
            const state = room.presenceState();
            const count = Object.keys(state).length;
            const statEl = document.getElementById('statLive');
            if(statEl) statEl.textContent = count;
        }).subscribe();
    }
    // Call presence init after a small delay
    setTimeout(initDashboardPresence, 3000);

    // GLOBAL LOGOUT
    window.logout = function() {
        confirmAction("TERMINATE SESSION?", "Are you sure you want to log out of the secure terminal?", () => {
            localStorage.removeItem('otp_admin_token');
            localStorage.removeItem('otp_insights_cache');
            window.location.href = 'portal-gate.html';
        });
    };

})();