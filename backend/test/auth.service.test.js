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

const { AuthService, effectiveRole } = require('../src/services/auth.service');

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

test('signup ignores a client attempt to create an admin account', async () => {
  const session = await AuthService.signup({
    name: 'Student',
    email: 'student@example.com',
    password: 'StrongPass123',
    role: 'ADMIN',
  });

  assert.equal(session.user.role, 'STUDENT');
});

test('only a verified Google identity from the allowlist receives the admin role', () => {
  const baseUser = {
    email: 'wallacemaia2007@gmail.com',
    role: 'STUDENT',
  };

  assert.equal(effectiveRole(baseUser), 'STUDENT');
  assert.equal(effectiveRole({ ...baseUser, provider: 'google', emailVerified: false }), 'STUDENT');
  assert.equal(effectiveRole({ ...baseUser, provider: 'google', emailVerified: true }), 'ADMIN');
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

test('OAuth creates a verified student account and reuses the provider identity', async () => {
  const profile = {
    providerId: 'github-user-1',
    email: 'oauth@example.com',
    name: 'OAuth User',
    emailVerified: true,
  };

  const firstUser = await AuthService.loginWithOAuthProfile('github', profile);
  const secondUser = await AuthService.loginWithOAuthProfile('github', profile);

  assert.equal(firstUser.email, 'oauth@example.com');
  assert.equal(firstUser.githubId, 'github-user-1');
  assert.equal(secondUser._id.toString(), firstUser._id.toString());
});

test('OAuth links a verified provider email to an existing password account', async () => {
  const signupSession = await AuthService.signup({
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });

  const linkedUser = await AuthService.loginWithOAuthProfile('google', {
    providerId: 'google-user-2',
    email: 'wallace@example.com',
    name: 'Wallace',
    emailVerified: true,
  });

  assert.equal(linkedUser.googleId, 'google-user-2');
  assert.equal(linkedUser.emailVerified, true);
  assert.equal(linkedUser._id.toString(), signupSession.user.id);
});

test('OAuth rejects linking when the provider email is unverified', async () => {
  await AuthService.signup({
    name: 'Wallace',
    email: 'wallace@example.com',
    password: 'StrongPass123',
  });

  await assert.rejects(
    () =>
      AuthService.loginWithOAuthProfile('google', {
        providerId: 'google-user-3',
        email: 'wallace@example.com',
        name: 'Wallace',
        emailVerified: false,
      }),
    /nao foi verificado/,
  );
});

test('OAuth ticket is single-use and exchanges into a session', async () => {
  const user = await AuthService.loginWithOAuthProfile('github', {
    providerId: 'github-user-4',
    email: 'ticket@example.com',
    name: 'Ticket User',
    emailVerified: true,
  });

  const ticket = await AuthService.createOAuthTicket(user);
  const session = await AuthService.exchangeOAuthTicket(ticket);
  const stored = require.cache[repositoryPath].exports.UserRepository;
  const storedUser = await stored.findById(user._id.toString());

  assert.equal(session.user.email, 'ticket@example.com');
  assert.ok(session.tokens.accessToken);
  assert.ok(session.tokens.refreshToken);
  assert.equal(storedUser.oauthTicketHash, null);

  await assert.rejects(() => AuthService.exchangeOAuthTicket(ticket), /expirado/);
});
