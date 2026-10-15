const { env } = require('../config/env');
const { successResponse } = require('./api-response');

const REFRESH_COOKIE_NAME = 'mw_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

function ttlToMilliseconds(value) {
  const source = typeof value === 'number' ? `${value}s` : String(value || '').trim();
  const match = source.match(
    /^(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|secs?|m|minutes?|mins?|h|hours?|hrs?|d|days?|w|weeks?|y|years?|yrs?)?$/i,
  );

  if (!match) {
    throw new Error('REFRESH_TOKEN_TTL precisa usar uma duracao valida, como 7d');
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  let multiplier = 1;

  if (unit === 's' || unit.startsWith('sec')) multiplier = 1000;
  else if (unit === 'm' || unit.startsWith('min')) multiplier = 60 * 1000;
  else if (unit === 'h' || unit.startsWith('hr') || unit.startsWith('hour')) multiplier = 60 * 60 * 1000;
  else if (unit === 'd' || unit.startsWith('day')) multiplier = 24 * 60 * 60 * 1000;
  else if (unit === 'w' || unit.startsWith('week')) multiplier = 7 * 24 * 60 * 60 * 1000;
  else if (unit === 'y' || unit.startsWith('yr') || unit.startsWith('year')) {
    multiplier = 365.25 * 24 * 60 * 60 * 1000;
  } else if (unit !== 'ms' && !unit.startsWith('millisecond')) {
    throw new Error('REFRESH_TOKEN_TTL precisa usar uma unidade valida');
  }

  return Math.floor(amount * multiplier);
}

function refreshCookieOptions(runtimeEnv = env) {
  return {
    httpOnly: true,
    secure: runtimeEnv.isProduction,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: ttlToMilliseconds(runtimeEnv.refreshTokenTtl),
  };
}

function setRefreshCookie(response, refreshToken) {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(response) {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  response.clearCookie(REFRESH_COOKIE_NAME, options);
}

function sendSession(response, session, statusCode = 200) {
  const { refreshToken, ...publicSession } = session;

  if (refreshToken) {
    setRefreshCookie(response, refreshToken);
  }

  return response.status(statusCode).json(successResponse(publicSession, 'OK'));
}

module.exports = {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  clearRefreshCookie,
  refreshCookieOptions,
  sendSession,
  setRefreshCookie,
  ttlToMilliseconds,
};
