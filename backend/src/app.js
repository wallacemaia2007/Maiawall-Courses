const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const { env } = require('./config/env');
const { authRouter } = require('./routes/auth.routes');
const { oauthRouter } = require('./routes/oauth.routes');
const { catalogRouter } = require('./routes/catalog.routes');
const { learningRouter } = require('./routes/learning.routes');
const { userRouter } = require('./routes/user.routes');
const { requireAuth, optionalAuth } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { successResponse } = require('./utils/api-response');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(env.jwtSecret));
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: false,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.get('/api/health', (_request, response) => {
    response.json(successResponse({ status: 'UP' }, 'OK'));
  });

  app.use('/api/auth/oauth', oauthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', requireAuth, userRouter);
  app.use('/api/courses', optionalAuth, catalogRouter);
  app.use('/api/learning', requireAuth, learningRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
