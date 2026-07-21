const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const vercel = JSON.parse(read('vercel.json'));
const app = require('../server.js');

function request(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: '127.0.0.1', port, path: requestPath, headers: { accept: 'text/html' } },
      (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location }));
      },
    );
    req.on('error', reject);
  });
}

async function main() {
  console.log('FIXLINE PREMIUM EXPERIENCE...');

  const rootProxy = vercel.routes.find((route) => route.src === '^/fixline/?$');
  const intakeProxy = vercel.routes.find((route) => route.src === '^/fixline/intake/?$');
  assert.deepStrictEqual(
    rootProxy,
    { src: '^/fixline/?$', dest: 'https://otp-fixline.vercel.app/fixline' },
    'Vercel serves the current FIXLINE application at the public root',
  );
  assert.deepStrictEqual(
    intakeProxy,
    { src: '^/fixline/intake/?$', dest: 'https://otp-fixline.vercel.app/fixline/intake' },
    'Vercel serves the four-step intake at the public intake route',
  );

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const port = server.address().port;
    const cases = [
      ['/fixline', 'https://otp-fixline.vercel.app/fixline'],
      ['/fixline/?source=homepage', 'https://otp-fixline.vercel.app/fixline?source=homepage'],
      ['/fixline/intake', 'https://otp-fixline.vercel.app/fixline/intake'],
      ['/fixline/intake/?source=archive&campaign=private-beta', 'https://otp-fixline.vercel.app/fixline/intake?source=archive&campaign=private-beta'],
    ];

    for (const [requestPath, expectedLocation] of cases) {
      const response = await request(port, requestPath);
      assert.strictEqual(response.status, 307, `${requestPath} uses a method-preserving handoff`);
      assert.strictEqual(response.location, expectedLocation, `${requestPath} preserves its bounded path and query`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('   OK: public root and intake use the current bounded FIXLINE application');
  console.log('FIXLINE PREMIUM EXPERIENCE COMPLETE');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
