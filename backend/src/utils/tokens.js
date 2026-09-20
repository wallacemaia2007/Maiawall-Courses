const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { env } = require('../config/env');

function basePayload(user) {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
}

function createAccessToken(user) {
  return jwt.sign({ ...basePayload(user), typ: 'access', jti: crypto.randomUUID() }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

function createRefreshToken(user) {
  return jwt.sign(
    { ...basePayload(user), typ: 'refresh', jti: crypto.randomUUID() },
    env.jwtRefreshSecret,
    {
      expiresIn: env.refreshTokenTtl,
    },
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);

  if (payload.typ !== 'access') {
    throw new Error('Invalid token type');
  }

  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwtRefreshSecret);

  if (payload.typ !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return payload;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
};
