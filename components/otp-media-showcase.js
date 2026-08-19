(function initOtpMediaShowcase(root) {
    'use strict';

    const CATEGORIES = [
        { id: 'all', label: 'All Projects' },
        { id: 'Video / Recap', label: 'Video / Recap' },
        { id: 'Music / Visuals', label: 'Music / Visuals' },
        { id: 'Events', label: 'Events' },
        { id: 'Creative Systems', label: 'Creative Systems' }
    ];

    function createShowcaseComponent(containerEl, videos) {
        if (!containerEl) return;

        let activeCategory = 'all';
        let activeVideo = null;

        // Build Shell
        containerEl.innerHTML = `
            <div class="otp-showcase-container">
                <div class="otp-showcase-filters" role="tablist" aria-label="Media Categories"></div>
                <div class="otp-showcase-grid" role="region" aria-live="polite"></div>
            </div>
            
            <div class="otp-media-modal-backdrop" aria-hidden="true">
                <div class="otp-media-modal-content">
                    <button type="button" class="otp-modal-close-btn" aria-label="Close Video Player">&times;</button>
                    <div class="otp-media-player-wrapper">
                        <iframe id="otpModalIframe" src="" title="OTP Video Showcase Player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    </div>
                    <div class="otp-modal-meta">
                        <div class="otp-modal-meta-info">
                            <h3 class="otp-modal-title" id="otpModalTitle">Video Title</h3>
                            <p class="otp-modal-desc" id="otpModalDesc">Video Description</p>
                        </div>
                        <a href="/bookings?source=media_showcase_modal" class="otp-modal-book-btn">Book Similar Work &rarr;</a>
                    </div>
                </div>
            </div>
        `;

        const filterBar = containerEl.querySelector('.otp-showcase-filters');
        const gridEl = containerEl.querySelector('.otp-showcase-grid');
        const modalBackdrop = containerEl.querySelector('.otp-media-modal-backdrop');
        const modalCloseBtn = containerEl.querySelector('.otp-modal-close-btn');
        const modalIframe = containerEl.querySelector('#otpModalIframe');
        const modalTitle = containerEl.querySelector('#otpModalTitle');
        const modalDesc = containerEl.querySelector('#otpModalDesc');

        // Render Filters
        CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `otp-filter-btn ${cat.id === activeCategory ? 'active' : ''}`;
            btn.textContent = cat.label;
            btn.setAttribute('data-cat', cat.id);
            btn.addEventListener('click', () => {
                activeCategory = cat.id;
                filterBar.querySelectorAll('.otp-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderGrid();
                
                if (root.OTPAnalytics && typeof root.OTPAnalytics.trackEvent === 'function') {
                    root.OTPAnalytics.trackEvent('showcase_category_filter', { category: cat.id });
                }
            });
            filterBar.appendChild(btn);
        });

        // Render Grid
        function renderGrid() {
            gridEl.innerHTML = '';
            const filtered = videos.filter(v => activeCategory === 'all' || v.category === activeCategory || v.type === activeCategory);

            if (filtered.length === 0) {
                gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">No projects found in this category.</div>`;
                return;
            }

            filtered.forEach(video => {
                const card = document.createElement('article');
                card.className = 'otp-media-card';
                card.innerHTML = `
                    <div class="otp-media-thumb-wrapper">
                        <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" decoding="async" width="640" height="360" />
                        <span class="otp-card-cat-tag">${video.category || 'Visuals'}</span>
                        <div class="otp-play-badge">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <div class="otp-card-details">
                        <h3 class="otp-card-title">${video.title}</h3>
                        <p class="otp-card-desc">${video.description || ''}</p>
                        <div class="otp-card-actions">
                            <span class="otp-card-cta-btn">Watch Reel &rarr;</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    openModal(video);
                });

                gridEl.appendChild(card);
            });
        }

        // Modal Handlers
        function openModal(video) {
            activeVideo = video;
            const embedSrc = video.embedUrl ? `${video.embedUrl}?autoplay=1` : `https://www.youtube.com/embed/${video.id}?autoplay=1`;
            modalIframe.src = embedSrc;
            modalTitle.textContent = video.title;
            modalDesc.textContent = video.description || '';
            modalBackdrop.classList.add('is-open');
            modalBackdrop.setAttribute('aria-hidden', 'false');

            if (root.OTPAnalytics && typeof root.OTPAnalytics.trackEvent === 'function') {
                root.OTPAnalytics.trackEvent('showcase_video_play', { videoId: video.id, title: video.title });
            }
        }

        function closeModal() {
            modalBackdrop.classList.remove('is-open');
            modalBackdrop.setAttribute('aria-hidden', 'true');
            modalIframe.src = '';
            activeVideo = null;
        }

        modalCloseBtn.addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalBackdrop.classList.contains('is-open')) closeModal();
        });

        // Initial Render
        renderGrid();
    }

    // Expose Global Namespace
    root.OTPMediaShowcase = {
        init: createShowcaseComponent
    };

    // Auto mount if container exists
    document.addEventListener('DOMContentLoaded', () => {
        const autoTarget = document.getElementById('otpMediaShowcaseMount');
        const videos = root.OTP_VIDEO_LIBRARY?.getFallbackVideos?.();
        if (autoTarget && Array.isArray(videos)) {
            createShowcaseComponent(autoTarget, videos);
        }
    });

})(typeof window !== 'undefined' ? window : this);
