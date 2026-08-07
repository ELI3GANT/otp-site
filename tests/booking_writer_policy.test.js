const assert = require('assert');

const { resolveBookingWriterPolicy } = require('../server/booking-writer-policy.js');

console.log('OTP BOOKING WRITER POLICY...');

assert.deepStrictEqual(resolveBookingWriterPolicy({}), {
    primary: 'otp_os',
    legacyDirectFallbackEnabled: true
}, 'OTP OS is the default operational writer while the direct-write fallback remains explicit and bounded');

assert.deepStrictEqual(resolveBookingWriterPolicy({ OTP_BOOKINGS_WRITER_MODE: 'legacy_direct' }), {
    primary: 'legacy_direct',
    legacyDirectFallbackEnabled: true
}, 'operators can explicitly preserve the legacy writer during rollout');

assert.deepStrictEqual(resolveBookingWriterPolicy({
    OTP_BOOKINGS_WRITER_MODE: 'otp_os',
    OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED: '0'
}), {
    primary: 'otp_os',
    legacyDirectFallbackEnabled: false
}, 'the legacy direct writer can be disabled independently');

assert.throws(
    () => resolveBookingWriterPolicy({ OTP_BOOKINGS_WRITER_MODE: 'both' }),
    /OTP_BOOKINGS_WRITER_MODE/,
    'ambiguous dual-writer modes are rejected'
);

console.log('OTP BOOKING WRITER POLICY OK');
