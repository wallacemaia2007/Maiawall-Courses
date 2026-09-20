const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { AuthService } = require('../services/auth.service');
const { OAuthService } = require('../services/oauth.service');
const { successResponse } = require('../utils/api-response');
const { env } = require('../config/env');

const authRouter = express.Router();
const OAUTH_STATE_COOKIE = 'mw_oauth_state';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

function redirectWithError(response, error) {
  const message = error.code || 'OAUTH_ERROR';
  response.redirect(`${env.oauthRedirectUrl}?error=${encodeURIComponent(message)}`);
}

function startOAuthFlow(provider) {
  return (request, response) => {
    try {
      const state = OAuthService.createState();
      response.cookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isProduction,
        maxAge: OAUTH_STATE_TTL_MS,
      });
      response.redirect(OAuthService[provider].buildAuthUrl(state));
    } catch (error) {
      redirectWithError(response, error);
    }
  };
}

function completeOAuthFlow(provider) {
  return async (request, response) => {
    const { code, state, error } = request.query;
    const cookieState = request.cookies?.[OAUTH_STATE_COOKIE];
    response.clearCookie(OAUTH_STATE_COOKIE);

    if (error) {
      return redirectWithError(response, { code: 'OAUTH_CANCELLED' });
    }

    if (!code || !state || !cookieState || state !== cookieState) {
      return redirectWithError(response, { code: 'OAUTH_STATE_MISMATCH' });
    }

    try {
      const profile = await OAuthService[provider].fetchProfile(code);
      const session = await AuthService.loginWithOAuth(profile);
      const params = new URLSearchParams({ accessToken: session.tokens.accessToken });

      if (session.tokens.refreshToken) {
        params.set('refreshToken', session.tokens.refreshToken);
      }

      response.redirect(`${env.oauthRedirectUrl}?${params.toString()}`);
    } catch (caughtError) {
      redirectWithError(response, caughtError);
    }
  };
}

authRouter.get('/google', startOAuthFlow('google'));
authRouter.get('/google/callback', completeOAuthFlow('google'));
authRouter.get('/github', startOAuthFlow('github'));
authRouter.get('/github/callback', completeOAuthFlow('github'));

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
