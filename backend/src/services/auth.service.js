const crypto = require('crypto');

const { UserRepository } = require('../repositories/user.repository');
const { AppError } = require('../middleware/error-handler');
const { hashPassword, verifyPassword } = require('../utils/password');
const {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} = require('../utils/tokens');
const { env } = require('../config/env');

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const OAUTH_TICKET_TTL_MS = 1000 * 60;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function effectiveRole(user) {
  const isVerifiedGoogleAdmin = user.provider === 'google'
    && user.emailVerified === true
    && env.adminEmails.includes(normalizeEmail(user.email));
  return user.role === 'ADMIN' || isVerifiedGoogleAdmin
    ? 'ADMIN'
    : user.role;
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: effectiveRole(user),
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    emailVerified: Boolean(user.emailVerified),
    hasPassword: Boolean(user.passwordHash),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function validateRequiredString(value, field) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} e obrigatorio`);
  }
}

function validatePassword(password) {
  validateRequiredString(password, 'password');

  if (password.length < 8) {
    throw new AppError(400, 'VALIDATION_ERROR', 'password deve ter ao menos 8 caracteres');
  }
}

// recordLogin=false no refresh de token: renovar sessao nao e um novo login.
async function createSession(user, { recordLogin = true } = {}) {
  const safeUser = sanitizeUser(user);
  const accessToken = createAccessToken(safeUser);
  const refreshToken = createRefreshToken(safeUser);
  const now = new Date();

  await UserRepository.updateById(safeUser.id, {
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenUpdatedAt: now,
    ...(recordLogin ? { lastLoginAt: now } : {}),
    updatedAt: now,
  });

  return {
    user: safeUser,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

const AuthService = {
  async signup(payload) {
    validateRequiredString(payload.name, 'name');
    validateRequiredString(payload.email, 'email');
    validatePassword(payload.password);

    const email = normalizeEmail(payload.email);
    const existingUser = await UserRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'E-mail ja cadastrado');
    }

    const now = new Date();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await UserRepository.create({
      name: payload.name.trim(),
      email,
      passwordHash: await hashPassword(payload.password),
      role: 'STUDENT',
      emailVerified: false,
      emailVerificationTokenHash: hashToken(verificationToken),
      createdAt: now,
      updatedAt: now,
    });

    if (!env.isProduction) {
      console.info(`Email verification token generated for ${email} in development mode`);
    }

    return createSession(user);
  },

  async login(payload) {
    validateRequiredString(payload.email, 'email');
    validateRequiredString(payload.password, 'password');

    const user = await UserRepository.findByEmail(normalizeEmail(payload.email));

    if (!user || !user.passwordHash || !(await verifyPassword(payload.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha invalidos');
    }

    return createSession(user);
  },

  async loginWithOAuthProfile(provider, profile) {
    validateRequiredString(provider, 'provider');
    validateRequiredString(profile.providerId, 'providerId');
    validateRequiredString(profile.email, 'email');

    const isGithub = provider === 'github';
    const email = normalizeEmail(profile.email);
    const now = new Date();
    let user = isGithub
      ? await UserRepository.findByGithubId(profile.providerId)
      : await UserRepository.findByGoogleId(profile.providerId);

    if (user) {
      return user;
    }

    const existingByEmail = await UserRepository.findByEmail(email);

    if (!existingByEmail) {
      return UserRepository.create({
        name: profile.name,
        email,
        [isGithub ? 'githubId' : 'googleId']: profile.providerId,
        provider,
        avatarUrl: profile.avatarUrl,
        role: 'STUDENT',
        emailVerified: Boolean(profile.emailVerified),
        createdAt: now,
        updatedAt: now,
      });
    }

    // E-mail ja cadastrado (senha): so vincula se o provedor comprovar que e o
    // dono do e-mail (verificado). Sem verificacao, nao vinculamos para evitar
    // takeover de conta por e-mail nao confirmado.
    if (!profile.emailVerified) {
      throw new AppError(
        401,
        'OAUTH_EMAIL_UNVERIFIED',
        'O e-mail do provedor nao foi verificado. Entre com seu e-mail e senha',
      );
    }

    return UserRepository.updateById(existingByEmail._id.toString(), {
      [isGithub ? 'githubId' : 'googleId']: profile.providerId,
      provider,
      avatarUrl: existingByEmail.avatarUrl || profile.avatarUrl,
      emailVerified: true,
      updatedAt: now,
    });
  },

  async createOAuthTicket(user) {
    const ticket = crypto.randomBytes(32).toString('hex');
    await UserRepository.updateById(user._id.toString(), {
      oauthTicketHash: hashToken(ticket),
      oauthTicketExpiresAt: new Date(Date.now() + OAUTH_TICKET_TTL_MS),
      updatedAt: new Date(),
    });
    return ticket;
  },

  async exchangeOAuthTicket(ticket) {
    validateRequiredString(ticket, 'ticket');

    const user = await UserRepository.findByOAuthTicketHash(hashToken(ticket));

    if (!user) {
      throw new AppError(401, 'OAUTH_INVALID_TICKET', 'Tempo de login expirado. Tente novamente');
    }

    await UserRepository.updateById(user._id.toString(), {
      oauthTicketHash: null,
      oauthTicketExpiresAt: null,
      updatedAt: new Date(),
    });

    return createSession(user);
  },

  async sessionForUser(user) {
    return {
      user: sanitizeUser(user),
      tokens: {
        accessToken: createAccessToken(sanitizeUser(user)),
      },
    };
  },

  async refreshSession(payload) {
    validateRequiredString(payload.refreshToken, 'refreshToken');

    let tokenPayload;

    try {
      tokenPayload = verifyRefreshToken(payload.refreshToken);
    } catch (_error) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token invalido');
    }

    const user = await UserRepository.findById(tokenPayload.sub);

    if (!user || user.refreshTokenHash !== hashToken(payload.refreshToken)) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token invalido');
    }

    return createSession(user, { recordLogin: false });
  },

  async logout(payload = {}) {
    if (!payload.refreshToken) {
      return;
    }

    try {
      const tokenPayload = verifyRefreshToken(payload.refreshToken);
      await UserRepository.clearRefreshToken(tokenPayload.sub);
    } catch (_error) {
      // Logout e idempotente: token ausente, expirado ou invalido termina como sucesso.
    }
  },

  async requestPasswordRecovery(payload) {
    validateRequiredString(payload.email, 'email');

    const email = normalizeEmail(payload.email);
    const user = await UserRepository.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await UserRepository.updateById(user._id.toString(), {
        passwordResetTokenHash: hashToken(resetToken),
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        updatedAt: new Date(),
      });

      if (!env.isProduction) {
        console.info(`Password reset token generated for ${email} in development mode`);
      }
    }

    return { accepted: true };
  },

  async resetPassword(payload) {
    validateRequiredString(payload.token, 'token');
    validatePassword(payload.password);

    const user = await UserRepository.findByPasswordResetTokenHash(hashToken(payload.token));

    if (!user) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Token de redefinicao invalido ou expirado');
    }

    await UserRepository.updateById(user._id.toString(), {
      passwordHash: await hashPassword(payload.password),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      refreshTokenHash: null,
      updatedAt: new Date(),
    });
  },

  async verifyEmail(payload) {
    validateRequiredString(payload.token, 'token');

    const user = await UserRepository.findByEmailVerificationTokenHash(hashToken(payload.token));

    if (!user) {
      throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'Token de verificacao invalido');
    }

    await UserRepository.updateById(user._id.toString(), {
      emailVerified: true,
      emailVerificationTokenHash: null,
      updatedAt: new Date(),
    });
  },
};

module.exports = {
  AuthService,
  sanitizeUser,
  validatePassword,
  validateRequiredString,
  effectiveRole,
};
