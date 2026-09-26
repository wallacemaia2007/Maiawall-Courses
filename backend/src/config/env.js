require('dotenv').config();

const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const isProduction = appEnv === 'production';

function required(name, fallback) {
  const value = process.env[name] || fallback;

  if (!value && isProduction) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '';
const isFirestoreEmulator = Boolean(firestoreEmulatorHost);

function commaSeparated(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

const env = {
  appEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200',
  firebaseProjectId: required(
    'FIREBASE_PROJECT_ID',
    isFirestoreEmulator ? 'demo-maiawall' : 'maiawall-courses',
  ),
  firebaseDatabaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
  firebaseServiceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  firestoreEmulatorHost,
  isFirestoreEmulator,
  jwtSecret: required('JWT_SECRET', isProduction ? undefined : 'dev-access-secret-change-me'),
  jwtRefreshSecret: required(
    'JWT_REFRESH_SECRET',
    isProduction ? undefined : 'dev-refresh-secret-change-me',
  ),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  oauthCallbackBaseUrl: process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3000',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  adminEmails: commaSeparated(
    process.env.ADMIN_EMAILS || 'wallacemaia2007@gmail.com',
  ),
  // GA4: opcional. Sem GA4_PROPERTY_ID, o painel mostra o dashboard sem a
  // secao de analytics (ver backend/src/services/analytics.service.js).
  ga4PropertyId: process.env.GA4_PROPERTY_ID || '',
  // JSON da service account com acesso de leitura na propriedade GA4. Se
  // vazio, usa GOOGLE_APPLICATION_CREDENTIALS (Application Default Credentials).
  ga4ServiceAccountJson: process.env.GA4_SERVICE_ACCOUNT || '',
};

module.exports = { env };
