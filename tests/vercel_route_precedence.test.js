const assert = require('assert');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'vercel.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

assert(Array.isArray(config.routes), 'vercel.json must define legacy routes');

const routes = config.routes;
const osRootIndex = routes.findIndex((route) => route.src === '^/os/?$');
const osPathIndex = routes.findIndex((route) => route.src === '^/os/(.*)$');
const filesystemIndex = routes.findIndex((route) => route.handle === 'filesystem');
const catchAllIndex = routes.findIndex((route) => route.src === '/(.*)' || route.src === '^/(.*)$');

assert.strictEqual(osRootIndex, 0, '/os root proxy must be the first Vercel route');
assert.strictEqual(osPathIndex, 1, '/os path proxy must be the second Vercel route');
assert.strictEqual(routes[osRootIndex].dest, '/server.js');
assert.strictEqual(routes[osPathIndex].dest, '/server.js');
assert(filesystemIndex > osPathIndex, 'filesystem handle must stay after /os proxy routes');
assert(catchAllIndex > osPathIndex, 'catch-all route must stay after /os proxy routes');

const bookingIndex = routes.findIndex((route) => route.src === '/(bookings|booking|book|book-otp)/?');
const apiIndex = routes.findIndex((route) => route.src === '/api/(.*)');

assert(bookingIndex > osPathIndex, 'booking aliases must stay after /os proxy routes');
assert(apiIndex > osPathIndex, 'API routes must stay after /os proxy routes');

console.log('Vercel route precedence contract passed.');
