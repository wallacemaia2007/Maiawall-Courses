const { env } = require('../config/env');
const { AppError } = require('../middleware/error-handler');

const OAUTH_PROVIDERS = ['github', 'google'];

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

const PROVIDER_CONFIG = {
  github: {
    clientId: env.githubClientId,
    clientSecret: env.githubClientSecret,
    callbackUrl: `${env.oauthCallbackBaseUrl}/api/auth/oauth/github/callback`,
  },
  google: {
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    callbackUrl: `${env.oauthCallbackBaseUrl}/api/auth/oauth/google/callback`,
  },
};

function ensureProvider(provider) {
  if (!PROVIDER_CONFIG[provider]) {
    throw new AppError(400, 'OAUTH_INVALID_PROVIDER', 'Provedor de login social invalido');
  }
}

function ensureConfigured(provider) {
  const config = PROVIDER_CONFIG[provider];

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

function buildAuthorizationUrl(provider, state) {
  ensureProvider(provider);
  ensureConfigured(provider);

  const config = PROVIDER_CONFIG[provider];

  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });
    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForProfile(provider, code) {
  ensureProvider(provider);
  return provider === 'github' ? fetchGithubProfile(code) : fetchGoogleProfile(code);
}

async function fetchGithubProfile(code) {
  ensureConfigured('github');
  const config = PROVIDER_CONFIG.github;

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
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
  const userResponse = await fetch(GITHUB_USER_URL, { headers });
  const user = await readJson(
    userResponse,
    'OAUTH_PROFILE_FAILED',
    'Nao foi possivel obter o perfil do GitHub',
  );

  // O e-mail primario pode vir privado (null) em /user; o /user/emails traz a
  // lista completa. So consideramos verificado aquele com primary + verified.
  let email = user.email;

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
    providerId: String(user.id),
    email,
    emailVerified: true,
    name: user.name || user.login,
    avatarUrl: user.avatar_url || undefined,
  };
}

async function fetchGoogleProfile(code) {
  ensureConfigured('google');
  const config = PROVIDER_CONFIG.google;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = await readJson(
    tokenResponse,
    'OAUTH_EXCHANGE_FAILED',
    'Nao foi possivel validar o login com Google',
  );
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new AppError(401, 'OAUTH_EXCHANGE_FAILED', 'Nao foi possivel validar o login com Google');
  }

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
    providerId: String(profile.sub),
    email: profile.email,
    emailVerified: Boolean(profile.email_verified),
    name: profile.name || profile.email.split('@')[0],
    avatarUrl: profile.picture || undefined,
  };
}

module.exports = {
  OAuthService: {
    buildAuthorizationUrl,
    exchangeCodeForProfile,
  },
  OAUTH_PROVIDERS,
};