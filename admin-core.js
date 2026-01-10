/**
 * ADMIN CORE V3.6 (SECURE)
 * Centralized logic for the OTP Admin Panel.
 * Handles: Server-side Auth, Secure API Proxy, Supabase Connection.
 */

(function() {
    console.log("🚀 ADMIN CORE V3.6 SECURE: Boot sequence initiated...");

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
        token: localStorage.getItem('otp_admin_token') || null // Persist session
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
        // Auto-login check
        if (state.token) {
             console.log("🔄 Found existing session token.");
             updateDiagnostics('auth', 'SECURE SESS', 'var(--success)');
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

        } catch (e) {
            console.error("🔥 CONNECTION FAILED:", e);
            updateDiagnostics('db', 'CONNECTION FAILED', '#ff4444');
        }
    }

    // --- AUTH UTILS ---
    window.logout = function() {
        localStorage.removeItem('otp_admin_token');
        window.location.href = 'admin.html';
    };

    // --- POST MANAGER & STATS LOGIC ---
    let postsCache = null;
    let lastFetchTime = 0;
    const CACHE_TTL = 60000; // 60s Cache

    // 4.6 FILE UPLOAD LOGIC
    window.handleFileUpload = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.querySelector('button[onclick="document.getElementById(\'fileInput\').click()"]');
        if(btn) btn.textContent = "UPLOADING...";

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `blog/${fileName}`;

            // Upload using standard client (requires bucket permissions)
            const { error: uploadError } = await state.client.storage
                .from('uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = state.client.storage
                .from('uploads')
                .getPublicUrl(filePath);

            document.getElementById('imageUrl').value = publicUrl;
            document.getElementById('fileDetails').style.display = 'block';
            document.getElementById('fileNameDisplay').textContent = file.name;
            document.getElementById('fileSizeDisplay').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            
            const prevImg = document.getElementById('previewImg');
            if(prevImg) {
                prevImg.src = publicUrl;
                document.getElementById('imagePreview').style.display = 'block';
            }
            
            showToast("FILE UPLOADED SUCCESSFULLY");

        } catch (err) {
            console.error("Upload Failed:", err);
            showToast("UPLOAD FAILED: " + err.message);
        } finally {
            if(btn) btn.textContent = "Upload Media";
        }
    };
    
    // 4.7 EDIT POST LOGIC
    window.loadPostForEdit = async function(id) {
        let post = postsCache ? postsCache.find(p => p.id === id) : null;
        if(!post) return;

        document.getElementById('postIdInput').value = post.id;
        document.getElementById('titleInput').value = post.title;
        document.getElementById('slugInput').value = post.slug;
        document.getElementById('imageUrl').value = post.image_url || '';
        document.getElementById('urlInput').value = post.image_url || '';
        document.getElementById('catInput').value = post.category || 'Strategy';
        document.getElementById('authorInput').value = post.author || 'OTP Admin';
        document.getElementById('excerptInput').value = post.excerpt || '';
        document.getElementById('contentArea').value = post.content || '';
        document.getElementById('seoTitle').value = post.seo_title || '';
        document.getElementById('seoDesc').value = post.seo_desc || '';
        document.getElementById('viewsInput').value = post.views || 0;
        document.getElementById('pubToggle').checked = post.published;

        const submitBtn = document.getElementById('submitBtn');
        if(submitBtn) {
            submitBtn.textContent = "UPDATE BROADCAST";
            submitBtn.style.background = "var(--accent)"; 
            submitBtn.style.color = "#fff";
        }
        
        document.getElementById('postForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update Word Count (New Feature)
        const content = document.getElementById('contentArea');
        if(content) {
             content.dispatchEvent(new Event('input')); // Trigger counter update
             // Optional: Focus explicitly if needed
             // content.focus(); 
        }

        showToast("POST LOADED FOR EDITING");
    };

    window.resetForm = function() {
        document.getElementById('postForm').reset();
        document.getElementById('postIdInput').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        
        const submitBtn = document.getElementById('submitBtn');
        if(submitBtn) {
            submitBtn.textContent = "COMMENCE BROADCAST";
            submitBtn.style.background = "var(--success)";
            submitBtn.style.color = "#000";
        }
    };

    async function fetchPosts(force = false) {
        const list = document.getElementById('postManager');
        if(!list) return;

        // Cache Check
        const now = Date.now();
        if (!force && postsCache && (now - lastFetchTime < CACHE_TTL)) {
            renderPosts(postsCache);
            updateStats(postsCache);
            return;
        }

        try {
            const { data: posts, error } = await state.client
                .from('posts')
                .select('id, title, created_at, published, views')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Update Cache
            postsCache = posts;
            lastFetchTime = now;

            renderPosts(posts);
            updateStats(posts);

        } catch (err) {
            console.error("FETCH ERROR:", err);
            if (list.children.length === 0) {
                 list.innerHTML = `<div style="text-align: center; color: #ff4444; padding:20px;">ERROR LOADING: ${err.message}</div>`;
            }
        }
    }

    function updateStats(posts) {
        const statPosts = document.getElementById('statPosts');
        const statViews = document.getElementById('statViews');
        const statLive = document.getElementById('statLive');
        const statPeak = document.getElementById('statPeak');
        const statDuration = document.getElementById('statDuration');

        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
            
        if(statPosts) statPosts.textContent = posts.length;
        if(statViews) statViews.textContent = totalViews.toLocaleString();
        
        // Simulated/Derived Real-time Metrics
        if(statLive) {
            const baseLive = Math.floor(Math.random() * 8) + 2; 
            statLive.textContent = baseLive;
        }
        if(statPeak) {
            const maxView = Math.max(...posts.map(p => p.views || 0), 0);
            statPeak.textContent = Math.floor(maxView * 0.45).toLocaleString();
        }
        if(statDuration) {
            statDuration.textContent = "2m 41s"; 
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
                <div style="cursor: pointer; flex: 1;" onclick="loadPostForEdit(${post.id})">
                    <div class="post-title">${post.title || 'Untitled'} <span style="font-size:0.7em; color:var(--admin-accent); margin-left:5px;">(EDIT)</span></div>
                    <div class="post-meta">${new Date(post.created_at).toLocaleDateString()} • ${post.views || 0} Views</div>
                </div>
                <div class="status-badge ${post.published ? 'status-live' : 'status-draft'}">
                    ${post.published ? 'LIVE' : 'DRAFT'}
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${post.published && post.slug ? `<a href="/journal/${post.slug}" target="_blank" class="view-btn" title="View Live" style="text-decoration:none; padding: 6px 12px; font-size: 0.7rem; border: 1px solid var(--admin-border); color: var(--admin-text); border-radius: 4px;">VIEW</a>` : ''}
                    <button onclick="openDeleteModal(${post.id}, event)" class="delete-btn">DELETE</button>
                </div>
            </div>
        `).join('');
    }
    
    // Modified Delete to prevent bubble up
    window.openDeleteModal = function(id, event) {
        if(event) event.stopPropagation(); // Don't trigger edit
        const modal = document.getElementById('deleteModal');
        if(modal) {
            modal.style.display = 'flex';
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
                    body: JSON.stringify({ id: targetId })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                         showToast("BROADCAST TERMINATED (SECURE)");
                         finishDelete();
                         return;
                    }
                }
            } catch(serverErr) {
                console.warn("Server delete failed, trying client-side fallback...");
            }

            // 2. Static Fallback (Client-Side)
            // Warning: RLS must allow this for authenticated users
            const { error } = await state.client.from('posts').delete().eq('id', targetId);
            if (error) throw error;
            
            showToast("BROADCAST TERMINATED (CLIENT)");
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

    // STARTUP
    document.addEventListener('DOMContentLoaded', () => {
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
        
        const postForm = document.getElementById('postForm');
        if(postForm) {
            postForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('submitBtn');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = "PROCESSING...";
                submitBtn.disabled = true;

                const formData = new FormData(postForm);
                const postId = document.getElementById('postIdInput').value; // Check for ID

                const postData = {
                    title: formData.get('title'),
                    slug: formData.get('slug'),
                    image_url: document.getElementById('imageUrl').value || document.getElementById('urlInput').value,
                    excerpt: formData.get('excerpt'),
                    content: formData.get('content'),
                    published: document.getElementById('pubToggle').checked,
                    category: formData.get('category'),
                    author: formData.get('author'),
                    seo_title: formData.get('seo_title'),
                    seo_desc: formData.get('seo_desc'),
                    views: parseInt(formData.get('views') || 0)
                };
                
                // If NEW post, add created_at
                if(!postId) postData.created_at = new Date().toISOString();

                try {
                    let result;
                    if (postId) {
                        // UPDATE
                        result = await state.client.from('posts').update(postData).eq('id', postId);
                    } else {
                        // INSERT
                        result = await state.client.from('posts').insert([postData]);
                    }

                    if(result.error) throw result.error;
                    
                    showToast(postId ? "UPDATED SUCCESSFULLY" : "BROADCAST LIVE");
                    resetForm(); // Clear form after success
                    await fetchPosts(true); 
                    
                } catch(err) {
                    console.error("BROADCAST ERROR:", err);
                    showToast("FAILED: " + err.message);
                    submitBtn.textContent = originalText;
                } finally {
                    submitBtn.disabled = false;
                    if(!postId) submitBtn.textContent = "COMMENCE BROADCAST"; 
                }
            });
        }
    });

    window.deleteBySlug = async function() {
        const input = document.getElementById('manualDeleteSlug');
        const slug = input ? input.value.trim() : '';
        
        if (!slug) { alert("Please enter a slug to remove."); return; }
        if (!confirm(`⚠️ PERMANENTLY KILL SLUG: ${slug}?`)) return;

        try {
            const res = await fetch('/api/admin/delete-post', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({ slug: slug })
            });

            const data = await res.json();

            if (!data.success) throw new Error(data.message);

            showToast(`SLUG ${slug} TERMINATED`);
            if(input) input.value = '';
            fetchPosts(true); 

        } catch (err) {
            showToast("TERMINATION FAILED: " + err.message);
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
    window.showToast = function(msg) {
        const toast = document.getElementById('toast');
        if(!toast) return;
        
        // Reset
        toast.classList.remove('show');
        void toast.offsetWidth; // Force reflow
        
        toast.querySelector('span').textContent = msg;
        toast.classList.add('show');
        
        // Auto hide after 4s (longer for errors)
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    };

    // ... (rest of init) ...

    // 7. SECURE AI NEURAL GENERATOR
    async function triggerAIGenerator() {
        const providerSel = document.getElementById('aiProvider');
        const promptInput = document.getElementById('aiPrompt');
        const titleInput = document.getElementById('titleInput');
        const archetypeInput = document.getElementById('archetype');
        const modelSel = document.getElementById('geminiModel');
        const status = document.getElementById('aiStatus');
        const btn = document.getElementById('magicBtn');

        if(!state.token) {
            if(status) { status.textContent = "SESSION EXPIRED. REFRESH."; status.style.color = "#ff4444"; }
            return;
        }

        const prompt = promptInput.value.trim();
        const title = titleInput.value.trim();
        
        if(!title) { 
            if(status) { status.textContent = "ERROR: Please enter a Headline first."; status.style.color = "#ff4444"; }
            titleInput.focus();
            return; 
        }
        if(!prompt) { 
            if(status) { status.textContent = "ERROR: Please enter a Concept / Prompt."; status.style.color = "#ff4444"; }
            promptInput.focus();
            return; 
        }

        const provider = providerSel.value;
        const model = (provider === 'gemini' && modelSel) ? modelSel.value : null;

        // UI Feedback
        btn.textContent = "SYNTHESIZING (SECURE)...";
        btn.disabled = true;
        if(status) { 
            status.innerHTML = `<span class="blink">⚡ TRANSMITTING TO ${provider.toUpperCase()} PROXY...</span>`; 
            status.style.color = "var(--accent2)"; 
        }

        try {
            // Secure Server Call
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}` // Send Admin Token
                },
                body: JSON.stringify({ 
                    prompt, 
                    archetype: archetypeInput.value, 
                    provider, 
                    model,
                    title
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || `Server Error ${res.status}`);
            if (!data.success) throw new Error(data.message || "Generation Failed");

            // Populate Fields
            if (data.data) {
                if(data.data.content) document.getElementById('contentArea').value = data.data.content;
                if(data.data.excerpt) document.getElementById('excerptInput').value = data.data.excerpt;
                if(data.data.seo_title) document.getElementById('seoTitle').value = data.data.seo_title;
                if(data.data.seo_desc) document.getElementById('seoDesc').value = data.data.seo_desc;
            }

            showToast("NEURAL CONTENT RECEIVED");
            if(status) { status.textContent = "GENERATION COMPLETE"; status.style.color = "var(--success)"; }

        } catch (err) {
            console.error("AI ERROR:", err);
            if(status) { status.textContent = "ERROR: " + err.message; status.style.color = "#ff4444"; }
            showToast("AI ERROR: " + err.message);
        } finally {
            btn.textContent = "⚡ TRANSMIT TO AI";
            btn.disabled = false;
        }
    }



    // 8. EVENT LISTENERS
    window.switchProvider = function(val) {
        localStorage.setItem('ai_provider', val);
        const geminiGroup = document.getElementById('geminiModelGroup');
        if(geminiGroup) geminiGroup.style.display = (val === 'gemini') ? 'block' : 'none';
    };




    window.updateWordCount = function(textarea) {
        const count = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        const disp = document.getElementById('wordCountDisplay');
        if(disp) disp.textContent = count;
    };

    window.copySchema = function() {
        const sql = `
-- OTP DATABASE SETUP --
CREATE TABLE IF NOT EXISTS posts (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title text,
  slug text UNIQUE,
  excerpt text,
  content text,
  category text,
  author text DEFAULT 'OTP Admin',
  image_url text,
  views int8 DEFAULT 0,
  published boolean DEFAULT true,
  seo_title text,
  seo_desc text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS contacts (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text,
  email text,
  service text,
  budget text,
  timeline text,
  message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS POLICIES --
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON posts FOR SELECT USING (true);
-- Insert/Update/Delete should be restricted in production --

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Insert" ON contacts FOR INSERT WITH CHECK (true);
`;
        navigator.clipboard.writeText(sql);
        showToast("SQL TEMPLATE COPIED");
    };

})();