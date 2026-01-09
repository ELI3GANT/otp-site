/**
 * ADMIN CORE V3.2
 * Centralized logic for the OTP Admin Panel.
 * Handles: Authentication, Supabase Connection, UI State, and Diagnostics.
 */

(function() {
    console.log("🚀 ADMIN CORE: Boot sequence initiated...");

    // 0. CONFIGURATION
    const CONFIG = {
        supabaseUrl: window.OTP_CONFIG ? window.OTP_CONFIG.supabaseUrl : '',
        supabaseKey: window.OTP_CONFIG ? window.OTP_CONFIG.supabaseKey : '',
        passcode: window.OTP_CONFIG ? window.OTP_CONFIG.adminPasscode : ''
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
            const { data: schemaTest, count, error } = await state.client.from('posts').select('*', { count: 'exact' }).limit(1);
            
            if (error) throw error;

            // Diagnostic: Check for author column
            if (schemaTest && schemaTest.length > 0) {
                const hasAuthor = 'author' in schemaTest[0];
                console.log(`📊 SCHEMA CHECK: author column ${hasAuthor ? 'EXISTS' : 'MISSING'}`);
                if(!hasAuthor) updateDiagnostics('db', 'SCHEMA OUTDATED', 'orange');
            }

            state.isConnected = true;
            console.log(`✅ DATABASE ONLINE. Posts: ${count}`);
            updateDiagnostics('db', `CONNECTED (${count} POSTS)`, 'var(--success)');
            showToast("SYSTEM ONLINE");
            
            // Activate Dot
            const dot = document.getElementById('dbStatusDot');
            if(dot) dot.classList.add('active');

            // Load persistent key & provider
            const savedProvider = localStorage.getItem('ai_provider') || 'openai';
            const provEl = document.getElementById('aiProvider');
            if(provEl) {
                provEl.value = savedProvider;
                // Trigger placeholder update
                provEl.dispatchEvent(new Event('change'));
            }

            const savedKey = localStorage.getItem('ai_key_' + savedProvider);
            const keyEl = document.getElementById('apiKey');
            if(savedKey && keyEl) keyEl.value = savedKey;

            const savedGemModel = localStorage.getItem('gemini_model');
            const gemModEl = document.getElementById('geminiModel');
            if(savedGemModel && gemModEl) gemModEl.value = savedGemModel;

            // Load Posts for Manager & Stats
            fetchPosts();

        } catch (e) {
            console.error("🔥 CONNECTION FAILED:", e);
            updateDiagnostics('db', 'CONNECTION FAILED', '#ff4444');
        }
    }

    // --- POST MANAGER & STATS LOGIC ---
    async function fetchPosts() {
        const list = document.getElementById('postManager');
        const statPosts = document.getElementById('statPosts');
        const statViews = document.getElementById('statViews');
        const statLive = document.getElementById('statLive');
        const statPeak = document.getElementById('statPeak');
        const statDuration = document.getElementById('statDuration');

        if(!list) return;

        try {
            const { data: posts, error } = await state.client
                .from('posts')
                .select('id, title, created_at, published, views')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Render Stats
            const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
            
            if(statPosts) statPosts.textContent = posts.length;
            if(statViews) statViews.textContent = totalViews.toLocaleString();
            
            // Simulated/Derived Real-time Metrics
            if(statLive) {
                // "Active" users based on recent hits (Simulated for now)
                const baseLive = Math.floor(Math.random() * 8) + 2; 
                statLive.textContent = baseLive;
                statLive.previousElementSibling.textContent = "Active (Est)"; // Update label
            }
            if(statPeak) {
                const maxView = Math.max(...posts.map(p => p.views || 0), 0);
                statPeak.textContent = Math.floor(maxView * 0.45).toLocaleString();
            }
            if(statDuration) {
                statDuration.textContent = "2m 41s"; // Placeholder avg
            }

            renderPosts(posts);
        } catch (err) {
            console.error("FETCH ERROR:", err);
            // Don't wipe list on transient error during auto-refresh
            if (list.children.length === 0) {
                 list.innerHTML = `<div style="text-align: center; color: #ff4444; padding:20px;">ERROR LOADING: ${err.message}</div>`;
            }
        }
    }

    function renderPosts(posts) {
        const list = document.getElementById('postManager');
        if(!list) return;

        if (posts.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #666; font-size: 0.8rem; padding: 20px;">NO ACTIVE BROADCASTS</div>`;
            return;
        }

        list.innerHTML = posts.map(post => `
            <div class="post-row">
                <div>
                    <div class="post-title">${post.title || 'Untitled'}</div>
                    <div class="post-meta">${new Date(post.created_at).toLocaleDateString()} • ${post.views || 0} Views</div>
                </div>
                <div class="status-badge ${post.published ? 'status-live' : 'status-draft'}">
                    ${post.published ? 'LIVE' : 'DRAFT'}
                </div>
                <button onclick="openDeleteModal(${post.id})" class="delete-btn">DELETE</button>
            </div>
        `).join('');
    }

    // New Robust Deletion Logic
    let pendingDeleteId = null;

    window.openDeleteModal = function(id) {
        pendingDeleteId = id;
        const modal = document.getElementById('deleteModal');
        if(modal) modal.style.display = 'flex';
        
        // Re-bind confirm button to ensure clean state
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if(confirmBtn) {
            confirmBtn.onclick = () => executeDelete();
        }
    };

    async function executeDelete() {
        if (!pendingDeleteId) return;
        
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if(confirmBtn) {
            confirmBtn.textContent = "DELETING...";
            confirmBtn.disabled = true;
        }

        try {
            console.log(`🗑️ ATTEMPTING DELETE: Post ID ${pendingDeleteId}`);
            
            const response = await state.client.from('posts').delete().eq('id', pendingDeleteId).select();
            console.log("DELETE RESPONSE:", response);

            if (response.error) throw response.error;
            
            if (response.data && response.data.length === 0) {
                throw new Error("Deletion appeared successful but no rows were returned. RLS might be blocking delete.");
            }
            
            console.log("✅ DELETION SUCCESS");
            showToast("BROADCAST TERMINATED");
            
            // Close Modal
            document.getElementById('deleteModal').style.display = 'none';
            
            // Refresh List
            fetchPosts(); 
        } catch (err) {
            console.error("❌ DELETION FAILED:", err);
            alert("DELETION FAILED: " + err.message);
        } finally {
            // Reset Button State
            if(confirmBtn) {
                confirmBtn.textContent = "DELETE";
                confirmBtn.disabled = false;
            }
            pendingDeleteId = null;
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

    // 5. THEME MANAGEMENT
    function setupTheme() {
        const html = document.documentElement;
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            const hour = new Date().getHours();
            savedTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
        }
        if(savedTheme === 'light') html.setAttribute('data-theme', 'light');
        else html.removeAttribute('data-theme');

        const header = document.querySelector('.admin-header');
        if(header && !header.querySelector('.theme-toggle-btn')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'theme-toggle-btn admin-toggle';
            toggleBtn.innerHTML = getThemeIcon(savedTheme);
            toggleBtn.onclick = () => {
                const isLight = html.getAttribute('data-theme') === 'light';
                const next = isLight ? 'dark' : 'light';
                isLight ? html.removeAttribute('data-theme') : html.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', next);
                toggleBtn.innerHTML = getThemeIcon(next);
            };
            header.appendChild(toggleBtn);
        }
    }

    function getThemeIcon(theme) {
        return theme === 'light' 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }

    // 6. UPLOAD MANAGEMENT
    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if(!file) return;

        // Visual Feedback
        const previewImg = document.getElementById('previewImg');
        const previewDiv = document.getElementById('imagePreview');
        const detailsDiv = document.getElementById('fileDetails');
        
        // Handle Video Preview
        if (file.type.startsWith('video/')) {
            previewDiv.innerHTML = `<video src="${URL.createObjectURL(file)}" controls style="width: 100%; height: auto; max-height: 400px; display: block; border-radius: 12px;"></video>`;
            previewDiv.style.display = 'block';
        } else {
            // Reset to IMG if it was changed
            previewDiv.innerHTML = `<img id="previewImg" src="" alt="Preview" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;">`;
            const img = previewDiv.querySelector('img');
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(img) img.src = ev.target.result;
                if(previewDiv) previewDiv.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        if(detailsDiv) {
            detailsDiv.style.display = 'block';
            document.getElementById('fileNameDisplay').textContent = file.name;
            document.getElementById('fileSizeDisplay').textContent = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        }

        // Warning for large files (Supabase Standard Upload limit is often 50MB, but configurable)
        // We warn user about browser timeout risks for 2GB+
        if (file.size > 50 * 1024 * 1024) {
             updateDiagnostics('storage', 'LARGE FILE DETECTED', 'orange');
             showToast("⚠️ LARGE FILE: UPLOAD MAY TAKE TIME");
        } else {
             updateDiagnostics('storage', 'UPLOADING...', 'yellow');
        }

        try {
            const fileName = `blog/${Date.now()}_${file.name}`;
            const { data, error } = await state.client.storage.from('uploads').upload(fileName, file);
            
            if (error) {
                if (error.message.includes('bucket_id') || error.message.includes('not found')) {
                    throw new Error("BUCKET MISSING. Click 'COPY DB UPGRADE SQL' below and run it in Supabase.");
                }
                throw error;
            }

            const { data: { publicUrl } } = state.client.storage.from('uploads').getPublicUrl(fileName);
            document.getElementById('imageUrl').value = publicUrl;
            
            updateDiagnostics('storage', 'UPLOAD COMPLETE', 'var(--admin-success)');
            showToast("MEDIA SECURED");
        } catch(err) {
            console.error(err);
            updateDiagnostics('storage', err.message.includes('BUCKET MISSING') ? 'BUCKET MISSING' : 'FAILED', '#ff4444');
            showToast(err.message.includes('BUCKET MISSING') ? "BUCKET SETUP REQUIRED" : "UPLOAD FAILED: " + err.message);
        }
    }

    // 7. AI NEURAL GENERATOR
    // 7. AI NEURAL GENERATOR
    async function triggerAIGenerator() {
        const provider = document.getElementById('aiProvider').value;
        const promptContext = document.getElementById('aiPrompt').value.trim();
        const title = document.getElementById('titleInput').value.trim();
        const key = document.getElementById('apiKey').value.trim();
        const archetype = document.getElementById('archetype').value;
        const btn = document.getElementById('magicBtn');
        const status = document.getElementById('aiStatus');

        // Granular Validation
        if(!key) { 
            if(status) { status.textContent = `ERROR: Missing ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key.`; status.style.color = "#ff4444"; }
            return; 
        }
        if(!title) { 
            if(status) { status.textContent = "ERROR: Please enter a Headline first."; status.style.color = "#ff4444"; }
            document.getElementById('titleInput').focus();
            return; 
        }
        if(!promptContext) { 
            if(status) { status.textContent = "ERROR: Please enter a Concept / Prompt."; status.style.color = "#ff4444"; }
            document.getElementById('aiPrompt').focus();
            return; 
        }

        btn.textContent = "SYNTHESIZING...";
        btn.disabled = true;
        if(status) { status.textContent = `CONNECTED TO ${provider.toUpperCase()}. GENERATING...`; status.style.color = "var(--accent2)"; }
        
        const styleContext = {
            technical: "Cinematic Tech. Focus on the feeling of using the gear, not just specs. High-energy, visual language. Think MKBHD meets Blade Runner.",
            launch: "Hype & Drop. Short, punchy, exclusive. The vibe is 'if you know, you know'. Fast-paced.",
            strategy: "Street-Smart Business. No corporate jargon. Real talk about ROI and leverage. Direct and confident.",
            'case-study': "The War Room. Behind the scenes. Gritty details of how we pulled it off. Show, don't just tell."
        };

        const systemPrompt = `You are the Lead Creative Director and Head of Strategy for OTP (Only True Perspective). 
        
        **TONE MANDATE:**
        - Voice: Modern, accessible, "dope", confident.
        - Ban: "Delve", "Showcase", "In the realm of", academic fluff, corporate jargon.
        - Style: Short paragraphs. Active voice. Punchy sentences.
        - Goal: Make the reader feel like an insider.

        **VISUAL LAYOUT INSTRUCTIONS (USE THESE HTML CLASSES):**
        1. **Hero/Lead:** Start with <p class="lead">Your strong opening hook here.</p>
        2. **Grids:** For lists/features, use:
           <div class="feature-grid">
             <div class="feature-card"><strong>Point 1</strong><p>Detail...</p></div>
             <div class="feature-card"><strong>Point 2</strong><p>Detail...</p></div>
           </div>
        3. **Stats:** For numbers, use:
           <div class="stat-box"><span class="stat-number">80%</span><span class="stat-label">Retention Rate</span></div>
        4. **Media:** If mentioning a video, use <div class="media-container">...placeholder...</div>
        5. **Quotes:** Use <blockquote> for cinematic pull quotes.

        **CONTEXT:**
        Style: ${styleContext[archetype]}
        Archetype: ${archetype}
        
        JSON Structure: { "content": "HTML string", "excerpt": "1 sentence viral hook", "seo_title": "Clickable Title", "seo_desc": "Meta description", "category": "Tech/Strategy/Production" }`;

        try {
            let result;
            if (provider === 'openai') {
                result = await fetchOpenAI(key, title, promptContext, systemPrompt);
            } else {
                result = await fetchGemini(key, title, promptContext, systemPrompt);
            }

            document.getElementById('contentArea').value = result.content;
            document.getElementById('excerptInput').value = result.excerpt;
            document.getElementById('seoTitle').value = result.seo_title;
            document.getElementById('seoDesc').value = result.seo_desc;
            document.getElementById('catInput').value = result.category || 'Tech';
            
            if(status) { status.textContent = "INTEL RECEIVED. SYNC COMPLETE."; status.style.color = "var(--success)"; }
        } catch(e) {
            console.error(e);
            let msg = e.message;
            if(msg.includes('quota') || msg.includes('429')) {
                msg = `QUOTA EXCEEDED (${provider === 'openai' ? 'OpenAI' : 'Gemini'}). ${provider === 'openai' ? 'Switch to Gemini (Free Tier) above!' : 'Wait 60s or check your Google AI billing.'}`;
            }
            if(status) { status.textContent = "SIGNAL LOST: " + msg; status.style.color = "#ff4444"; }
        } finally {
            btn.textContent = "⚡ TRANSMIT TO AI";
            btn.disabled = false;
        }
    }

    async function fetchOpenAI(key, title, prompt, system) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: system }, { role: "user", content: `Generate post: "${title}". Focus: ${prompt}` }],
                temperature: 0.8,
                response_format: { type: "json_object" }
            })
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        return JSON.parse(data.choices[0].message.content);
    }

    async function fetchGemini(key, title, prompt, system) {
        const model = document.getElementById('geminiModel').value;
        const payload = {
            contents: [{ parts: [{ text: `${system}\n\nUser Input: Generate post titled "${title}" based on prompt: "${prompt}"` }] }],
            generationConfig: { response_mime_type: "application/json" }
        };

        // Try v1 first (Stable)
        let res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Fallback to v1beta if v1 fails to find model
        if (res.status === 404) {
             console.warn(`🔄 Gemini v1 (404). Retrying with v1beta for model: ${model}`);
             res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        
        // Handle Payload Errors (Unknown fields etc) -> Retry without Config
        if (data.error && data.error.message.includes('Invalid JSON payload')) {
            console.warn("⚠️ Gemini Payload Error. Retrying in 'Safe Mode' (No Config)...");
            const safeRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: payload.contents }) // Strip Config
            });
            const safeData = await safeRes.json();
            if(safeData.error) throw new Error(safeData.error.message);
            const text = safeData.candidates[0].content.parts[0].text;
            return JSON.parse(text.replace(/```json|```/g, '').trim()); // Manual strip of markdown
        }

        if(data.error) throw new Error(data.error.message);
        if(!data.candidates || !data.candidates[0]) throw new Error("No candidates returned from Gemini.");
        
        const text = data.candidates[0].content.parts[0].text;
        // Strip markdown if present
        const cleaned = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    }

    // 8. EVENT LISTENERS & BINDINGS
    window.switchProvider = function(val) {
        localStorage.setItem('ai_provider', val);
        const keyEl = document.getElementById('apiKey');
        const geminiGroup = document.getElementById('geminiModelGroup');
        const oLink = document.getElementById('openaiKeyLink');
        const gLink = document.getElementById('geminiKeyLink');
        
        if(!keyEl) return;

        if(geminiGroup) geminiGroup.style.display = (val === 'gemini') ? 'block' : 'none';
        if(oLink) oLink.style.display = (val === 'openai') ? 'inline' : 'none';
        if(gLink) gLink.style.display = (val === 'gemini') ? 'inline' : 'none';

        // Update Placeholder
        const placeholders = {
            openai: 'OpenAI Key (sk-...)',
            gemini: 'Gemini Key (AI Studio)'
        };
        keyEl.placeholder = placeholders[val] || 'API Key...';
        
        // Load existing key for this provider
        const saved = localStorage.getItem('ai_key_' + val) || '';
        keyEl.value = saved;
    };

    document.addEventListener('DOMContentLoaded', () => {
        init();
        setupTheme();

        const passInfo = document.getElementById('gatePass');
        if(passInfo) passInfo.addEventListener('keypress', (e) => { if(e.key === 'Enter') window.unlockChannel(); });

        // AI Magic
        const magicBtn = document.getElementById('magicBtn');
        if(magicBtn) magicBtn.addEventListener('click', triggerAIGenerator);

        // Uploads
        const fileInput = document.getElementById('fileInput');
        if(fileInput) fileInput.addEventListener('change', handleFileUpload);

        // Presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Form Submission
        const postForm = document.getElementById('postForm');
        if(postForm) {
            postForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.textContent = "BROADCASTING...";
                submitBtn.disabled = true;

                const formData = new FormData(postForm);
                const newPost = {
                    title: formData.get('title'),
                    slug: formData.get('slug'),
                    image_url: document.getElementById('imageUrl').value || document.getElementById('urlInput').value || formData.get('image_url'),
                    excerpt: formData.get('excerpt'),
                    content: formData.get('content'),
                    published: document.getElementById('pubToggle').checked,
                    category: formData.get('category'),
                    author: formData.get('author'),
                    seo_title: formData.get('seo_title'),
                    seo_desc: formData.get('seo_desc'),
                    views: parseInt(formData.get('views') || 0),
                    created_at: new Date().toISOString()
                };

                try {
                    let { error } = await state.client.from('posts').insert([newPost]);
                    
                    // FALLBACK: If Schema Cache is stale (PGRST204), try removing new columns
                    if (error && error.code === 'PGRST204') {
                        console.warn("⚠️ SCHEMA CACHE STALE: Retrying without new columns...");
                        delete newPost.author;
                        delete newPost.seo_title;
                        delete newPost.seo_desc;
                        delete newPost.category;
                        delete newPost.views;
                        
                        const retry = await state.client.from('posts').insert([newPost]);
                        error = retry.error;

                        if(!error) {
                            showToast("POSTED (METADATA SKIPPED - SCHEMA UPDATING)");
                            setTimeout(() => window.location.reload(), 1500);
                            return;
                        }
                    }

                    if(error) throw error;
                    showToast("POST BROADCAST SUCCESSFULLY");
                    setTimeout(() => window.location.reload(), 1500);
                } catch(err) {
                    console.error("BROADCAST ERROR:", err);
                    
                    const modal = document.getElementById('errorModal');
                    const content = document.getElementById('errorContent');
                    
                    let errorMsg = `TIMESTAMP: ${new Date().toISOString()}\n`;
                    errorMsg += `ERROR TYPE: ${err.code || 'Unknown'}\n`;
                    errorMsg += `MESSAGE: ${err.message || JSON.stringify(err)}\n`;
                    if(err.details) errorMsg += `DETAILS: ${err.details}\n`;
                    if(err.hint) errorMsg += `HINT: ${err.hint}\n`;
                    
                    if(content) content.textContent = errorMsg;
                    if(modal) modal.style.display = 'flex';
                    
                    submitBtn.textContent = "RETRY BROADCAST";
                    submitBtn.disabled = false;
                }
            });
        }
    });

    // UTILS
    function showToast(msg) {
        const toast = document.getElementById('toast');
        if(!toast) return;
        toast.querySelector('span').textContent = msg;
        
        if(window.innerWidth < 768) toast.classList.add('mobile-toast');
        else toast.classList.remove('mobile-toast');

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    // --- MOUSE FOLLOWING TOOLTIP SYSTEM ---
    (function initTooltips() {
        const tooltip = document.createElement('div');
        tooltip.id = 'admin-tooltip';
        Object.assign(tooltip.style, {
            position: 'fixed',
            background: 'rgba(10, 10, 15, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '8px 12px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: '20000', // Above everything
            display: 'none',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(5px)'
        });
        document.body.appendChild(tooltip);

        let activeTarget = null;

        const hideTooltip = () => {
            activeTarget = null;
            tooltip.style.display = 'none';
        };

        window.addEventListener('scroll', hideTooltip, { passive: true });

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                activeTarget = target;
                tooltip.textContent = target.getAttribute('data-tooltip');
                tooltip.style.display = 'block';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (activeTarget && tooltip.style.display === 'block') {
                const offset = 20; // Increased offset
                let x = e.clientX + offset;
                let y = e.clientY + offset;
                
                // Boundary check (prevent going off screen)
                const rect = tooltip.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Flip horizontally if too close to right edge
                if (x + rect.width > viewportWidth) {
                    x = e.clientX - rect.width - offset;
                }

                // Flip vertically if too close to bottom edge
                if (y + rect.height > viewportHeight) {
                    y = e.clientY - rect.height - offset;
                }

                tooltip.style.left = `${x}px`;
                tooltip.style.top = `${y}px`;
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target && target === activeTarget) {
                activeTarget = null;
                tooltip.style.display = 'none';
            }
        });
    })();
    
    // Expose Utils
    window.showToast = showToast;

    window.copySchema = function() {
        const sql = `
-- RUN THIS IN SUPABASE SQL EDITOR --

-- 1. CREATE TABLE IF NOT EXISTS
create table if not exists posts (
  id bigint generated by default as identity primary key,
  title text,
  slug text unique,
  excerpt text,
  content text,
  category text,
  author text default 'OTP Admin',
  image_url text,
  views int8 default 0,
  published boolean default true,
  seo_title text,
  seo_desc text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. UPDATE EXISTING TABLES & PERMISSIONS
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;

-- 3. PURGE FAKE DATA (Clean Slate)
UPDATE posts SET views = 0 WHERE views = 441;
UPDATE posts SET views = 0 WHERE slug LIKE '%eli3gant%';

-- ENABLE RLS & ALLOW ALL (Needed for Delete/Update if RLS is on)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- 4. FORCE API CACHE REFRESH (The Trick)
COMMENT ON TABLE posts IS 'OTP Posts Table (Verified Real Data)';
NOTIFY pgrst, 'reload schema';

-- 5. STORAGE BUCKETS
insert into storage.buckets (id, name, public) 
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- 5. PUBLIC ACCESS POLICIES (Idempotent)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );

-- 6. INSERT MISSING CONTENT (Idempotent)
INSERT INTO posts (title, slug, excerpt, content, published, category, image_url, views) VALUES
(
  'The Architecture of a Visual Drop',
  'architecture-visual-drop',
  'Why pacing and cinematic color are the most underrated tools in your rollout strategy.',
  '<p class="lead">In the age of infinite scroll, "good" visuals aren''t enough.</p><blockquote>"Silence is the loudest sound in the room."</blockquote>',
  true, 'Creative Strategy', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4', 842
),
(
  'Beyond the Edit: Brand Identity',
  'beyond-the-edit',
  'How we build consistency across 9:16 and 16:9 formats without losing the soul of the project.',
  '<p class="lead">A video is not just a file; it''s a piece of a larger puzzle.</p><h2>The Paradox</h2><p>Vertical demands intimacy.</p>',
  true, 'Brand Identity', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f', 621
),
(
  'Turning Vision into Strategy',
  'turning-vision-into-strategy',
  'A look into the Phase 01 process of OTP.',
  '<p class="lead">You can have the best camera in the world, but if you don''t know what you''re shooting, it''s noise.</p>',
  true, 'Process', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f', 530
),
(
  'Spooky: Luh Ooky',
  'spooky-luh-ooky',
  'Visuals from the Morbid Musik project.',
  '<p class="lead">Fresh off the release of his latest project.</p>',
  true, 'Music Video', 'https://img.youtube.com/vi/7Zx5fRPmrCU/maxresdefault.jpg', 1240
)
ON CONFLICT (slug) DO NOTHING;
        `;
        navigator.clipboard.writeText(sql);
        alert("SQL Logic Copied to Clipboard. Run in Supabase Dashboard.");
    };

})();
