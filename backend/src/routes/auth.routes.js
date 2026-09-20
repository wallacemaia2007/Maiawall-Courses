const express = require('express');
const crypto = require('crypto');

const { requireAuth } = require('../middleware/auth');
const { AuthService } = require('../services/auth.service');
const { OAuthService } = require('../services/oauth.service');
const { env } = require('../config/env');
const { successResponse } = require('../utils/api-response');

const authRouter = express.Router();
const OAUTH_STATE_COOKIE = 'mw_oauth_state';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

function frontendRedirect(path, params = {}) {
  const url = new URL(path, env.frontendOrigin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function oauthErrorRedirect(response, code) {
  response.redirect(frontendRedirect('/login', { oauthError: code }));
}

function startOAuth(provider) {
  return (request, response) => {
    try {
      const state = crypto.randomBytes(24).toString('hex');
      response.cookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isProduction,
        maxAge: OAUTH_STATE_TTL_MS,
      });
      response.redirect(OAuthService.buildAuthorizationUrl(provider, state));
    } catch (error) {
      oauthErrorRedirect(response, error.code || 'OAUTH_ERROR');
    }
  };
}

function completeOAuth(provider) {
  return async (request, response) => {
    const { code, state, error } = request.query;
    const savedState = request.cookies?.[OAUTH_STATE_COOKIE];
    response.clearCookie(OAUTH_STATE_COOKIE);

    if (error) {
      return oauthErrorRedirect(response, 'OAUTH_CANCELLED');
    }

    if (!code || !state || !savedState || state !== savedState) {
      return oauthErrorRedirect(response, 'OAUTH_STATE_MISMATCH');
    }

    try {
      const profile = await OAuthService.exchangeCodeForProfile(provider, code);
      const user = await AuthService.loginWithOAuthProfile(provider, profile);
      const ticket = await AuthService.createOAuthTicket(user);
      response.redirect(frontendRedirect('/auth/callback', { ticket }));
    } catch (caughtError) {
      oauthErrorRedirect(response, caughtError.code || 'OAUTH_ERROR');
    }
  };
}

authRouter.get('/oauth/google', startOAuth('google'));
authRouter.get('/oauth/github', startOAuth('github'));
authRouter.get('/oauth/google/callback', completeOAuth('google'));
authRouter.get('/oauth/github/callback', completeOAuth('github'));

authRouter.post('/signup', async (request, response, next) => {
  try {
    const session = await AuthService.signup(request.body);
    response.status(201).json(successResponse(session, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const session = await AuthService.login(request.body);
    response.json(successResponse(session, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    const session = await AuthService.sessionForUser(request.auth.user);
    response.json(successResponse(session, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh-token', async (request, response, next) => {
  try {
    const session = await AuthService.refreshSession(request.body);
    response.json(successResponse(session, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    await AuthService.logout(request.body);
    response.json(successResponse(null, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', async (request, response, next) => {
  try {
    const result = await AuthService.requestPasswordRecovery(request.body);
    response.json(successResponse(result, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (request, response, next) => {
  try {
    await AuthService.resetPassword(request.body);
    response.json(successResponse(null, 'OK'));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-email', async (request, response, next) => {
  try {
    await AuthService.verifyEmail(request.body);
    response.json(successResponse(null, 'OK'));
  } catch (error) {
    next(error);
  }
});

module.exports = { authRouter };
