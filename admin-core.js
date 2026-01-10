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

            // Live Clock System
            const clockEl = document.getElementById('liveClock');
            if (clockEl) {
                const isStatic = state.token === 'static-bypass-token';
                const apiBase = localStorage.getItem('otp_api_base') || '';
                const isRemote = apiBase.startsWith('http') && !apiBase.includes('localhost');
                
                let statusTag = '<span style="color:var(--admin-success)">[NODE:LIVE]</span>';
                if (isStatic) statusTag = '<span style="color:#ff8800">[LEGACY]</span>';
                else if (isRemote) statusTag = '<span style="color:#00ffaa">[SATELLITE]</span>';

                setInterval(() => {
                    const currentBase = localStorage.getItem('otp_api_base') || '';
                    const currentToken = localStorage.getItem('otp_admin_token') || '';
                    const isStatic = currentToken === 'static-bypass-token';
                    const isRemote = currentBase.startsWith('http') && !currentBase.includes('localhost');
                    
                    let statusTag = '<span style="color:var(--admin-success)">[NODE:LIVE]</span>';
                    if (isStatic) {
                        statusTag = isRemote 
                            ? '<span style="color:#00ffaa; filter: drop-shadow(0 0 5px #00ffaa);">[SATELLITE:LINKED]</span>' 
                            : '<span style="color:#ff8800">[LEGACY]</span>';
                    } else if (isRemote) {
                        statusTag = '<span style="color:#00ffaa; font-weight: bold; text-shadow: 0 0 10px #00ffaa;">[SATELLITE:SECURE]</span>';
                    }

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
            if(cloudOA) cloudOA.value = localStorage.getItem('cloud_openai') || '';
            if(cloudG) cloudG.value = localStorage.getItem('cloud_gemini') || '';
            if(cloudC) cloudC.value = localStorage.getItem('cloud_claude') || '';
            if(cloudGr) cloudGr.value = localStorage.getItem('cloud_groq') || '';
            if(satUrl) satUrl.value = localStorage.getItem('otp_api_base') || '';

            // 6. SITE COMMAND UPLINK (Realtime)
            state.siteChannel = state.client.channel('site_state');
            state.siteChannel.subscribe((status) => {
                console.log("📡 SITE COMMAND UPLINK:", status);
                if(status === 'SUBSCRIBED') {
                    const centerDot = document.getElementById('aiStatusDot');
                    if(centerDot) centerDot.style.background = 'var(--admin-success)';
                }
            });

        } catch (e) {
            console.error("🔥 CONNECTION FAILED:", e);
            updateDiagnostics('db', 'CONNECTION FAILED', '#ff4444');
        }
    }

    // --- AUTH UTILS ---
    window.logout = function() {
        localStorage.removeItem('otp_admin_token');
        window.location.href = 'portal-gate.html';
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
        showToast("FETCHING POST DATA...");
        
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

    async function fetchPosts(force = false) {
        const list = document.getElementById('postManager');
        if(!list) return;

        // One-time Realtime Subscription for DB Changes (Views, etc)
        if (state.client && !state.dbSubscription) {
             state.dbSubscription = state.client
                .channel('posts-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
                    // console.log("DB Update Detected:", payload);
                    // Debounce refresh to prevent flickering on high traffic
                    if(window.refreshTimeout) clearTimeout(window.refreshTimeout);
                    window.refreshTimeout = setTimeout(() => fetchPosts(true), 2000); 
                })
                .subscribe();
        }

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
        const statViews = document.getElementById('statViews');
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        if(statViews) statViews.textContent = totalViews.toLocaleString();
        
        // Presence is now handled by initDashboardPresence()
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
                    ${post.published && post.slug ? `
                        <a href="/journal/${post.slug}" target="_blank" class="view-btn" title="View Live" style="text-decoration:none; padding: 6px 12px; font-size: 0.7rem; border: 1px solid var(--admin-border); color: var(--admin-text); border-radius: 4px;">VIEW</a>
                        <button onclick="copyPostLink('${post.slug}')" title="Copy Link" style="background: transparent; border: 1px solid var(--admin-border); color: var(--admin-muted); padding: 6px 10px; border-radius: 4px; font-size: 0.7rem;">🔗</button>
                    ` : ''}
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
                    seo_desc: formData.get('seo_desc')
                    // Views handled by DB organically
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

    // 7. SECURE AI NEURAL GENERATOR
    async function triggerAIGenerator() {
        const providerSel = document.getElementById('aiProvider');
        const promptInput = document.getElementById('aiPrompt');
        const titleInput = document.getElementById('titleInput');
        const archetypeInput = document.getElementById('archetype');
        const modelSel = document.getElementById('geminiModel');
        const status = document.getElementById('aiStatus');
        const btn = document.getElementById('magicBtn');

        if(!state.token || state.token === "null") {
            if(status) { status.textContent = "SESSION EXPIRED. PLEASE RE-LOGIN."; status.style.color = "#ff4444"; }
            showToast("SESSION EXPIRED");
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
            const authToken = (state.token || '').trim();
            const personalKeys = {
                openai: localStorage.getItem('cloud_openai'),
                gemini: localStorage.getItem('cloud_gemini'),
                anthropic: localStorage.getItem('cloud_claude'),
                groq: localStorage.getItem('cloud_groq')
            };
            
            const sysPrompt = `You are a professional blog writer for a high-tech media brand. Output RAW JSON ONLY. No markdown blocks. Return format: { "content": "markdown...", "excerpt": "...", "seo_title": "...", "seo_desc": "..." }`;
            const userPrompt = `Generate post titled "${title}" based on: ${prompt}. Archetype: ${archetypeInput ? archetypeInput.value : 'technical'}.`;

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
                        body: JSON.stringify({ prompt, archetype: archetypeInput ? archetypeInput.value : 'technical', provider: provider || 'openai', model, title })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        aiResult = data.data;
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
                }
                else if (provider === 'gemini') {
                    const gemModel = model || 'gemini-2.5-flash';
                    const endpoints = ['v1', 'v1beta'];
                    let gemSuccess = false;
                    for (const v of endpoints) {
                        try {
                            const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${gemModel}:generateContent?key=${cloudKey}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contents: [{ parts: [{ text: sysPrompt + "\n\n" + userPrompt }] }] })
                            });
                            const raw = await res.json();
                            if(!raw.error) {
                                aiResult = JSON.parse(raw.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim());
                                gemSuccess = true; break;
                            }
                        } catch(e) {}
                    }
                    if(!gemSuccess) throw new Error("Gemini Neural Bridge Failed. Check key permissions.");
                }
            }

            if (aiResult) {
                if(aiResult.content) document.getElementById('contentArea').value = aiResult.content;
                if(aiResult.excerpt) document.getElementById('excerptInput').value = aiResult.excerpt;
                if(aiResult.seo_title) document.getElementById('seoTitle').value = aiResult.seo_title;
                if(aiResult.seo_desc) document.getElementById('seoDesc').value = aiResult.seo_desc;
                
                showToast(usedDirect ? "NEURAL BRIDGE: DIRECT CLOUD" : "NEURAL BRIDGE: SECURE HUB");
                if(status) { status.textContent = "GENERATION COMPLETE"; status.style.color = "var(--success)"; }
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



    // 8. EVENT LISTENERS
    window.switchProvider = function(val) {
        localStorage.setItem('ai_provider', val);
        const geminiGroup = document.getElementById('geminiModelGroup');
        if(geminiGroup) geminiGroup.style.display = (val === 'gemini') ? 'block' : 'none';
    };




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
        const url = window.location.origin + '/journal/' + slug;
        navigator.clipboard.writeText(url);
        showToast("LINK COPIED TO CLIPBOARD");
    };

    window.openDraftPreview = function() {
        const title = document.getElementById('titleInput').value || "UNTITLED BROADCAST";
        const content = document.getElementById('contentArea').value || "_No content captured._";
        
        document.getElementById('previewTitleDisplay').textContent = title;
        // Simple display (could add markdown parser later if needed)
        document.getElementById('previewBodyDisplay').innerHTML = content.replace(/\n/g, '<br>');
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

        // 3. Kursor
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
        const url = `https://onlytrueperspective.tech/journal/${slug}`;
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
        let target = prompt("ENTER TARGET WARP URL (e.g. google.com):");
        if(!target || !state.siteChannel) return;

        // Auto-fix URL
        target = target.trim();
        if (!target.startsWith('http')) target = 'https://' + target;

        if(!confirm(`THIS WILL IMMEDIATELY REDIRECT ALL ACTIVE VISITORS TO ${target}. PROCEED?`)) return;
        
        await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'warp', value: target } });
        showToast("GLOBAL WARP INITIATED");
    };

    window.toggleLiveTheme = async function() {
        if(!state.siteChannel) return;
        const statusEl = document.getElementById('status-theme');
        const isDay = statusEl.textContent === 'DAY-MODE';
        const nextTheme = isDay ? 'dark' : 'light';
        
        await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'theme', value: nextTheme } });
        statusEl.textContent = nextTheme === 'light' ? 'DAY-MODE' : 'NIGHT-MODE';
        statusEl.style.color = nextTheme === 'light' ? '#ffaa00' : 'var(--accent2)';
        showToast("THEME SYNCED TO NETWORK");
    };

    window.openBroadcastPrompt = async function() {
        const msg = prompt("ENTER EMERGENCY BROADCAST MESSAGE:");
        if(!msg || !state.siteChannel) return;
        await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'alert', value: msg } });
        showToast("EMERGENCY BROADCAST SENT");
    };

    window.refreshLiveSite = async function() {
        if(!confirm("THIS WILL REFRESH ALL ACTIVE VISITOR SESSIONS. PROCEED?")) return;
        if(!state.siteChannel) return;
        await state.siteChannel.send({ type: 'broadcast', event: 'command', payload: { type: 'refresh' } });
        showToast("NETWORK REFRESH COMMAND SENT");
    };

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

})();