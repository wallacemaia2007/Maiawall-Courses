const crypto = require('crypto');
const express = require('express');

const { env } = require('../config/env');
const { OAuthService, OAUTH_PROVIDERS } = require('../services/oauth.service');
const { AuthService } = require('../services/auth.service');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const OAUTH_STATE_COOKIE = 'mw_oauth_state';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

const oauthRouter = express.Router();

function createState() {
  return crypto.randomBytes(16).toString('hex');
}

function ensureProvider(provider) {
  if (!OAUTH_PROVIDERS.includes(provider)) {
    throw new AppError(400, 'OAUTH_INVALID_PROVIDER', 'Provedor de login social invalido');
  }
}

function redirectToFrontend(response, path, params = {}) {
  const url = new URL(path, env.frontendOrigin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  response.redirect(url.toString());
}

function redirectWithError(response, error) {
  const code = typeof error === 'string' ? error : error.code || 'OAUTH_ERROR';
  redirectToFrontend(response, '/login', { oauthError: code });
}

oauthRouter.get('/:provider', (request, response) => {
  const { provider } = request.params;

  try {
    ensureProvider(provider);
    const state = createState();
    response.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      signed: true,
      maxAge: OAUTH_STATE_TTL_MS,
    });
    response.redirect(OAuthService.buildAuthorizationUrl(provider, state));
  } catch (error) {
    redirectWithError(response, error);
  }
});

oauthRouter.get('/:provider/callback', async (request, response) => {
  const { provider } = request.params;
  const { code, state, error: providerError } = request.query;
  response.clearCookie(OAUTH_STATE_COOKIE);

  if (providerError) {
    return redirectWithError(response, 'OAUTH_CANCELLED');
  }

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return redirectWithError(response, 'OAUTH_INVALID_PROVIDER');
  }

  const cookieState = request.signedCookies?.[OAUTH_STATE_COOKIE];

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithError(response, 'OAUTH_STATE_MISMATCH');
  }

  try {
    const profile = await OAuthService.exchangeCodeForProfile(provider, code);
    const user = await AuthService.loginWithOAuthProfile(provider, profile);
    const ticket = await AuthService.createOAuthTicket(user);
    return redirectToFrontend(response, '/auth/callback', { ticket });
  } catch (error) {
    redirectWithError(response, error);
  }
});

oauthRouter.post('/exchange', async (request, response, next) => {
  try {
    const session = await AuthService.exchangeOAuthTicket(request.body?.ticket);
    response.json(successResponse(session, 'OK'));
  } catch (error) {
    next(error);
  }
});

module.exports = { oauthRouter };