const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');

const repositoryPath = require.resolve('../src/repositories/user.repository');
const users = new Map();

function clone(value) {
  return value ? structuredClone(value) : value;
}

const fakeRepository = {
  async findById(id) {
    return clone(users.get(id) || null);
  },
  async findByEmail(email) {
    return clone([...users.values()].find((user) => user.email === email) || null);
  },
  async updateById(id, update) {
    const updated = { ...users.get(id), ...update };
    users.set(id, updated);
    return clone(updated);
  },
  async changeEmail(id, _oldEmail, newEmail, update) {
    const existing = [...users.values()].find((user) => user.email === newEmail && user._id !== id);
    if (existing) {
      const error = new Error('E-mail ja cadastrado');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_REGISTERED';
      throw error;
    }
    return this.updateById(id, update);
  },
  async clearRefreshToken() {},
};

require.cache[repositoryPath] = { exports: { UserRepository: fakeRepository } };

const { createApp } = require('../src/app');
const { createAccessToken } = require('../src/utils/tokens');
const { hashPassword, verifyPassword } = require('../src/utils/password');

let server;
let baseUrl;
let accessToken;

function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

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

beforeEach(async () => {
  users.clear();
  const user = {
    _id: 'user-1',
    name: 'Wallace',
    email: 'wallace@example.com',
    role: 'STUDENT',
    emailVerified: true,
    passwordHash: await hashPassword('StrongPass123'),
    refreshTokenHash: 'active-refresh-token',
    createdAt: new Date('2026-01-01T10:00:00Z'),
  };
  users.set(user._id, user);
  accessToken = createAccessToken({ id: user._id, email: user.email, role: user.role });
});

test('PATCH /api/users/me updates profile data and marks a changed email unverified', async () => {
  const response = await request('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Wallace Dev', email: 'NEW@example.com' }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.name, 'Wallace Dev');
  assert.equal(body.data.email, 'new@example.com');
  assert.equal(body.data.emailVerified, false);
  assert.equal(body.data.hasPassword, true);
});

test('PATCH /api/users/me rejects an email already used by another account', async () => {
  users.set('user-2', {
    _id: 'user-2',
    name: 'Another user',
    email: 'used@example.com',
    role: 'STUDENT',
  });

  const response = await request('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ email: 'used@example.com' }),
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, 'EMAIL_ALREADY_REGISTERED');
});

test('PATCH /api/users/me/password explains that OAuth-only accounts have no local password', async () => {
  users.set('user-1', { ...users.get('user-1'), passwordHash: undefined, provider: 'google' });

  const response = await request('/api/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword: 'StrongPass123', newPassword: 'NewStrongPass456' }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, 'OAUTH_ONLY_ACCOUNT');
});

test('PATCH /api/users/me/password changes the password and invalidates the refresh token', async () => {
  const response = await request('/api/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword: 'StrongPass123', newPassword: 'NewStrongPass456' }),
  });

  assert.equal(response.status, 200);
  assert.equal(users.get('user-1').refreshTokenHash, null);
  assert.equal(await verifyPassword('NewStrongPass456', users.get('user-1').passwordHash), true);
});
