'use strict';

class BoundedTtlCache {
    constructor({ maxEntries = 100, ttlMs = 60 * 60 * 1000, now = () => Date.now() } = {}) {
        if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries must be a positive integer');
        if (!Number.isFinite(ttlMs) || ttlMs < 1) throw new TypeError('ttlMs must be positive');
        this.maxEntries = maxEntries;
        this.ttlMs = ttlMs;
        this.now = now;
        this.entries = new Map();
    }

    pruneExpired() {
        const cutoff = this.now();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt > cutoff) continue;
            this.entries.delete(key);
        }
    }

    set(key, value) {
        this.pruneExpired();
        if (this.entries.has(key)) this.entries.delete(key);
        while (this.entries.size >= this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            this.entries.delete(oldest);
        }
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
        return this;
    }

    get(key) {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    has(key) {
        return this.get(key) !== undefined;
    }

    get size() {
        this.pruneExpired();
        return this.entries.size;
    }
}

module.exports = { BoundedTtlCache };
