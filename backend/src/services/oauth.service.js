const crypto = require('crypto');

const { env } = require('../config/env');
const { AppError } = require('../middleware/error-handler');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

function createState() {
  return crypto.randomBytes(16).toString('hex');
}

function ensureConfigured(provider) {
  const config = env[provider];

  if (!config.clientId || !config.clientSecret) {
    throw new AppError(
      503,
      'OAUTH_NOT_CONFIGURED',
      `Login com ${provider === 'google' ? 'Google' : 'GitHub'} nao esta configurado no servidor`,
    );
  }
}

async function readJson(response, errorCode, message) {
  if (!response.ok) {
    throw new AppError(401, errorCode, message);
  }

  return response.json();
}

const OAuthService = {
  createState,

  google: {
    buildAuthUrl(state) {
      ensureConfigured('google');
      const params = new URLSearchParams({
        client_id: env.google.clientId,
        redirect_uri: env.google.callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
      });
      return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    },

    async fetchProfile(code) {
      ensureConfigured('google');
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.google.clientId,
          client_secret: env.google.clientSecret,
          redirect_uri: env.google.callbackUrl,
          grant_type: 'authorization_code',
        }),
      });
      const { access_token: accessToken } = await readJson(
        tokenResponse,
        'OAUTH_EXCHANGE_FAILED',
        'Nao foi possivel validar o login com Google',
      );
      const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await readJson(
        profileResponse,
        'OAUTH_PROFILE_FAILED',
        'Nao foi possivel obter o perfil do Google',
      );

      if (!profile.email) {
        throw new AppError(400, 'OAUTH_EMAIL_MISSING', 'Sua conta Google nao possui e-mail publico');
      }

      return {
        provider: 'google',
        providerId: profile.sub,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        avatarUrl: profile.picture || undefined,
        emailVerified: Boolean(profile.email_verified),
      };
    },
  },

  github: {
    buildAuthUrl(state) {
      ensureConfigured('github');
      const params = new URLSearchParams({
        client_id: env.github.clientId,
        redirect_uri: env.github.callbackUrl,
        scope: 'read:user user:email',
        state,
        allow_signup: 'true',
      });
      return `${GITHUB_AUTH_URL}?${params.toString()}`;
    },

    async fetchProfile(code) {
      ensureConfigured('github');
      const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: env.github.clientId,
          client_secret: env.github.clientSecret,
          redirect_uri: env.github.callbackUrl,
        }),
      });
      const { access_token: accessToken, error } = await readJson(
        tokenResponse,
        'OAUTH_EXCHANGE_FAILED',
        'Nao foi possivel validar o login com GitHub',
      );

      if (!accessToken || error) {
        throw new AppError(401, 'OAUTH_EXCHANGE_FAILED', 'Nao foi possivel validar o login com GitHub');
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'maiawall-courses',
      };
      const profileResponse = await fetch(GITHUB_USER_URL, { headers });
      const profile = await readJson(
        profileResponse,
        'OAUTH_PROFILE_FAILED',
        'Nao foi possivel obter o perfil do GitHub',
      );
      let email = profile.email;

      if (!email) {
        const emailsResponse = await fetch(GITHUB_EMAILS_URL, { headers });
        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          email = emails.find((entry) => entry.primary && entry.verified)?.email;
        }
      }

      if (!email) {
        throw new AppError(
          400,
          'OAUTH_EMAIL_MISSING',
          'Sua conta GitHub nao possui e-mail verificado. Adicione um e-mail e tente novamente',
        );
      }

      return {
        provider: 'github',
        providerId: String(profile.id),
        email,
        name: profile.name || profile.login,
        avatarUrl: profile.avatar_url || undefined,
        emailVerified: true,
      };
    },
  },
};

module.exports = { OAuthService };