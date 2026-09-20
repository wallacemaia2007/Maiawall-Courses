const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { AuthService } = require('../services/auth.service');
const { successResponse } = require('../utils/api-response');

const authRouter = express.Router();

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
