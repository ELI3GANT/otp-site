const assert = require('assert');

const { resolveBookingWriterPolicy } = require('../server/booking-writer-policy.js');

console.log('OTP BOOKING WRITER POLICY...');

assert.deepStrictEqual(resolveBookingWriterPolicy({}), {
    primary: 'otp_os',
    legacyDirectFallbackEnabled: false
}, 'OTP OS is the default operational writer and the legacy fallback fails closed');

assert.deepStrictEqual(resolveBookingWriterPolicy({ OTP_BOOKINGS_WRITER_MODE: 'legacy_direct' }), {
    primary: 'legacy_direct',
    legacyDirectFallbackEnabled: false
}, 'legacy mode alone cannot activate direct operational writes');

assert.deepStrictEqual(resolveBookingWriterPolicy({
    OTP_BOOKINGS_WRITER_MODE: 'legacy_direct',
    OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED: '1'
}), {
    primary: 'legacy_direct',
    legacyDirectFallbackEnabled: true
}, 'operators must explicitly opt into the legacy writer');

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
