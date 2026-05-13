(function initOtpVideoLibrary(root) {
    'use strict';

    const YOUTUBE_CHANNEL = Object.freeze({
        handle: '@OnlyTruePerspective',
        id: 'UC-AWbVtv_3Kb9mxP8jS953w',
        url: 'https://www.youtube.com/@OnlyTruePerspective'
    });

    const CATEGORY_FALLBACK = 'Video / Recap';
    const GENERIC_CATEGORIES = new Set([
        'Video / Recap',
        'Video',
        'Recap',
        'Recap / Vlog',
        'Archive'
    ]);
    const SAFE_CATEGORIES = Object.freeze([
        'Video / Recap',
        'Music / Visuals',
        'Culture',
        'Brand Work',
        'Events',
        'Creative Systems'
    ]);

    const BOOKING_URL = '/bookings';

    const FALLBACK_VIDEOS = Object.freeze([
        {
            id: 'j70o4Psmxfk',
            title: 'TJ\u2019S NIGHT | Shot + Edited by OnlyTruePerspective',
            url: 'https://www.youtube.com/watch?v=j70o4Psmxfk',
            embedUrl: 'https://www.youtube.com/embed/j70o4Psmxfk',
            thumbnail: 'https://i.ytimg.com/vi/j70o4Psmxfk/hqdefault.jpg',
            publishedAt: '2026-05-12T21:04:36-07:00',
            description: "TJ'S NIGHT captured through the OTP lens - a recap of the night with Alex and the TJ squad.",
            source: 'youtube',
            category: 'Video / Recap',
            type: 'Video / Recap',
            featured: true,
            pinned: true,
            bookable: true
        },
        {
            id: 'oFM_roer79A',
            title: "'2 THE FROZE TOUR' | VLOG",
            url: 'https://www.youtube.com/watch?v=oFM_roer79A',
            embedUrl: 'https://www.youtube.com/embed/oFM_roer79A',
            thumbnail: 'https://i.ytimg.com/vi/oFM_roer79A/hqdefault.jpg',
            publishedAt: null,
            description: 'Tour documentary and scenery-led recap work from the OTP archive.',
            source: 'youtube',
            category: 'Events',
            type: 'Video / Recap',
            featured: true,
            pinned: true,
            bookable: true
        },
        {
            id: 'vNxUzSmr7x0',
            title: "ELI & Tengu: 'Fame and Fortune'",
            url: 'https://www.youtube.com/watch?v=vNxUzSmr7x0',
            embedUrl: 'https://www.youtube.com/embed/vNxUzSmr7x0',
            thumbnail: 'https://i.ytimg.com/vi/vNxUzSmr7x0/hqdefault.jpg',
            publishedAt: null,
            description: 'Music visuals and post-production from the OTP lens.',
            source: 'youtube',
            category: 'Music / Visuals',
            type: 'Music / Visuals',
            featured: true,
            pinned: true,
            bookable: true
        },
        {
            id: 'KYVTqzsovU8',
            title: 'OTP Presents: State of Mind',
            url: 'https://www.youtube.com/watch?v=KYVTqzsovU8',
            embedUrl: 'https://www.youtube.com/embed/KYVTqzsovU8',
            thumbnail: 'https://i.ytimg.com/vi/KYVTqzsovU8/hqdefault.jpg',
            publishedAt: null,
            description: 'Visual concept and creative direction from the OTP vault.',
            source: 'youtube',
            category: 'Creative Systems',
            type: 'Creative Systems',
            featured: true,
            pinned: false,
            bookable: true
        },
        {
            id: '5uPeZWd5jVo',
            title: 'Neon Nights | Workout Visuals',
            url: 'https://www.youtube.com/watch?v=5uPeZWd5jVo',
            embedUrl: 'https://www.youtube.com/embed/5uPeZWd5jVo',
            thumbnail: 'https://i.ytimg.com/vi/5uPeZWd5jVo/hqdefault.jpg',
            publishedAt: null,
            description: 'Cinematic color, motion, and workout visual treatment.',
            source: 'youtube',
            category: 'Culture',
            type: 'Culture',
            featured: false,
            pinned: false,
            bookable: true
        },
        {
            id: 'L-5bRU7Ai0U',
            title: 'Perspective Sweep: ELI',
            url: 'https://www.youtube.com/watch?v=L-5bRU7Ai0U',
            embedUrl: 'https://www.youtube.com/embed/L-5bRU7Ai0U',
            thumbnail: 'https://i.ytimg.com/vi/L-5bRU7Ai0U/hqdefault.jpg',
            publishedAt: null,
            description: 'Motion graphics and identity work built around the OTP perspective.',
            source: 'youtube',
            category: 'Brand Work',
            type: 'Brand Work',
            featured: false,
            pinned: false,
            bookable: true
        },
        {
            id: 'gq5dkcnOkok',
            title: 'OTP: NO AVERSION SHOW',
            url: 'https://www.youtube.com/watch?v=gq5dkcnOkok',
            embedUrl: 'https://www.youtube.com/embed/gq5dkcnOkok',
            thumbnail: 'https://i.ytimg.com/vi/gq5dkcnOkok/hqdefault.jpg',
            publishedAt: null,
            description: 'Live event visuals and recap energy from the vault.',
            source: 'youtube',
            category: 'Events',
            type: 'Events',
            featured: false,
            pinned: false,
            bookable: true
        },
        {
            id: 'MGvCpDN-Tss',
            title: "Series #001: 'Another Night'",
            url: 'https://www.youtube.com/watch?v=MGvCpDN-Tss',
            embedUrl: 'https://www.youtube.com/embed/MGvCpDN-Tss',
            thumbnail: 'https://i.ytimg.com/vi/MGvCpDN-Tss/hqdefault.jpg',
            publishedAt: null,
            description: 'Episodic narrative editing from the OTP archive.',
            source: 'youtube',
            category: 'Culture',
            type: 'Culture',
            featured: false,
            pinned: false,
            bookable: true
        }
    ]);

    function cleanText(value, maxLength) {
        const max = Number.isFinite(Number(maxLength)) ? Number(maxLength) : 500;
        return String(value == null ? '' : value)
            .replace(/<[^>]*>/g, ' ')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, max);
    }

    function safeYoutubeId(value) {
        const raw = String(value == null ? '' : value).trim();
        if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
        try {
            const url = new URL(raw, 'https://www.youtube.com');
            const host = url.hostname.replace(/^www\./, '');
            if (host === 'youtu.be') {
                const id = url.pathname.split('/').filter(Boolean)[0];
                return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
            }
            if (host === 'youtube.com' || host === 'music.youtube.com') {
                const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
                return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
            }
        } catch (e) {
            return '';
        }
        return '';
    }

    function safeYoutubeUrl(id) {
        const safeId = safeYoutubeId(id);
        return safeId ? `https://www.youtube.com/watch?v=${safeId}` : '';
    }

    function safeYoutubeEmbedUrl(id) {
        const safeId = safeYoutubeId(id);
        return safeId ? `https://www.youtube.com/embed/${safeId}` : '';
    }

    function safeYoutubeThumbnail(id, value) {
        const safeId = safeYoutubeId(id);
        const fallback = safeId ? `https://i.ytimg.com/vi/${safeId}/hqdefault.jpg` : '';
        const raw = String(value == null ? '' : value).trim();
        if (!raw) return fallback;
        try {
            const url = new URL(raw);
            const host = url.hostname.replace(/^www\./, '');
            if (url.protocol === 'https:' && (host === 'i.ytimg.com' || host === 'img.youtube.com')) {
                return url.toString();
            }
        } catch (e) {
            return fallback;
        }
        return fallback;
    }

    function inferCategoryFromCopy(value) {
        const copy = ` ${cleanText(value, 220).toLowerCase()} `;
        const rules = [
            ['Music / Visuals', [
                /\bmusic video\b/,
                /\bmusic\b/,
                /\bvisuals?\b/,
                /\bbeat\b/,
                /\bperformance\b/,
                /\breel\b/
            ]],
            ['Creative Systems', [
                /\bsystem(s)?\b/,
                /\bautomation\b/,
                /\bworkflow\b/,
                /\bbooking\b/,
                /\bwebsite\b/,
                /\bsite\b/,
                /\bapp\b/,
                /\blaunch\b/,
                /\bprocess\b/
            ]],
            ['Brand Work', [
                /\bbrand\b/,
                /\bidentity\b/,
                /\blogo\b/,
                /\bdesign\b/,
                /\brollout\b/,
                /\bdirection\b/
            ]],
            ['Events', [
                /\bevent(s)?\b/,
                /\btour\b/,
                /\blive\b/,
                /\bshow\b/,
                /\bconcert\b/,
                /\bvlog\b/,
                /\bnight\b/
            ]],
            ['Culture', [
                /\bculture\b/,
                /\blifestyle\b/,
                /\bbts\b/,
                /\bbehind the scenes\b/,
                /\bdocumentary\b/,
                /\bseries\b/,
                /\bepisode\b/,
                /\bstory\b/
            ]]
        ];

        for (const [category, patterns] of rules) {
            if (patterns.some((pattern) => pattern.test(copy))) return category;
        }

        return CATEGORY_FALLBACK;
    }

    function classifyVideoCategory(source) {
        const rawCategory = cleanText(source && (source.category || source.type), 80);
        if (SAFE_CATEGORIES.includes(rawCategory) && !GENERIC_CATEGORIES.has(rawCategory)) {
            return rawCategory;
        }

        if (GENERIC_CATEGORIES.has(rawCategory) && (source && (source.featured || source.pinned))) {
            return rawCategory || CATEGORY_FALLBACK;
        }

        return inferCategoryFromCopy([
            source && source.title,
            source && source.description,
            source && source.category,
            source && source.type
        ].filter(Boolean).join(' '));
    }

    function normalizePublishedAt(value) {
        const raw = String(value == null ? '' : value).trim();
        if (!raw) return null;
        const time = Date.parse(raw);
        return Number.isFinite(time) ? new Date(time).toISOString() : null;
    }

    function normalizeVideo(input) {
        const source = input && typeof input === 'object' ? input : {};
        const id = safeYoutubeId(source.id || source.videoId || source.url || source.embedUrl);
        if (!id) return null;
        const title = cleanText(source.title, 180) || 'Untitled OTP video';
        const description = cleanText(source.description, 360);
        const category = classifyVideoCategory(source);
        return {
            id,
            title,
            url: safeYoutubeUrl(id),
            embedUrl: safeYoutubeEmbedUrl(id),
            thumbnail: safeYoutubeThumbnail(id, source.thumbnail),
            publishedAt: normalizePublishedAt(source.publishedAt || source.published || source.date),
            description,
            source: 'youtube',
            category,
            type: category,
            year: source.year ? cleanText(source.year, 16) : '',
            featured: source.featured === true,
            pinned: source.pinned === true,
            bookable: source.bookable !== false
        };
    }

    function getFallbackVideos() {
        return FALLBACK_VIDEOS.map(normalizeVideo).filter(Boolean);
    }

    function sortVideosByDate(videos) {
        return videos.slice().sort((a, b) => {
            const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
            const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
            if (bTime !== aTime) return bTime - aTime;
            return String(a.title).localeCompare(String(b.title));
        });
    }

    function mergeVideoLists(primaryVideos, fallbackVideos) {
        const merged = new Map();
        const primary = Array.isArray(primaryVideos) ? primaryVideos : [];
        const fallback = Array.isArray(fallbackVideos) ? fallbackVideos : getFallbackVideos();
        primary.concat(fallback).forEach((video) => {
            const normalized = normalizeVideo(video);
            if (!normalized || merged.has(normalized.id)) return;
            merged.set(normalized.id, normalized);
        });
        return sortVideosByDate(Array.from(merged.values()));
    }

    function getFeaturedVideos(videos, limit) {
        const max = Number.isFinite(Number(limit)) ? Number(limit) : 4;
        const list = mergeVideoLists(videos, getFallbackVideos());
        const selected = [];
        const seen = new Set();
        const add = (video) => {
            if (!video || seen.has(video.id) || selected.length >= max) return;
            selected.push(video);
            seen.add(video.id);
        };
        add(list[0]);
        getFallbackVideos().filter((video) => video.pinned || video.featured).forEach(add);
        list.filter((video) => video.featured || video.pinned).forEach(add);
        list.forEach(add);
        return selected;
    }

    const api = Object.freeze({
        YOUTUBE_CHANNEL,
        BOOKING_URL,
        SAFE_CATEGORIES,
        normalizeVideo,
        mergeVideoLists,
        getFallbackVideos,
        getFeaturedVideos,
        safeYoutubeId,
        cleanText,
        classifyVideoCategory
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.OTP_VIDEO_LIBRARY = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
