const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

const repositoryPath = require.resolve('../src/repositories/user.repository');

const users = new Map();

function clone(value) {
  return value ? structuredClone(value) : value;
}

require.cache[repositoryPath] = {
  exports: {
    UserRepository: {
      async create(user) {
        const id = String(users.size + 1).padStart(24, '0');
        const stored = { ...user, _id: id };
        users.set(id, stored);
        return clone(stored);
      },
      async findByEmail(email) {
        return clone([...users.values()].find((user) => user.email === email) || null);
      },
      async findById(id) {
        return clone(users.get(id) || null);
      },
      async findByPasswordResetTokenHash(tokenHash) {
        return clone(
          [...users.values()].find((user) => user.passwordResetTokenHash === tokenHash) || null,
        );
      },
      async findByEmailVerificationTokenHash(tokenHash) {
        return clone(
          [...users.values()].find((user) => user.emailVerificationTokenHash === tokenHash) || null,
        );
      },
      async updateById(id, update) {
        const current = users.get(id);
        const updated = { ...current, ...update };
        users.set(id, updated);
        return clone(updated);
      },
      async clearRefreshToken(id) {
        const current = users.get(id);
        if (current) {
          delete current.refreshTokenHash;
        }
      },
    },
  },
};

const { AuthService } = require('../src/services/auth.service');

beforeEach(() => {
  users.clear();
});

test('signup creates a student session with access and refresh tokens', async () => {
  const session = await AuthService.signup({
    name: 'Wallace',
    email: 'Wallace@Example.com',
    password: 'StrongPass123',
  });

  assert.equal(session.user.email, 'wallace@example.com');
  assert.equal(session.user.role, 'STUDENT');
  assert.ok(session.tokens.accessToken);
  assert.ok(session.tokens.refreshToken);
});

test('login rejects invalid credentials', async () => {
  await AuthService.signup({
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });

  await assert.rejects(
    () => AuthService.login({ email: 'wallace@example.com', password: 'wrong-password' }),
    /E-mail ou senha invalidos/,
  );
});

test('refresh rotates stored refresh token', async () => {
  const firstSession = await AuthService.signup({
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });

  const secondSession = await AuthService.refreshSession({
    refreshToken: firstSession.tokens.refreshToken,
  });

  assert.ok(secondSession.tokens.accessToken);
  assert.ok(secondSession.tokens.refreshToken);
  assert.notEqual(secondSession.tokens.refreshToken, firstSession.tokens.refreshToken);
});
