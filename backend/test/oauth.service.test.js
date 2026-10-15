const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.GOOGLE_CLIENT_ID ||= 'oauth-test-client-id';
process.env.GOOGLE_CLIENT_SECRET ||= 'oauth-test-client-secret';

const { OAuthService } = require('../src/services/oauth.service');

test('Google OAuth em producao usa FRONTEND_ORIGIN, nao o subdominio de API', () => {
  const authorizationUrl = new URL(
    OAuthService.buildAuthorizationUrl('google', 'test-state', {
      isProduction: true,
      frontendOrigin: 'https://cursos.maiawall.com',
      oauthCallbackBaseUrl: 'https://api.cursos.maiawall.com',
    }),
  );

  assert.equal(
    authorizationUrl.searchParams.get('redirect_uri'),
    'https://cursos.maiawall.com/api/auth/oauth/google/callback',
  );
});

test('Google OAuth fora de producao continua usando a base local configurada', () => {
  const callbackUrl = OAuthService.buildCallbackUrl('google', {
    isProduction: false,
    frontendOrigin: 'https://cursos.maiawall.com',
    oauthCallbackBaseUrl: 'http://localhost:3000/',
  });

  assert.equal(callbackUrl, 'http://localhost:3000/api/auth/oauth/google/callback');
});
