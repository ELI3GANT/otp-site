const WRITER_MODES = new Set(['otp_os', 'legacy_direct']);

function resolveBookingWriterPolicy(env = process.env) {
    const primary = String(env.OTP_BOOKINGS_WRITER_MODE || 'otp_os').trim().toLowerCase();
    if (!WRITER_MODES.has(primary)) {
        throw new Error('OTP_BOOKINGS_WRITER_MODE must be otp_os or legacy_direct');
    }

    return Object.freeze({
        primary,
        legacyDirectFallbackEnabled: env.OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED === '1'
    });
}

module.exports = { resolveBookingWriterPolicy };
