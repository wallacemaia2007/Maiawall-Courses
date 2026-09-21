const crypto = require('crypto');
const express = require('express');

const { env } = require('../config/env');
const { AppError } = require('../middleware/error-handler');
const { UserRepository } = require('../repositories/user.repository');
const {
  sanitizeUser,
  validatePassword,
  validateRequiredString,
} = require('../services/auth.service');
const { hashPassword, verifyPassword } = require('../utils/password');
const { hashToken } = require('../utils/tokens');
const { successResponse } = require('../utils/api-response');

const userRouter = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

userRouter.get('/me', async (request, response, next) => {
  try {
    response.json(successResponse(sanitizeUser(request.auth.user), 'OK'));
  } catch (error) { next(error); }
});

userRouter.patch('/me', async (request, response, next) => {
  try {
    const user = request.auth.user;
    const payload = request.body || {};
    const hasUpdates = ['name', 'email', 'avatarUrl'].some((key) => payload[key] !== undefined);

    if (!hasUpdates) {
      response.json(successResponse(sanitizeUser(user), 'OK'));
      return;
    }

    const update = { updatedAt: new Date() };

    if (payload.name !== undefined) {
      const name = String(payload.name).trim();
      if (!name) {
        throw new AppError(400, 'VALIDATION_ERROR', 'name nao pode ficar vazio');
      }
      update.name = name;
    }

    if (payload.avatarUrl !== undefined) {
      if (typeof payload.avatarUrl !== 'string' || !payload.avatarUrl.trim()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'avatarUrl invalido');
      }
      update.avatarUrl = payload.avatarUrl.trim();
    }

    let updatedUser = user;

    if (payload.email !== undefined) {
      validateRequiredString(payload.email, 'email');
      const email = normalizeEmail(payload.email);

      if (email === normalizeEmail(user.email)) {
        updatedUser = await UserRepository.updateById(user._id.toString(), update);
      } else {
        const existing = await UserRepository.findByEmail(email);

        if (existing && existing._id.toString() !== user._id.toString()) {
          throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'E-mail ja cadastrado');
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        update.email = email;
        update.emailVerified = false;
        update.emailVerificationTokenHash = hashToken(verificationToken);

        if (!env.isProduction) {
          console.info(`Email verification token generated for ${email} in development mode`);
        }

        updatedUser = await UserRepository.changeEmail(
          user._id.toString(),
          user.email,
          email,
          update,
        );
      }
    } else {
      updatedUser = await UserRepository.updateById(user._id.toString(), update);
    }

    response.json(successResponse(sanitizeUser(updatedUser), 'OK'));
  } catch (error) { next(error); }
});

userRouter.patch('/me/password', async (request, response, next) => {
  try {
    const user = request.auth.user;

    if (!user.passwordHash) {
      throw new AppError(400, 'OAUTH_ONLY_ACCOUNT', 'Esta conta usa login social, nao ha senha para trocar');
    }

    const { currentPassword, newPassword } = request.body || {};
    validateRequiredString(currentPassword, 'currentPassword');
    validatePassword(newPassword);

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Senha atual incorreta');
    }

    await UserRepository.updateById(user._id.toString(), {
      passwordHash: await hashPassword(newPassword),
      refreshTokenHash: null,
      updatedAt: new Date(),
    });

    response.json(successResponse(null, 'OK'));
  } catch (error) { next(error); }
});

module.exports = { userRouter };