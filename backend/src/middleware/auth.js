const { AppError } = require('./error-handler');
const { UserRepository } = require('../repositories/user.repository');
const { verifyAccessToken } = require('../utils/tokens');
const { env } = require('../config/env');

function isAdminUser(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  const isVerifiedGoogleAdmin = user?.provider === 'google'
    && user?.emailVerified === true
    && env.adminEmails.includes(email);
  return user?.role === 'ADMIN' || isVerifiedGoogleAdmin;
}

async function requireAuth(request, _response, next) {
  try {
    const header = request.get('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Sessao nao autenticada');
    }

    const payload = verifyAccessToken(token);
    const user = await UserRepository.findById(payload.sub);

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Sessao nao autenticada');
    }

    request.auth = {
      token,
      user,
      userId: user._id.toString(),
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, 'UNAUTHORIZED', 'Sessao expirada ou invalida'));
  }
}

function requireAdmin(request, _response, next) {
  if (!request.auth?.user || !isAdminUser(request.auth.user)) {
    next(new AppError(403, 'FORBIDDEN', 'Acesso restrito ao administrador'));
    return;
  }

  next();
}

async function optionalAuth(request, _response, next) {
  const header = request.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await UserRepository.findById(payload.sub);
    if (user) request.auth = { token, user, userId: user._id.toString() };
  } catch (_error) {
    // A catalog visitor can still read public material with an expired local token.
  }
  return next();
}

module.exports = { isAdminUser, requireAdmin, requireAuth, optionalAuth };
