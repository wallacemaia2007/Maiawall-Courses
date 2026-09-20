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

const env = {
  appEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200',
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017'),
  mongodbDbName: required('MONGODB_DB_NAME', 'maiawall_courses'),
  jwtSecret: required('JWT_SECRET', isProduction ? undefined : 'dev-access-secret-change-me'),
  jwtRefreshSecret: required(
    'JWT_REFRESH_SECRET',
    isProduction ? undefined : 'dev-refresh-secret-change-me',
  ),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
};

module.exports = { env };
