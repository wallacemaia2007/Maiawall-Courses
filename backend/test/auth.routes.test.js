const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { createApp } = require('../src/app');

let server;
let baseUrl;

before(async () => {
  const app = createApp();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/auth/me returns 401 without bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.code, 'UNAUTHORIZED');
});

test('POST /api/auth/logout is idempotent without refresh token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.code, 'SUCCESS');
});

test('GET /api/auth/oauth/google redirects to the configured provider', async () => {
  const response = await fetch(`${baseUrl}/api/auth/oauth/google`, { redirect: 'manual' });

  assert.equal(response.status, 302);
  assert.match(response.headers.get('location'), /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
});
