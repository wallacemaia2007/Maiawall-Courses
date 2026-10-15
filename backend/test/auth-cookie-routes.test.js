const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');

const repositoryPath = require.resolve('../src/repositories/user.repository');
const users = new Map();
let nextId = 0;

function clone(value) {
  return value ? structuredClone(value) : value;
}

const userRepository = {
  async create(user) {
    nextId += 1;
    const id = String(nextId).padStart(24, '0');
    const stored = { ...user, _id: id };
    users.set(id, stored);
    return clone(stored);
  },
  async findByEmail(email) {
    return clone([...users.values()].find((user) => user.email === email) || null);
  },
  async findByGithubId(githubId) {
    return clone([...users.values()].find((user) => user.githubId === githubId) || null);
  },
  async findByGoogleId(googleId) {
    return clone([...users.values()].find((user) => user.googleId === googleId) || null);
  },
  async findByOAuthTicketHash(tokenHash) {
    return clone(
      [...users.values()].find(
        (user) =>
          user.oauthTicketHash === tokenHash &&
          user.oauthTicketExpiresAt &&
          user.oauthTicketExpiresAt > new Date(),
      ) || null,
    );
  },
  async findById(id) {
    return clone(users.get(id) || null);
  },
  async updateById(id, update) {
    const current = users.get(id);
    if (!current) return null;
    const updated = { ...current, ...update };
    users.set(id, updated);
    return clone(updated);
  },
  async clearRefreshToken(id) {
    const current = users.get(id);
    if (current) {
      delete current.refreshTokenHash;
      delete current.refreshTokenUpdatedAt;
    }
  },
};

require.cache[repositoryPath] = { exports: { UserRepository: userRepository } };

const { createApp } = require('../src/app');
const { AuthService } = require('../src/services/auth.service');
const {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  refreshCookieOptions,
} = require('../src/utils/auth-session-cookie');

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  users.clear();
  nextId = 0;
});

async function post(path, body = {}, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;

  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function cookieHeader(response) {
  const value = response.headers.get('set-cookie');
  assert.ok(value, 'esperava Set-Cookie');
  assert.match(value, new RegExp(`^${REFRESH_COOKIE_NAME}=`));
  return value;
}

function cookiePair(response) {
  return cookieHeader(response).split(';', 1)[0];
}

function assertSessionBodyHasNoRefreshToken(body) {
  assert.equal(body.success, true);
  assert.ok(body.data.tokens.accessToken);
  assert.equal('refreshToken' in body.data, false);
  assert.equal('refreshToken' in body.data.tokens, false);
}

function assertRefreshCookie(response) {
  const value = cookieHeader(response);
  assert.match(value, /; Path=\/api\/auth(?:;|$)/i);
  assert.match(value, /; HttpOnly(?:;|$)/i);
  assert.match(value, /; SameSite=Lax(?:;|$)/i);
  assert.match(value, /; Max-Age=604800(?:;|$)/i);
  return value;
}

test('refresh cookie usa secure apenas em producao, path auth e maxAge do TTL', () => {
  assert.deepEqual(refreshCookieOptions({ isProduction: true, refreshTokenTtl: '7d' }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
});

test('signup e login emitem cookie httpOnly sem devolver refreshToken no JSON', async () => {
  const signupResponse = await post('/api/auth/signup', {
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });
  const signupBody = await signupResponse.json();

  assert.equal(signupResponse.status, 201);
  assertSessionBodyHasNoRefreshToken(signupBody);
  assertRefreshCookie(signupResponse);

  const loginResponse = await post('/api/auth/login', {
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });
  const loginBody = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  assertSessionBodyHasNoRefreshToken(loginBody);
  assertRefreshCookie(loginResponse);
});

test('refresh le cookie, rotaciona o token e reuso do antigo invalida a sessao', async () => {
  const signupResponse = await post('/api/auth/signup', {
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });
  const oldCookie = cookiePair(signupResponse);

  const refreshResponse = await post('/api/auth/refresh-token', {}, oldCookie);
  const refreshBody = await refreshResponse.json();
  const rotatedCookie = cookiePair(refreshResponse);

  assert.equal(refreshResponse.status, 200);
  assert.notEqual(rotatedCookie, oldCookie);
  assertSessionBodyHasNoRefreshToken(refreshBody);
  assertRefreshCookie(refreshResponse);

  const reuseResponse = await post('/api/auth/refresh-token', {}, oldCookie);
  const reuseBody = await reuseResponse.json();

  assert.equal(reuseResponse.status, 401);
  assert.equal(reuseBody.code, 'REFRESH_TOKEN_REUSED');
  assert.match(cookieHeader(reuseResponse), /Max-Age=0|Expires=Thu, 01 Jan 1970/i);

  const invalidatedResponse = await post('/api/auth/refresh-token', {}, rotatedCookie);
  assert.equal(invalidatedResponse.status, 401);
});

test('logout limpa o cookie e invalida o hash atual no banco', async () => {
  const signupResponse = await post('/api/auth/signup', {
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });
  const cookie = cookiePair(signupResponse);
  const userId = (await signupResponse.json()).data.user.id;

  const logoutResponse = await post('/api/auth/logout', {}, cookie);
  const logoutBody = await logoutResponse.json();

  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutBody.success, true);
  const clearedCookie = cookieHeader(logoutResponse);
  assert.match(clearedCookie, /^mw_refresh=;/);
  assert.match(clearedCookie, /; Path=\/api\/auth(?:;|$)/i);
  assert.match(clearedCookie, /; HttpOnly(?:;|$)/i);
  assert.equal((await userRepository.findById(userId)).refreshTokenHash, undefined);
});

test('exchange OAuth emite cookie de refresh e nao expoe o token no JSON', async () => {
  const user = await AuthService.loginWithOAuthProfile('google', {
    providerId: 'google-user-1',
    email: 'oauth@example.com',
    name: 'OAuth User',
    emailVerified: true,
  });
  const ticket = await AuthService.createOAuthTicket(user);

  const response = await post('/api/auth/oauth/exchange', { ticket });
  const body = await response.json();

  assert.equal(response.status, 200);
  assertSessionBodyHasNoRefreshToken(body);
  assertRefreshCookie(response);
});
