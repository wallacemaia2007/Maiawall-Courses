const { AppError } = require('./error-handler');
const { UserRepository } = require('../repositories/user.repository');
const { verifyAccessToken } = require('../utils/tokens');

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

module.exports = { requireAuth };
